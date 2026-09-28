/**
 * 讯飞语音听写（流式版 IAT）浏览器端识别器
 *
 * 设计要点：
 * - 接口：wss://iat-api.xfyun.cn/v2/iat，握手用 hmac-sha256 签名鉴权（见 buildAuthUrl）。
 *   签名走浏览器原生 Web Crypto（crypto.subtle），不引入额外加密库。
 * - 采集：getUserMedia + AudioContext（ScriptProcessor）取单声道 Float32，重采样到 16k、
 *   转 16bit 小端 PCM，按官方建议「每 40ms 发 1280B」的节奏分帧 base64 上行。
 *   这套采集与浏览器 SpeechRecognition 用的是同一条 getUserMedia 链路，因此对输入设备
 *   （耳机 / 笔记本内置麦 / USB 麦）完全无关，只要求浏览器能拿到麦克风。
 * - 结果：开启动态修正（dwa=wpgs），按 sn 序号维护分段文本，rpl 替换 / apd 追加，
 *   实时回调「当前完整识别文本」给上层写入输入框。
 *
 * 安全提示：本文件默认从 import.meta.env 读取 APISecret 在前端直连签名，
 * 密钥会被打进构建产物、可被访问者提取，仅适合内网 / 受控环境。
 * 公网交付应改为「后端下发已签名的鉴权 URL」，届时把 buildAuthUrl 换成请求后端接口即可，
 * 其余采集 / 收发 / 结果拼装逻辑无需改动。
 */

const XF_IAT_HOST = 'iat-api.xfyun.cn'
const XF_IAT_PATH = '/v2/iat'
const TARGET_SAMPLE_RATE = 16000
// 官方建议：PCM 每次发送间隔 40ms、每次 1280B（= 640 个 16bit 单声道采样）
const FRAME_BYTES = 1280
const SEND_INTERVAL_MS = 40
// 单次会话上限：讯飞听写最长 60s，留 3s 余量主动收尾
const MAX_SESSION_MS = 57000

export interface XfIatCallbacks {
  // 每次识别更新回调当前完整文本；isFinal 表示会话已定稿
  onResult: (text: string, isFinal: boolean) => void
  onError: (message: string) => void
  // 连接关闭 / 会话结束（正常或异常）统一回调，供上层复位「聆听中」状态
  onEnd: () => void
}

/** 三件套是否已在 env 配置齐全 */
export function isXfIatConfigured(): boolean {
  return !!(
    import.meta.env.VITE_APP_XF_IAT_APPID
    && import.meta.env.VITE_APP_XF_IAT_API_KEY
    && import.meta.env.VITE_APP_XF_IAT_API_SECRET
  )
}

/** 当前环境是否具备语音输入条件：安全上下文 + 关键浏览器 API 存在 + 密钥已配置 */
export function isXfIatAvailable(): boolean {
  return (
    typeof window !== 'undefined'
    && !!(window as any).crypto?.subtle
    && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    && !!(window as any).AudioContext
    && isXfIatConfigured()
  )
}

// Uint8Array → base64（分块避免 String.fromCharCode 传参过多）
function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any)
  }
  return window.btoa(binary)
}

// UTF-8 字符串 → base64（authorization 拼接串可能含非 ASCII，统一按字节编码）
function utf8ToBase64(str: string): string {
  return bytesToBase64(new TextEncoder().encode(str))
}

// 计算 base64(hmac-sha256(message, secret))
async function hmacSha256Base64(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(secret) as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await window.crypto.subtle.sign('HMAC', key, enc.encode(message) as unknown as BufferSource)
  return bytesToBase64(new Uint8Array(sig))
}

// 组装带鉴权参数的 wss 调用地址（date 用 RFC1123 GMT，toUTCString 即为该格式）
async function buildAuthUrl(apiKey: string, apiSecret: string): Promise<string> {
  const date = new Date().toUTCString()
  const signatureOrigin = `host: ${XF_IAT_HOST}\ndate: ${date}\nGET ${XF_IAT_PATH} HTTP/1.1`
  const signature = await hmacSha256Base64(signatureOrigin, apiSecret)
  const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`
  const authorization = utf8ToBase64(authorizationOrigin)
  const query = `authorization=${authorization}&date=${encodeURIComponent(date)}&host=${XF_IAT_HOST}`
  return `wss://${XF_IAT_HOST}${XF_IAT_PATH}?${query}`
}

