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
          class="admin-entry-btn"
          title="后台配置"
          @click="openBackendConfig"
        >
          <IconSettings />
        </button>
      </template>
    </DifyRealDialog>

    <BackendConfigDialog v-model:visible="backendConfigVisible" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import DifyRealDialog from '@/components/dify-chatbot/DifyRealDialog.vue'
import BackendConfigDialog from './BackendConfigDialog.vue'
import { IconSettings } from '@/icons'

export default defineComponent({
  name: 'Main',
  components: {
    DifyRealDialog,
    BackendConfigDialog,
    IconSettings,
  },
  setup() {
    // 对话窗始终内嵌显示
    const showDialog = ref(true)
    const backendConfigVisible = ref(false)
    const openBackendConfig = () => {
      backendConfigVisible.value = true
    }
    return {
      showDialog,
      backendConfigVisible,
      openBackendConfig,
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

/* 后台配置入口按钮：与 DifyRealDialog 内 .sidebar-toggle-btn 完全同款。
   按钮通过 #header-actions 插槽渲染在 .custom-dialog 内部，
   可直接继承 --chat-primary / --chat-primary-soft 主题变量与 --chat-font-scale 字号缩放 */
.admin-entry-btn {
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

.admin-entry-btn:hover {
  background-color: var(--chat-primary-soft, #eef4ff);
  color: var(--chat-primary, #2f6bff);
}

.admin-entry-btn svg {
  width: calc(18px * var(--chat-font-scale, 1));
  height: calc(18px * var(--chat-font-scale, 1));
}
</style>
