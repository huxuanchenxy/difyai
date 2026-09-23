import { ref } from 'vue'
import { login, logout, getInfo, getRolePermissions } from '@/api/user'
import { setToken, removeToken, removeIframe, setMainMenu, setProjectMenu, removeMainMenu, removeProjectMenu } from '@/utils/token-util'

interface tokenModel {
  access_token: string
  expires_in: number
  isAdmin: number
  refresh_expires_in: number
  refresh_token: string
}

export class passwordExpiryError extends Error {
  constructor(message: string) {
    super(message)
  }
}

const token = ref('')
const name = ref('')
const avatar = ref('')
const role = ref(-1)

export const UserStore = () => {
  const doLogin = async (username: string, password: string, code: string) => {
    try {
      const res = await login(username, password, code)
      if (res.data.code === 200) {
        const model = res.data.data as tokenModel
        token.value = model.access_token
        setToken(model.access_token, model.expires_in)
      } else if (res.data.code === 501) {
        throw new passwordExpiryError(res.data.msg)
      } else {
        throw Error(res.data.msg)
      }
    } catch (error) {
      throw error
    }
  }

  const getRoleMenu = async () => {
    try {
      const res = await getRolePermissions()
      if (res.data.code === 200) {
        const { data } = res.data
        const mainMenu = JSON.stringify(data['一级菜单'])
        const projectMenu = JSON.stringify(data['二级菜单'])
        setMainMenu(mainMenu)
        setProjectMenu(projectMenu)
      } else {
        throw Error(res.data.message)
      }
    } catch (error) {
      throw error
    }
  }

  const getUserInfo = async () => {
    try {
      const res = await getInfo()
      if (res.data.code === 200) {
        const { data } = res.data
        name.value = data.name
        avatar.value = data.avatar
        role.value = data.role
      } else {
        throw Error(res.data.message)
      }
    } catch (error) {
      throw error
    }
  }

  const resetToken = () => {
    token.value = ''
    removeToken()
  }

  const doLogout = async () => {
    try {
      await logout()
    } finally {
      removeIframe()
      resetToken()
      removeMainMenu()
      removeProjectMenu()
    }
  }

  return {
    token,
    name,
    avatar,
    role,
    doLogin,
    getUserInfo,
    resetToken,
    doLogout,
    getRoleMenu,
  }
}
