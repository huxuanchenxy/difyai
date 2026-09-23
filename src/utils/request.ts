import axios from 'axios'
import { getToken } from './token-util'

import * as loginJson from '@/../public/templates/login.json'
import { loginSettingModel } from '../routes/loginSettingModel'
import { getIcApiUrl } from './apiUrl'

import router from '@/routes/index'
import { removeToken } from './token-util'

const setting = loginJson.default as unknown as loginSettingModel

/**
 * dashboard 主服务（网关）专用 axios 实例。
 * 与 difyai 的关系：登录 / 权限等接口走 IC 网关，主业务接口保留此实例以兼容迁移过来的模块。
 */
const instance = axios.create({
  baseURL: getIcApiUrl('dashboard'),
  timeout: 300000,
  withCredentials: false,
})

// request interceptor
instance.interceptors.request.use(
  config => {
    if (setting.needLogin) {
      const token = getToken()
      config.headers.post.token = token
      config.headers.get.token = token
    }
    return config
  },
  error => {
    return Promise.reject(error)
  },
)

// response interceptor
instance.interceptors.response.use(
  response => {
    const res = response.data
    if (res.code !== undefined && res.code !== 200) {
      let msg = ''
      if (res.message) {
        msg = res.message
      } else if (res.msg) {
        msg = res.msg
      } else {
        msg = 'System Error'
      }
      return Promise.reject(new Error(msg))
    }
    return response
  },
  error => {
    const status = error?.response?.status
    if (status === 403 || status === 401) {
      removeToken()
      if (router.currentRoute.value.path !== '/login') {
        router.push({ path: '/login', query: { redirect: router.currentRoute.value.fullPath } })
      }
      return Promise.reject({ data: { code: status, message: '登录失效，请重新登录' } })
    }
    return Promise.reject(error)
  },
)

export default instance
