<template>
  <div class="difyai-main">
    <!-- 应用层：Dify 智能助手对话窗（内嵌填满页面） -->
    <DifyRealDialog
      v-model:visible="showDialog"
      title="DifyAI 智能助手"
      :inline="true"
      :fixed="true"
      role="backend_ops"
      :md-editor="true"
      md-editor-storage-key="difyai-md-doc"
    >
      <!-- 后台配置入口：插入对话窗顶栏操作区（收起会话列表按钮同排），
           与 DifyRealDialog 顶部按钮风格完全一致，随主题 / 字号缩放 -->
      <template #header-actions>
        <button
          type="button"
          class="header-icon-btn"
          title="后台配置"
          @click="openBackendConfig"
        >
          <IconSettings />
        </button>
        <button
          type="button"
          class="header-icon-btn"
          title="退出登录"
          @click="handleLogout"
        >
          <IconLogout />
        </button>
      </template>
    </DifyRealDialog>

    <BackendConfigDialog v-model:visible="backendConfigVisible" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import DifyRealDialog from '@/components/dify-chatbot/DifyRealDialog.vue'
import BackendConfigDialog from './BackendConfigDialog.vue'
import { UserStore } from '@/domains/user'
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
    // 对话窗始终内嵌显示
    const showDialog = ref(true)
    const backendConfigVisible = ref(false)
    const openBackendConfig = () => {
      backendConfigVisible.value = true
    }
    // 退出登录：二次确认后走 UserStore().doLogout（清 token / 菜单缓存），再跳登录页；
    // 服务端退出接口失败不阻塞，本地清理在 doLogout 的 finally 中已完成，照常回登录页
    const handleLogout = async () => {
      try {
        await ElMessageBox.confirm('确认退出当前账号登录？', '退出确认', {
          type: 'warning',
          confirmButtonText: '退出',
          cancelButtonText: '取消',
        })
      } catch {
        return // 取消退出
      }
      try {
        await UserStore().doLogout()
      } finally {
        router.push('/login')
      }
    }
    return {
      showDialog,
      backendConfigVisible,
      openBackendConfig,
      handleLogout,
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

/* 顶栏图标按钮（后台配置 / 退出登录）：与 DifyRealDialog 内 .sidebar-toggle-btn 完全同款。
   按钮通过 #header-actions 插槽渲染在 .custom-dialog 内部，
   可直接继承 --chat-primary / --chat-primary-soft 主题变量与 --chat-font-scale 字号缩放 */
.header-icon-btn {
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

.header-icon-btn:hover {
  background-color: var(--chat-primary-soft, #eef4ff);
  color: var(--chat-primary, #2f6bff);
}

.header-icon-btn svg {
  width: calc(18px * var(--chat-font-scale, 1));
  height: calc(18px * var(--chat-font-scale, 1));
}
</style>
