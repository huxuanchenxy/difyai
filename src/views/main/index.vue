<template>
  <div class="difyai-main">
    <!-- 应用层：Dify 智能助手对话窗（内嵌填满页面） -->
    <DifyRealDialog
      v-model:visible="showDialog"
      title="AI 智能助手"
      :inline="true"
      :fixed="true"
      role="backend_ops"
      :md-editor="true"
      md-editor-storage-key="difyai-md-doc"
      :text-welcome="false"
      :voice-input="true"
      :login-account="urlToken"
      :auth-token="urlToken"
      :anonymous="isNoAuthAccess"
    >
      <!-- 后台配置入口：插入对话窗顶栏操作区（收起会话列表按钮同排），
           与 DifyRealDialog 顶部按钮风格完全一致，随主题 / 字号缩放；
           匿名访问（免登录 URL token）无登录态，隐藏该入口 -->
      <template #header-actions>
        <button
          v-if="!isNoAuthAccess"
          type="button"
          class="chat-icon-btn"
          title="后台配置"
          @click="openBackendConfig"
        >
          <IconSettings />
        </button>
      </template>

      <!-- 退出登录：与侧栏底部用户信息（头像 / 用户名 / 角色）同排靠右；
           匿名访问（免登录 URL token）同样保留退出入口 -->
      <template #sidebar-footer>
        <button
          type="button"
          class="chat-icon-btn"
          title="退出登录"
          @click="handleLogout"
        >
          <IconLogout />
        </button>
      </template>
    </DifyRealDialog>

    <BackendConfigDialog v-model:visible="backendConfigVisible" />

    <!-- 退出确认弹窗：风格与 DifyRealDialog 内置 .dify-real-confirm 完全一致（替 ElMessageBox）。
         用 Teleport 挂到 body，确保盖在自绘对话窗（z-index 9999/10000）之上 -->
    <Teleport to="body">
      <div
        v-if="logoutConfirmVisible"
        class="dify-real-confirm-mask"
        @click.self="logoutConfirmVisible = false"
      >
        <div class="dify-real-confirm">
          <div class="dify-real-confirm__title">退出确认</div>
          <div class="dify-real-confirm__message">确认退出当前账号登录？</div>
          <div class="dify-real-confirm__actions">
            <button class="dify-real-confirm__btn cancel" @click="logoutConfirmVisible = false">取消</button>
            <button class="dify-real-confirm__btn danger" @click="confirmLogout">退出</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { useRouter } from 'vue-router'
import DifyRealDialog from '@/components/dify-chatbot/DifyRealDialog.vue'
import BackendConfigDialog from './BackendConfigDialog.vue'
import { UserStore } from '@/domains/user'
import { getUrlAuthToken } from '@/utils/token-util'
import { IconSettings, IconLogout } from '@/icons'

export default defineComponent({
  name: 'Main',
  components: {
    DifyRealDialog,
    BackendConfigDialog,
    IconSettings,
    IconLogout,
  },
  setup() {
    const router = useRouter()
    // 免登录访问：URL 上带 ?token=xxx 时，该 token 同时作为接口的 account(loginAccount) 与 token 下发，
    // 后台已有免 token 机制；无 URL token 时为空串，DifyRealDialog 自动回退 localStorage 登录态
    const urlToken = getUrlAuthToken()
    const isNoAuthAccess = !!urlToken
    // 地址栏 token 规范化：hash 路由（vue-router）用 encodeURI 序列化 query，会把 %2F/%3D 当作安全字符
    // 还原成 / 与 ==（如 owgBrqms9%2FFa4Z2Ri3iByg%3D%3D -> owgBrqms9/Fa4Z2Ri3iByg==）。
    // 这里在挂载后（晚于任何一次路由重写）用 encodeURIComponent 把 token 段还原为完整百分号编码形式，
    // 使地址栏与配置的 token 完全一致；urlToken 本身（已解码值）不变，接口鉴权用的仍是它。
    if (urlToken) {
      const exactHash = `#/?token=${encodeURIComponent(urlToken)}`
      if (window.location.hash !== exactHash) {
        window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${exactHash}`)
      }
    }
    // 对话窗始终内嵌显示
    const showDialog = ref(true)
    const backendConfigVisible = ref(false)
    const openBackendConfig = () => {
      backendConfigVisible.value = true
    }
    // 退出确认弹窗显隐（风格对齐 DifyRealDialog 自定义确认框，替 ElMessageBox）
    const logoutConfirmVisible = ref(false)
    const handleLogout = () => {
      logoutConfirmVisible.value = true
    }
    // 确认退出：走 UserStore().doLogout（清 token / 菜单缓存），再跳登录页；
    // 服务端退出接口失败不阻塞，本地清理在 doLogout 的 finally 中已完成，照常回登录页
    const confirmLogout = async () => {
      logoutConfirmVisible.value = false
      try {
        await UserStore().doLogout()
      } finally {
        if (isNoAuthAccess) {
          // 匿名访问：token 挂在 URL 上，路由守卫会因 hash 仍带 token 而把 /login 弹回 /，
          // 故直接把地址改为不带 token 的 #/login 并整页重载，确保干净退出到登录页
          window.location.hash = '#/login'
          window.location.reload()
        } else {
          router.push('/login')
        }
      }
    }
    return {
      urlToken,
      isNoAuthAccess,
      showDialog,
      backendConfigVisible,
      openBackendConfig,
      logoutConfirmVisible,
      handleLogout,
      confirmLogout,
    }
  },
})
</script>

<style scoped>
.difyai-main {
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background-color: #f6f8fc;
}

/* 对话窗宿主图标按钮（顶栏后台配置 / 侧栏底部退出登录）：
   与 DifyRealDialog 内 .sidebar-toggle-btn 完全同款。
   按钮通过插槽渲染在 .custom-dialog 内部，
   可直接继承 --chat-primary / --chat-primary-soft 主题变量与 --chat-font-scale 字号缩放 */
.chat-icon-btn {
  flex-shrink: 0;
  width: calc(30px * var(--chat-font-scale, 1));
  height: calc(30px * var(--chat-font-scale, 1));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: calc(9px * var(--chat-font-scale, 1));
  background: transparent;
  color: #7d8b9f;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.chat-icon-btn:hover {
  background-color: var(--chat-primary-soft, #eef4ff);
  color: var(--chat-primary, #2f6bff);
}

.chat-icon-btn svg {
  width: calc(18px * var(--chat-font-scale, 1));
  height: calc(18px * var(--chat-font-scale, 1));
}
</style>
