/**
 * 匿名访问：URL token 的有效性校验。
 *
 * 背景：
 * - 免登录 URL（/#/?token=xxx）上的 token 来自 VITE_APP_ANONYMOUS_TOKEN，直接作为鉴权凭证；
 * - 进入页面前先用该 token 调 GET /api/oauth/checkToken 校验有效性，code=200 视为匿名登录成功，
 *   否则由调用方（views/main/index.vue）跳回登录页。
 *
 * 设计约束：
 * - 仅 URL 上带 ?token 时才会走本流程；不带 token（正常登录态）绝不进入，
 *   原有鉴权逻辑保持不变（由调用方 main/index.vue 决定是否调用）。
 */
import { difyRequest } from './dify-request'
import { getIcApiUrl } from './apiUrl'
import { getUrlSrcSystem } from './token-util'

/**
 * checkToken 校验结果。
 * - valid=true：code=200，token 有效；
 * - valid=false：token 无效或接口异常，调用方依据 code 决定后续动作——
 *   code=401 视为鉴权失效跳登录，其它 code（如 500）视为业务/服务异常弹错误提示。
 */
export interface TokenCheckResult {
  valid: boolean
  // 业务码（HTTP 2xx 时取响应体 code；非 2xx 时取 HTTP 状态码；网络异常无响应体时为 undefined）
  code?: number
  // 后端错误文案，用于弹提示；缺失时由调用方兜底
  msg?: string
}

// 从 checkToken 的 axios 成功响应中解析校验结果：优先响应体 code，缺省视为 200
const parseCheckTokenResult = (data?: { code?: number; msg?: string; message?: string; }): TokenCheckResult => {
  const code = data?.code
  const valid = code === undefined || code === 200
  return { valid, code, msg: data?.msg || data?.message }
}

// 从 checkToken 抛出的错误中解析校验结果：
// - 有响应体且带业务 code（如 HTTP 200 但 body code=500 被拦截器抛出，或后端以非 2xx 承载 body）→ 以 body code 为准；
// - 否则取 HTTP 状态码；
// - 网络异常（无响应）→ code 为 undefined，调用方按非鉴权异常处理。
const parseCheckTokenError = (err: any): TokenCheckResult => {
  const httpStatus: number | undefined = err?.response?.status
  const body = err?.response?.data as { code?: number; msg?: string; message?: string; } | undefined
  // 业务码优先（后端可能把 401/500 挂在响应体 code 上），无业务码回退 HTTP 状态码
  const code = body?.code ?? httpStatus
  return { valid: false, code, msg: body?.msg || body?.message || err?.message }
}

/**
 * 匿名登录前置校验：GET /api/oauth/checkToken（IC 网关）。
 *
 * 需求：URL 带 ?token 时先校验该 token 是否有效，后端返回 code=200 视为匿名登录成功；
 * 否则（非 200 / 网络异常 / 无响应体）由调用方（views/main/index.vue）跳回登录页。
 *
 * 用纯净实例 difyRequest + 绝对地址：
 * - 不能复用 @/utils/ic-request，其请求拦截器会把 token 头覆盖成 localStorage 的 DataS-Token
 *   （匿名态该值为空），且响应拦截器在 401/403 时会 removeToken + push('/login')，与匿名校验语义冲突；
 * - checkToken 走 IC 网关（与 /api/oauth/login、/api/oauth/getUser 同域），故 base 取 getIcApiUrl('')。
 * token 同时以请求头与查询参数下发，兼容后端两种取值方式；本体仍由 header 承载（与网关其余 oauth 接口一致）。
 */
export const verifyAnonymousToken = async (urlToken: string): Promise<TokenCheckResult> => {
  const raw = (urlToken || '').trim()
  // 无 token：视为鉴权失效（code=401），保持原有跳登录语义
  if (!raw) return { valid: false, code: 401 }
  const base = getIcApiUrl('')
  const reqUrl = `${base}/api/oauth/checkToken`
  // 调试友好：把请求信息先打出来，方便核对实际下发的 token 与地址
  console.log('[anonymous-auth] checkToken 请求', { url: reqUrl, token: raw })
  try {
    const resp = await difyRequest.get(
      reqUrl,
      {
        params: { token: raw },
        headers: {
          'X-Src-System': getUrlSrcSystem(),
          token: raw,
        },
      },
    )
    const result = parseCheckTokenResult(resp?.data)
    // 打印接口真实返回体与最终判定，便于排查无效 token 的后端响应内容
    console.log('[anonymous-auth] checkToken 返回', {
      httpStatus: resp?.status,
      data: resp?.data,
      valid: result.valid,
      code: result.code,
    })
    return result
  } catch (err: any) {
    // 网络异常 / 非 2xx 也会走到这里（纯净实例无响应拦截器），尽量把后端响应体打出来
    const result = parseCheckTokenError(err)
    console.warn('[anonymous-auth] checkToken 异常，视为无效', {
      httpStatus: err?.response?.status,
      data: err?.response?.data,
      message: err?.message,
      code: result.code,
    })
    return result
  }
}

/**
 * 通用 token 有效性验证：GET /api/oauth/checkToken，code=200 返回 true。
 *
 * 可用于任意来源的 token（localStorage 登录态 / URL 匿名 token），
 * 不区分来源、仅做有效性校验。使用场景：正常登录态进入主页时前置检查，
 * 避免将已失效的本地 token 直接带入会话列表 / 历史消息等首次请求。
 */
export const checkTokenValidity = async (token: string): Promise<TokenCheckResult> => {
  const raw = (token || '').trim()
  // 无 token：视为鉴权失效（code=401），保持原有跳登录语义
  if (!raw) return { valid: false, code: 401 }
  const base = getIcApiUrl('')
  const reqUrl = `${base}/api/oauth/checkToken`
  console.log('[token-verify] checkToken 请求', { url: reqUrl })
  try {
    const resp = await difyRequest.get(reqUrl, {
      params: { token: raw },
      headers: {
        'X-Src-System': getUrlSrcSystem(),
        token: raw,
      },
    })
    const result = parseCheckTokenResult(resp?.data)
    console.log('[token-verify] checkToken 返回', {
      httpStatus: resp?.status,
      code: resp?.data?.code,
      valid: result.valid,
    })
    return result
  } catch (err: any) {
    const result = parseCheckTokenError(err)
    console.warn('[token-verify] checkToken 异常，视为无效', {
      httpStatus: err?.response?.status,
      data: err?.response?.data,
      message: err?.message,
      code: result.code,
    })
    return result
  }
}
