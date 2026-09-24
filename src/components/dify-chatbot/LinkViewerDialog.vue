<template>
  <Teleport to="body">
    <transition name="link-viewer-fade">
      <div
        v-if="visible"
        class="link-viewer-mask"
        :style="maskStyle"
        @mousedown.self="handleClose"
      >
        <div class="link-viewer-dialog">
          <div class="link-viewer-header">
            <div class="link-viewer-title">
              <span class="title-icon">🔗</span>
              <span class="title-text" :title="title || url">{{ title || url }}</span>
            </div>
            <div class="link-viewer-actions">
              <a
                class="header-btn"
                :href="url"
                target="_blank"
                rel="noopener noreferrer"
                title="在新标签页中打开"
              >↗ 新窗口</a>
              <button
                class="header-btn"
                title="复制链接地址"
                @click="copyLink"
              >
                ⧉ 复制链接
              </button>
              <button class="header-btn close-btn" title="关闭 (Esc)" @click="handleClose">
                ✕
              </button>
            </div>
          </div>
          <div class="link-viewer-body">
            <div v-if="loading" class="link-viewer-loading">
              <span class="loading-spinner"></span>
              <span class="loading-text">内容加载中…</span>
            </div>
            <iframe
              :src="url"
              class="link-viewer-iframe"
              frameborder="0"
              allowfullscreen
              @load="loading = false"
            ></iframe>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch, onUnmounted } from 'vue'

export default defineComponent({
  name: 'LinkViewerDialog',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    // 要在弹层内嵌展示的链接地址（http/https）
    url: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      default: '',
    },
    // 遮罩层级：默认 10001（高于对话窗 wrapper 的 10000），宿主层级更高时可传入
    zIndex: {
      type: Number,
      default: null,
    },
  },
  emits: ['update:visible'],
  setup(props, { emit }) {
    const maskStyle = computed(() =>
      props.zIndex !== null ? { zIndex: props.zIndex } : {},
    )

    // 每次打开重置加载态（iframe load 事件再次关闭）
    const loading = ref(false)
    watch(
      () => props.visible,
      val => {
        if (val) loading.value = true
      },
    )

    const handleClose = () => {
      emit('update:visible', false)
    }

    const copyLink = async () => {
      try {
        await navigator.clipboard.writeText(props.url)
      } catch (e) {
        // 非安全上下文（http 页面）下 clipboard 不可用，退化用 execCommand 复制
        const input = document.createElement('input')
        input.value = props.url
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
      }
    }

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && props.visible) {
        handleClose()
      }
    }
    document.addEventListener('keydown', onKeydown)
    onUnmounted(() => {
      document.removeEventListener('keydown', onKeydown)
    })

    return {
      maskStyle,
      loading,
      handleClose,
      copyLink,
    }
  },
})
</script>

<style scoped>
.link-viewer-mask {
  position: fixed;
  inset: 0;
  /* 需高于对话窗 wrapper(z-index: 10000)，与 MdEditorDialog 同层 */
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
}

.link-viewer-dialog {
  /* 弹层占视口 90% */
  display: flex;
  flex-direction: column;
  width: 90vw;
  height: 90vh;
  overflow: hidden;
  background-color: #fff;
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.25);
}

.link-viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(90deg, #f8fafc 0%, #eff6ff 100%);
}

.link-viewer-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.link-viewer-title .title-text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.title-icon {
  font-size: 17px;
  flex-shrink: 0;
}

.link-viewer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.header-btn {
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background-color: #fff;
  color: #334155;
  font-size: 13px;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
}

.header-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

.header-btn.close-btn {
  width: 30px;
  padding: 0;
  justify-content: center;
  font-size: 14px;
  color: #94a3b8;
}

.header-btn.close-btn:hover {
  border-color: #ef4444;
  color: #ef4444;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.15);
}

.link-viewer-body {
  position: relative;
  flex: 1;
  min-height: 0;
}

.link-viewer-iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: none;
  background-color: #fff;
}

.link-viewer-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background-color: #f8fafc;
  color: #64748b;
  font-size: 13px;
  z-index: 1;
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #dbeafe;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: link-viewer-spin 0.8s linear infinite;
}

@keyframes link-viewer-spin {
  to {
    transform: rotate(360deg);
  }
}

.link-viewer-fade-enter-active,
.link-viewer-fade-leave-active {
  transition: opacity 0.25s ease;
}

.link-viewer-fade-enter-active .link-viewer-dialog,
.link-viewer-fade-leave-active .link-viewer-dialog {
  transition: transform 0.25s ease;
}

.link-viewer-fade-enter-from,
.link-viewer-fade-leave-to {
  opacity: 0;
}

.link-viewer-fade-enter-from .link-viewer-dialog,
.link-viewer-fade-leave-to .link-viewer-dialog {
  transform: scale(0.96) translateY(8px);
}
</style>
