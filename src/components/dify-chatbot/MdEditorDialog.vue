<template>
  <Teleport to="body">
    <transition name="md-dialog-fade">
      <div
        v-if="visible"
        class="md-editor-dialog-mask"
        :class="{ 'md-mask-docked': isDocked }"
        :style="maskStyle"
        @mousedown.self="handleClose"
      >
        <div class="md-editor-dialog" :class="{ 'md-editor-dialog-docked': isDocked }" :style="dialogStyle">
          <div class="md-editor-dialog-header">
            <div class="md-editor-dialog-title">
              <span class="title-icon">📝</span>
              <span class="title-text">{{ title }}</span>
              <span v-if="dirty" class="title-dirty">未保存</span>
            </div>
            <div class="md-editor-dialog-actions">
              <button class="header-btn" title="打开本地 .md 文件" @click="openFile">📂 打开</button>
              <button class="header-btn" title="下载为 .md 文件" @click="downloadFile">⬇ 存为文件</button>
              <button class="header-btn close-btn" title="关闭 (Esc)" @click="handleClose">✕</button>
            </div>
          </div>
          <div class="md-editor-dialog-body">
            <MdEditor
              :model-value="draft"
              style="height: 100%"
              :toolbars="toolbars"
              preview-theme="default"
              @update:model-value="onInput"
            />
          </div>
          <div class="md-editor-dialog-footer">
            <!-- 字数统计使用编辑器自带的底栏显示，此处不再重复 -->
            <div class="footer-actions">
              <button class="btn btn-cancel" @click="handleClose">取消</button>
              <button class="btn btn-save" @click="handleSave">保存</button>
            </div>
          </div>
          <input
            ref="fileInputRef"
            type="file"
            accept=".md,.markdown,.txt"
            style="display: none"
            @change="handleFileChange"
          >
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted, onUnmounted } from 'vue'
// md-editor-v3@2.2.0 仅提供默认导出
import MdEditor from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { saveAs } from 'file-saver'
import type { ToolbarNames } from 'md-editor-v3/lib/MdEditor/type'

const DEFAULT_CONTENT = '# Markdown 文档\n\n在这里开始编辑...\n\n- 支持 **Markdown** 语法\n- 左侧编辑，右侧实时预览\n'

