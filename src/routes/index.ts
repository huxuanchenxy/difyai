import * as loginJson from '@/../public/templates/login.json'

import { RouteRecordRaw, createRouter, createWebHashHistory } from 'vue-router'

import { getToken } from '@/utils/token-util'
import { globalConfig } from '@/config'
import { loginSettingModel } from './loginSettingModel'

const setting = loginJson.default as unknown as loginSettingModel

const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/login.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/updatePassword',
    name: 'UpdatePassword',
    component: () => import('@/views/login/updatePassword.vue'),
    meta: { title: '更新登录密码' },
    props: true,
  },
  {
    // 应用主页面：DifyRealDialog（应用层）+ 后台配置入口（BackendConfigDialog）
    path: '/',
    name: 'Main',
    component: () => import('@/views/main/index.vue'),
    meta: { title: 'AI 助手' },
  },
  {
    path: '/:catchAll(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

const whiteList = ['/login', '/updatePassword']

router.beforeEach(async (to, from, next) => {
  if (to.meta && to.meta.title) {
    document.title = `${to.meta.title} | ${globalConfig.title}`
  } else {
    document.title = globalConfig.title
  }

  if (setting.needLogin) {
    const hasToken = getToken()
    if (hasToken) {
      if (to.path === '/login') {
        next({ path: '/' })
      } else {
        next()
      }
    } else if (whiteList.some(m => to.path.startsWith(m))) {
      next()
    } else {
      next(`/login?redirect=${to.path}`)
    }
  } else {
    next()
  }
})

export default router
