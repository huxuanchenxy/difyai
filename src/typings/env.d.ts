interface ImportMetaEnv {
  VITE_PUBLIC_PATH: string
  VITE_APP_BASE_API: string
  VITE_APP_QINIU_AK: string
  VITE_APP_QINIU_SK: string
  VITE_APP_QINIU_BUCKET: string
  VITE_APP_QINIU_UPLOAD: string
  VITE_APP_QINIU_UPLOADCOVER: string
  VITE_APP_QINIU_IMAGE: string
  VITE_APP_CDN: string
  VITE_APP_COVID_POINT_DETAIL_API: string
  VITE_APP_SERVER_PORT: string
  VITE_APP_SERVER_HOST: string
  VITE_APP_IC_PORT: string
  VITE_APP_IC_HOST: string
  VITE_APP_WS_HOST: string
  VITE_APP_WS_PORT: string
  VITE_App_AGENT_TOKEN: string
  VITE_APP_APIMANAGE_GETTOKEN: string
  VITE_APP_API_Host: string
  VITE_APP_API_Port: string

  // 文件类型 → 查看器 base（AI 结果表格文件路径链接化；未配置则为空字符串）
  VITE_APP_MARKDOWN_LINK_BASE: string
  VITE_APP_PDF_LINK_BASE: string
  VITE_APP_IMAGE_LINK_BASE: string
  VITE_APP_VIDEO_LINK_BASE: string

  // Dify AI 对话配置
  VITE_APP_DIFY_API_KEY: string
  VITE_APP_DIFY_API_KEY_FLOW3: string // 新程序专用 API Key
  VITE_APP_DIFY_API_KEY_FLOW4: string // difyapidialog 专用 API Key 演示专用一次生成环保
  VITE_APP_DIFY_API_KEY_FLOWa1: string // difyapidialog 专用 API Key (sendMessage4 FLOWa1)
  VITE_APP_DIFY_API_KEY_FLOWb1: string // difyapidialog 专用 API Key (sendMessage5v1 FLOWb1)
  VITE_APP_DIFY_API_KEY_FLOWb2: string // difyapidialog 专用 API Key (sendMessage5v2 FLOWb2)
  VITE_APP_DIFY_API_KEY_FLOWb3: string // difyapidialog 专用 API Key (sendMessage5v2 FLOWb3)
  VITE_APP_DIFY_API_KEY_FLOW_getway: string // difyapidialog 专用 API Key (getway)
  VITE_APP_DIFY_API_KEY_FLOW_WATER: string // 水务专用 API Key
  VITE_APP_DIFY_WATER_SERVICE_MODE: string // 水务业务模式开关
  VITE_APP_DIFY_SSE_TIMEOUT_MS: string // SSE 连接超时时间
  VITE_APP_DIFY_STEP2_TRANSFER_MODE: string // 步骤2传输模式
  VITE_APP_DIFY_BASE_URL: string
  VITE_APP_DIFY_USER_ID: string // Dify 用户ID（用于对话标识）
  VITE_APP_DIFY_SESSION_HOST: string // 会话历史服务地址
  VITE_APP_DIFY_WS_HOST: string // 对话 WebSocket 服务地址
  VITE_APP_DIFY_UPLOAD_HOST: string // 附件上传服务地址（/api/file/upload/batch）
  VITE_APP_DIFY_SRC_SYSTEM: string // 组态侧鉴权来源系统标识（X-Src-System）

  // MCP 图片服务地址（后端 answer 中 http://YOUR_SERVER_IP:MCP_PORT/images/xxx.png 占位符的真实值）
  VITE_APP_MCP_HOST: string
  VITE_APP_MCP_PORT: string
}