export default defineComponent({
  name: 'MdEditorDialog',
  components: {
    MdEditor,
  },
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    modelValue: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      default: 'Markdown 编辑器',
    },
    fileName: {
      type: String,
      default: 'document.md',
    },
    // 停靠锚点：三个都传入时，编辑器吸附在锚点右侧（用于紧靠 DifyApiDemoDialog），否则居中弹窗
    dockLeft: {
      type: Number,
      default: null,
    },
    dockTop: {
      type: Number,
      default: null,
    },
    dockHeight: {
      type: Number,
      default: null,
    },
    // 传入后内容自行持久化到 localStorage，宿主无需管理内容
    storageKey: {
      type: String,
      default: '',
    },
    // 遮罩层级：默认 10001（高于普通弹层）。当宿主本身是高层级 dialog（如后台配置 10300）时，
    // 需传入更大的值，否则编辑器会被宿主弹窗遮挡。
    zIndex: {
      type: Number,
      default: null,
    },
  },
  emits: ['update:visible', 'update:modelValue', 'save'],
  setup(props, { emit }) {
    const maskStyle = computed(() =>
      props.zIndex !== null ? { zIndex: props.zIndex } : {},
    )

    const isDocked = computed(
      () => props.dockLeft !== null && props.dockTop !== null && props.dockHeight !== null,
    )

    const loadContent = () => {
      if (props.storageKey) {
        return window.localStorage.getItem(props.storageKey) || props.modelValue || DEFAULT_CONTENT
      }
      return props.modelValue
    }

    const draft = ref(loadContent())
    const initial = ref(draft.value)
    const fileInputRef = ref<HTMLInputElement | null>(null)

    const dirty = computed(() => draft.value !== initial.value)

    // 停靠模式下视口尺寸变化时需重新计算宽度
    const viewportTick = ref(0)
    const onViewportResize = () => {
      viewportTick.value += 1
    }

    onMounted(() => {
      window.addEventListener('resize', onViewportResize)
    })

    const dialogStyle = computed(() => {
      // 访问 tick 以便窗口缩放时重新计算
      void viewportTick.value
      if (!isDocked.value) {
        return {}
      }
      const gap = 12
      const margin = 16
      const minWidth = 360
      // dockLeft 为对话窗右边缘，编辑器停靠其后并向右铺满至视口右侧留白处
      const available = window.innerWidth - (props.dockLeft + gap) - margin
      const width = Math.max(available, minWidth)
      return {
        left: `${props.dockLeft + gap}px`,
        top: `${props.dockTop}px`,
        height: `${props.dockHeight}px`,
        width: `${width}px`,
      }
    })

    watch(
      () => props.visible,
      val => {
        if (val) {
          // 每次打开时与外部内容同步，避免弹层内残留上次草稿
          const content = loadContent()
          draft.value = content
          initial.value = content
        }
      },
    )

    const onInput = (val: string) => {
      draft.value = val
    }

    const handleClose = () => {
      if (dirty.value && !window.confirm('当前内容尚未保存，确定要关闭吗？')) {
        return
      }
      emit('update:visible', false)
    }

    const handleSave = () => {
      if (props.storageKey) {
        window.localStorage.setItem(props.storageKey, draft.value)
      }
      emit('update:modelValue', draft.value)
      emit('save', draft.value)
      initial.value = draft.value
      emit('update:visible', false)
    }

    const openFile = () => {
      if (dirty.value && !window.confirm('打开新文件将覆盖当前未保存内容，是否继续？')) {
        return
      }
      fileInputRef.value && fileInputRef.value.click()
    }

    const handleFileChange = (event: Event) => {
      const input = event.target as HTMLInputElement
      const file = input.files && input.files[0]
      if (!file) {
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          draft.value = reader.result
        }
      }
      reader.readAsText(file, 'utf-8')
      input.value = ''
    }

    const downloadFile = () => {
      const blob = new Blob([draft.value], { type: 'text/markdown;charset=utf-8' })
      saveAs(blob, props.fileName)
    }

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    watch(
      () => props.visible,
      val => {
        if (val) {
          document.addEventListener('keydown', onKeydown)
        } else {
          document.removeEventListener('keydown', onKeydown)
        }
      },
    )

    onUnmounted(() => {
      document.removeEventListener('keydown', onKeydown)
      window.removeEventListener('resize', onViewportResize)
    })

    return {
      draft,
      dirty,
      isDocked,
      maskStyle,
      dialogStyle,
      fileInputRef,
      // 工具栏白名单：只保留常用核心功能，去掉下划线/删除线/上下标/图片/mermaid/公式/目录等低频按钮
      toolbars: [
        'bold',
        'italic',
        '-',
        'title',
        'quote',
        'unorderedList',
        'orderedList',
        '-',
        'code',
        'link',
        'table',
        '-',
        'revoke',
        'next',
        '=',
        'pageFullscreen',
        'preview',
        // ---- 以下为被排除的低频按钮，需要时去掉对应行的注释即可加回 ----
        // 'underline', // 下划线
        // 'strikeThrough', // 删除线
        // 'sub', // 下标
        // 'sup', // 上标
        // 'codeRow', // 行内代码
        // 'image', // 图片（未配置上传处理器）
        // 'mermaid', // mermaid 图表
        // 'katex', // KaTeX 公式
        // 'save', // 保存草稿到 localStorage（已由页脚保存按钮接管）
        // 'prettier', // prettier 文本美化
        // 'fullscreen', // 浏览器全屏
        // 'htmlPreview', // HTML 预览
        // 'catalog', // 目录
        // 'github', // GitHub 链接
      ] as ToolbarNames[],
      onInput,
      handleClose,
      handleSave,
      openFile,
      handleFileChange,
      downloadFile,
    }
  },
})
</script>

