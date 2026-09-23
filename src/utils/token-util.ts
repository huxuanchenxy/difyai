import { DEFAULT_ATTRIBUTES, getCookie, removeCookie, setCookie } from 'typescript-cookie'

const TokenKey = 'DataS-Token'

const ProjectKey = 'DataS-Project'
const isIdeKey = 'DataS-isIde'

const isIframe = 'DataS-isIframe'

const MainMenuKey = 'DataS-MainMenu'
const ProjectMenuKey = 'DataS-ProjectMenu'

export function getToken() {
  return localStorage.getItem(TokenKey)
  //return getCookie(TokenKey);
}

export function setToken(token: string, expirySecond?: number) {
  return localStorage.setItem(TokenKey, token)
}

export function removeToken() {
  localStorage.removeItem(TokenKey)
}

export function getProjectId() {
  return localStorage.getItem(ProjectKey)
}

export function getisIframe() {
  return localStorage.getItem(isIframe)
}

export function setisIframe(status: string) {
  return localStorage.setItem(isIframe, status)
}

export function removeIframe() {
  localStorage.removeItem(isIframe)
}

export function getisIde() {
  return localStorage.getItem(isIdeKey)
}

export function setProjectId(projectId: number, expirySecond?: number) {
  return localStorage.setItem(ProjectKey, projectId.toString())
}

export function setisIde(isIde: number, expirySecond?: number) {
  const expiryday = expirySecond / 60 / 60 / 24
  return localStorage.setItem(isIdeKey, isIde.toString())
}

export function removeProjectId() {
  localStorage.removeItem(ProjectKey)
}


export function getMainMenu() {
  return localStorage.getItem(MainMenuKey)
  //return getCookie(TokenKey);
}

export function setMainMenu(menu: string) {
  return localStorage.setItem(MainMenuKey, menu)
}

export function removeMainMenu() {
  localStorage.removeItem(MainMenuKey)
}


export function getProjectMenu() {
  return localStorage.getItem(ProjectMenuKey)
  //return getCookie(TokenKey);
}

export function setProjectMenu(menu: string) {
  return localStorage.setItem(ProjectMenuKey, menu)
}

export function removeProjectMenu() {
  localStorage.removeItem(ProjectMenuKey)
}

// ===== 发布页（#/publish/:screenId?token=xxx）匿名访问判定 =====
// 实现统一收敛在 @/utils/dify-publish（供 ai-dify-real / ai-dify-demo 等 datav wrapper 复用，
// 避免把路由 / URL 嗅探逻辑塞进纯展示组件 DifyRealDialog）。这里只做转出，防止两份实现漂移。
export { getCurrentHashPath, isPublishPage, getPublishToken, getAnonymousToken } from './dify-publish'