// Float32 降采样到目标采样率（区间均值，兼作简单抗混叠）
function downsample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (toRate >= fromRate) return input
  const ratio = fromRate / toRate
  const outLen = Math.floor(input.length / ratio)
  const out = new Float32Array(outLen)
  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * ratio)
    const end = Math.max(Math.floor((i + 1) * ratio), start + 1)
    let sum = 0
    let count = 0
    for (let j = start; j < end && j < input.length; j++) {
      sum += input[j]
      count++
    }
    out[i] = count > 0 ? sum / count : 0
  }
  return out
}

// Float32 [-1,1] → Int16 小端 PCM 字节，追加进待发队列
function appendPcm(queue: number[], samples: Float32Array): void {
  for (let i = 0; i < samples.length; i++) {
    let s = samples[i]
    s = s < -1 ? -1 : s > 1 ? 1 : s
    const v = s < 0 ? s * 0x8000 : s * 0x7fff
    const int16 = Math.round(v) & 0xffff
    queue.push(int16 & 0xff)
    queue.push((int16 >> 8) & 0xff)
  }
}

// 讯飞返回的一帧 result.ws 拼成文本
function wsToText(ws: Array<{ cw?: Array<{ w?: string; }>; }>): string {
  if (!Array.isArray(ws)) return ''
  return ws.map(item => (item.cw || []).map(cw => cw.w || '').join('')).join('')
}

export class XfIatRecognizer {
  private ws: WebSocket | null = null
  private audioCtx: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private sendTimer: number | null = null
  private maxTimer: number | null = null
  private byteQueue: number[] = []
  // 动态修正：按 sn 序号存分段文本，rpl 时删除被替换区段，最终按 sn 顺序拼接
  private parts = new Map<number, string>()
  private firstFrameSent = false
  private stopping = false
  private ended = false
  private callbacks: XfIatCallbacks | null = null