<style scoped>
.md-editor-dialog-mask {
  position: fixed;
  inset: 0;
  /* 需高于 DifyApiDemoDialog 的 wrapper(z-index: 10000)，否则会被对话窗压在下面 */
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
}

/* 停靠模式：不遮罩页面、不拦截事件，保证对话窗仍可操作；关闭走 ✕ / Esc / 头部开关 */
.md-mask-docked {
  background-color: transparent;
  backdrop-filter: none;
  pointer-events: none;
}

.md-editor-dialog {
  display: flex;
  flex-direction: column;
  width: min(1000px, 92vw);
  height: min(680px, 88vh);
  overflow: hidden;
  background-color: #fff;
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.25);
}

/* 停靠模式：尺寸由 dialogStyle 内联控制，额外加描边与页面区分；恢复被遮罩禁用的事件 */
.md-editor-dialog-docked {
  position: fixed;
  width: auto;
  height: auto;
  border: 1px solid #e2e8f0;
  pointer-events: auto;
}

.md-editor-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(90deg, #f8fafc 0%, #eff6ff 100%);
}

.md-editor-dialog-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.title-icon {
  font-size: 17px;
}

.title-dirty {
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  color: #d97706;
  background-color: #fef3c7;
  border-radius: 999px;
}

.md-editor-dialog-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-btn {
  height: 30px;
  padding: 0 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background-color: #fff;
  color: #334155;
  font-size: 13px;
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
  font-size: 14px;
  color: #94a3b8;
}

.header-btn.close-btn:hover {
  border-color: #ef4444;
  color: #ef4444;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.15);
}

.md-editor-dialog-body {
  flex: 1;
  min-height: 0;
}

.md-editor-dialog-body :deep(.md-editor) {
  border: none;
  border-radius: 0;
}

.md-editor-dialog-body :deep(.md-editor-input-wrapper textarea),
.md-editor-dialog-body :deep(.md-editor-content textarea),
.md-editor-dialog-body :deep(textarea) {
  font-size: 15px;
  line-height: 1.7;
}

/* 修复窄窗口下「浏览器全屏 / 预览」按钮被截断不可见的问题：
   md-editor-v3 自带 .md-toolbar 固定 min-width:850px 且隐藏滚动条，
   窗口变窄时右侧按钮超出可视区且无法滚动。这里取消最小宽度并允许换行，
   保证任何宽度下右侧按钮都始终可见（宽窗口布局与原来一致）。 */
.md-editor-dialog-body :deep(.md-toolbar-wrapper) {
  height: auto;
  overflow: visible;
}

.md-editor-dialog-body :deep(.md-toolbar) {
  min-width: 0;
  flex-wrap: wrap;
}

/* 停靠模式最小宽度 360px 时左侧按钮组仍可能放不下，同样允许换行 */
.md-editor-dialog-body :deep(.md-toolbar-left) {
  flex-wrap: wrap;
}

.md-editor-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 12px 20px;
  border-top: 1px solid #e2e8f0;
  background-color: #f8fafc;
}

.footer-actions {
  display: flex;
  gap: 10px;
}

.btn {
  min-width: 84px;
  height: 34px;
  padding: 0 18px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  border: 1px solid #e2e8f0;
  background-color: #fff;
  color: #64748b;
}

.btn-cancel:hover {
  border-color: #cbd5e1;
  color: #334155;
}

.btn-save {
  border: none;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #fff;
}

.btn-save:hover {
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  transform: translateY(-1px);
}

.md-dialog-fade-enter-active,
.md-dialog-fade-leave-active {
  transition: opacity 0.25s ease;
}

.md-dialog-fade-enter-active .md-editor-dialog,
.md-dialog-fade-leave-active .md-editor-dialog {
  transition: transform 0.25s ease;
}

.md-dialog-fade-enter-from,
.md-dialog-fade-leave-to {
  opacity: 0;
}

.md-dialog-fade-enter-from .md-editor-dialog,
.md-dialog-fade-leave-to .md-editor-dialog {
  transform: scale(0.96) translateY(8px);
}
</style>
