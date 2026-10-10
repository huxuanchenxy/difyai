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
export const verifyAnonymousToken = async (urlToken: string): Promise<boolean> => {
  const raw = (urlToken || '').trim()
  if (!raw) return false
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
    // 打印接口真实返回体与最终判定，便于排查无效 token 的后端响应内容
    console.log('[anonymous-auth] checkToken 返回', {
      httpStatus: resp?.status,
      data: resp?.data,
      valid: resp?.data?.code === 200,
    })
    return resp?.data?.code === 200
  } catch (err: any) {
    // 网络异常 / 非 2xx 也会走到这里（纯净实例无响应拦截器），尽量把后端响应体打出来
    console.warn('[anonymous-auth] checkToken 异常，视为无效', {
      httpStatus: err?.response?.status,
      data: err?.response?.data,
      message: err?.message,
    })
    return false
  }
}
