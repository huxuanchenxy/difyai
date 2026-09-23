import axios from 'axios'
import { getToken } from './token-util'

import * as loginJson from '@/../public/templates/login.json'
import { loginSettingModel } from '../routes/loginSettingModel'
import { getIcApiUrl } from './apiUrl'

import router from '@/routes/index'
import { removeToken } from './token-util'

const setting = loginJson.default as unknown as loginSettingModel

/**
 * IC 网关（device/dashboard 服务）专用 axios 实例。
 * 登录、登出、用户信息、菜单权限等接口都走这里。
 */
const instance = axios.create({
  baseURL: getIcApiUrl('device'),
  timeout: 120000,
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
  response => response,
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
