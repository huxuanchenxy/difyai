/**
 * Dify / 组态 AI 后端（VITE_APP_DIFY_SESSION_HOST，默认 http://10.89.34.77:8080）专用 axios 实例。
 *
 * 为什么不能复用 @/utils/request（全局实例）：
 * 1. 全局实例带 needLogin 请求拦截器，会执行 `config.headers.post.token = getToken()`，
 *    强制把 token 头覆盖成 localStorage 的 DataS-Token。发布页匿名访问时该值为空或已失效，
 *    会把 URL 上的匿名 token 冲掉，导致上传 / 会话接口 401。
 * 2. 全局实例响应拦截器在 401/403 时会 removeToken() + router.push('/login')，
 *    匿名用户会被误踢到登录页。
 * 3. 全局实例有 baseURL（dashboard 网关），且响应拦截器要求 `code === 200` 才放行，
 *    与 Dify 后端的 { code, msg, data } 约定不一定一致，容易把正常响应判成失败。
 *
 * 因此这里用纯净实例：无 baseURL（各调用方自带绝对地址）、无拦截器，
 * 错误一律交给调用方自行处理。
 */
import axios from 'axios'

export const difyRequest = axios.create({
  timeout: 300000,
  withCredentials: false,
})

export default difyRequest
