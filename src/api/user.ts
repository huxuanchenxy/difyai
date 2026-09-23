import axios from 'axios'
import requestic from '@/utils/ic-request'
import { getApiUrl } from '@/utils/apiUrl'

// 登录 / 登出 / 用户信息 / 菜单权限 / 改密：仅保留 difyai 登录模块所需接口
export function login(userName: string, password: string, code: string) {
  return requestic.post('/home/login', { userName, password, code })
}

export function updatePassword(userName: string, password: string, newpassword: string) {
  return axios.post(getApiUrl(`${import.meta.env.VITE_APP_BASE_API}/user/updatePassword`), {
    userName,
    password,
    newpassword,
  })
}

export function logout() {
  return requestic.post('/home/logout')
}

// 当前登录用户信息
export function getInfo() {
  return requestic.get('/server/authority/user/info')
}

// 查询菜单权限
export function getRolePermissions() {
  return requestic.post('/server/authority/menu/permissions', {})
}