  // 启动一次识别会话；返回的 Promise 在「握手 + 麦克风就绪」后 resolve，
  // 识别结果与结束/错误通过 callbacks 异步回调
  async start(callbacks: XfIatCallbacks): Promise<void> {
    if (this.ended || this.ws) {
      // 复用实例前应先 stop()/销毁；此处直接拒绝重复启动
      this.callbacks = callbacks
      return
    }
    this.callbacks = callbacks
    this.parts.clear()
    this.byteQueue = []
    this.firstFrameSent = false
    this.stopping = false
    this.ended = false

    if (!window.isSecureContext) {
      this.fail('当前页面非安全上下文，浏览器禁止访问麦克风（请用 HTTPS 或 localhost 打开）')
      return
    }
    if (!isXfIatConfigured()) {
      this.fail('语音识别未配置：缺少讯飞 AppID / APIKey / APISecret')
      return
    }

    let authUrl: string
    try {
      authUrl = await buildAuthUrl(
        import.meta.env.VITE_APP_XF_IAT_API_KEY,
        import.meta.env.VITE_APP_XF_IAT_API_SECRET,
      )
    } catch (e) {
      this.fail('语音识别鉴权失败')
      return
    }

    // 先申请麦克风（会弹授权），失败直接返回，避免白连 WS
    // 单声道 + 回声消除 + 降噪；noiseSuppression 在本项目 DOM 类型未声明，故断言绕过多余属性检查
    try {
      const audioConstraints = {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      } as MediaTrackConstraints
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints })
    } catch (e) {
      this.fail('麦克风权限被拒绝或不可用，请在浏览器地址栏设置中允许后重试')
      return
    }

    try {
      await this.openSocket(authUrl)
    } catch (e) {
      this.cleanup()
      this.notifyEnd()
    }
  }

  // 建立 WS，握手成功（onopen）后开始采集音频
  private openSocket(authUrl: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let settled = false
      const ws = new WebSocket(authUrl)
      this.ws = ws

      const opened = () => {
        if (settled) return
        settled = true
        clearTimeout(guard)
        resolve()
        // 连接就绪：启动音频采集与分帧上行（含 AudioContext resume，异步）
        void this.startCapturePipeline()
      }
      const failed = () => {
        if (settled) return
        settled = true
        clearTimeout(guard)
        reject(new Error('websocket handshake failed'))
      }
      // 握手无 onerror 兜底的极端情况：3s 未 open 视为失败
      const guard = window.setTimeout(failed, 3000)

      ws.onopen = opened
      ws.onerror = () => {
        this.callbacks?.onError('无法连接讯飞语音识别服务，请检查网络或防火墙')
        failed()
      }
      ws.onclose = () => {
        // 未建立就关闭走 reject；已建立后关闭由 handleServerMessage/正常收尾处理
        if (!settled) failed()
        else this.finish()
      }
      ws.onmessage = ev => this.handleServerMessage(ev)
    })
  }

  // 启动采集链路：建节点 → resume AudioContext → 开始分帧上行。
  // 关键修复：AudioContext 在脱离用户手势（await getUserMedia 之后）创建会处于 suspended，
  // 不 resume 则 onaudioprocess 永不触发，一个字节也采不到 → 讯飞不回字。
  private async startCapturePipeline(): Promise<void> {
    try {
      this.setupAudio()
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume()
      }
      this.startSending()
      this.startMaxSessionGuard()
      this.startNoAudioWatchdog()
    } catch (e) {
      this.callbacks?.onError('音频采集启动失败，请重试')
      this.abort()
    }
  }

  // 看门狗：连接就绪但 4s 内仍未发出任何音频帧 → 基本是麦克风未真正采集（设备/权限/挂起），
  // 主动报错并中止，避免用户对着静音麦克风干等
  private startNoAudioWatchdog(): void {
    window.setTimeout(() => {
      if (!this.ended && !this.firstFrameSent) {
        this.callbacks?.onError('未采集到麦克风音频，请检查系统输入设备或更换麦克风后重试')
        this.abort()
      }
    }, 4000)
  }

  private setupAudio(): void {
    const AudioCtor = (window as any).AudioContext
    this.audioCtx = new AudioCtor()
    this.source = this.audioCtx!.createMediaStreamSource(this.mediaStream!)
    // ScriptProcessor 虽已标记废弃，但兼容性最好、无需外部 worklet 文件，适合内联采集
    this.processor = this.audioCtx!.createScriptProcessor(4096, 1, 1)
    this.processor.onaudioprocess = (e: AudioProcessingEvent) => {
      if (this.stopping || this.ended) return
      const input = e.inputBuffer.getChannelData(0)
      const down = downsample(input, this.audioCtx!.sampleRate, TARGET_SAMPLE_RATE)
      appendPcm(this.byteQueue, down)
    }
    this.source.connect(this.processor)
    // processor 需接到 destination 才会触发 onaudioprocess；接静音节点避免回声监听
    const silent = this.audioCtx!.createGain()
    silent.gain.value = 0
    this.processor.connect(silent)
    silent.connect(this.audioCtx!.destination)
  }

  private startSending(): void {
    this.sendTimer = window.setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
      // 攒够一帧再发，避免过小帧；停止时把不足一帧的余量也发出
      if (this.byteQueue.length < FRAME_BYTES && !(this.stopping && this.byteQueue.length > 0)) {
        return
      }
      const take = Math.min(this.byteQueue.length, FRAME_BYTES)
      const frame = new Uint8Array(this.byteQueue.splice(0, take))
      this.sendAudioFrame(frame)
      // 请求停止且队列已排空 → 发结束帧收尾
      if (this.stopping && this.byteQueue.length === 0) {
        this.sendEndFrame()
      }
    }, SEND_INTERVAL_MS)
  }

  private sendAudioFrame(frame: Uint8Array): void {
    const payload: Record<string, any> = {
      data: {
        status: this.firstFrameSent ? 1 : 0,
        format: 'audio/L16;rate=16000',
        encoding: 'raw',
        audio: bytesToBase64(frame),
      },
    }
    if (!this.firstFrameSent) {
      // 首帧携带公共 + 业务参数（dwa=wpgs 开启动态修正，ptt=1 加标点）
      payload.common = { app_id: import.meta.env.VITE_APP_XF_IAT_APPID }
      payload.business = {
        language: 'zh_cn',
        domain: 'iat',
        accent: 'mandarin',
        dwa: 'wpgs',
        ptt: 1,
      }
      this.firstFrameSent = true
    }
    this.ws?.send(JSON.stringify(payload))
  }

  private sendEndFrame(): void {
    if (this.sendTimer !== null) {
      clearInterval(this.sendTimer)
      this.sendTimer = null
    }
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    // 数据结束标识：status=2，最后一帧必须发送
    this.ws.send(JSON.stringify({
      data: {
        status: 2,
        format: 'audio/L16;rate=16000',
        encoding: 'raw',
      },
    }))
  }

  private startMaxSessionGuard(): void {
    this.maxTimer = window.setTimeout(() => {
      // 达时长上限：主动停止（发结束帧），等待服务端定稿帧后关闭
      this.stop()
    }, MAX_SESSION_MS)
  }

  private handleServerMessage(ev: MessageEvent): void {
    let resp: any
    try {
      resp = JSON.parse(ev.data as string)
    } catch (e) {
      return
    }
    if (resp.code !== 0) {
      this.callbacks?.onError(`语音识别出错（${resp.code}）：${resp.message || '未知错误'}`)
      this.abort()
      return
    }
    const result = resp.data?.result
    if (result) {
      const sn: number = result.sn
      const text = wsToText(result.ws)
      if (result.pgs === 'rpl' && Array.isArray(result.rg)) {
        // 替换 [rg0, rg1] 区段的旧分段
        for (let i = result.rg[0]; i <= result.rg[1]; i++) this.parts.delete(i)
      }
      this.parts.set(sn, text)
      const full = [...this.parts.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(entry => entry[1])
        .join('')
      this.callbacks?.onResult(full, false)
    }
    // data.status=2：识别结果全部返回，可安全关闭连接
    if (resp.data?.status === 2) {
      this.finish()
    }
  }

  /**
   * 正常停止：停止采集 → 排空缓冲 → 发结束帧 → 等服务端定稿帧（或 2s 超时）后关闭。
   * 已识别文本保留。
   */
  stop(): void {
    if (this.ended) return
    this.stopping = true
    // 若一帧都未发出（用户点了立刻停），直接收尾，避免发不出结束帧卡住
    if (!this.firstFrameSent) {
      this.finish()
      return
    }
    window.setTimeout(() => {
      if (!this.ended) this.finish()
    }, 2000)
  }

  /** 立即中止：不等待收尾，直接关闭并释放麦克风（关窗 / 卸载 / 发送时用） */
  abort(): void {
    if (this.ended) return
    this.ended = true
    this.stopping = true
    this.cleanup()
    try {
      this.ws?.close(1000)
    } catch (e) {
      // 忽略关闭异常
    }
    this.ws = null
    this.notifyEnd()
  }

  // 收到定稿帧或连接关闭：正常收尾
  private finish(): void {
    if (this.ended) return
    this.ended = true
    this.cleanup()
    try {
      if (this.ws && this.ws.readyState <= WebSocket.CLOSING) this.ws.close(1000)
    } catch (e) {
      // 忽略
    }
    this.ws = null
    this.notifyEnd()
  }

  private cleanup(): void {
    if (this.sendTimer !== null) {
      clearInterval(this.sendTimer)
      this.sendTimer = null
    }
    if (this.maxTimer !== null) {
      clearTimeout(this.maxTimer)
      this.maxTimer = null
    }
    try {
      this.processor?.disconnect()
      this.source?.disconnect()
      if (this.audioCtx && this.audioCtx.state !== 'closed') void this.audioCtx.close()
    } catch (e) {
      // 忽略释放异常
    }
    this.processor = null
    this.source = null
    this.audioCtx = null
    // 关键：停止所有音轨，否则系统麦克风指示灯常亮
    this.mediaStream?.getTracks().forEach(track => track.stop())
    this.mediaStream = null
  }

  private notifyEnd(): void {
    this.callbacks?.onEnd()
  }

  // 启动前置校验失败：无连接可关，仅回调错误 + 结束
  private fail(message: string): void {
    this.ended = true
    this.callbacks?.onError(message)
    this.callbacks?.onEnd()
  }
}
