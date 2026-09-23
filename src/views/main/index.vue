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
    />

    <!-- 后台配置层面入口：右上角悬浮图标按钮（同对话窗「收起会话列表」样式），唤起 BackendConfigDialog -->
    <div class="admin-entry">
      <button
        type="button"
        class="admin-entry-btn"
        title="后台配置"
        @click="openBackendConfig"
      >
        <IconSettings />
      </button>
    </div>

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

.admin-entry {
  position: absolute;
  top: 16px;
  right: 20px;
  z-index: 100;
}

/* 与 DifyRealDialog 内 .sidebar-toggle-btn 同款的圆角图标按钮；
   该按钮在 .custom-dialog 之外，取不到 --chat-* CSS 变量，故直接写死同款色值 */
.admin-entry-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: #7d8b9f;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.admin-entry-btn:hover {
  background-color: #eef4ff;
  color: #2f6bff;
}

.admin-entry-btn svg {
  width: 18px;
  height: 18px;
}
</style>
