/**
 * 发布页（#/publish/:screenId?token=xxx）匿名访问相关的运行时判定与取值。
 *
 * 抽成独立 util，供各 datav wrapper（ai-dify-real / ai-dify-demo）复用，
 * 避免把路由 / URL 嗅探逻辑塞进纯展示组件 DifyRealDialog：
 * wrapper 负责判断当前是否匿名发布页并取出 token，再通过 prop 下发给 DifyRealDialog。
 */

// 取当前 hash 路由的 path（去掉 ? 之后的 query），如 #/publish/346?token=xxx -> /publish/346
export const getCurrentHashPath = (): string => {
  const raw = (window.location.hash || '').replace(/^#/, '')
  const qIndex = raw.indexOf('?')
  return (qIndex >= 0 ? raw.slice(0, qIndex) : raw) || '/'
}

// 是否处于发布页（匿名访问场景）：#/publish/:screenId?token=xxx
export const isPublishPage = (): boolean => getCurrentHashPath().startsWith('/publish')

// 取 URL query 上的 token（hash 路由下 query 挂在 hash 后面；URLSearchParams 会自动 decode）
export const getPublishToken = (): string => {
  const raw = (window.location.hash || '').replace(/^#/, '')
  const qIndex = raw.indexOf('?')
  const search = qIndex >= 0 ? raw.slice(qIndex + 1) : window.location.search.replace(/^\?/, '')
  if (!search) return ''
  try {
    return new URLSearchParams(search).get('token') || ''
  } catch (e) {
    return ''
  }
}

/**
 * 发布页匿名令牌：仅发布页返回 URL 上的原始 token，其余场景返回空串。
 * 空串交给 DifyRealDialog 内部回退到 localStorage（编辑器 / 后台的登录态）。
 */
export const getAnonymousToken = (): string => (isPublishPage() ? getPublishToken() : '')
