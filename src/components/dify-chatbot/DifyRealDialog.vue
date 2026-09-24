<template>
  <Teleport to="body" :disabled="inline">
    <div
      v-if="dialogVisible"
      class="custom-dialog-mask"
      :class="{ 'no-mask': noMask, 'inline-mode': inline }"
    >
      <div
        class="custom-dialog-wrapper"
        :style="wrapperStyle"
      >
        <div v-if="!fixed" class="resize-handles">
          <div class="resize-handle resize-n" @mousedown.stop="startResize('n', $event)"></div>
          <div class="resize-handle resize-s" @mousedown.stop="startResize('s', $event)"></div>
          <div class="resize-handle resize-e" @mousedown.stop="startResize('e', $event)"></div>
          <div class="resize-handle resize-w" @mousedown.stop="startResize('w', $event)"></div>
          <div class="resize-handle resize-ne" @mousedown.stop="startResize('ne', $event)"></div>
          <div class="resize-handle resize-nw" @mousedown.stop="startResize('nw', $event)"></div>
          <div class="resize-handle resize-se" @mousedown.stop="startResize('se', $event)"></div>
          <div class="resize-handle resize-sw" @mousedown.stop="startResize('sw', $event)"></div>
        </div>
        <div
          class="custom-dialog"
          :class="{ 'custom-dialog-fixed': fixed, 'sidebar-collapsed': sidebarCollapsed }"
          :style="chatFontStyle"
          @mousedown="handleMouseDown"
        >
          <div class="dify-api-container">
            <!-- 左侧：品牌 / 新建对话 / 会话列表 / 当前用户 -->
            <aside class="conversation-sidebar" :style="sidebarStyle">
              <div class="sidebar-brand">
                <span class="brand-logo"><ChatSparkle /></span>
                <span class="brand-text">
                  <span class="brand-title" :title="title">{{ title }}</span>
                  <span class="brand-subtitle">{{ subtitle }}</span>
                </span>
              </div>

              <div class="sidebar-actions">
                <button class="new-conversation-btn" @click="createNewConversation">
                  <ChatPlus class="new-conversation-plus" />
                  <span class="new-conversation-text">新建对话</span>
                  <ChatArrowUpRight class="new-conversation-arrow" />
                </button>
              </div>

              <div class="sidebar-section-title">历史记录</div>

              <div class="conversation-list">
                <template v-for="conv in conversationList" :key="conv.id">
                  <div
                    class="conversation-item"
                    :class="{ active: conv.id === currentConversationId }"
                    @click="selectConversation(conv)"
                  >
                    <ChatBubble class="conversation-item-icon" />
                    <span class="conversation-item-title" :title="conv.title">{{ conv.title }}</span>
                    <button
                      class="conversation-delete-btn"
                      title="删除该对话"
                      @click.stop="confirmDeleteConversation(conv)"
                    >
                      <ChatBottle />
                    </button>
                  </div>
                </template>
                <div v-if="conversationList.length === 0" class="conversation-empty">
                  暂无对话记录
                </div>
              </div>

              <div class="sidebar-footer">
                <span class="user-avatar">{{ userInitial }}</span>
                <span class="user-info">
                  <span class="user-name" :title="userDisplayName">{{ userDisplayName }}</span>
                  <span v-if="showUserSub" class="user-sub">{{ roleLabel }}</span>
                </span>
                <!-- 宿主自定义侧栏底部操作区（如退出登录）：user-info 为 flex:1，
                     插槽内容自然靠右对齐，与用户信息同排 -->
                <slot name="sidebar-footer"></slot>
              </div>
            </aside>

            <!-- 右侧：顶栏 + 消息区 + 输入区 -->
            <div class="chat-main">
              <div class="chat-main-header">
                <div class="chat-main-title-wrap">
                  <button
                    class="sidebar-toggle-btn"
                    :title="sidebarCollapsed ? '展开会话列表' : '收起会话列表'"
                    @click="toggleSidebar"
                  >
                    <ChatSidebar />
                  </button>
                  <span class="chat-main-title">{{ headerTitle }}</span>
                </div>
                <div class="chat-main-actions">
                  <!-- 宿主自定义顶栏操作区（如后台配置入口）：与关闭按钮同排，
                       处于 .custom-dialog 内，可继承 --chat-* 主题变量与 --chat-font-scale 缩放 -->
                  <slot name="header-actions"></slot>
                  <button
                    v-if="!noMask && !inline"
                    class="round-icon-btn"
                    title="关闭"
                    @click="handleClose"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div class="message-section-wrapper">
                <div
                  ref="messageContainer"
                  class="message-section"
                  :class="{ 'is-empty': messages.length === 0 }"
                >
                  <!-- 空态：品牌欢迎页（品牌标识 / 标语 / 引导卡片） -->
                  <div v-if="messages.length === 0" class="welcome-screen">
                    <div class="welcome-inner">
                      <div class="welcome-logo">
                        <span class="welcome-logo-inner"><ChatSparkle /></span>
                      </div>
                      <div class="welcome-slogan">让想法，更进一步</div>
                      <div class="welcome-title">今天，有什么可以帮你？</div>
                      <div class="welcome-subtitle">从一个问题开始，把复杂的工作变简单。</div>
                      <!-- <div class="welcome-cards">
                        <button
                          v-for="(card, ci) in suggestionCards"
                          :key="ci"
                          class="suggestion-card"
                          @click="applySuggestion(card)"
                        >
                          <span class="suggestion-card-icon" v-html="suggestionIcon(ci)"></span>
                          <span class="suggestion-card-body">
                            <span class="suggestion-card-title">{{ card.title }}</span>
                            <span class="suggestion-card-desc">{{ card.desc }}</span>
                          </span>
                          <svg class="suggestion-card-arrow" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M7.6 16.4 16.4 7.6M9 7.6h7.4V15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                          </svg>
                        </button>
                      </div> -->
                    </div>
                  </div>
                  <div v-else class="message-list">
                    <div
                      v-for="(message, index) in messages"
                      :key="index"
                      :class="[
                        'message-item',
                        message.role === 'user' ? 'user-message' : 'assistant-message',
                      ]"
                    >
                      <div class="message-header">
                        <span class="avatar" :class="message.role">
                          <span v-if="message.role === 'user'" class="avatar-text">{{ userInitial }}</span>
                          <span v-else class="avatar-brand"><ChatSparkle /></span>
                        </span>
                        <span class="message-role">{{ message.role === "user" ? userDisplayName : "AI 助手" }}</span>
                      </div>
                      <div class="message-content">
                        <div v-if="message.isThinking" class="thinking-indicator">
                          <span class="thinking-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                          </span>
                          <span class="thinking-text">{{ message.thinkingContent || '思考中' }}</span>
                        </div>
                        <div v-else-if="!message.isInterrupted && !message.isCompleted">
                          <!-- answer 开头的代码（JSON / Python / SQL 等）：仿编辑器代码卡片（折叠头 + 语言标签 + 复制 + 行号 + hljs 高亮）；
                               位置与 answer 原文一致——代码在前、尾部提示文字在后 -->
                          <div v-if="message.codeBlock" class="code-card" :class="'code-card--' + codeTheme">
                            <div class="code-card-header" @click="toggleCodeCard(index)">
                              <span class="code-card-caret">{{ message.codeCollapsed ? '▸' : '▾' }}</span>
                              <span class="code-card-lang">{{ (message.codeLang || 'text').toUpperCase() }}</span>
                              <button
                                class="code-card-theme"
                                :title="codeTheme === 'light' ? '切换为深色主题' : '切换为浅色主题'"
                                @click.stop="toggleCodeTheme"
                              >
                                <ChatThemeDark v-if="codeTheme === 'light'" />
                                <ChatThemeLight v-else />
                              </button>
                              <button
                                class="code-card-copy"
                                title="复制代码"
                                @click.stop="copyCodeBlock(message)"
                              >
                                <ChatCodeCopy />
                              </button>
                            </div>
                            <div v-show="!message.codeCollapsed" class="code-card-body">
                              <div class="code-gutter" aria-hidden="true">
                                <span v-for="n in codeLineCount(message.codeBlock)" :key="n">{{ n }}</span>
                              </div>
                              <pre class="code-pre"><code class="hljs" v-html="highlightCode(message.codeBlock, message.codeLang || 'text')"></code></pre>
                            </div>
                          </div>
                          <div
                            class="content-text"
                            :class="{ 'error-text': message.isError }"
                            @click="handleContentLinkClick"
                            v-html="formatContent(message.content)"
                          ></div>
                          <div v-if="message.flintSpecs && message.flintSpecs.length > 0" class="flint-charts-container">
                            <div
                              v-for="(spec, chartIdx) in message.flintSpecs"
                              :key="chartIdx"
                              :ref="(el) => setFlintChartRef(el, index, chartIdx)"
                              class="flint-chart-item"
                            ></div>
                          </div>
                          <!-- HTML 交互面板 -->
                          <div
                            v-if="message.htmlInteractions && message.htmlInteractions.length > 0"
                            class="html-interactions-container"
                          >
                            <div
                              v-for="(interaction, interIdx) in message.htmlInteractions"
                              :key="interIdx"
                              class="html-interaction-panel"
                              :class="{ resolved: message.interactionResolved }"
                            >
                              <!-- 技能选择面板（可勾选） -->
                              <div v-if="interaction.type === 'skill_select'" class="skill-select-panel">
                                <div class="skill-select-message">{{ interaction.message }}</div>
                                <div class="skill-select-list">
                                  <div
                                    v-for="skill in interaction.skills"
                                    :key="skill.name"
                                    class="skill-select-item"
                                    :class="{ selected: message.selectedSkills && message.selectedSkills.includes(skill.name) }"
                                    @click="toggleSkill(index, skill.name)"
                                  >
                                    <div class="skill-checkbox">
                                      <span v-if="message.selectedSkills && message.selectedSkills.includes(skill.name)">✓</span>
                                    </div>
                                    <div class="skill-select-info">
                                      <div class="skill-select-name">{{ skill.name }}</div>
                                      <div class="skill-select-desc">{{ skill.desc }}</div>
                                    </div>
                                  </div>
                                </div>
                                <div class="skill-select-actions">
                                  <button
                                    v-for="btn in getButtons(interaction)"
                                    :key="btn.type"
                                    class="skill-btn"
                                    :class="btn.type === 'confirm' ? 'skill-confirm-btn' : 'skill-cancel-btn'"
                                    :style="getButtonInlineStyle(btn)"
                                    :disabled="message.interactionResolved"
                                    @click="btn.type === 'confirm' ? confirmSkillSelection(index, btn) : cancelSkillSelection(index, btn)"
                                  >
                                    {{ btn.text }}
                                  </button>
                                </div>
                                <div v-if="message.interactionResolved && message.interactionText" class="skill-selected-summary">
                                  {{ message.interactionText }}
                                </div>
                                <div v-if="message.interactionResolved && !message.interactionText && message.selectedSkills && message.selectedSkills.length > 0" class="skill-selected-summary">
                                  已选择：{{ message.selectedSkills.join('、') }}
                                </div>
                              </div>
                              <!-- 技能列表面板（只读列表，不可勾选） -->
                              <div v-else-if="interaction.type === 'skill_list'" class="skill-list-panel">
                                <div class="skill-select-message">{{ interaction.message }}</div>
                                <div class="skill-select-list">
                                  <div
                                    v-for="skill in interaction.skills"
                                    :key="skill.name"
                                    class="skill-list-item"
                                  >
                                    <div class="skill-list-info">
                                      <div class="skill-select-name">{{ skill.name }}</div>
                                      <div class="skill-select-desc">{{ skill.desc }}</div>
                                    </div>
                                  </div>
                                </div>
                                <div v-if="interaction.buttons && interaction.buttons.length > 0" class="skill-select-actions">
                                  <button
                                    v-for="btn in getButtons(interaction)"
                                    :key="btn.type"
                                    class="skill-btn"
                                    :class="btn.type === 'confirm' ? 'skill-confirm-btn' : 'skill-cancel-btn'"
                                    :style="getButtonInlineStyle(btn)"
                                    :disabled="message.interactionResolved"
                                    @click="btn.type === 'confirm' ? confirmSkillList(index, btn) : cancelSkillList(index, btn)"
                                  >
                                    {{ btn.text }}
                                  </button>
                                </div>
                                <div v-if="message.interactionResolved && message.interactionText" class="skill-selected-summary">
                                  {{ message.interactionText }}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div v-else-if="message.isInterrupted" class="interrupted-panel">
                          <div class="interrupted-header">
                            <span class="interrupted-badge">待确认</span>
                          </div>
                          <!-- answer 开头的代码（JSON / Python / SQL 等）：与常规消息同款代码卡片；位置与原文一致——代码在前、尾部提示文字在后 -->
                          <div v-if="message.codeBlock" class="code-card" :class="'code-card--' + codeTheme">
                            <div class="code-card-header" @click="toggleCodeCard(index)">
                              <span class="code-card-caret">{{ message.codeCollapsed ? '▸' : '▾' }}</span>
                              <span class="code-card-lang">{{ (message.codeLang || 'text').toUpperCase() }}</span>
                              <button
                                class="code-card-theme"
                                :title="codeTheme === 'light' ? '切换为深色主题' : '切换为浅色主题'"
                                @click.stop="toggleCodeTheme"
                              >
                                <ChatThemeDark v-if="codeTheme === 'light'" />
                                <ChatThemeLight v-else />
                              </button>
                              <button
                                class="code-card-copy"
                                title="复制代码"
                                @click.stop="copyCodeBlock(message)"
                              >
                                <ChatCodeCopy />
                              </button>
                            </div>
                            <div v-show="!message.codeCollapsed" class="code-card-body">
                              <div class="code-gutter" aria-hidden="true">
                                <span v-for="n in codeLineCount(message.codeBlock)" :key="n">{{ n }}</span>
                              </div>
                              <pre class="code-pre"><code class="hljs" v-html="highlightCode(message.codeBlock, message.codeLang || 'text')"></code></pre>
                            </div>
                          </div>
                          <!-- 尾部提示文字（answer 去掉开头代码后的剩余），保持在代码卡片之后 -->
                          <div
                            v-if="message.content"
                            class="interrupted-question content-text"
                            @click="handleContentLinkClick"
                            v-html="formatContent(message.content)"
                          ></div>
                          <!-- actions_hint 非空：后端在等显式动作，提供确认/取消按钮；
                               仅最后一条消息可操作，已应答或 AI 回复中时置灰 -->
                          <div v-if="message.actionsHint && message.actionsHint.length" class="interrupted-actions">
                            <button
                              class="skill-btn skill-confirm-btn"
                              :disabled="message.interruptResolved || isLoading || index !== messages.length - 1"
                              title="向后端发送确认动作"
                              @click="confirmInterrupted(index)"
                            >
                              确认
                            </button>
                            <button
                              class="skill-btn skill-cancel-btn"
                              :disabled="message.interruptResolved || isLoading || index !== messages.length - 1"
                              title="取消待确认，恢复常规输入"
                              @click="cancelInterrupted(index)"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                        <div v-else-if="message.isCompleted" class="result-panel">
                          <div class="result-header">
                            <span class="result-badge">已完成</span>
                          </div>
                          <div v-if="message.resultEntries && message.resultEntries.length" class="interrupted-context">
                            <div class="interrupted-context-title">结果</div>
                            <div
                              v-for="(entry, ci) in message.resultEntries"
                              :key="ci"
                              class="pending-context-item"
                            >
                              <div v-if="entry.key" class="pending-context-key">{{ entry.key }}</div>
                              <pre v-if="entry.isCode && entry.text" class="pending-context-code">{{ entry.text }}</pre>
                              <table v-else-if="entry.isTable && entry.tableColumns && entry.tableColumns.length" class="pending-context-table">
                                <thead>
                                  <tr>
                                    <th v-for="col in entry.tableColumns" :key="col">{{ col }}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr v-for="(row, ri) in entry.tableRows" :key="ri">
                                    <td v-for="col in entry.tableColumns" :key="col">{{ pendingCellText(row[col]) }}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                      <!-- 消息附件：与正文面板并列，历史会话与实时消息共用同一套渲染 -->
                      <div v-if="message.files && message.files.length > 0" class="message-files">
                        <div
                          v-for="file in message.files"
                          :key="file.id"
                          class="message-file-item"
                        >
                          <!-- 图片类附件显示缩略图，点击打开原图；加载失败回退为图标 -->
                          <a
                            v-if="file.accessUrl && isImageFile(file.name) && !isThumbBroken(file.accessUrl)"
                            class="file-thumb"
                            :href="file.accessUrl"
                            target="_blank"
                            rel="noopener"
                            :title="'点击查看原图：' + file.name"
                          >
                            <img :src="file.accessUrl" :alt="file.name" @error="onThumbError(file.accessUrl)">
                          </a>
                          <span v-else class="file-icon">{{ fileIcon(file.name) }}</span>
                          <!-- 有访问地址时名称可点击打开；无地址（极端异常）则纯文本 -->
                          <a
                            v-if="file.accessUrl"
                            class="file-name file-name-link"
                            :href="file.accessUrl"
                            target="_blank"
                            rel="noopener"
                            :title="file.name"
                          >{{ file.name }}</a>
                          <span v-else class="file-name" :title="file.name">{{ file.name }}</span>
                          <!-- 历史接口不下发体积，缺省时不展示 -->
                          <span v-if="file.size != null" class="file-size">{{ formatFileSize(file.size) }}</span>
                          <a
                            v-if="file.accessUrl"
                            class="file-download"
                            :href="file.accessUrl"
                            :download="file.name"
                            title="下载附件"
                          >⬇</a>
                        </div>
                      </div>
                      <div v-if="!message.isThinking" class="message-footer">
                        <span class="message-time">{{ formatTime(message.timestamp) }}</span>
                        <button
                          class="copy-btn"
                          title="复制内容"
                          @click="copyMessageContent(message)"
                        >
                          <ChatCopy />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <!-- 切换历史会话时，消息拉取完成前显示「加载中」遮罩，避免页面空白、提升体验 -->
                <div v-if="historyLoading" class="history-loading-overlay">
                  <div class="history-loading-spinner"></div>
                  <div class="history-loading-text">数据加载中，请稍后…</div>
                </div>
              </div>

              <div class="input-section">
                <div class="input-wrapper">
                  <div v-if="uploadedFiles.length > 0" class="uploaded-files-list">
                    <div
                      v-for="file in uploadedFiles"
                      :key="file.id"
                      class="uploaded-file-item"
                      :class="{ uploading: file.uploading, 'upload-error': file.error }"
                    >
                      <span class="file-icon">📄</span>
                      <span class="file-name">{{ file.name }}</span>
                      <span class="file-size">{{ file.error ? '上传失败' : (file.uploading ? '上传中…' : formatFileSize(file.size)) }}</span>
                      <button class="remove-file-btn" @click="removeFile(file.id)">
                        ×
                      </button>
                    </div>
                  </div>
                  <div class="composer">
                    <el-input
                      ref="queryInputRef"
                      v-model="userQuery"
                      type="textarea"
                      :rows="3"
                      placeholder="输入你的问题，让我们一起解决..."
                      resize="none"
                      :disabled="isLoading"
                      @keydown.enter.prevent="handleEnter"
                    />
                    <div class="composer-footer">
                      <button
                        class="attach-btn"
                        :disabled="isLoading"
                        title="上传文件"
                        @click="openFileDialog"
                      >
                        <ChatUpload class="attach-icon" />
                        <span class="attach-text">添加附件</span>
                      </button>
                      <div class="composer-footer-right">
                        <span v-if="isLoading" class="hint">AI 正在思考中，请稍候...</span>
                        <button
                          v-if="isLoading"
                          class="round-btn stop-btn"
                          title="停止"
                          @click="stopGeneration"
                        >
                          <ChatStop class="round-icon" />
                        </button>
                        <button
                          v-else
                          class="round-btn send-btn"
                          :disabled="!canSend"
                          title="发送"
                          @click="sendMessage"
                        >
                          <ChatSend class="round-icon" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div class="composer-hint">
                    <button class="scroll-bottom-btn" title="回到最新消息" @click="scrollToBottom">
                      <ChatArrowDown />
                    </button>
                    <span class="composer-hint-text">生成内容仅供参考，请核实重要信息</span>
                  </div>
                  <input
                    ref="fileInputRef"
                    type="file"
                    multiple
                    class="hidden-file-input"
                    @change="handleFileSelect"
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Markdown 编辑器：停靠在本对话窗右侧并向右铺满视口，锚点随拖拽/缩放同步变化 -->
      <MdEditorDialog
        v-if="mdEditor"
        v-model:visible="mdEditorVisible"
        :dock-left="dialogPosition.x + dialogWidth"
        :dock-top="dialogPosition.y"
        :dock-height="dialogHeight"
        title="Agent 说明文档"
        file-name="agent.md"
        :storage-key="mdEditorStorageKey"
      />

      <!-- 链接查看弹层：AI 回复中的 http/https 链接改为本地弹层内嵌展示（占视口 90%），
           不再跳新浏览器标签页；头部保留「新窗口」按钮作为兜底（如目标站拒绝 iframe 嵌入时） -->
      <LinkViewerDialog
        v-model:visible="linkViewerVisible"
        :url="linkViewerUrl"
        :title="linkViewerTitle"
      />

      <!-- 自定义二次确认弹窗：替换 ElMessageBox，避免被自绘对话框遮挡 / 左上角错位 -->
      <div
        v-if="confirmDialogVisible"
        class="dify-real-confirm-mask"
        @click.self="closeConfirmDialog"
      >
        <div class="dify-real-confirm">
          <div class="dify-real-confirm__title">{{ confirmDialogTitle }}</div>
          <div class="dify-real-confirm__message">{{ confirmDialogMessage }}</div>
          <div class="dify-real-confirm__actions">
            <button class="dify-real-confirm__btn cancel" @click="closeConfirmDialog">取消</button>
            <button class="dify-real-confirm__btn danger" @click="onConfirmDelete">删除</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  watch,
  computed,
  onMounted,
  onUnmounted,
  nextTick,
} from 'vue'
import { ElInput } from 'element-plus'
import { useMessage } from 'naive-ui'
import { DemoScriptEngine } from './demo-script'
import ChatCopy from '@/icons/chat-copy.vue'
import ChatUpload from '@/icons/chat-upload.vue'
import ChatStop from '@/icons/chat-stop.vue'
import ChatSend from '@/icons/chat-send.vue'
import ChatThemeDark from '@/icons/chat-theme-dark.vue'
import ChatThemeLight from '@/icons/chat-theme-light.vue'
import ChatCodeCopy from '@/icons/chat-code-copy.vue'
import ChatSparkle from '@/icons/chat-sparkle.vue'
import ChatPlus from '@/icons/chat-plus.vue'
import ChatArrowUpRight from '@/icons/chat-arrow-up-right.vue'
import ChatBubble from '@/icons/chat-bubble.vue'
import ChatBottle from '@/icons/chat-bottle.vue'
import ChatSidebar from '@/icons/chat-sidebar.vue'
import ChatArrowDown from '@/icons/chat-arrow-down.vue'
import MdEditorDialog from './MdEditorDialog.vue'
import LinkViewerDialog from './LinkViewerDialog.vue'
import { getFontScale } from './font-scale'
import { assembleECharts } from 'flint-chart'
import type { ChartAssemblyInput } from 'flint-chart'
import * as echarts from 'echarts'
// Dify / 组态 AI 后端专用实例（无拦截器、不跳登录），见 @/utils/dify-request
import difyRequest from '@/utils/dify-request'
import { marked } from 'marked'
// highlight.js：代码卡片语法高亮（按需注册语言，避免全量引入）；仅 core + 少量语言
import hljs from 'highlight.js/lib/core'
import jsonLang from 'highlight.js/lib/languages/json'
import pythonLang from 'highlight.js/lib/languages/python'
import bashLang from 'highlight.js/lib/languages/bash'
import sqlLang from 'highlight.js/lib/languages/sql'
import javascriptLang from 'highlight.js/lib/languages/javascript'
import typescriptLang from 'highlight.js/lib/languages/typescript'
// 不引入 hljs 官方主题（全局 .hljs 规则会互相覆盖、无法按卡片切换）；
// 改由组件自带 .code-card--light / --dark 两套 CSS 变量配色，默认浅色，可一键切换

hljs.registerLanguage('json', jsonLang)
hljs.registerLanguage('python', pythonLang)
hljs.registerLanguage('bash', bashLang)
hljs.registerLanguage('shell', bashLang)
hljs.registerLanguage('sh', bashLang)
hljs.registerLanguage('sql', sqlLang)
hljs.registerLanguage('javascript', javascriptLang)
hljs.registerLanguage('js', javascriptLang)
hljs.registerLanguage('typescript', typescriptLang)
hljs.registerLanguage('ts', typescriptLang)

// Flint 图表相关接口
interface FlintSpec {
  rawInput: ChartAssemblyInput
  echartsOption: any
}

// 对话历史列表项（侧栏用，与后端约定保持一致）
interface ConversationItem {
  id: string
  title: string
  updateTime: string // 展示用时间，如 "08-28 14:30"
  // 以下为真实会话接口（/session/list）返回字段的映射承载
  sessionId?: string | null // 后端会话标识，可为 null
  state?: number // 后端状态位（0/1）
}

// 按钮颜色配置接口
interface ButtonColorConfig {
  backgroundColor?: string
  textColor?: string
  borderColor?: string
  hoverBackgroundColor?: string
}

// 按钮配置接口
interface ButtonConfig {
  type: 'confirm' | 'cancel'
  text: string
  // 点击该按钮后，在面板下方显示的提示文本；为空/不配置则不显示
  resolvedText?: string
  color?: ButtonColorConfig
}

// HTML 交互内容接口
interface HtmlInteraction {
  type: string
  message: string
  skills?: Array<{
    name: string
    desc: string
  }>
  buttons?: ButtonConfig[]
}

// 空态引导卡片（对话窗欢迎页）
interface SuggestionCard {
  title: string
  desc: string
  prompt: string
}

// 附件上传接口返回项（/api/file/upload/batch）
interface UploadedFileMeta {
  accessUrl: string
  filesId: string
  originalFileName: string
}

// 历史消息里的附件项（/api/chat/sessionId 的 fileItemList[]）
// 字段命名与上传接口不同（fileId / originalFileName / accessUrl），统一归一化到消息附件结构
interface HistoryFileItem {
  fileId?: string
  originalFileName?: string
  accessUrl?: string
}

// pending_context / result 归一化后的单条展示项
interface PendingContextEntry {
  key: string
  text: string
  isCode: boolean
  isTable: boolean
  tableColumns?: string[]
  tableRows?: Array<Record<string, any>>
}

interface ChartMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  isThinking?: boolean
  thinkingContent?: string
  // 服务端返回错误时的提示消息（样式与普通回复区分）
  isError?: boolean
  // 消息附件：发送侧（本地上传）与历史侧（后端 fileItemList）共用同一结构
  files?: Array<{
    id: string
    name: string
    // 历史接口不下发文件大小，故可缺省；缺省时不展示体积
    size?: number
    // 后端附件引用 id（上传接口 filesId / 历史接口 fileId）
    fileId?: string
    // 附件可访问地址；存在时附件可点击预览 / 下载
    accessUrl?: string
  }>
  flintSpecs?: FlintSpec[]
  htmlInteractions?: HtmlInteraction[]
  selectedSkills?: string[]
  interactionResolved?: boolean
  interactionText?: string
  // AI 主动挂起、等待用户确认（status=interrupted）相关字段
  // pending_question / pending_context 两个字段不一定每次都下发
  isInterrupted?: boolean
  // interrupted 帧携带的候选动作（actions_hint，如 ["confirm"]）：非空时面板渲染确认/取消按钮
  // （仅最后一条未应答的待确认帧可点）；不阻塞常规输入，用户也可直接发文字指出错误
  actionsHint?: string[]
  interruptResolved?: boolean
  // 复制专用原文：answer 经拆分后 content 只含尾部文字、JSON 改走卡片渲染，
  // 存在时复制走此字段（后端原始 answer），保证复制结果与下发内容一致
  copyContent?: string
  // answer 拆出的代码（JSON / Python / SQL 等）：由模板渲染为可折叠代码卡片（语言标签 / 复制 / 行号 / hljs 高亮）
  codeBlock?: string
  // 代码语言（json / python / bash / sql ...），决定高亮方式与卡片头标签
  codeLang?: string
  // 卡片折叠态（默认收起，避免长代码占满聊天区）
  codeCollapsed?: boolean
  intentCode?: string
  pendingQuestion?: string
  pendingContext?: Record<string, any> | null
  // 归一化后的展示条目（构建消息时算好，模板只按 length 判断是否渲染面板）
  pendingContextEntries?: PendingContextEntry[]
  // 任务完成（status=completed）相关字段：展示 result 中的最终产物
  // result 结构与 pending_context 一致（含 SQL_COMPOSER.sql / SQL_EXEC_AGENT.json 等），同样不一定每次下发
  isCompleted?: boolean
  resultPayload?: Record<string, any> | null
  resultEntries?: PendingContextEntry[]
}

export default defineComponent({
  name: 'DifyRealDialog',
  components: {
    ElInput,
    ChatCopy,
    ChatUpload,
    ChatStop,
    ChatSend,
    ChatThemeDark,
    ChatThemeLight,
    ChatCodeCopy,
    ChatSparkle,
    ChatPlus,
    ChatArrowUpRight,
    ChatBubble,
    ChatBottle,
    ChatSidebar,
    ChatArrowDown,
    MdEditorDialog,
    LinkViewerDialog,
  },
  props: {
    title: {
      type: String,
      default: 'AI 智能助手',
    },
    visible: {
      type: Boolean,
      default: false,
    },
    noMask: {
      type: Boolean,
      default: false,
    },
    fixed: {
      type: Boolean,
      default: false,
    },
    // 内嵌模式：不传送到 body，就地渲染并填满父容器（供仪表盘组件内嵌使用）
    inline: {
      type: Boolean,
      default: false,
    },
    initialPosition: {
      type: Object as () => { x: number; y: number; },
      default: null,
    },
    initialSize: {
      type: Object as () => { width: number; height: number; },
      default: null,
    },
    // 浮动模式下弹窗占视口的比例（宽高同比例），默认 80%
    viewportRatio: {
      type: Number,
      default: 1,
    },
    role: {
      type: String,
      default: '',
    },
    // 是否在头部显示 Markdown 编辑器入口（停靠在本对话窗右侧）
    mdEditor: {
      type: Boolean,
      default: false,
    },
    mdEditorStorageKey: {
      type: String,
      default: '',
    },
    // 是否以「角色文字欢迎语消息」开场。为 false 时不注入欢迎消息，
    // 保留空态品牌欢迎页（welcome-screen：星光徽标 + 标语 + 引导卡片）
    textWelcome: {
      type: Boolean,
      default: true,
    },
    // 字体整体缩放倍率；<=0 表示未设置，回退读取 localStorage 中的持久化配置
    fontScale: {
      type: Number,
      default: 0,
    },
    // 左侧品牌区副标题
    subtitle: {
      type: String,
      default: '你的智能工作伙伴',
    },
    // 空态引导卡片；不传则使用内置三条默认引导
    suggestions: {
      type: Array as () => SuggestionCard[] | null,
      default: null,
    },
    // 左侧对话历史侧栏宽度（px）
    sidebarWidth: {
      type: Number,
      default: 260,
    },
    // 接口 loginAccount 参数覆盖值：由宿主（大屏 wrapper）在匿名发布页传入 URL token；
    // 传空则回退 localStorage 的 loginAccount（编辑器 / 后台登录态）
    loginAccount: {
      type: String,
      default: '',
    },
    // 接口鉴权 token 覆盖值：由宿主在匿名发布页传入 URL token；传空则回退 localStorage 的 DataS-Token
    authToken: {
      type: String,
      default: '',
    },
    // 匿名访问：为 true 时发问者显示名不取 loginAccount（避免把 token 当用户名展示），直接回退角色中文名
    anonymous: {
      type: Boolean,
      default: false,
    },
    com: {
      type: Object as () => {
        buttonImage: string
        buttonStyle: {
          backgroundColor: string
          hoverBackgroundColor: string
        }
        role: string
      },
      default: () => ({
        buttonImage: '',
        buttonStyle: {
          backgroundColor: '#409eff',
          hoverBackgroundColor: '#66b1ff',
        },
        role: '',
      }),
    },
  },
  emits: ['close', 'update:visible', 'message-received', 'message-sent', 'md-editor-visible-change'],
  setup(props, { emit }) {
    // 消息提示统一用 naive-ui 的 message（App.vue 已用 n-message-provider 全局包裹，主/分享应用均适用）
    const nMessage = useMessage()
    const dialogVisible = ref(false)
    // 切换历史会话时的「数据加载中」遮罩开关（与发送消息的 isLoading 解耦，避免互相影响）
    const historyLoading = ref(false)
    const userQuery = ref('')
    // 输入框实例：点击引导卡片后自动聚焦，方便继续编辑后发送
    const queryInputRef = ref<any>(null)
    const messages = ref<ChartMessage[]>([])
    const flintChartRefs = ref<Map<string, HTMLElement>>(new Map())
    const flintChartInstances = ref<Map<string, echarts.ECharts>>(new Map())
    const isLoading = ref(false)
    const messageContainer = ref<HTMLElement | null>(null)
    const mdEditorVisible = ref(false)

    // 编辑器开关状态变化时通知宿主，供宿主调整页面布局（如面板分屏比例）
    watch(mdEditorVisible, val => {
      emit('md-editor-visible-change', val)
    })
    // 浮动模式下的默认尺寸：按视口比例（默认 80%）计算并居中显示，宿主传了 initialSize / initialPosition 时以其为准
    const MIN_DIALOG_WIDTH = 420
    const MIN_DIALOG_HEIGHT = 420
    const computeViewportSize = () => ({
      width: Math.max(MIN_DIALOG_WIDTH, Math.round(window.innerWidth * props.viewportRatio)),
      height: Math.max(MIN_DIALOG_HEIGHT, Math.round(window.innerHeight * props.viewportRatio)),
    })
    const computeViewportPosition = (size: { width: number; height: number; }) => ({
      x: Math.max(0, Math.round((window.innerWidth - size.width) / 2)),
      y: Math.max(0, Math.round((window.innerHeight - size.height) / 2)),
    })
    const defaultDialogSize = props.initialSize ?? computeViewportSize()
    // 用户手动拖拽/缩放过之后不再自动跟随视口重算，保留其自定义结果
    const userAdjusted = ref(false)

    const dialogPosition = ref(props.initialPosition ?? computeViewportPosition(defaultDialogSize))
    const dragOffset = ref({ x: 0, y: 0 })
    const isDragging = ref(false)

    // 字体整体缩放：优先使用外部传入的 fontScale（实时联动），否则读取 localStorage
    const chatFontScale = computed(() => (props.fontScale > 0 ? props.fontScale : getFontScale()))
    // 通过 CSS 变量下发缩放倍率；as any 规避 CSSProperties 不识别自定义属性名的类型限制
    const chatFontStyle = computed(() => ({ '--chat-font-scale': chatFontScale.value } as any))

    // 聊天输入区待发送的附件：选好文件即调用真实上传接口，回填 filesId / accessUrl
    const uploadedFiles = ref<
      Array<{
        id: string
        name: string
        size: number
        // 上传接口返回的附件引用 id（filesId）
        fileId?: string
        // 上传接口返回的可访问地址（accessUrl），本地留存备用
        accessUrl?: string
        // 是否仍在上传中；上传完成后置 false 并回填 fileId / accessUrl
        uploading?: boolean
        // 上传失败：条目保留由用户手动移除，发送时自动忽略
        error?: boolean
      }>
    >([])
    const fileInputRef = ref<HTMLInputElement | null>(null)
    // 是否存在仍在"上传中"的附件（发送前需等待其完成）
    const isUploadingFiles = computed(() => uploadedFiles.value.some(file => !!file.uploading))
    // 是否存在可发送内容（输入非空，或已选择附件），用于控制发送按钮可用态
    const canSend = computed(
      () => !isLoading.value && !isUploadingFiles.value && (!!userQuery.value.trim() || uploadedFiles.value.length > 0),
    )

    const scriptEngine = new DemoScriptEngine()
    // 不再请求 mockdata.json：真实对话走 WS，scriptEngine 仅作为技能按钮交互的内置兜底
    const scriptLoaded = ref(true)
    const scriptLoadError = ref<string | null>(null)

    const currentRole = computed(() => {
      return props.role || props.com.role
    })

    const config = ref({
      buttonImage: props.com.buttonImage,
      buttonStyle: props.com.buttonStyle,
      role: currentRole.value,
    })

    watch(
      () => props.com,
      newCom => {
        config.value = {
          buttonImage: newCom.buttonImage,
          buttonStyle: newCom.buttonStyle,
          role: currentRole.value,
        }
      },
      { deep: true },
    )

    // ===== 对话历史侧栏（接口预留） =====
    // 后端接口就绪前用本地数据占位，保证 UI 可交互；
    // 接口到位后只需替换下方「预留接口」函数体中的注释实现，UI 无需改动。
    const conversationList = ref<ConversationItem[]>([])
    const currentConversationId = ref<string>('') // 当前选中的会话项 id（本地生成或后端 id）
    // 当前对话绑定的后端 sessionId；空字符串代表「尚未关联到后端（新对话）」
    const currentSessionId = ref<string>('')
    // 当前会话来源：none=尚未开始 / history=历史会话 / new=已新建（本地空白态）
    const convSource = ref<'none' | 'history' | 'new'>('none')

    // 自定义二次确认弹窗状态（替换 ElMessageBox，避免被自绘对话框遮挡 / 左上角错位）
    const confirmDialogVisible = ref(false)
    const confirmDialogTitle = ref('')
    const confirmDialogMessage = ref('')
    const pendingDeleteConv = ref<ConversationItem | null>(null)

    // 接口 loginAccount 参数取值（会话 / 上传 / 聊天等接口共用）：
    // 优先用宿主传入的 loginAccount（如发布页匿名访问时 wrapper 传入的 URL token），否则回退 localStorage。
    // 匿名访问（anonymous=true）时只用 URL token，绝不回退 localStorage —— 否则会把编辑器登录账号
    // 当成发布页匿名用户的账号提交，导致会话归属错人（这正是匿名场景要修的问题）。
    const getLoginAccount = (): string =>
      props.anonymous
        ? props.loginAccount
        : props.loginAccount || localStorage.getItem('loginAccount') || ''

    // ===== 组态侧鉴权信息 =====
    // 来源系统标识：随 X-Src-System 下发，值统一从环境变量取（三套 env 均已配置），缺省兜底 zutai01
    const SRC_SYSTEM = import.meta.env.VITE_APP_DIFY_SRC_SYSTEM || 'zutai01'

    // 接口鉴权 token：
    // 优先用宿主传入的 authToken（如发布页匿名访问时 wrapper 传入的 URL token），否则回退 localStorage 的 DataS-Token
    // 说明：发布页 / URL token 的判定已上移到 wrapper（见 @/utils/dify-publish），本组件不再嗅探路由
    const getAuthToken = (): string =>
      props.authToken || localStorage.getItem('DataS-Token') || ''
    // 给接口地址追加 loginAccount 查询参数（自动判断用 ? 还是 &）；未登录时返回原地址
    // 匿名发布页场景下这里的 account 就是 URL 上的 token（由 wrapper 经 loginAccount prop 下发）
    const withLoginAccount = (url: string): string => {
      const account = getLoginAccount()
      if (!account) return url
      return `${url}${url.includes('?') ? '&' : '?'}loginAccount=${encodeURIComponent(account)}`
    }

    // 组态侧鉴权头：X-Src-System 标识来源系统，token 取匿名 URL token 或 localStorage 的 DataS-Token
    // 所有直连 Dify 后端的 HTTP 接口（会话列表 / 历史消息 / 删除会话 / 附件上传）统一携带
    const getAuthHeaders = (): Record<string, string> => ({
      'X-Src-System': SRC_SYSTEM,
      token: getAuthToken(),
    })

    // 角色中文名：侧栏底部「用户名 / 角色」与发问者兜底显示名共用
    const roleLabel = computed(() => {
      switch (currentRole.value) {
        case 'project_manager':
          return '项目经理'
        case 'developer':
          return '开发人员'
        case 'backend_ops':
          return '后台维护人员'
        default:
          return ''
      }
    })

    // 发问者显示名：优先取 localStorage 的 loginAccount，未登录时兜底到角色中文名
    // loginAccount 非响应式，故用 ref 缓存，并在挂载 / 对话框打开时刷新，确保读到最新账号
    const userDisplayName = ref('')
    // 头像文字：取显示名首字（英文取大写首字母）
    const userInitial = computed(() => {
      const name = userDisplayName.value || '我'
      return /^[a-z]/i.test(name) ? name.charAt(0).toUpperCase() : name.charAt(0)
    })
    // 未登录（显示名即角色名）时不重复展示第二行，避免出现「使用人员 / 使用人员」
    const showUserSub = computed(() => userDisplayName.value !== roleLabel.value)
    const refreshUserDisplayName = () => {
      // 匿名访问（如发布页）：loginAccount 参数是 URL token，不作为显示名；
      // 依次回退角色中文名 → 「匿名用户」，避免侧栏底部 / 头像处出现空白
      const account = props.anonymous ? '' : getLoginAccount()
      userDisplayName.value = account || roleLabel.value || (props.anonymous ? '匿名用户' : '')
    }

    // 会话列表右侧时间文案：把后端 createdOn 归一化为「MM-DD HH:mm」（跨年补年份）
    // 缺失 / 非法格式统一返回空串，模板判空后不渲染，避免出现 Invalid Date
    const formatConversationTime = (raw?: string | number): string => {
      if (raw == null || raw === '') return ''
      const text = String(raw)
      const ts = typeof raw === 'number' ? raw : Date.parse(text) || Date.parse(text.replace(/-/g, '/'))
      if (!ts || Number.isNaN(ts)) return ''
      const d = new Date(ts)
      const pad = (n: number) => String(n).padStart(2, '0')
      const prefix = d.getFullYear() === new Date().getFullYear() ? '' : `${d.getFullYear()}-`
      return `${prefix}${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    }

    // 真实接口：拉取对话历史列表（直连，不走代理）
    // 后端地址 http://10.89.34.77:8080/api/session/list，返回 { code, msg, data: [...] }
    // 地址可通过环境变量 VITE_APP_DIFY_SESSION_HOST 覆盖；直连方式下请确保后端已开启 CORS
    // 实际返回字段：autoId(主键) / name / sessionId / tSessionId / createdOn 等，无 id 字段
    // 列表项唯一标识取 autoId（缺失时兜底 sessionId / 索引），避免多条记录 id 相同导致全选/Key 冲突
    const fetchConversationList = async (): Promise<void> => {
      try {
        const base = import.meta.env.VITE_APP_DIFY_SESSION_HOST || 'http://10.89.34.77:8080'
        const resp = await difyRequest.get(withLoginAccount(`${base}/api/session/list`), {
          headers: getAuthHeaders(),
        })
        const rawList = (resp.data?.data || []) as Array<{
          autoId?: number
          cache?: string
          name: string
          sessionId: string | null
          state?: number
          // 后端下发的时间字段（不同版本可能是时间戳或日期字符串），用于列表右侧时间展示
          createdOn?: string | number
        }>
        const fetched = rawList.map((item, index) => ({
          id: item.autoId != null ? String(item.autoId) : item.sessionId || `hist-${index}`,
          title: item.name || '',
          updateTime: formatConversationTime(item.createdOn),
          sessionId: item.sessionId,
          state: item.state,
        }))
        // 保留本地占位项（pending- 前缀）：后端尚未收录刚发起的新会话，避免刷新后消失
        const known = new Set(fetched.map(i => i.sessionId).filter(Boolean))
        const pending = conversationList.value.filter(
          c => c.id.startsWith('pending-') && c.sessionId && !known.has(c.sessionId),
        )
        conversationList.value = [...pending, ...fetched]
      } catch (e) {
        console.error('[DifyRealDialog] 拉取会话列表失败', e)
        conversationList.value = []
      }
    }

    // 新建对话：仅在「当前处于某个历史会话」时才真正新建；否则（刷新后初次 / 已处于新会话态）提示「已是最新对话」
    // 新建时既不往历史列表插入 item，也不预先建立 WS：只有真正发出第一条消息后才由 session_ready 入列表
    const createNewConversation = async (): Promise<void> => {
      if (convSource.value !== 'history') {
        nMessage.info('已是最新对话', { duration: 1500 })
        return
      }
      // 从历史会话切换到「新建」：断开旧连接、清空消息、取消历史项高亮
      convSource.value = 'new'
      currentConversationId.value = '' // 取消历史项高亮（历史列表中没有对应的本地项）
      currentSessionId.value = '' // 新对话尚未绑定后端会话
      closeWs() // 关闭上一会话的 WS，避免复用旧连接
      resetMessages() // 清空当前消息（不插入欢迎语）
    }

    // 从文本开头剥离一层平衡的 JSON 对象（括号配对扫描，跳过字符串内的括号与转义符）
    // 用于 interrupted 帧：后端有时把结构化结果（如识别出的设备列表）序列化后直接拼在
    // answer 开头，尾部才是给人看的提示文字；一大段 JSON 原样铺开可读性极差，需拆分处理
    // 不以 { 开头 / 括号不平衡 / 前缀非法 JSON 均返回 json=null，由调用方保持原样渲染
    const extractLeadingJsonObject = (text: string): { json: Record<string, any> | null; rest: string; } => {
      const trimmed = text.trimStart()
      if (!trimmed.startsWith('{')) return { json: null, rest: '' }
      let depth = 0
      let inString = false
      let escaped = false
      for (let i = 0; i < trimmed.length; i++) {
        const ch = trimmed[i]
        if (inString) {
          if (escaped) escaped = false
          else if (ch === '\\') escaped = true
          else if (ch === '"') inString = false
          continue
        }
        if (ch === '"') inString = true
        else if (ch === '{') depth++
        else if (ch === '}') {
          depth--
          if (depth === 0) {
            try {
              const parsed = JSON.parse(trimmed.slice(0, i + 1))
              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return { json: parsed as Record<string, any>, rest: trimmed.slice(i + 1).trim() }
              }
            } catch (e) {
              // 前缀不是合法 JSON，放弃拆分
            }
            return { json: null, rest: '' }
          }
        }
      }
      // JSON 未闭合（截断帧等异常）：不拆分，保持原有整段展示
      return { json: null, rest: '' }
    }

    // 拆分 answer 开头的结构化内容 → 代码卡片：
    // 1) 以 ```lang ... ``` 围栏代码块开头（如后端返回的 Python / SQL 代码）→ 取围栏内代码，语言取围栏声明（缺省自动检测）；
    // 2) 否则以序列化 JSON 对象开头 → 剥离并格式化（缩进 2 格），语言固定 json；
    // 命中则返回 { text: 尾部提示文字, code: 代码文本, lang: 语言 }，代码不再混进 markdown 正文，
    // 交给模板渲染成仿编辑器代码卡片（hljs 高亮 / 行号 / 折叠）；两者都不命中返回 null，维持常规展示
    const FENCED_CODE_RE = /^\s*```([a-zA-Z0-9_+-]*)\r?\n([\s\S]*?)\r?\n```\s*/
    const splitAnswerStructured = (answerText: string): { text: string; code: string; lang: string; } | null => {
      const fence = answerText.match(FENCED_CODE_RE)
      if (fence) {
        const lang = (fence[1] || '').trim().toLowerCase() || 'text'
        return { text: answerText.slice(fence[0].length).trim(), code: fence[2], lang }
      }
      const { json, rest } = extractLeadingJsonObject(answerText)
      if (!json) return null
      return { text: rest, code: JSON.stringify(json, null, 2), lang: 'json' }
    }

    // 业务要求：SQL_QUERY_GENERAL 意图的回复不展示 SQL 语句与「响应ID」提示行。
    // 从 answer 中剔除 ```sql ... ``` 围栏代码块，并删除含「响应ID」的整行（如「> 响应ID: 46」），
    // 只保留其余正文（如用户问题引用与结果表格），最后折叠多余空行交给 markdown 正常渲染
    const SQL_FENCE_RE = /```[ \t]*sql\b[^\n]*\n[\s\S]*?\n[ \t]*```[ \t]*\n?/gi
    const RESP_ID_RE = /^[^\n]*响应ID[^\n]*\r?\n?/gm
    const stripSqlQueryAnswer = (text: string): string =>
      text
        .replace(SQL_FENCE_RE, '')
        .replace(RESP_ID_RE, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()

    // 代码卡片高亮：整段交给 highlight.js（按语言着色），输出 HTML 直接 v-html 注入。
    // 未注册的语言回退自动检测；异常时退化为 HTML 转义原文，保证不报错、无 XSS
    const escapeHtml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const highlightCode = (code: string, lang: string): string => {
      try {
        if (lang && lang !== 'text' && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
        }
        return hljs.highlightAuto(code).value
      } catch (e) {
        return escapeHtml(code)
      }
    }

    // 行号列：与代码逻辑行数一致（配合 white-space: pre 不折行，逐行对齐）
    const codeLineCount = (code: string): number => (code ? code.split('\n').length : 0)

    // 代码卡片主题：默认浅色，点卡片头主题按钮全局切换（所有代码卡片共用一套）
    const codeTheme = ref<'light' | 'dark'>('light')
    const toggleCodeTheme = (): void => {
      codeTheme.value = codeTheme.value === 'light' ? 'dark' : 'light'
    }

    // 展开 / 收起代码卡片
    const toggleCodeCard = (messageIndex: number): void => {
      const msg = messages.value[messageIndex]
      if (!msg || !msg.codeBlock) return
      msg.codeCollapsed = !msg.codeCollapsed
    }

    // 卡片头复制按钮：只复制卡片内代码文本（消息页脚的复制仍走 answer 原文）
    const copyCodeBlock = (message: ChartMessage): void => {
      if (!message.codeBlock) return
      const onCopied = () => {
        nMessage.success('已复制到剪贴板', { duration: 1500 })
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(message.codeBlock).then(onCopied).catch(() => {
          fallbackCopy(message.codeBlock as string, onCopied)
        })
      } else {
        fallbackCopy(message.codeBlock as string, onCopied)
      }
    }

    // 结构化帧（status=interrupted 待确认 / completed 已完成）→ 消息字段映射
    // 实时 WS 分支与历史会话解析共用同一套逻辑，保证两条链路渲染一致
    const buildAssistantFrameFields = (data: any): Partial<ChartMessage> | null => {
      if (data.status === 'interrupted') {
        // interrupted 帧统一只取 answer 作为显示内容：里面包含完整的结构化数据（如识别出的设备列表）
        // 以及末尾的提示文字（如「回复确认继续绑定点位」），用户能看到完整结果而非仅一句提示
        // 空白字符串同样视为空，避免渲染出空白区域
        const answerText = typeof data.answer === 'string' ? data.answer.trim() : ''
        // actions_hint 非空（如 ["confirm"]）表示后端在等用户显式动作：面板渲染确认/取消按钮
        // 供一键应答；同时不阻塞常规输入，用户也可直接发文字指出错误
        const actionsHint = Array.isArray(data.actions_hint)
          ? data.actions_hint.map((v: any) => String(v).trim()).filter((v: string) => !!v)
          : []
        // answer 若以围栏代码块或序列化 JSON 开头（如 CAD 识别结果 / Python 代码），拆出交给代码卡片展示，
        // 尾部提示文字作为正文（pending_question / pending_context 已弃用，不再回退）；
        // 拆分失败则维持整段 markdown 展示
        const split = splitAnswerStructured(answerText)
        return {
          content: split ? split.text : answerText,
          codeBlock: split ? split.code : undefined,
          codeLang: split ? split.lang : undefined,
          codeCollapsed: split ? true : undefined,
          // 拆分过的消息：复制时回到 answer 原文，不带卡片加工
          copyContent: split ? answerText : undefined,
          isInterrupted: true,
          actionsHint: actionsHint.length > 0 ? actionsHint : undefined,
          intentCode: data.intent_code != null ? String(data.intent_code) : undefined,
        }
      }
      if (data.status === 'completed') {
        const intentCode = data.intent_code != null ? String(data.intent_code) : undefined
        // answer 非空时直接作为常规助手回复展示（不区分 intent_code）
        // formatContent 会处理其中的图片 markdown 转「点击打开图片」超链接、SQL 代码块、表格等
        // 这样无论是 OTHER 闲聊还是 SQL_QUERY_GENERAL 等业务意图，用户都能看到完整的回答内容
        const answerText = typeof data.answer === 'string' ? data.answer.trim() : ''
        if (answerText) {
          // SQL_QUERY_GENERAL：按业务要求剔除 SQL 语句与「响应ID」行，只保留其余正文（问题引用 / 结果表格）
          const effectiveAnswer = intentCode === 'SQL_QUERY_GENERAL' ? stripSqlQueryAnswer(answerText) : answerText
          // answer 以围栏代码块或序列化 JSON 开头时（如确认动作后回发的 CAD 识别结果、纯 JSON 无尾随文字），
          // 拆出交给代码卡片展示，仍按常规助手消息渲染（不弹结果面板）；
          // 拆分失败（闲聊等普通文本 answer）照旧原样展示
          const split = splitAnswerStructured(effectiveAnswer)
          return {
            content: split ? split.text : effectiveAnswer,
            codeBlock: split ? split.code : undefined,
            codeLang: split ? split.lang : undefined,
            codeCollapsed: split ? true : undefined,
            // 拆分过的消息：复制时回到（已剔除 SQL 的）answer 正文，不带卡片加工
            copyContent: split ? effectiveAnswer : undefined,
            intentCode,
          }
        }
        // answer 为空时回退到结果面板展示结构化数据（如纯 JSON 结果）
        const resultPayload = data.result != null ? data.result : undefined
        return {
          content: '',
          isCompleted: true,
          intentCode,
          resultPayload,
          resultEntries: normalizePendingContext(resultPayload),
        }
      }
      // 其它未预处理的 status：返回 null，由调用方原样展示
      return null
    }

    // 历史会话里的助手消息，content 可能是后端落库的 WS 原始 JSON 帧（status=interrupted/completed）
    // 非结构化内容（普通文本 / JSON 解析失败 / 未预处理 status）一律原样文本展示
    const parseAssistantHistoryContent = (content: string): Partial<ChartMessage> => {
      const text = (content || '').trim()
      if (!text || !text.startsWith('{')) return {}
      try {
        const data = JSON.parse(text)
        if (!data || typeof data !== 'object') return {}
        return buildAssistantFrameFields(data) ?? {}
      } catch (e) {
        return {}
      }
    }

    // 加载某条历史对话的真实消息：GET /api/chat/sessionId?sessionId=xxx
    // 接口字段：type(0=用户 1=助手) / content / chatTime(时间戳) / sort(排序) / fileItemList(附件)
    const loadConversationMessages = async (sessionId: string): Promise<void> => {
      try {
        const base = import.meta.env.VITE_APP_DIFY_SESSION_HOST || 'http://10.89.34.77:8080'
        const resp = await difyRequest.get(withLoginAccount(`${base}/api/chat/sessionId`), {
          params: { sessionId },
          headers: getAuthHeaders(),
        })
        const raw = (resp.data?.data || []) as Array<{
          id?: number
          chatId?: string
          content: string
          chatTime: string
          type: number
          sort?: number
          fileItemList?: HistoryFileItem[]
        }>
        messages.value = raw
          .slice()
          .sort((a, b) => (a.sort ?? a.id ?? 0) - (b.sort ?? b.id ?? 0))
          // 确认动作帧（content 为空、无附件）也会被后端落库为一次用户回合，
          // 历史加载时过滤掉这类无任何可展示内容的消息，避免渲染出空气泡
          .filter(item =>
            (typeof item.content === 'string' && item.content.trim() !== '') ||
            (Array.isArray(item.fileItemList) && item.fileItemList.length > 0),
          )
          .map(item => {
            const base2: ChartMessage = {
              role: item.type === 0 ? 'user' : 'assistant',
              content: item.content || '',
              timestamp: parseChatTime(item.chatTime),
              // 附件：历史接口不下发体积，只展示名称并提供预览/下载入口
              files: normalizeFileItems(item.fileItemList),
            }
            // 助手消息尝试解析结构化帧（interrupted / completed 面板等）
            if (item.type !== 0) {
              Object.assign(base2, parseAssistantHistoryContent(item.content || ''))
            }
            return base2
          })
        setTimeout(scrollToBottom, 100)
      } catch (e) {
        console.error('[DifyRealDialog] 拉取会话消息失败', e)
        resetMessages()
      }
    }

    // 切换 / 加载某条历史对话
    const selectConversation = async (conv: ConversationItem): Promise<void> => {
      if (conv.id === currentConversationId.value) return
      currentConversationId.value = conv.id
      currentSessionId.value = conv.sessionId || ''
      convSource.value = 'history'
      if (conv.sessionId) {
        historyLoading.value = true
        try {
          await loadConversationMessages(conv.sessionId)
        } finally {
          historyLoading.value = false
        }
        connectChat(conv.sessionId).catch(() => {}) // 预热连接，便于后续发送
      } else {
        resetMessages()
      }
    }

    // 删除某条会话后本地收尾：若删的是当前选中会话，回退到「新建对话」空白态
    const removeConversationLocally = (convId: string): void => {
      if (currentConversationId.value === convId) {
        currentConversationId.value = ''
        currentSessionId.value = ''
        convSource.value = 'new'
        closeWs() // 关闭该会话的 WS，避免复用已删除会话的连接
        resetMessages()
      }
      conversationList.value = conversationList.value.filter(c => c.id !== convId)
    }

    // 删除历史对话：悬停出现的删除按钮 → 自定义二次确认弹窗 → DELETE /api/session/delete/{sessionId}
    const openConfirmDialog = (title: string, message: string, conv: ConversationItem): void => {
      confirmDialogTitle.value = title
      confirmDialogMessage.value = message
      pendingDeleteConv.value = conv
      confirmDialogVisible.value = true
    }

    const closeConfirmDialog = (): void => {
      confirmDialogVisible.value = false
      pendingDeleteConv.value = null
    }

    const onConfirmDelete = async (): Promise<void> => {
      const conv = pendingDeleteConv.value
      closeConfirmDialog()
      if (!conv) return
      // 本地 pending 项（sessionId 为空，后端尚未落库）：只做本地移除
      if (!conv.sessionId) {
        removeConversationLocally(conv.id)
        return
      }
      try {
        const base = import.meta.env.VITE_APP_DIFY_SESSION_HOST || 'http://10.89.34.77:8080'
        await difyRequest.delete(
          withLoginAccount(`${base}/api/session/delete/${encodeURIComponent(conv.sessionId)}`),
          { headers: getAuthHeaders() },
        )
        removeConversationLocally(conv.id)
        nMessage.success('对话已删除', { duration: 1500 })
      } catch (e) {
        console.error('[DifyRealDialog] 删除会话失败', e)
        nMessage.error('删除失败，请稍后重试')
      }
    }

    const confirmDeleteConversation = (conv: ConversationItem): void => {
      openConfirmDialog(
        '删除对话',
        `确定要删除对话「${conv.title || '未命名对话'}」吗？删除后无法恢复。`,
        conv,
      )
    }

    // 回填当前对话的 sessionId（后端「发送消息」接口返回新会话时调用）
    // 新建对话首次发送后，后端会下发 sessionId，需要回填到会话项，避免重复新建
    const bindCurrentSession = (sessionId: string) => {
      currentSessionId.value = sessionId
      const cur = conversationList.value.find(c => c.id === currentConversationId.value)
      if (cur) cur.sessionId = sessionId
    }

    // 新会话首条消息后，把该会话插入历史列表顶部并高亮（已在列表中的会话只更新选中态，不重排）
    // 列表数据来自后端 /api/session/list，后端尚未落库时先本地占位展示，避免用户看不到刚发起的对话
    const upsertNewConversation = (sessionId: string) => {
      const existing = conversationList.value.find(c => c.sessionId === sessionId)
      if (existing) {
        // 已在列表中：只更新选中态，不做置顶
        // （点击历史会话时也会收到 session_ready，若在这里置顶，选中的 item 会被顶到列表最上方）
        // 新建会话场景下该 item 本身就在顶部（下方插入即 unshift），无需再重排
        currentConversationId.value = existing.id
        convSource.value = 'history'
        return
      }
      // 仅当已发出过用户消息（pendingTitle 非空）才入列表：
      // 空白新建时不会触发这里，避免列表里冒出空的「新对话」
      if (!pendingTitle) return
      const item: ConversationItem = {
        id: `pending-${sessionId}`,
        title: pendingTitle,
        updateTime: '',
        sessionId,
      }
      conversationList.value = [item, ...conversationList.value]
      currentConversationId.value = item.id
      convSource.value = 'history' // 已发起真实会话，后续可再次「新建会话」
      pendingTitle = '' // 用完即清，避免影响下一次新建
    }

    // ===== WebSocket 连接管理 =====
    // 与服务端交互的唯一通道：ws://<host>/ws/chat?sessionId=xxx
    // 连接成功后服务端先回 session_ready 携带 session_id；之后发送 {content} 即可收到助手回复
    const WS_BASE = import.meta.env.VITE_APP_DIFY_WS_HOST || 'ws://10.89.34.77:8080'
    const MAX_RECONNECT = 10
    // 重连间隔（ms）：固定值，共 10 次机会；如需指数退避在这里改
    const RECONNECT_DELAY = 60000

    const ws = ref<WebSocket | null>(null)
    const wsStatus = ref<'idle' | 'connecting' | 'open' | 'closed' | 'error'>('idle')
    let wsSessionId = ''           // 当前 ws 所绑定的 sessionId，用于判断「复用 / 切换 / 是否仍需重连」
    let connectPromise: Promise<WebSocket> | null = null
    let reconnectCount = 0
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let pendingTitle = ''          // 新会话首条消息内容，用作历史列表标题（后端落库前）
    let handshakeResolve: ((sid: string) => void) | null = null // 两段式握手：接收后端下发的 sessionId
    let replyWatchdog: ReturnType<typeof setTimeout> | null = null // 发送后等待回复的看门狗，超时结束思考态
    // 技能按钮交互链路（本地脚本引擎）的定时器句柄与打字机状态，停止时用于中止
    let interactionThinkingTimer: ReturnType<typeof setTimeout> | null = null
    let interactionResponseTimer: ReturnType<typeof setTimeout> | null = null
    let typingTimer: ReturnType<typeof setInterval> | null = null
    let typingMessageIndex = -1

    // 重置重连状态：连接恢复 / 主动切换会话 / 主动关闭时都要调用。
    // 只清定时器不清零计数的话，一次会话里累计的失败次数会被带到后续连接上，
    // 导致新会话一开始就只剩很少的重连机会（改 10 次后这个残留更明显）
    const resetReconnect = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      reconnectCount = 0
    }

    const clearReplyWatchdog = () => {
      if (replyWatchdog) {
        clearTimeout(replyWatchdog)
        replyWatchdog = null
      }
    }

    // 统一结束「思考中」状态：移除占位消息、复位 isLoading、可选弹出 toast / 插入聊天内错误提示
    // 任何异常路径（服务端 error 帧、连接断开、响应超时、帧解析失败）都必须走到这里，避免界面卡死
    const endThinkingState = (chatText?: string, toast?: string) => {
      clearReplyWatchdog()
      const thinkingIdx = messages.value.findIndex(msg => msg.isThinking)
      if (thinkingIdx !== -1) {
        messages.value.splice(thinkingIdx, 1)
      }
      if (chatText) {
        messages.value.push({
          role: 'assistant',
          content: chatText,
          timestamp: Date.now(),
          isError: true,
        })
      }
      isLoading.value = false
      if (toast) {
        // 长错误详情（如后端透出的 SQL 异常堆栈）给更长的阅读时间，但也会自动消失；
        // 带关闭按钮，可提前关掉。阅读时长随内容长度增加，上限 15 秒
        const isLong = toast.length > 80
        const duration = isLong
          ? Math.min(5000 + Math.ceil(toast.length / 40) * 1000, 15000)
          : 3000
        // 用 naive-ui message：provider 已设 closable，长错误可手动关闭；
        // 全局把 .n-message-container 的 z-index 抬到自绘对话框（9999/10000）之上
        nMessage.error(toast, { duration })
      }
      scrollToBottom()
    }

    // 尽力从非法 JSON 帧中提取 msg 字段（后端错误信息含未转义换行导致 JSON.parse 失败时使用）
    // 返回还原转义后的 msg 文本；提取不到返回 null
    const extractErrorMsg = (raw: string): string | null => {
      const m = raw.match(/"msg"\s*:\s*"([\s\S]*)"\s*}\s*$/)
      if (!m) return null
      return m[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .trim() || null
    }

    // 尝试从后端错误信息中提取嵌套的 detail 字段
    // 典型场景：msg="调用AI失败：AI接口异常响应体：{\"detail\":\"意图识别失败，请换一种表述\"}"
    // 命中则返回反转义后的 detail 文本（更贴近用户可读提示），未命中原样返回，保证完整信息不丢失
    const prettifyErrorDetail = (msg: string): string => {
      const m = msg.match(/"detail"\s*:\s*"([^"]+)"/)
      if (m && m[1]) {
        const detail = m[1]
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
          .trim()
        if (detail) return detail
      }
      return msg
    }

    // 停止生成：
    // 1) WS 链路——清除看门狗并结束思考态；连接保持不断开（后续可继续发消息），
    //    停止后到达的迟到回复帧由 onmessage 中的 isLoading 判断丢弃；
    // 2) 技能交互链路（本地脚本引擎）——中止思考/响应定时器与打字机输出，保留已输出内容
    const stopGeneration = () => {
      clearReplyWatchdog()
      if (interactionThinkingTimer !== null) {
        clearTimeout(interactionThinkingTimer)
        interactionThinkingTimer = null
      }
      if (interactionResponseTimer !== null) {
        clearTimeout(interactionResponseTimer)
        interactionResponseTimer = null
      }
      if (typingTimer !== null) {
        clearInterval(typingTimer)
        typingTimer = null
      }

      const thinkingIdx = messages.value.findIndex(msg => msg.isThinking)
      if (thinkingIdx !== -1) {
        // 还在“思考中”，直接移除占位消息
        messages.value.splice(thinkingIdx, 1)
      } else if (typingMessageIndex !== -1 && messages.value[typingMessageIndex]) {
        // 正在打字输出：保留已输出内容，补停止标记并渲染已解析的图表
        const msg = messages.value[typingMessageIndex]
        if (!msg.content) {
          msg.content = '（已停止生成）'
        } else if (!msg.content.endsWith('（已停止生成）')) {
          msg.content += '\n\n（已停止生成）'
        }
        if (msg.flintSpecs && msg.flintSpecs.length > 0) {
          renderFlintCharts(typingMessageIndex)
        }
      }
      // 确认动作已发出、等待回复期间被停止：占位移除后末条消息即待确认帧本身，
      // 回退其「已应答」标记，允许重新点击确认/取消（已发出的动作若迟到回帧，仍被 isLoading 判断丢弃）
      const lastMsg = messages.value[messages.value.length - 1]
      if (lastMsg && lastMsg.isInterrupted && lastMsg.actionsHint && lastMsg.actionsHint.length > 0 && lastMsg.interruptResolved) {
        lastMsg.interruptResolved = false
      }
      typingMessageIndex = -1
      isLoading.value = false
      console.log('[DifyRealDialog] 已停止生成')
      scrollToBottom()
    }

    // 确保已建立连接：复用同一会话的连接，否则关闭旧连接并新建、等待 open
    // sessionId 为空时连接不带参数的 /ws/chat，由后端下发 sessionId（两段式握手）
    const connectChat = (sessionId: string): Promise<WebSocket> => {
      // 同一会话且处于连接/连接中状态，直接复用
      if (
        ws.value &&
        wsSessionId === sessionId &&
        (ws.value.readyState === WebSocket.OPEN || ws.value.readyState === WebSocket.CONNECTING)
      ) {
        return connectPromise || Promise.resolve(ws.value)
      }
      // 建新连接前清掉待执行的重连定时器（避免与本次连接竞争同一个 ws.value）
      // 注意：这里只能清定时器，不能调 resetReconnect() 清零计数——重连走的也是这条路径，
      // 清零会导致重连计数永远停在 1/MAX_RECONNECT，重连次数上限形同虚设
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      if (ws.value) {
        ws.value.close()
        ws.value = null
      }
      connectPromise = null
      wsSessionId = ''

      wsStatus.value = 'connecting'
      wsSessionId = sessionId
      // 浏览器原生 WebSocket 不支持自定义请求头，X-Src-System / token 只能随握手 URL 的 query 下发
      const rawUrl = sessionId
        ? `${WS_BASE}/ws/chat?sessionId=${encodeURIComponent(sessionId)}`
        : `${WS_BASE}/ws/chat`
      const authQuery = `X-Src-System=${encodeURIComponent(SRC_SYSTEM)}&token=${encodeURIComponent(getAuthToken())}`
      const url = withLoginAccount(`${rawUrl}${rawUrl.includes('?') ? '&' : '?'}${authQuery}`)
      console.log('[DifyRealDialog][WS] 连接中:', url)
      const socket = new WebSocket(url)
      connectPromise = new Promise<WebSocket>((resolve, reject) => {
        socket.onopen = () => {
          wsStatus.value = 'open'
          resetReconnect() // 连接成功即清零：后续再断开时重新拥有完整重连机会
          connectPromise = null
          console.log('[DifyRealDialog][WS] 已连接:', url)
          resolve(socket)
        }
        socket.onmessage = (ev: MessageEvent) => {
          let data: any
          try {
            data = JSON.parse(ev.data as string)
          } catch (e) {
            // 帧本身非法（如 msg 内含未转义换行导致 JSON 断裂）：结束思考态并提示，避免卡死
            console.error('[DifyRealDialog] 收到无法解析的消息', ev.data)
            if (isLoading.value) {
              // 尽力从原始帧中还原 msg 字段，把后端错误详情直接写入 AI 助手回复内容
              // （不再只依赖 toast 弹窗，避免用户错过关键错误原因）
              const rawDetail = extractErrorMsg(String(ev.data))
              const chatText = rawDetail
                ? `消息处理失败：${prettifyErrorDetail(rawDetail)}`
                : '消息处理失败，请稍后重试'
              endThinkingState(chatText)
            }
            return
          }
          // 服务端业务错误（如消息落库失败、意图识别失败等）：优先于其它分支判断，
          // 防止错误帧若同时携带 content 等字段被当作普通回复处理
          if (data.type === 'error' || data.error) {
            console.error('[DifyRealDialog][WS] 服务端错误:', data.msg || data.error)
            // 已停止/非等待回复状态下不弹提示，避免迟到错误帧打扰
            if (isLoading.value) {
              // 把后端返回的 msg 错误详情直接写入 AI 助手回复内容，
              // 若 msg 中嵌套了 {"detail":"..."} 结构则优先展示内层 detail，让用户看到具体原因
              const rawDetail = String(data.msg || data.error || '')
              const chatText = rawDetail
                ? `消息处理失败：${prettifyErrorDetail(rawDetail)}`
                : '消息处理失败，请稍后重试'
              endThinkingState(chatText)
            }
            return
          }
          // 结构化结果帧：status=interrupted（挂起待确认，展示 pending_question + pending_context）
          // 或 status=completed（任务完成，展示 result）。字段映射与历史会话解析共用
          // buildAssistantFrameFields()，保证两条链路渲染一致
          if (data.status === 'interrupted' || data.status === 'completed') {
            if (!isLoading.value) {
              // 已停止 / 非等待回复状态的迟到帧：仅记录，不重复插入，避免打扰
              console.log('[DifyRealDialog][WS] 非等待回复状态，忽略迟到帧', data.status)
              return
            }
            // 用结果面板替换「思考中」占位消息
            const thinkingIdx = messages.value.findIndex(msg => msg.isThinking)
            if (thinkingIdx !== -1) {
              messages.value.splice(thinkingIdx, 1)
            }
            const frameFields = buildAssistantFrameFields(data)
            if (frameFields) {
              messages.value.push({
                role: 'assistant',
                content: '',
                timestamp: Date.now(),
                ...frameFields,
                // 服务端若随结构化帧下发附件，一并渲染
                files: normalizeFileItems(data.fileItemList),
              })
            } else {
              // 理论不可达（上面已限定两种 status），保险起见仍走原样展示
              console.warn('[DifyRealDialog][WS] 结构化帧字段映射失败，原样展示:', data)
              messages.value.push({
                role: 'assistant',
                content: `（收到未在代码中预处理的返回数据（status=${data.status}），已原样展示）\n\n${JSON.stringify(data, null, 2)}`,
                timestamp: Date.now(),
              })
            }
            isLoading.value = false
            clearReplyWatchdog()
            scrollToBottom()
            return
          }
          // 服务端确认会话就绪：sessionId 完全以后端下发为准
          if (data.type === 'session_ready' && data.session_id) {
            const readyId = String(data.session_id)
            currentSessionId.value = readyId
            console.log('[DifyRealDialog][WS] 会话就绪 sessionId:', readyId)
            // 两段式握手：当前是无参数连接 → 关闭它，改用 ?sessionId=xxx 重连
            if (!sessionId) {
              handshakeResolve && handshakeResolve(readyId)
            } else {
              upsertNewConversation(readyId)
            }
            return
          }
          // 普通助手回复
          if (data.content != null) {
            // 已停止生成（或不在等待回复）时丢弃迟到帧，避免停止后内容又突然出现
            if (!isLoading.value) {
              console.log('[DifyRealDialog][WS] 非等待回复状态，忽略迟到帧')
              return
            }
            // 用真实回复替换「思考中」占位消息
            const thinkingIdx = messages.value.findIndex(msg => msg.isThinking)
            if (thinkingIdx !== -1) {
              messages.value.splice(thinkingIdx, 1)
            }
            messages.value.push({
              role: 'assistant',
              content: String(data.content),
              timestamp: Date.now(),
              // 服务端若随回复下发附件（fileItemList），一并渲染
              files: normalizeFileItems(data.fileItemList),
            })
            isLoading.value = false
            clearReplyWatchdog()
            scrollToBottom()
          }
          // ===== 兜底：以上分支均未命中（返回的数据未在代码里预处理 / 新结构） =====
          // 绝不能让对话一直卡在「思考中」：把原始返回数据原样渲染成一条助手消息
          if (isLoading.value) {
            console.warn('[DifyRealDialog][WS] 收到未在代码中预处理的帧，原样展示避免卡在思考中:', data)
            const thinkingIdx = messages.value.findIndex(msg => msg.isThinking)
            if (thinkingIdx !== -1) {
              // 用原始数据替换「思考中」占位消息
              messages.value.splice(thinkingIdx, 1)
            }
            let rawText = ''
            try {
              rawText = JSON.stringify(data, null, 2)
            } catch (e) {
              rawText = String(data)
            }
            const statusHint = typeof data.status === 'string' ? `（status=${data.status}）` : ''
            messages.value.push({
              role: 'assistant',
              content: `（收到未在代码中预处理的返回数据${statusHint}，已原样展示）\n\n${rawText}`,
              timestamp: Date.now(),
            })
            isLoading.value = false
            clearReplyWatchdog()
            scrollToBottom()
          }
        }
        socket.onerror = () => {
          wsStatus.value = 'error'
          connectPromise = null
          // 连接错误的用户提示统一在这里弹出；sendMessage 的 catch 只记日志，避免双重报警
          console.error('[DifyRealDialog][WS] 连接出错:', url)
          nMessage.error('对话连接出错，请稍后重试')
          reject(new Error('websocket error'))
        }
        socket.onclose = () => {
          wsStatus.value = 'closed'
          connectPromise = null
          console.warn('[DifyRealDialog][WS] 连接关闭:', url)
          // 正在等回复时当前活跃连接被断开（服务端异常/落库失败后直接关连接）：
          // 结束思考态并提示；两段式握手主动换连接时 ws.value 已置 null，不会误触
          if (socket === ws.value && isLoading.value) {
            endThinkingState('连接已断开，消息可能未送达', '连接已断开，请重试')
          }
          if (wsSessionId === sessionId) {
            attemptReconnect()
          }
        }
      })
      ws.value = socket
      return connectPromise
    }

    // 两段式握手：先连无参数 /ws/chat 拿后端下发的 sessionId，再关闭它、用 ?sessionId=xxx 重连
    const handshakeNewSession = (): Promise<string> => {
      return new Promise<string>((resolve, reject) => {
        handshakeResolve = resolve
        connectChat('')
          .catch(reject)
      }).then((sid: string) => {
        handshakeResolve = null
        return sid
      })
    }

    // 确保可用于发送的连接：无 sessionId 时先握手获取，再用真实 sessionId 建连
    const ensureChatSocket = async (): Promise<WebSocket> => {
      let sid = currentSessionId.value
      if (!sid) {
        sid = await handshakeNewSession()
      }
      // 关闭握手用的无参数连接，改用带 sessionId 的地址重连
      if (ws.value && wsSessionId !== sid) {
        console.log('[DifyRealDialog][WS] 握手完成，关闭临时连接，改用 sessionId 重连:', sid)
        wsSessionId = '' // 标记旧连接已作废，避免触发重连
        ws.value.close()
        ws.value = null
      }
      return connectChat(sid)
    }

    // 异常断开后的自动重连（有限次数，避免无效重试）
    const attemptReconnect = () => {
      if (reconnectCount >= MAX_RECONNECT) {
        console.error(`[DifyRealDialog][WS] 重连次数已达上限（${MAX_RECONNECT}），放弃重连`)
        nMessage.error('连接已断开，重连失败')
        return
      }
      const sid = currentSessionId.value
      if (!sid) return
      reconnectCount++
      console.warn(`[DifyRealDialog][WS] 尝试重连 ${reconnectCount}/${MAX_RECONNECT}...`)
      if (reconnectTimer) clearTimeout(reconnectTimer)
      reconnectTimer = setTimeout(() => {
        // 等待期间连接已自行恢复（如别处已重建连接）：视为重连成功并复位
        if (ws.value && ws.value.readyState === WebSocket.OPEN) {
          resetReconnect()
          return
        }
        connectChat(sid)
          .then(() => {
            // 重连成功：清零计数，本次会话后续再断开可重新拿到完整的重试次数
            resetReconnect()
            console.log('[DifyRealDialog][WS] 重连成功，已重置重连次数')
          })
          .catch(() => { /* 失败由 onerror/onclose 继续处理 */ })
      }, RECONNECT_DELAY)
    }

    // 主动关闭连接（切换会话 / 关闭弹窗 / 卸载时调用）
    const closeWs = () => {
      resetReconnect() // 清掉待执行的重连并复位计数，新会话重新计次
      clearReplyWatchdog()
      if (ws.value) {
        ws.value.close()
        ws.value = null
      }
      wsSessionId = ''
      wsStatus.value = 'closed'
    }

    watch(
      () => props.role,
      newRole => {
        config.value.role = newRole || props.com.role
      },
    )

    const scrollToBottom = async () => {
      await nextTick()
      if (messageContainer.value) {
        messageContainer.value.scrollTop = messageContainer.value.scrollHeight
      }
    }

    const showWelcomeMessage = async () => {
      // 宿主关闭文字欢迎语：保持消息区为空，由空态品牌欢迎页接手（仅当无加载错误时）
      if (!props.textWelcome && !scriptLoadError.value) return
      if (!scriptLoaded.value) {
        await new Promise<void>(resolve => {
          const timer = setInterval(() => {
            if (scriptLoaded.value) {
              clearInterval(timer)
              resolve()
            }
          }, 50)
          setTimeout(() => {
            clearInterval(timer)
            resolve()
          }, 10000)
        })
      }

      const role = currentRole.value
      const welcomeMessage = scriptEngine.getWelcomeMessage(role)
      const errorSuffix = scriptLoadError.value ? `\n\n⚠️ ${scriptLoadError.value}` : ''
      if (welcomeMessage || errorSuffix) {
        // 已切换到历史会话或已新建会话时，不要覆盖真实对话内容
        if (convSource.value !== 'none') return
        messages.value = [{
          role: 'assistant',
          content: (welcomeMessage || '') + errorSuffix,
          timestamp: Date.now(),
        }]
        setTimeout(scrollToBottom, 100)
      }
    }

    // 窗口 resize 时同步调整图表大小，并让未手动调整过的弹窗跟随视口
    const handleWindowResize = () => {
      syncSizeToViewport()
      flintChartInstances.value.forEach(instance => {
        instance.resize()
      })
    }

    onMounted(() => {
      dialogVisible.value = props.visible
      refreshUserDisplayName()
      window.addEventListener('resize', handleWindowResize)
      fetchConversationList()
      if (dialogVisible.value) {
        showWelcomeMessage()
      }
    })

    watch(
      () => props.visible,
      newVisible => {
        dialogVisible.value = newVisible
        if (newVisible) {
          // 打开前按当前视口重算尺寸/位置，避免固定 600×600 显得过小
          syncSizeToViewport()
          // 每次打开刷新发问者显示名，兼容登录账号变更后的场景
          refreshUserDisplayName()
          showWelcomeMessage()
        }
      },
    )

    watch(
      () => props.initialPosition,
      newPos => {
        if (newPos) {
          dialogPosition.value = { ...newPos }
        }
      },
    )

    watch(
      () => props.initialSize,
      newSize => {
        if (newSize) {
          dialogWidth.value = newSize.width
          dialogHeight.value = newSize.height
        }
      },
    )

    // 清理所有 Flint 图表实例
    const disposeAllCharts = () => {
      // 清理 ResizeObserver
      resizeObservers.forEach(observer => {
        observer.disconnect()
      })
      resizeObservers.length = 0

      flintChartInstances.value.forEach(instance => {
        instance.dispose()
      })
      flintChartInstances.value.clear()
      flintChartRefs.value.clear()
    }

    onUnmounted(() => {
      // 卸载时中止生成流程，防止定时器在组件销毁后继续操作响应式数据
      stopGeneration()
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mousemove', handleResize)
      document.removeEventListener('mouseup', stopResize)
      window.removeEventListener('resize', handleWindowResize)
      disposeAllCharts()
      closeWs()
    })

    const handleClose = () => {
      // 关闭窗口时停止生成，避免后台定时器/迟到回复继续输出
      stopGeneration()
      dialogVisible.value = false
      emit('update:visible', false)
      emit('close')
      closeWs()
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (props.fixed) return
      if (isResizing.value) return
      isDragging.value = true
      dragOffset.value = {
        x: e.clientX - dialogPosition.value.x,
        y: e.clientY - dialogPosition.value.y,
      }
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.value) return
      dialogPosition.value = {
        x: e.clientX - dragOffset.value.x,
        y: e.clientY - dragOffset.value.y,
      }
    }

    const handleMouseUp = () => {
      if (isDragging.value) userAdjusted.value = true
      isDragging.value = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    const isResizing = ref(false)
    const resizeDirection = ref('')
    const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0, left: 0, top: 0 })
    const dialogWidth = ref(defaultDialogSize.width)
    const dialogHeight = ref(defaultDialogSize.height)
    // 每次打开（或窗口尺寸变化）时按视口重算尺寸与位置；用户手动调整过则不再干预
    const syncSizeToViewport = () => {
      if (props.inline || userAdjusted.value) return
      const size = props.initialSize ?? computeViewportSize()
      dialogWidth.value = size.width
      dialogHeight.value = size.height
      if (!props.initialPosition) {
        dialogPosition.value = computeViewportPosition(size)
      }
    }

    // ===== 视图层状态（空态引导 / 侧栏分栏与收起 / 标题），不影响消息与会话逻辑 =====
    // 空态引导卡片：宿主可通过 suggestions 覆盖，未传则使用内置三条通用引导
    const DEFAULT_SUGGESTIONS: SuggestionCard[] = [
      { title: '查询业务数据', desc: '快速定位你需要的信息', prompt: '帮我查询业务数据' },
      { title: '解读文档内容', desc: '梳理重点，提炼关键信息', prompt: '帮我解读文档内容' },
      { title: '一起理清思路', desc: '让每个想法都有下一步', prompt: '帮我一起理清思路' },
    ]
    const suggestionCards = computed<SuggestionCard[]>(() => {
      const custom = props.suggestions
      if (custom && custom.length > 0) {
        const valid = custom.filter(item => !!item && !!item.title)
        if (valid.length > 0) return valid
      }
      return DEFAULT_SUGGESTIONS
    })
    // 点击引导卡片：仅回填输入框并聚焦，由用户确认后再发送，避免误触直接发起请求
    const applySuggestion = async (card: SuggestionCard): Promise<void> => {
      if (isLoading.value) return
      userQuery.value = card.prompt || card.title
      await nextTick()
      queryInputRef.value?.focus()
    }

    // 侧栏统一为「历史记录」，展示全部会话，不做最近/更早分组
    const SIDEBAR_MIN_WIDTH = 560

    // 侧栏收起：默认展开，窗口过窄（如 600px 浮窗）时自动收起；仅跨过阈值时干预，保留用户手动操作结果
    const sidebarCollapsed = ref(dialogWidth.value < SIDEBAR_MIN_WIDTH)
    const toggleSidebar = () => {
      sidebarCollapsed.value = !sidebarCollapsed.value
    }
    const sidebarStyle = computed(() =>
      sidebarCollapsed.value
        ? { width: '0px', flexBasis: '0px' }
        : { width: `${props.sidebarWidth}px`, flexBasis: `${props.sidebarWidth}px` },
    )
    watch(dialogWidth, (w, oldW) => {
      if (oldW == null) return
      const wasNarrow = oldW < SIDEBAR_MIN_WIDTH
      const isNarrow = w < SIDEBAR_MIN_WIDTH
      if (wasNarrow !== isNarrow) sidebarCollapsed.value = isNarrow
    })

    // 主区标题：已绑定后端会话时显示会话名，尚未绑定（新对话）时显示「新的对话」
    const headerTitle = computed(() => {
      if (!currentSessionId.value) return '新的对话'
      const current = conversationList.value.find(item => item.id === currentConversationId.value)
      return current?.title || '当前对话'
    })

    // 对话窗定位样式：内嵌模式下填满父容器；否则使用浮动定位（left/top/width/height）
    const wrapperStyle = computed(() => {
      if (props.inline) {
        return { position: 'relative' as const, left: 'auto', top: 'auto', width: '100%', height: '100%' }
      }
      return {
        left: `${dialogPosition.value.x  }px`,
        top: `${dialogPosition.value.y  }px`,
        width: `${dialogWidth.value  }px`,
        height: `${dialogHeight.value  }px`,
      }
    })

    // 宿主重新测量（如窗口缩放）时同步对话窗位置/尺寸，避免只在初始化时读一次
    watch(
      () => props.initialPosition,
      pos => {
        if (pos) {
          dialogPosition.value = { x: pos.x, y: pos.y }
        }
      },
    )

    watch(
      () => props.initialSize,
      size => {
        if (size) {
          dialogWidth.value = size.width
          dialogHeight.value = size.height
        }
      },
    )

    const startResize = (direction: string, e: MouseEvent) => {
      isResizing.value = true
      resizeDirection.value = direction
      resizeStart.value = {
        x: e.clientX,
        y: e.clientY,
        width: dialogWidth.value,
        height: dialogHeight.value,
        left: dialogPosition.value.x,
        top: dialogPosition.value.y,
      }
      document.addEventListener('mousemove', handleResize)
      document.addEventListener('mouseup', stopResize)
    }

    const handleResize = (e: MouseEvent) => {
      if (!isResizing.value) return

      const dx = e.clientX - resizeStart.value.x
      const dy = e.clientY - resizeStart.value.y
      const minWidth = 400
      const minHeight = 600

      switch (resizeDirection.value) {
        case 'n': {
          const newHeight = Math.max(minHeight, resizeStart.value.height - dy)
          const newTop = resizeStart.value.top + (resizeStart.value.height - newHeight)
          dialogHeight.value = newHeight
          dialogPosition.value.y = newTop
          break
        }
        case 's': {
          dialogHeight.value = Math.max(minHeight, resizeStart.value.height + dy)
          break
        }
        case 'e': {
          dialogWidth.value = Math.max(minWidth, resizeStart.value.width + dx)
          break
        }
        case 'w': {
          const newWidth = Math.max(minWidth, resizeStart.value.width - dx)
          const newLeft = resizeStart.value.left + (resizeStart.value.width - newWidth)
          dialogWidth.value = newWidth
          dialogPosition.value.x = newLeft
          break
        }
        case 'ne': {
          dialogWidth.value = Math.max(minWidth, resizeStart.value.width + dx)
          const newHeight = Math.max(minHeight, resizeStart.value.height - dy)
          const newTop = resizeStart.value.top + (resizeStart.value.height - newHeight)
          dialogHeight.value = newHeight
          dialogPosition.value.y = newTop
          break
        }
        case 'nw': {
          const newWidth = Math.max(minWidth, resizeStart.value.width - dx)
          const newLeft = resizeStart.value.left + (resizeStart.value.width - newWidth)
          const newHeight = Math.max(minHeight, resizeStart.value.height - dy)
          const newTop = resizeStart.value.top + (resizeStart.value.height - newHeight)
          dialogWidth.value = newWidth
          dialogPosition.value.x = newLeft
          dialogHeight.value = newHeight
          dialogPosition.value.y = newTop
          break
        }
        case 'se': {
          dialogWidth.value = Math.max(minWidth, resizeStart.value.width + dx)
          dialogHeight.value = Math.max(minHeight, resizeStart.value.height + dy)
          break
        }
        case 'sw': {
          const newWidth = Math.max(minWidth, resizeStart.value.width - dx)
          const newLeft = resizeStart.value.left + (resizeStart.value.width - newWidth)
          dialogHeight.value = Math.max(minHeight, resizeStart.value.height + dy)
          dialogWidth.value = newWidth
          dialogPosition.value.x = newLeft
          break
        }
      }
    }

    const stopResize = () => {
      if (isResizing.value) userAdjusted.value = true
      isResizing.value = false
      resizeDirection.value = ''
      document.removeEventListener('mousemove', handleResize)
      document.removeEventListener('mouseup', stopResize)
    }

    const sendMessage = async () => {
      if (!userQuery.value.trim() && uploadedFiles.value.length === 0) {
        return
      }

      // 有附件仍在上传中时，先等待全部拿到 fileId，保证 files 数组完整
      if (uploadedFiles.value.some(file => file.uploading)) {
        await new Promise<void>(resolve => {
          const timer = setInterval(() => {
            if (!uploadedFiles.value.some(file => file.uploading)) {
              clearInterval(timer)
              resolve()
            }
          }, 100)
        })
        // 等待期间附件全部上传失败且无文本，则取消本次发送（失败条目保留在输入区，由用户手动移除）
        if (!userQuery.value.trim() && uploadedFiles.value.every(file => !file.fileId)) {
          return
        }
      }

      const text = userQuery.value.trim()
      // 只有上传成功（拿到 fileId）的附件才会随消息发送
      const validFiles = uploadedFiles.value.filter(file => !!file.fileId)

      // Dify 风格：附件以 { fileId, name } 数组随文本一起发送
      const sendFiles = validFiles.map(file => ({ fileId: file.fileId as string, name: file.name }))

      const userMessage = {
        role: 'user' as const,
        content: text,
        timestamp: Date.now(),
        // 带上 fileId / accessUrl，使刚发出的附件在气泡里同样可点击预览 / 下载
        files: validFiles.length > 0
          ? validFiles.map(file => ({
            id: file.id,
            name: file.name,
            size: file.size,
            fileId: file.fileId,
            accessUrl: file.accessUrl,
          }))
          : undefined,
      }

      messages.value.push(userMessage)
      userQuery.value = ''
      // 仅清除上传成功的附件，失败条目保留在输入区由用户手动处理
      uploadedFiles.value = uploadedFiles.value.filter(file => !file.fileId)

      // 立即滚动到底部，确保刚发送的消息在可视区域内
      await scrollToBottom()
      // 附件图片等异步渲染完成后再次校准滚动位置
      setTimeout(scrollToBottom, 100)

      isLoading.value = true

      // 插入「思考中」占位消息，等待 WS 回复后替换
      messages.value.push({
        role: 'assistant' as const,
        content: '',
        timestamp: Date.now(),
        isThinking: true,
        thinkingContent: 'AI 正在思考中...',
      })
      await scrollToBottom()

      // 尚无会话：先握手拿后端 sessionId（首条消息内容用作列表标题；纯附件消息取首个文件名兜底）
      if (!currentSessionId.value) {
        convSource.value = 'new'
        pendingTitle = text || sendFiles.map(f => f.name).join('、') || '新对话'
      }

      try {
        // sessionId 完全由后端下发：无则先连无参数 /ws/chat 握手，拿到后再用 ?sessionId=xxx 发送
        const socket = await ensureChatSocket()
        // 用户主动发消息成功：重置重连计数，避免历史残留次数占掉后续断线时的重连机会
        resetReconnect()
        // 附件（若有）以数组形式与文本一起发送
        // loginAccount 随消息体一并下发（匿名发布页为 URL token），与握手 URL 上的取值保持一致，
        // 兼容后端按「每条消息」而非「连接」取账号的实现
        socket.send(
          JSON.stringify({
            content: text,
            files: sendFiles,
            loginAccount: getLoginAccount(),
            ...(currentSessionId.value ? { sessionId: currentSessionId.value } : {}),
          }),
        )
        // 看门狗：服务端异常时可能不回任何帧（或错误帧发到了已关闭的握手连接），
        // 超时未收到回复则结束思考态并提示，避免永远卡在「正在思考中」
        clearReplyWatchdog()
        replyWatchdog = setTimeout(() => {
          if (isLoading.value) {
            endThinkingState('长时间未收到响应', '响应超时，请重试')
          }
        }, 6000000)
      } catch (e) {
        // 发送失败：移除「思考中」占位消息；连接错误提示统一由 socket.onerror
        // （“对话连接出错，请稍后重试”）弹出，这里只记录日志，避免双重报警
        const thinkingIdx = messages.value.findIndex(msg => msg.isThinking)
        if (thinkingIdx !== -1) messages.value.splice(thinkingIdx, 1)
        isLoading.value = false
        pendingTitle = '' // 发送失败，清掉待用标题，避免下次误入列表
        console.error('[DifyRealDialog] 消息发送失败:', e)
      }
    }

    const handleEnter = () => {
      sendMessage()
    }

    // 待确认帧（interrupted + actions_hint）的确认应答：与常规发送同样进入等待回复态，
    // 但发送帧 content 置空、files 为空数组，另携 action 字段（取 actions_hint 首项，当前场景为 confirm）；
    // 后端收到动作后继续流程，回复帧仍走现有 interrupted / completed / 普通 content 分支处理
    const confirmInterrupted = async (messageIndex: number): Promise<void> => {
      const msg = messages.value[messageIndex]
      if (!msg || msg.interruptResolved) return
      // 仅允许应答当前会话的最新待确认帧，防止误点历史帧向后端发送过时动作
      if (messageIndex !== messages.value.length - 1) return
      const action = msg.actionsHint && msg.actionsHint.length > 0 ? msg.actionsHint[0] : 'confirm'
      msg.interruptResolved = true

      isLoading.value = true
      // 插入「思考中」占位消息，等待后端动作回复后替换
      messages.value.push({
        role: 'assistant' as const,
        content: '',
        timestamp: Date.now(),
        isThinking: true,
        thinkingContent: 'AI 正在思考中...',
      })
      await scrollToBottom()

      try {
        const socket = await ensureChatSocket()
        resetReconnect()
        socket.send(
          JSON.stringify({
            content: '',
            files: [],
            loginAccount: getLoginAccount(),
            sessionId: currentSessionId.value,
            action,
          }),
        )
        // 看门狗与 sendMessage 一致：超时未收到回复则结束思考态，避免永久卡在「正在思考中」
        clearReplyWatchdog()
        replyWatchdog = setTimeout(() => {
          if (isLoading.value) {
            endThinkingState('长时间未收到响应', '响应超时，请重试')
          }
        }, 6000000)
      } catch (e) {
        // 发送失败：移除「思考中」占位并退出等待态，错误提示与 sendMessage 同样交由 socket.onerror
        const thinkingIdx = messages.value.findIndex(m => m.isThinking)
        if (thinkingIdx !== -1) messages.value.splice(thinkingIdx, 1)
        isLoading.value = false
        console.error('[DifyRealDialog] 确认动作发送失败:', e)
      }
    }

    // 取消待确认：actions_hint 仅下发后端支持的显式动作（如 confirm），后端无「取消」动作概念，
    // 故取消只做本地解锁：解除输入区阻塞，用户可继续用常规文本指出识别错误（对应帧内提示
    // 「回复确认继续…；或指出识别错误」的后一条路径）
    const cancelInterrupted = (messageIndex: number): void => {
      const msg = messages.value[messageIndex]
      if (!msg || msg.interruptResolved) return
      if (messageIndex !== messages.value.length - 1) return
      msg.interruptResolved = true
    }

    // 从消息内容中解析 Flint spec
    const parseFlintSpecs = (content: string): FlintSpec[] => {
      const specs: FlintSpec[] = []
      const regex = /```flint\s*\n([\s\S]*?)\n```/g
      let match
      while ((match = regex.exec(content)) !== null) {
        try {
          const rawInput = JSON.parse(match[1]) as ChartAssemblyInput
          const echartsOption = assembleECharts(rawInput)
          specs.push({ rawInput, echartsOption })
        } catch (e) {
          console.warn('Failed to parse Flint spec:', e)
        }
      }
      return specs
    }

    // 从消息内容中解析 HTML 交互内容
    const parseHtmlInteractions = (content: string): HtmlInteraction[] => {
      const interactions: HtmlInteraction[] = []
      const regex = /```html\s*\n([\s\S]*?)\n```/g
      let match
      while ((match = regex.exec(content)) !== null) {
        try {
          const interaction = JSON.parse(match[1]) as HtmlInteraction
          interactions.push(interaction)
        } catch (e) {
          console.warn('Failed to parse HTML interaction:', e)
        }
      }
      return interactions
    }

    // 清理消息内容中的 Flint 代码块
    const stripFlintBlocks = (content: string): string => {
      return content.replace(/```flint\s*\n[\s\S]*?\n```/g, '')
    }

    // 清理消息内容中的 HTML 代码块
    const stripHtmlBlocks = (content: string): string => {
      return content.replace(/```html\s*\n[\s\S]*?\n```/g, '')
    }

    // 将 interrupted 帧的 pending_context 对象规整为可渲染的条目数组
    // 每个条目对应一个中间产物步骤（如 SQL_COMPOSER.sql / SQL_EXEC_AGENT.json）
    //   - 字符串值（如 SQL）：按代码块展示
    //   - 数组值（如记录列表）：按表格展示
    //   - 其它对象/基本类型：降级为 JSON / 文本展示
    // 字段缺失、类型异常、或 context 本身非法时一律安全降级，不抛错、不渲染空面板
    // 无实质内容的字段（null / 空串 / 空白串 / 空数组 / {}）直接过滤，避免出现空标题
    const isEmptyContextValue = (val: any): boolean => {
      if (val === null || val === undefined) return true
      if (typeof val === 'string') return val.trim() === ''
      if (Array.isArray(val)) return val.length === 0
      if (typeof val === 'object') return Object.keys(val).length === 0
      return false
    }

    const normalizePendingContext = (ctx: any): PendingContextEntry[] => {
      // 兼容字符串形式的 JSON：后端有时会把 pending_context / result 序列化为字符串下发
      // 先尝试 JSON.parse 还原为对象，失败则视为无上下文，避免渲染异常
      let normalized = ctx
      if (typeof ctx === 'string' && ctx.trim()) {
        try {
          normalized = JSON.parse(ctx)
        } catch (e) {
          return []
        }
      }
      if (!normalized || typeof normalized !== 'object' || Array.isArray(normalized)) return []
      return Object.keys(normalized)
        .filter(key => !isEmptyContextValue(normalized[key]))
        .map(key => {
          const val = normalized[key]
          if (Array.isArray(val)) {
            const rows = val as Array<Record<string, any>>
            const first = rows[0]
            const columns = first && typeof first === 'object' && !Array.isArray(first)
              ? Object.keys(first as Record<string, any>)
              : []
            return { key, text: '', isCode: false, isTable: true, tableColumns: columns, tableRows: rows }
          }
          if (typeof val === 'string') {
          // 字符串值可能是嵌套的 JSON 字符串：尝试解析后以格式化 JSON 展示，更易读
          // 解析失败时按原字符串展示，避免破坏原有内容
            const trimmed = val.trim()
            if (trimmed && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
              try {
                const parsed = JSON.parse(trimmed)
                return { key, text: JSON.stringify(parsed, null, 2), isCode: true, isTable: false }
              } catch (e) {
              // 非合法 JSON，按原字符串展示
              }
            }
            return { key, text: val, isCode: true, isTable: false }
          }
          if (val && typeof val === 'object') {
            try {
              return { key, text: JSON.stringify(val, null, 2), isCode: true, isTable: false }
            } catch (e) {
              return { key, text: String(val), isCode: true, isTable: false }
            }
          }
          return { key, text: String(val ?? ''), isCode: true, isTable: false }
        })
    }

    // 表格单元格文本：对象 / 数组降级为 JSON，其它转为字符串，避免显示 [object Object]
    const pendingCellText = (val: any): string => {
      if (val === null || val === undefined) return ''
      if (typeof val === 'object') {
        try {
          return JSON.stringify(val)
        } catch (e) {
          return String(val)
        }
      }
      return String(val)
    }

    // 设置图表 DOM 引用
    const setFlintChartRef = (el: any, messageIndex: number, chartIdx: number) => {
      if (el) {
        const key = `${messageIndex}-${chartIdx}`
        flintChartRefs.value.set(key, el as HTMLElement)
      }
    }

    // 渲染 Flint 图表
    const renderFlintCharts = async (messageIndex: number) => {
      await nextTick()
      const msg = messages.value[messageIndex]
      if (!msg || !msg.flintSpecs || msg.flintSpecs.length === 0) return

      msg.flintSpecs.forEach((spec, chartIdx) => {
        const key = `${messageIndex}-${chartIdx}`
        const domEl = flintChartRefs.value.get(key)
        if (!domEl) return

        // 确保容器有正确的宽度
        const rect = domEl.getBoundingClientRect()
        if (rect.width === 0) {
          // 宽度为0，等待下一帧再试
          requestAnimationFrame(() => renderFlintCharts(messageIndex))
          return
        }

        const existingInstance = flintChartInstances.value.get(key)
        if (existingInstance) {
          existingInstance.dispose()
        }

        // 根据容器实际尺寸重新生成 ECharts 配置，
        // 确保 flint-chart 计算的像素值（如饼图半径）与容器匹配
        const actualW = domEl.clientWidth || 400
        const actualH = domEl.clientHeight || 300
        let chartOption = spec.echartsOption
        const specW = chartOption._width || 0
        const specH = chartOption._height || 0
        if (Math.abs(actualW - specW) > 20 || Math.abs(actualH - specH) > 20) {
          try {
            const reassembled = assembleECharts({
              ...spec.rawInput,
              chart_spec: {
                ...spec.rawInput.chart_spec,
                canvasSize: { width: actualW, height: actualH },
              },
            })
            chartOption = reassembled
          } catch (e) {
            console.warn('Failed to re-assemble Flint chart:', e)
          }
        }

        // 读取 chartProperties 中的自定义配置（mockdata 可配）
        const rawChartProps = spec.rawInput?.chart_spec?.chartProperties || {}
        const customYAxisLabel = rawChartProps.yAxisLabel as string | undefined
        const customXAxisLabel = rawChartProps.xAxisLabel as string | undefined
        const customLegendTitle = rawChartProps.legendTitle as string | undefined

        // 修正 static series（数组形式 y 编码）产生的合成轴名
        // flint-chart 内部用 __flint_series_value 作为 unpivot 后的值列名，
        // 折线图模板直接将其作为 y 轴标签，此处替换为原始字段名或自定义标签
        const yAxisArr = Array.isArray(chartOption.yAxis) ? chartOption.yAxis : [chartOption.yAxis]
        const rawYEnc = spec.rawInput?.chart_spec?.encodings?.y
        if (Array.isArray(rawYEnc)) {
          const fieldNames = rawYEnc.map((e: any) => e?.field || '').filter(Boolean)
          const yLabel = customYAxisLabel || (fieldNames.length > 0 ? fieldNames.join(' / ') : '值')
          for (const ya of yAxisArr) {
            if (ya && typeof ya.name === 'string' && ya.name.includes('flint_series_value')) {
              ya.name = yLabel
              ya.nameGap = 55
            }
          }
        } else if (customYAxisLabel) {
          for (const ya of yAxisArr) {
            if (ya) ya.name = customYAxisLabel
          }
        }
        const xAxisArr = Array.isArray(chartOption.xAxis) ? chartOption.xAxis : [chartOption.xAxis]
        const rawXEnc = spec.rawInput?.chart_spec?.encodings?.x
        if (customXAxisLabel !== undefined) {
          // 显式配置了 x 轴标签（空字符串表示隐藏字段名标题）
          for (const xa of xAxisArr) {
            if (xa) xa.name = customXAxisLabel
          }
        } else if (Array.isArray(rawXEnc)) {
          const xFieldNames = rawXEnc.map((e: any) => e?.field || '').filter(Boolean)
          const xLabel = xFieldNames.length > 0 ? xFieldNames.join(' / ') : '值'
          for (const xa of xAxisArr) {
            if (xa && typeof xa.name === 'string' && xa.name.includes('flint_series_value')) {
              xa.name = xLabel
            }
          }
        }

        // 清除 flint-chart 自动生成的合成列名图例标题（如 __flint_series_key）
        // ecApplyLayoutToSpec 会用 color 字段名作为 graphic 文本添加到右上角
        if (chartOption.graphic) {
          const graphics = Array.isArray(chartOption.graphic) ? chartOption.graphic : [chartOption.graphic]
          const filtered = graphics.filter((g: any) => {
            const text = g?.style?.text
            if (typeof text === 'string' && text.includes('flint_series_key')) {
              return false
            }
            return true
          })
          chartOption.graphic = filtered.length > 0 ? filtered : undefined
        }
        // 如果用户配置了自定义图例标题，添加到 graphic 中
        if (customLegendTitle && chartOption.legend) {
          const legendTop = chartOption.legend.top ?? 0
          const legendLeft = chartOption.legend.left ?? 'right'
          const titleGraphic = {
            type: 'text' as const,
            left: legendLeft,
            top: Math.max(0, legendTop - 18),
            z: 100,
            style: {
              text: customLegendTitle,
              fontSize: 12,
              fontWeight: 'bold',
              fill: '#333',
              textAlign: 'left',
            },
          }
          chartOption.graphic = chartOption.graphic
            ? [...(Array.isArray(chartOption.graphic) ? chartOption.graphic : [chartOption.graphic]), titleGraphic]
            : [titleGraphic]
        }

        // 双 Y 轴支持：当 chartProperties.dualYAxis 为 true 时，
        // 将数组形式 y 编码的各系列分配到左右两个 y 轴
        if (rawChartProps.dualYAxis && Array.isArray(rawYEnc) && chartOption.series) {
          const fieldNames = rawYEnc.map((e: any) => e?.field || '').filter(Boolean)
          const leftLabel = customYAxisLabel || fieldNames[0] || 'Y1'
          const rightLabel = (rawChartProps.yAxis2Label as string) || fieldNames[1] || 'Y2'
          const leftYAxis = Array.isArray(chartOption.yAxis) ? chartOption.yAxis[0] : chartOption.yAxis

          // 从两个系列中提取数据值，计算对齐的刻度
          const getSeriesValues = (s: any): number[] => {
            if (!s || !Array.isArray(s.data)) return []
            return s.data.map((d: any) => {
              if (typeof d === 'number') return d
              if (d && typeof d === 'object' && 'value' in d) return d.value
              return 0
            })
          }

          const leftValues = getSeriesValues(chartOption.series[0])
          const rightValues = getSeriesValues(chartOption.series[1])

          // 计算"美观"的刻度范围和间隔，使双轴刻度对齐
          const computeNiceScale = (values: number[]) => {
            if (values.length === 0) {
              return { min: 0, max: 100, interval: 25 }
            }
            const min = Math.min(...values)
            const max = Math.max(...values)
            if (min === max) {
              const pad = Math.abs(max) * 0.1 || 1
              return { min: min - pad, max: max + pad, interval: pad * 2 }
            }
            const range = max - min
            const roughInterval = range / 5
            const mag = Math.pow(10, Math.floor(Math.log10(roughInterval)))
            const norm = roughInterval / mag
            let niceInterval: number
            if (norm < 1.5) niceInterval = mag
            else if (norm < 3) niceInterval = 2 * mag
            else if (norm < 7) niceInterval = 5 * mag
            else niceInterval = 10 * mag
            const niceMin = Math.floor(min / niceInterval) * niceInterval
            const niceMax = Math.ceil(max / niceInterval) * niceInterval
            return { min: niceMin, max: niceMax, interval: niceInterval }
          }

          const leftScale = computeNiceScale(leftValues)
          const rightScale = computeNiceScale(rightValues)

          // 使用相同的分割数使双轴刻度对齐
          const leftTickCount = Math.round((leftScale.max - leftScale.min) / leftScale.interval)
          const rightInterval = (rightScale.max - rightScale.min) / leftTickCount

          // 确保右轴的最小值与左轴对齐（都是 interval 的整数倍）
          const rightMin = Math.floor(rightScale.min / rightInterval) * rightInterval
          const rightMax = Math.ceil(rightScale.max / rightInterval) * rightInterval

          // 从左轴继承视觉样式，确保右轴样式一致
          const leftAxisStyle = {
            axisLine: leftYAxis?.axisLine ?? { show: true, lineStyle: {} },
            axisTick: leftYAxis?.axisTick ?? { show: true, lineStyle: {} },
            axisLabel: leftYAxis?.axisLabel ?? { show: true },
            splitLine: leftYAxis?.splitLine ?? { show: true, lineStyle: {} },
            nameTextStyle: leftYAxis?.nameTextStyle ?? {},
          }

          chartOption.yAxis = [
            {
              ...leftYAxis,
              type: 'value',
              name: leftLabel,
              nameGap: 55,
              nameLocation: 'middle',
              position: 'left',
              min: leftScale.min,
              max: leftScale.max,
              interval: leftScale.interval,
              axisLine: leftAxisStyle.axisLine,
              axisTick: leftAxisStyle.axisTick,
              axisLabel: leftAxisStyle.axisLabel,
              nameTextStyle: leftAxisStyle.nameTextStyle,
            },
            {
              ...leftAxisStyle,
              type: 'value',
              name: rightLabel,
              nameGap: 55,
              nameLocation: 'middle',
              nameRotate: 90,
              position: 'right',
              min: rightMin,
              max: rightMax,
              interval: rightInterval,
              splitLine: { show: false },
            },
          ]
          // 将第 2 个系列分配到右轴
          if (chartOption.series.length >= 2) {
            chartOption.series[1].yAxisIndex = 1
          }
          // 右轴需要额外的 grid 右边距
          if (chartOption.grid) {
            const grids = Array.isArray(chartOption.grid) ? chartOption.grid : [chartOption.grid]
            for (const g of grids) {
              if (g) g.right = (typeof g.right === 'number' ? g.right : 40) + 50
            }
          } else {
            chartOption.grid = { right: 70 }
          }
        }

        // 补充图例（flint-chart 默认不生成 legend）
        if (!chartOption.legend && chartOption.series) {
          const hasPie = chartOption.series.some((s: any) => s.type === 'pie')
          if (hasPie) {
            chartOption.legend = {
              orient: 'horizontal',
              bottom: 0,
              icon: 'circle',
              itemWidth: 10,
              itemHeight: 10,
              textStyle: { fontSize: 12 },
            }
          } else {
            chartOption.legend = {
              orient: 'horizontal',
              bottom: 0,
              textStyle: { fontSize: 12 },
            }
          }
        }

        // 对话框场景布局压缩：flint-chart 默认边距偏保守，这里收紧让图表尽量铺满容器
        const seriesList = Array.isArray(chartOption.series)
          ? chartOption.series
          : chartOption.series
            ? [chartOption.series]
            : []
        const hasPieSeries = seriesList.some((s: any) => s && s.type === 'pie')
        if (hasPieSeries) {
          // 饼图：放大半径（flint 保守比例在对话框容器里留白过多），
          // 上下预留外部标签空间，左右预留标签文字空间
          for (const s of seriesList) {
            if (!s || s.type !== 'pie') continue
            const r = s.radius
            let innerPx = 0
            let outerPx = 0
            if (Array.isArray(r)) {
              innerPx = parseFloat(r[0]) || 0
              outerPx = parseFloat(r[1]) || 0
            } else if (typeof r === 'string') {
              outerPx = parseFloat(r) || 0
            }
            if (outerPx > 0) {
              const maxOuter = Math.min((actualH - 84) / 2, (actualW - 160) / 2)
              const newOuter = Math.round(Math.max(outerPx, maxOuter))
              const ratio = innerPx > 0 ? innerPx / outerPx : 0
              s.radius = ratio > 0 ? [`${Math.round(newOuter * ratio)}px`, `${newOuter}px`] : `${newOuter}px`
            }
          }
        } else if (chartOption.xAxis || chartOption.yAxis) {
          // 笛卡尔图表：图例移到底部居中（释放右侧整列留白），收紧四周 grid
          if (chartOption.legend) {
            delete chartOption.legend.right
            chartOption.legend = {
              ...chartOption.legend,
              orient: 'horizontal',
              left: 'center',
              top: 'auto',
              bottom: 0,
            }
          }
          const yAxisList = Array.isArray(chartOption.yAxis) ? chartOption.yAxis : [chartOption.yAxis]
          const xAxisList = Array.isArray(chartOption.xAxis) ? chartOption.xAxis : [chartOption.xAxis]
          const isDualY = yAxisList.filter(Boolean).length > 1
          const hasYTitle = yAxisList.some((y: any) => y && y.name)
          const hasXTitle = xAxisList.some((x: any) => x && x.name)
          const grids = Array.isArray(chartOption.grid) ? chartOption.grid : [chartOption.grid || {}]
          for (const g of grids) {
            if (!g) continue
            g.containLabel = true
            // 轴标题（nameGap 40/55）在 grid 之外，需额外预留
            g.left = isDualY ? 70 : hasYTitle ? 56 : 10
            g.right = isDualY ? 64 : 10
            g.top = 16
            g.bottom = (hasXTitle ? 48 : 28) + 24 // x 轴标题 + 底部图例
          }
        }

        const chartInstance = echarts.init(domEl)
        chartInstance.setOption(chartOption)
        flintChartInstances.value.set(key, chartInstance)

        // 使用 ResizeObserver 监听容器尺寸变化
        if (typeof ResizeObserver !== 'undefined') {
          const observer = new ResizeObserver(() => {
            chartInstance.resize()
          })
          observer.observe(domEl)
          resizeObservers.push(observer)
        }
      })
    }

    // 存储 ResizeObserver 以便清理
    const resizeObservers: ResizeObserver[] = []

    // MCP 图片服务地址：后端 answer 中以 http://YOUR_SERVER_IP:MCP_PORT/images/xxx.png 形式下发，
    // 前端用环境变量替换占位符，并把 markdown 图片语法转成「点击打开图片」超链接（新窗口打开）
    const MCP_IMAGE_HOST = import.meta.env.VITE_APP_MCP_HOST || '10.89.33.93'
    const MCP_IMAGE_PORT = import.meta.env.VITE_APP_MCP_PORT || '8001'
    const MCP_IMAGE_BASE = `http://${MCP_IMAGE_HOST}:${MCP_IMAGE_PORT}`
    const MCP_PLACEHOLDER_RE = /http:\/\/YOUR_SERVER_IP:MCP_PORT/g

    // 文件类型 → 查看器 base 映射（配置项，后续扩展只需加键 / 配 env）：1=Markdown、2=PDF、3=图片(PNG 等)、4=视频…
    // 某类型 base 为空（未配置）时，其文件路径保持纯文本不链接；配好 base 后自动变可点击链接。改 .env 需重启 dev 生效
    const FILE_LINK_BASE_MAP: Record<string, string> = {
      1: import.meta.env.VITE_APP_MARKDOWN_LINK_BASE || 'http://10.89.33.97:3344/#/markdown/',
      2: import.meta.env.VITE_APP_PDF_LINK_BASE || '',
      3: import.meta.env.VITE_APP_IMAGE_LINK_BASE || '',
      4: import.meta.env.VITE_APP_VIDEO_LINK_BASE || '',
    }

    // 自定义 marked renderer：拦截 MCP 占位符图片转为「点击打开图片」超链接，
    // 其余 markdown 元素（表格、围栏代码块、引用、列表等）由 marked 默认渲染
    const mcpRenderer = new marked.Renderer()
    mcpRenderer.image = (href: string, _title: string | null, text: string): string => {
      if (href && href.includes('YOUR_SERVER_IP:MCP_PORT')) {
        const url = href.replace(MCP_PLACEHOLDER_RE, MCP_IMAGE_BASE)
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="mcp-image-link">点击打开图片</a>`
      }
      return `<img src="${href || ''}" alt="${text || ''}" style="max-width:100%;" />`
    }
    // 链接统一新窗口打开，避免对话框内跳转丢失聊天状态
    mcpRenderer.link = (href: string, title: string | null, text: string): string => {
      const titleAttr = title ? ` title="${title}"` : ''
      return `<a href="${href || ''}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`
    }

    marked.setOptions({
      renderer: mcpRenderer,
      gfm: true,    // GitHub Flavored Markdown：支持表格、删除线、任务列表
      breaks: true, // 单个换行符转 <br>，匹配聊天场景的宽松排版习惯
    })

    // 结果表格简化：当表格同时含「文件类型」「文件全路径」两列时，去掉表头与「文件类型」列，
    // 只保留文件路径：按「文件类型」查 FILE_LINK_BASE_MAP 取对应查看器 base 拼成可点击链接 [路径](base+路径)（类型未配置 base 则保持纯文本）。
    // 整张表用 markdown 列表（- 路径）替换；数据中可能混有零宽空格（如 "​1"），先清洗再判断
    const ZERO_WIDTH_RE = /[\u200B-\u200D\uFEFF]/g
    const cleanTableCell = (s: string): string => s.replace(ZERO_WIDTH_RE, '').trim()
    const splitTableRow = (row: string): string[] => {
      let s = row.trim()
      if (s.startsWith('|')) s = s.slice(1)
      if (s.endsWith('|')) s = s.slice(0, -1)
      return s.split('|')
    }
    const linkifyMarkdownFileTable = (text: string): string => {
      if (!text || text.indexOf('|') === -1) return text
      const lines = text.split('\n')
      const out: string[] = []
      let i = 0
      while (i < lines.length) {
        const isHeader = /^\s*\|/.test(lines[i]) && i + 1 < lines.length &&
          /^[\s|:-]+$/.test(lines[i + 1]) && lines[i + 1].includes('-')
        let handled = false
        if (isHeader) {
          const headers = splitTableRow(lines[i]).map(cleanTableCell)
          const typeIdx = headers.findIndex(h => h.includes('文件类型'))
          const locIdx = headers.findIndex(h => h.includes('文件全路径'))
          if (typeIdx !== -1 && locIdx !== -1) {
            let j = i + 2
            for (; j < lines.length && /^\s*\|/.test(lines[j]); j++) {
              const cells = splitTableRow(lines[j])
              if (cells.length <= Math.max(typeIdx, locIdx)) continue
              const path = cleanTableCell(cells[locIdx])
              if (!path) continue
              const typeCode = cleanTableCell(cells[typeIdx])
              const base = FILE_LINK_BASE_MAP[typeCode]
              const linked = base && !path.startsWith('[') ? `[${path}](<${base}${path}>)` : path
              out.push(`- ${linked}`)
            }
            i = j
            handled = true
          }
        }
        if (!handled) {
          out.push(lines[i])
          i++
        }
      }
      return out.join('\n')
    }

    // 格式化内容：清理 Flint/HTML 块后用 marked 解析 markdown
    // 表格、SQL 围栏代码块、引用、列表、加粗、行内代码等均由 marked 标准渲染，
    // MCP 占位符图片走自定义 renderer 转超链接，不再需要硬编码 regex 链
    const formatContent = (content: string): string => {
      const cleaned = stripHtmlBlocks(stripFlintBlocks(content))
      // 兜底：纯文本中残留的 MCP 占位符 URL（不在 markdown 图片语法内）也替换为真实地址
      const withRealUrl = cleaned.replace(MCP_PLACEHOLDER_RE, MCP_IMAGE_BASE)
      return marked.parse(linkifyMarkdownFileTable(withRealUrl)) as string
    }

    // 链接查看弹层状态：AI 回复中的 http/https 链接点击后在本地弹层内嵌打开（占视口 90%）
    const linkViewerVisible = ref(false)
    const linkViewerUrl = ref('')
    const linkViewerTitle = ref('')

    const openLinkViewer = (url: string, title = '') => {
      linkViewerUrl.value = url
      linkViewerTitle.value = title
      linkViewerVisible.value = true
    }

    // 事件代理拦截 v-html 注入内容里的 <a> 点击：http/https 链接改由本地弹层展示，
    // 阻止默认的 target="_blank" 新标签页跳转；其余链接（如 # 锚点、download 附件）保持原行为
    const handleContentLinkClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement | null)?.closest?.('a')
      if (!anchor) return
      const raw = anchor.getAttribute('href') || ''
      if (!/^https?:\/\//i.test(raw)) return
      e.preventDefault()
      openLinkViewer(raw, anchor.textContent || '')
    }

    const formatTime = (timestamp: number): string => {
      const date = new Date(timestamp)
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `${hours}:${minutes}`
    }

    // 将接口 chatTime（"2026-08-28 09:00:00"）转为数值时间戳；解析失败回退当前时间
    const parseChatTime = (chatTime: string): number => {
      const t = chatTime ? chatTime.replace(' ', 'T') : ''
      const parsed = t ? new Date(t).getTime() : NaN
      return Number.isNaN(parsed) ? Date.now() : parsed
    }

    const copyMessageContent = (message: ChartMessage) => {
      const onCopied = () => {
        nMessage.success('已复制到剪贴板', { duration: 1500 })
      }
      // 附件名一并复制；「已完成」面板正文通常为空，此时回退复制原始 result；
      // 经拆分美化过的消息（content 含折叠/围栏加工）优先复制 copyContent 原文
      const parts: string[] = []
      const bodyText = message.copyContent || message.content
      if (bodyText) {
        parts.push(bodyText)
      } else if (message.resultPayload) {
        try {
          parts.push(JSON.stringify(message.resultPayload, null, 2))
        } catch (e) {
          parts.push(String(message.resultPayload))
        }
      }
      const attachText = (message.files || []).map(file => file.name).join('、')
      if (attachText) {
        parts.push(`附件：${attachText}`)
      }
      const text = parts.join('\n')
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(onCopied).catch(() => {
          fallbackCopy(text, onCopied)
        })
      } else {
        fallbackCopy(text, onCopied)
      }
    }

    const fallbackCopy = (text: string, onCopied?: () => void) => {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      try {
        const ok = document.execCommand('copy')
        if (ok) {
          onCopied && onCopied()
        } else {
          nMessage.error('复制失败，请手动复制', { duration: 1500 })
        }
      } catch (err) {
        nMessage.error('复制失败，请手动复制', { duration: 1500 })
      }
      document.body.removeChild(textArea)
    }

    const clearMessages = () => {
      // 若仍在生成中，先停止输出，避免残留定时器继续写入已清空的消息列表
      stopGeneration()
      disposeAllCharts()
      messages.value = []
      showWelcomeMessage()
    }

    // 仅清空消息、不插入欢迎语（切换会话 / 新建会话 / 加载历史时使用）
    const resetMessages = () => {
      // 切换会话前若仍在生成中，先停止输出
      stopGeneration()
      disposeAllCharts()
      messages.value = []
    }

    // 切换技能选中状态
    const toggleSkill = (messageIndex: number, skillName: string) => {
      const msg = messages.value[messageIndex]
      if (!msg || !msg.selectedSkills || msg.interactionResolved) return
      const idx = msg.selectedSkills.indexOf(skillName)
      if (idx === -1) {
        msg.selectedSkills.push(skillName)
      } else {
        msg.selectedSkills.splice(idx, 1)
      }
    }

    // 确认技能选择
    // 使用按钮实际文本作为消息发送给脚本引擎，使不同场景的确认按钮
    // （如"确认"等）都能匹配对应状态的关键词
    const confirmSkillSelection = (messageIndex: number, btn?: ButtonConfig) => {
      const msg = messages.value[messageIndex]
      if (!msg || msg.interactionResolved) return
      const selected = msg.selectedSkills || []
      msg.interactionResolved = true
      // 优先使用 mockdata.json 中按钮配置的 resolvedText；
      // resolvedText 支持 {selected} 占位符，自动替换为用户实际勾选的技能；
      // 若 resolvedText 为空但有选中项，仍显示选中项摘要；否则不显示提示文本
      if (btn?.resolvedText) {
        msg.interactionText = btn.resolvedText.replace(/\{selected\}/g, selected.length > 0 ? selected.join('、') : '（未选择）')
      } else if (selected.length > 0) {
        msg.interactionText = `已选择：${selected.join('、')}`
      } else {
        msg.interactionText = undefined
      }
      sendInteractionMessage(btn?.text || '确认')
    }

    // 取消技能选择
    // 使用按钮实际文本作为消息发送给脚本引擎，使不同场景的取消按钮
    // 都能匹配对应状态的关键词
    const cancelSkillSelection = (messageIndex: number, btn?: ButtonConfig) => {
      const msg = messages.value[messageIndex]
      if (!msg || msg.interactionResolved) return
      msg.interactionResolved = true
      msg.selectedSkills = []
      // 优先使用 mockdata.json 中按钮配置的 resolvedText；为空则不展示提示文本
      msg.interactionText = btn?.resolvedText || undefined
      sendInteractionMessage(btn?.text || '取消')
    }

    // 确认技能列表
    // 使用按钮实际文本作为消息发送给脚本引擎，使不同场景的确认按钮
    // （如"确认联动"、"确认屏蔽"、"确认"等）都能匹配对应状态的关键词
    const confirmSkillList = (messageIndex: number, btn?: ButtonConfig) => {
      const msg = messages.value[messageIndex]
      if (!msg || msg.interactionResolved) return
      msg.interactionResolved = true
      // 优先使用 mockdata.json 中按钮配置的 resolvedText；为空则不展示提示文本
      msg.interactionText = btn?.resolvedText || undefined
      sendInteractionMessage(btn?.text || '确认')
    }

    // 取消技能列表
    // 使用按钮实际文本作为消息发送给脚本引擎，使不同场景的取消按钮
    // （如"取消"、"生成清洁工单"等）都能匹配对应状态的关键词
    const cancelSkillList = (messageIndex: number, btn?: ButtonConfig) => {
      const msg = messages.value[messageIndex]
      if (!msg || msg.interactionResolved) return
      msg.interactionResolved = true
      // 优先使用 mockdata.json 中按钮配置的 resolvedText；为空则不展示提示文本
      msg.interactionText = btn?.resolvedText || undefined
      sendInteractionMessage(btn?.text || '取消')
    }

    // 发送交互结果消息（不显示用户消息，直接触发脚本引擎返回结果）
    const sendInteractionMessage = (text: string) => {
      isLoading.value = true
      interactionThinkingTimer = setTimeout(async () => {
        interactionThinkingTimer = null
        const thinkingMessage = {
          role: 'assistant' as const,
          content: '',
          timestamp: Date.now(),
          isThinking: true,
          thinkingContent: 'AI 正在思考中，请稍候...',
        }
        messages.value.push(thinkingMessage)
        await scrollToBottom()
      }, 300)

      interactionResponseTimer = setTimeout(async () => {
        interactionResponseTimer = null
        const response = scriptEngine.getResponse(text)
        const flintSpecs = parseFlintSpecs(response)
        const htmlInteractions = parseHtmlInteractions(response)
        const textContent = stripHtmlBlocks(stripFlintBlocks(response)).trim()

        const thinkingIndex = messages.value.findIndex(msg => msg.isThinking)
        if (thinkingIndex !== -1) {
          messages.value[thinkingIndex] = {
            role: 'assistant' as const,
            content: '',
            timestamp: Date.now(),
            isThinking: false,
            flintSpecs: flintSpecs.length > 0 ? flintSpecs : undefined,
            htmlInteractions: htmlInteractions.length > 0 ? htmlInteractions : undefined,
            selectedSkills: htmlInteractions.length > 0 ? [] : undefined,
            interactionResolved: false,
          }
          await scrollToBottom()

          const typingSpeed = 50
          let index = 0
          typingMessageIndex = thinkingIndex
          const interval = setInterval(() => {
            if (index < textContent.length) {
              messages.value[thinkingIndex].content = textContent.slice(0, index + 1)
              index++
              scrollToBottom()
            } else {
              clearInterval(interval)
              typingTimer = null
              typingMessageIndex = -1
              isLoading.value = false
              if (flintSpecs.length > 0) {
                renderFlintCharts(thinkingIndex)
              }
            }
          }, typingSpeed)
          typingTimer = interval
        }
      }, 2500 + Math.random() * 500)
    }

    // ===== 附件上传（真实接口） =====
    // POST {UPLOAD_HOST}/api/file/upload/batch，multipart/form-data：loginAccount + files
    // 返回 { code, msg, data: [{ accessUrl, filesId, originalFileName }] }
    // 地址可用 VITE_APP_DIFY_UPLOAD_HOST 覆盖，未配置时回退 VITE_APP_DIFY_SESSION_HOST
    const UPLOAD_HOST =
      import.meta.env.VITE_APP_DIFY_UPLOAD_HOST ||
      import.meta.env.VITE_APP_DIFY_SESSION_HOST ||
      'http://10.89.34.77:8080'

    // 上传单个文件（一个文件一个请求）；失败直接抛出，由调用方标记错误态
    const uploadFile = async (file: File): Promise<UploadedFileMeta> => {
      const form = new FormData()
      // 登录账号：未登录时兜底 admin，与 Postman 调试取值保持一致
      form.append('loginAccount', getLoginAccount() || 'admin')
      form.append('files', file, file.name)

      // axios 检测到 FormData 会自动删除 Content-Type，由浏览器补上 multipart boundary
      // 组态侧鉴权：X-Src-System 固定标识来源系统，token 取发布页 URL 参数或 localStorage 的 DataS-Token
      const resp = await difyRequest.post(`${UPLOAD_HOST}/api/file/upload/batch`, form, {
        headers: getAuthHeaders(),
      })
      const meta = ((resp.data?.data || []) as UploadedFileMeta[])[0]
      if (!meta || !meta.filesId) {
        throw new Error('上传返回数据为空')
      }
      console.log('[DifyRealDialog] 附件上传成功:', {
        name: file.name,
        filesId: meta.filesId,
        accessUrl: meta.accessUrl,
      })
      return meta
    }

    // 选好文件立即上传：逐个串行调用上传接口，避免并发抢占
    const handleFileSelect = async (event: Event) => {
      const target = event.target as HTMLInputElement
      if (!target.files || target.files.length === 0) return

      // 先拷贝再清空 input，保证同一文件可重复选择并再次触发 change
      const fileList = Array.from(target.files)
      target.value = ''

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i]
        const item = {
          id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          size: file.size,
          uploading: true,
        }
        uploadedFiles.value.push(item)
        try {
          const meta = await uploadFile(file)
          // 按 id 回填（用户可能在上传过程中手动移除该附件）
          const entry = uploadedFiles.value.find(f => f.id === item.id)
          if (entry) {
            entry.fileId = meta.filesId
            entry.accessUrl = meta.accessUrl
            entry.uploading = false
          }
        } catch (e) {
          console.error('[DifyRealDialog] 附件上传失败:', file.name, e)
          const entry = uploadedFiles.value.find(f => f.id === item.id)
          if (entry) {
            entry.uploading = false
            entry.error = true
          }
          nMessage.error(`附件「${file.name}」上传失败`)
        }
      }
    }

    const removeFile = (id: string) => {
      uploadedFiles.value = uploadedFiles.value.filter(file => file.id !== id)
    }

    const openFileDialog = () => {
      fileInputRef.value?.click()
    }

    const formatFileSize = (size: number): string => {
      if (size < 1024) {
        return `${size} B`
      } else if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`
      } else {
        return `${(size / (1024 * 1024)).toFixed(1)} MB`
      }
    }

    // ===== 附件展示辅助 =====
    // 后端 fileItemList[] → 消息附件结构；空数组返回 undefined，模板按缺省处理更省事
    const normalizeFileItems = (list?: HistoryFileItem[] | null) => {
      if (!Array.isArray(list) || list.length === 0) return undefined
      const files = list
        .filter(item => item && (item.originalFileName || item.fileId))
        .map((item, index) => ({
          id: item.fileId || `hist-file-${index}`,
          name: item.originalFileName || item.fileId || '附件',
          fileId: item.fileId,
          accessUrl: item.accessUrl,
        }))
      return files.length > 0 ? files : undefined
    }

    // 取小写扩展名（含点），用于图标与图片判定
    const getFileExt = (name: string): string => {
      const idx = (name || '').lastIndexOf('.')
      return idx === -1 ? '' : name.slice(idx).toLowerCase()
    }

    const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg']
    const isImageFile = (name: string): boolean => IMAGE_EXTS.includes(getFileExt(name))

    // 按扩展名给出对应图标，未命中走通用文件图标
    const fileIcon = (name: string): string => {
      const ext = getFileExt(name)
      if (IMAGE_EXTS.includes(ext)) return '🖼️'
      if (['.xls', '.xlsx', '.csv'].includes(ext)) return '📊'
      if (['.doc', '.docx', '.txt', '.md'].includes(ext)) return '📝'
      if (['.pdf'].includes(ext)) return '📕'
      if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) return '🗜️'
      if (['.json', '.xml', '.yaml', '.yml'].includes(ext)) return '🧩'
      if (['.mp4', '.avi', '.mov', '.mkv'].includes(ext)) return '🎬'
      return '📄'
    }

    // 图片缩略图加载失败（地址失效/无权限）时记录下来，回退成图标展示
    const brokenThumbs = ref<Set<string>>(new Set())
    const onThumbError = (url: string) => {
      if (!url || brokenThumbs.value.has(url)) return
      brokenThumbs.value = new Set(brokenThumbs.value).add(url)
    }
    const isThumbBroken = (url: string): boolean => !!url && brokenThumbs.value.has(url)

    // 获取按钮配置，如果未配置则使用默认值
    const getButtons = (interaction: HtmlInteraction) => {
      if (interaction.buttons && interaction.buttons.length > 0) {
        return interaction.buttons
      }
      // 默认按钮配置
      return [
        { type: 'confirm' as const, text: '确定' },
        { type: 'cancel' as const, text: '取消' },
      ]
    }

    // 获取按钮的内联样式（用于每个按钮单独配置颜色）
    const getButtonInlineStyle = (btn: ButtonConfig) => {
      if (!btn.color) {
        return {}
      }
      const style: Record<string, string> = {}
      if (btn.color.backgroundColor) {
        style.background = btn.color.backgroundColor
      }
      if (btn.color.textColor) {
        style.color = btn.color.textColor
      }
      if (btn.type === 'cancel' && btn.color.borderColor) {
        style.border = `1px solid ${btn.color.borderColor}`
      }
      return style
    }

    return {
      dialogVisible,
      userQuery,
      messages,
      isLoading,
      historyLoading,
      messageContainer,
      mdEditorVisible,
      sendMessage,
      stopGeneration,
      clearMessages,
      resetMessages,
      conversationList,
      currentConversationId,
      currentSessionId,
      createNewConversation,
      selectConversation,
      confirmDeleteConversation,
      confirmDialogVisible,
      confirmDialogTitle,
      confirmDialogMessage,
      closeConfirmDialog,
      onConfirmDelete,
      bindCurrentSession,
      closeWs,
      handleClose,
      handleEnter,
      formatContent,
      formatTime,
      linkViewerVisible,
      linkViewerUrl,
      linkViewerTitle,
      openLinkViewer,
      handleContentLinkClick,
      copyMessageContent,
      normalizePendingContext,
      pendingCellText,
      dialogPosition,
      handleMouseDown,
      uploadedFiles,
      fileInputRef,
      handleFileSelect,
      removeFile,
      openFileDialog,
      formatFileSize,
      isImageFile,
      fileIcon,
      onThumbError,
      isThumbBroken,
      isUploadingFiles,
      dialogWidth,
      dialogHeight,
      wrapperStyle,
      startResize,
      currentRole,
      userDisplayName,
      setFlintChartRef,
      toggleSkill,
      confirmSkillSelection,
      cancelSkillSelection,
      confirmSkillList,
      cancelSkillList,
      getButtons,
      getButtonInlineStyle,
      chatFontScale,
      chatFontStyle,
      // 视图层新增：空态引导、侧栏分栏/收起、标题、用户信息、输入框实例
      suggestionCards,
      applySuggestion,
      sidebarCollapsed,
      toggleSidebar,
      sidebarStyle,
      headerTitle,
      roleLabel,
      userInitial,
      showUserSub,
      queryInputRef,
      canSend,
      confirmInterrupted,
      cancelInterrupted,
      highlightCode,
      codeLineCount,
      codeTheme,
      toggleCodeTheme,
      toggleCodeCard,
      copyCodeBlock,
      scrollToBottom,
    }
  },
})
</script>

<style lang="scss" scoped>
/* =========================================================================
   AI 智能助手对话窗｜视觉规范（浅色 · 蓝色主色）
   品牌蓝 #2f6bff ｜ 主区底色 #f6f8fc ｜ 卡片白底 + 1px 细边框
   所有尺寸均乘以 --chat-font-scale，保证「字体缩放」功能整体一致
   ========================================================================= */
.custom-dialog {
  --chat-primary: #2f6bff;
  --chat-primary-strong: #1c56e6;
  --chat-primary-soft: #eef4ff;
  --chat-bg: #f6f8fc;
  --chat-card: #ffffff;
  --chat-border: #e8eef8;
  --chat-border-soft: #eff3fa;
  --chat-title: #1b2434;
  --chat-text: #2b3747;
  --chat-text-sub: #6c7c93;
  --chat-text-light: #9aa8bb;
  /* 内容列最大宽度：欢迎页 / 消息列表 / 输入区共用，改这一个值即可整体加宽 */
  --chat-content-max: 1040px;
}

/* 组件内统一使用 border-box：项目没有全局 reset，content-box 下「width:100% + padding」
   会把容器撑得比父级更宽（消息区/气泡会溢出对话框），统一盒子模型后尺寸可预期 */
.custom-dialog,
.custom-dialog * {
  box-sizing: border-box;
}

.custom-dialog-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 9999;
}

.custom-dialog-mask.no-mask {
  background-color: transparent;
  pointer-events: none;
}

.custom-dialog-mask.no-mask .custom-dialog-wrapper {
  pointer-events: auto;
}

.custom-dialog-wrapper {
  position: absolute;
  background-color: transparent;
  z-index: 10000;
}

/* 内嵌模式：遮罩层不再固定全屏，改为填满宿主容器；窗体相对定位铺满 */
.custom-dialog-mask.inline-mode {
  position: relative;
  top: auto;
  left: auto;
  right: auto;
  bottom: auto;
  width: 100%;
  height: 100%;
  background-color: transparent;
  z-index: auto;
  pointer-events: auto;
}

.custom-dialog-mask.inline-mode .custom-dialog-wrapper {
  position: relative;
  z-index: auto;
}

.custom-dialog {
  width: 100%;
  height: 100%;
  background-color: var(--chat-card);
  border-radius: 18px;
  box-shadow: 0 24px 70px rgba(19, 45, 92, 0.18), 0 6px 20px rgba(19, 45, 92, 0.08);
  overflow: hidden;
  /* 横向布局：左侧会话栏 + 右侧主区 */
  display: flex;
  flex-direction: row;
  /* 基准字号随缩放倍率变化，未单独声明字号的文字也跟随缩放 */
  font-size: calc(14px * var(--chat-font-scale, 1));
  color: var(--chat-text);
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif;
}

.custom-dialog-fixed .sidebar-brand,
.custom-dialog-fixed .chat-main-header {
  cursor: default;
}

.dify-api-container {
  display: flex;
  flex-direction: row;
  flex: 1;
  min-width: 0;
  min-height: 0;
  background-color: var(--chat-bg);
  overflow: hidden;
}

/* ===================== 左侧：会话栏 ===================== */
.conversation-sidebar {
  /* 宽度由 prop sidebarWidth 经 sidebarStyle 动态控制（收起时为 0） */
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background-color: var(--chat-card);
  border-right: 1px solid var(--chat-border-soft);
  height: 100%;
  overflow: hidden;
}

/* 收起态：整栏不参与布局（宽度由 sidebarStyle 同步置 0） */
.custom-dialog.sidebar-collapsed .conversation-sidebar {
  display: none;
}

.sidebar-brand {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: calc(12px * var(--chat-font-scale, 1));
  padding: calc(18px * var(--chat-font-scale, 1)) calc(16px * var(--chat-font-scale, 1));
  cursor: move;
  user-select: none;
}

.brand-logo {
  flex-shrink: 0;
  width: calc(44px * var(--chat-font-scale, 1));
  height: calc(44px * var(--chat-font-scale, 1));
  border-radius: calc(13px * var(--chat-font-scale, 1));
  background: linear-gradient(135deg, #4f8bff 0%, #1f5fe8 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 16px rgba(47, 107, 255, 0.3);

  /* v-html 注入的 svg 不带 scoped 属性，需用 :deep 才能生效 */
  :deep(svg) {
    width: calc(23px * var(--chat-font-scale, 1));
    height: calc(23px * var(--chat-font-scale, 1));
  }
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: calc(3px * var(--chat-font-scale, 1));
  min-width: 0;
}

.brand-title {
  font-size: calc(16px * var(--chat-font-scale, 1));
  font-weight: 700;
  color: var(--chat-title);
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.brand-subtitle {
  font-size: calc(11.5px * var(--chat-font-scale, 1));
  color: var(--chat-text-light);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-actions {
  flex-shrink: 0;
  padding: calc(2px * var(--chat-font-scale, 1)) calc(16px * var(--chat-font-scale, 1)) calc(14px * var(--chat-font-scale, 1));
}

.new-conversation-btn {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  min-height: calc(46px * var(--chat-font-scale, 1));
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(8px * var(--chat-font-scale, 1));
  border: none;
  border-radius: calc(13px * var(--chat-font-scale, 1));
  background: linear-gradient(135deg, #4a83ff 0%, #2564e0 100%);
  color: #ffffff;
  font-size: calc(14.5px * var(--chat-font-scale, 1));
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(47, 107, 255, 0.26);
  transition: box-shadow 0.2s, transform 0.1s;
}

.new-conversation-btn:hover {
  box-shadow: 0 8px 22px rgba(47, 107, 255, 0.36);
}

.new-conversation-btn:active {
  transform: translateY(1px);
}

.new-conversation-plus {
  width: calc(17px * var(--chat-font-scale, 1));
  height: calc(17px * var(--chat-font-scale, 1));
}

.new-conversation-arrow {
  position: absolute;
  right: calc(14px * var(--chat-font-scale, 1));
  width: calc(17px * var(--chat-font-scale, 1));
  height: calc(17px * var(--chat-font-scale, 1));
  opacity: 0.9;
}

.sidebar-section-title {
  flex-shrink: 0;
  padding: calc(12px * var(--chat-font-scale, 1)) calc(14px * var(--chat-font-scale, 1)) calc(6px * var(--chat-font-scale, 1));
  font-size: calc(12px * var(--chat-font-scale, 1));
  font-weight: 500;
  color: #93a1b5;
}

.conversation-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: calc(10px * var(--chat-font-scale, 1)) calc(12px * var(--chat-font-scale, 1)) calc(14px * var(--chat-font-scale, 1));
}

.conversation-list::-webkit-scrollbar {
  width: 6px;
}

.conversation-list::-webkit-scrollbar-track {
  background: transparent;
}

.conversation-list::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 3px;
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: calc(10px * var(--chat-font-scale, 1));
  padding: calc(10px * var(--chat-font-scale, 1)) calc(11px * var(--chat-font-scale, 1));
  margin-bottom: calc(2px * var(--chat-font-scale, 1));
  border: 1px solid transparent;
  border-radius: calc(11px * var(--chat-font-scale, 1));
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s, box-shadow 0.15s;
}

.conversation-item:hover {
  background-color: #f5f8fe;
}

.conversation-item.active {
  background-color: var(--chat-card);
  border-color: var(--chat-border);
  box-shadow: 0 3px 10px rgba(31, 71, 150, 0.07);
}

.conversation-item-icon {
  flex-shrink: 0;
  width: calc(18px * var(--chat-font-scale, 1));
  height: calc(18px * var(--chat-font-scale, 1));
  color: #a4b1c4;
}

.conversation-item.active .conversation-item-icon {
  color: var(--chat-primary);
}

.conversation-item-title {
  flex: 1;
  min-width: 0;
  font-size: calc(13px * var(--chat-font-scale, 1));
  font-weight: 500;
  color: #46556c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-item.active .conversation-item-title {
  color: var(--chat-title);
  font-weight: 600;
}

/* 删除按钮：默认隐藏，悬停会话项时显示 */
.conversation-delete-btn {
  flex-shrink: 0;
  width: calc(22px * var(--chat-font-scale, 1));
  height: calc(22px * var(--chat-font-scale, 1));
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: calc(6px * var(--chat-font-scale, 1));
  color: #a4b1c4;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, background-color 0.15s, color 0.15s;

  svg {
    width: calc(15px * var(--chat-font-scale, 1));
    height: calc(15px * var(--chat-font-scale, 1));
  }
}

.conversation-item:hover .conversation-delete-btn {
  opacity: 1;
}

.conversation-delete-btn:hover {
  background-color: #fee2e2;
  color: #ef4444;
}

.conversation-empty {
  margin-top: calc(28px * var(--chat-font-scale, 1));
  text-align: center;
  font-size: calc(12px * var(--chat-font-scale, 1));
  color: var(--chat-text-light);
}

/* 底部：当前登录用户 / 角色 */
.sidebar-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: calc(10px * var(--chat-font-scale, 1));
  padding: calc(12px * var(--chat-font-scale, 1)) calc(16px * var(--chat-font-scale, 1));
  border-top: 1px solid var(--chat-border-soft);
}

.user-avatar {
  flex-shrink: 0;
  width: calc(34px * var(--chat-font-scale, 1));
  height: calc(34px * var(--chat-font-scale, 1));
  border-radius: 50%;
  background: linear-gradient(135deg, #4a83ff 0%, #2564e0 100%);
  color: #ffffff;
  font-size: calc(14px * var(--chat-font-scale, 1));
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: calc(2px * var(--chat-font-scale, 1));
}

.user-name {
  font-size: calc(13px * var(--chat-font-scale, 1));
  font-weight: 600;
  color: var(--chat-title);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-sub {
  font-size: calc(11.5px * var(--chat-font-scale, 1));
  color: var(--chat-text-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-switch-icon {
  flex-shrink: 0;
  width: calc(16px * var(--chat-font-scale, 1));
  height: calc(16px * var(--chat-font-scale, 1));
  color: #b6c2d3;
}

/* ===================== 右侧：主区 ===================== */
.chat-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--chat-bg);
}

.chat-main-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(12px * var(--chat-font-scale, 1));
  padding: calc(13px * var(--chat-font-scale, 1)) calc(20px * var(--chat-font-scale, 1));
  background-color: var(--chat-card);
  border-bottom: 1px solid var(--chat-border-soft);
  cursor: move;
  user-select: none;
}

.chat-main-title-wrap {
  display: flex;
  align-items: center;
  gap: calc(10px * var(--chat-font-scale, 1));
  min-width: 0;
}

.sidebar-toggle-btn {
  flex-shrink: 0;
  width: calc(30px * var(--chat-font-scale, 1));
  height: calc(30px * var(--chat-font-scale, 1));
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: calc(9px * var(--chat-font-scale, 1));
  background: transparent;
  color: #7d8b9f;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;

  svg {
    width: calc(18px * var(--chat-font-scale, 1));
    height: calc(18px * var(--chat-font-scale, 1));
  }
}

.sidebar-toggle-btn:hover {
  background-color: var(--chat-primary-soft);
  color: var(--chat-primary);
}

.chat-main-title {
  font-size: calc(16px * var(--chat-font-scale, 1));
  font-weight: 600;
  color: #2a3547;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-main-actions {
  display: flex;
  align-items: center;
  gap: calc(8px * var(--chat-font-scale, 1));
}

.pill-btn {
  height: calc(30px * var(--chat-font-scale, 1));
  padding: 0 calc(14px * var(--chat-font-scale, 1));
  border: 1px solid #e2ecfd;
  border-radius: calc(9px * var(--chat-font-scale, 1));
  background-color: #f2f7ff;
  color: var(--chat-primary);
  font-size: calc(12.5px * var(--chat-font-scale, 1));
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;
}

.pill-btn:hover {
  background-color: #e8f1ff;
  border-color: #cfe0ff;
}

.pill-btn.active {
  background-color: #e2edff;
  border-color: #b7d1ff;
}

.round-icon-btn {
  width: calc(30px * var(--chat-font-scale, 1));
  height: calc(30px * var(--chat-font-scale, 1));
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--chat-border);
  border-radius: 50%;
  background-color: var(--chat-card);
  color: #7d8b9f;
  font-size: calc(18px * var(--chat-font-scale, 1));
  line-height: 1;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
}

.round-icon-btn:hover {
  background-color: #fff1f1;
  border-color: #ffd6d6;
  color: #ef4444;
}

/* ===================== 消息区 ===================== */
.message-section-wrapper {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

/* 切换历史会话时的「加载中」遮罩：覆盖消息区，避免空白闪烁 */
.history-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: rgba(246, 248, 252, 0.86);
  backdrop-filter: blur(1px);
  user-select: none;
}

.history-loading-spinner {
  width: 34px;
  height: 34px;
  border: 3px solid #dbe7ff;
  border-top-color: var(--chat-primary);
  border-radius: 50%;
  animation: dify-real-spin 0.8s linear infinite;
}

.history-loading-text {
  font-size: calc(14px * var(--chat-font-scale, 1));
  color: #475569;
  font-weight: 500;
}

@keyframes dify-real-spin {
  to {
    transform: rotate(360deg);
  }
}

.message-section {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: calc(24px * var(--chat-font-scale, 1)) calc(28px * var(--chat-font-scale, 1));
}

/* 空态（欢迎页）时去掉内边距，交给欢迎页自行控制，便于整体垂直居中 */
.message-section.is-empty {
  padding: 0;
}

.message-section::-webkit-scrollbar {
  width: 6px;
}

.message-section::-webkit-scrollbar-track {
  background: transparent;
}

.message-section::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 3px;
}

.message-section::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}

/* ---------- 空态：品牌欢迎页 ---------- */
.welcome-screen {
  box-sizing: border-box;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(20px * var(--chat-font-scale, 1)) calc(28px * var(--chat-font-scale, 1)) calc(56px * var(--chat-font-scale, 1));
}

.welcome-inner {
  width: 100%;
  max-width: var(--chat-content-max, 1040px);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.welcome-logo {
  width: calc(88px * var(--chat-font-scale, 1));
  height: calc(88px * var(--chat-font-scale, 1));
  border-radius: calc(26px * var(--chat-font-scale, 1));
  background: linear-gradient(180deg, #f4f8ff 0%, #e7f0ff 100%);
  border: 1px solid #dde8fb;
  box-shadow: 0 12px 26px rgba(47, 107, 255, 0.14), inset 0 1px 0 #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: calc(22px * var(--chat-font-scale, 1));
}

.welcome-logo-inner {
  display: flex;
  color: #3b7bff;

  /* v-html 注入的 svg 不带 scoped 属性，需用 :deep 才能命中 */
  :deep(svg) {
    width: calc(40px * var(--chat-font-scale, 1));
    height: calc(40px * var(--chat-font-scale, 1));
  }
}

.welcome-slogan {
  font-size: calc(14.5px * var(--chat-font-scale, 1));
  font-weight: 600;
  letter-spacing: 1px;
  background: linear-gradient(90deg, #5b8cff 0%, #8f7dff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin-bottom: calc(12px * var(--chat-font-scale, 1));
}

.welcome-title {
  font-size: calc(27px * var(--chat-font-scale, 1));
  font-weight: 700;
  color: var(--chat-title);
  line-height: 1.3;
  letter-spacing: 0.5px;
  margin-bottom: calc(12px * var(--chat-font-scale, 1));
}

.welcome-subtitle {
  font-size: calc(14px * var(--chat-font-scale, 1));
  color: #8494a8;
  line-height: 1.6;
  margin-bottom: calc(28px * var(--chat-font-scale, 1));
}

.welcome-cards {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: calc(14px * var(--chat-font-scale, 1));
}

.suggestion-card {
  display: flex;
  align-items: center;
  gap: calc(14px * var(--chat-font-scale, 1));
  width: 100%;
  box-sizing: border-box;
  padding: calc(16px * var(--chat-font-scale, 1)) calc(20px * var(--chat-font-scale, 1));
  background-color: var(--chat-card);
  border: 1px solid var(--chat-border);
  border-radius: calc(14px * var(--chat-font-scale, 1));
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s;
}

.suggestion-card:hover {
  border-color: #c7daff;
  box-shadow: 0 8px 20px rgba(47, 107, 255, 0.1);
  transform: translateY(-1px);
}

.suggestion-card-icon {
  flex-shrink: 0;
  display: flex;
  color: var(--chat-primary);

  /* v-html 注入的 svg 不带 scoped 属性，需用 :deep 才能命中 */
  :deep(svg) {
    width: calc(23px * var(--chat-font-scale, 1));
    height: calc(23px * var(--chat-font-scale, 1));
  }
}

.suggestion-card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: calc(4px * var(--chat-font-scale, 1));
}

.suggestion-card-title {
  font-size: calc(15px * var(--chat-font-scale, 1));
  font-weight: 600;
  color: var(--chat-title);
  line-height: 1.4;
}

.suggestion-card-desc {
  font-size: calc(13px * var(--chat-font-scale, 1));
  color: #8494a8;
  line-height: 1.4;
}

.suggestion-card-arrow {
  flex-shrink: 0;
  width: calc(18px * var(--chat-font-scale, 1));
  height: calc(18px * var(--chat-font-scale, 1));
  color: #b9c6d8;
  transition: color 0.18s;
}

.suggestion-card:hover .suggestion-card-arrow {
  color: var(--chat-primary);
}

/* ---------- 消息列表 ---------- */
.message-list {
  display: flex;
  flex-direction: column;
  gap: calc(22px * var(--chat-font-scale, 1));
  max-width: var(--chat-content-max, 1040px);
  margin: 0 auto;
}

.message-item {
  display: flex;
  flex-direction: column;
}

.message-item.user-message {
  align-items: flex-end;
}

.message-item.assistant-message {
  align-items: stretch;
}

.message-header {
  display: flex;
  align-items: center;
  gap: calc(8px * var(--chat-font-scale, 1));
  margin-bottom: calc(8px * var(--chat-font-scale, 1));
}

.avatar {
  flex-shrink: 0;
  width: calc(30px * var(--chat-font-scale, 1));
  height: calc(30px * var(--chat-font-scale, 1));
  border-radius: calc(10px * var(--chat-font-scale, 1));
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar.user {
  background-color: #eef2fa;
  color: #5b6b83;
  font-size: calc(13px * var(--chat-font-scale, 1));
  font-weight: 600;
}

.avatar.assistant {
  background: linear-gradient(135deg, #4a83ff 0%, #2564e0 100%);
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(47, 107, 255, 0.24);
}

.avatar-brand {
  display: flex;

  /* v-html 注入的 svg 不带 scoped 属性，需用 :deep 才能命中 */
  :deep(svg) {
    width: calc(17px * var(--chat-font-scale, 1));
    height: calc(17px * var(--chat-font-scale, 1));
  }
}

.message-role {
  font-size: calc(12.5px * var(--chat-font-scale, 1));
  color: #8494a8;
  font-weight: 500;
}

.message-content {
  max-width: 75%;
  padding: calc(14px * var(--chat-font-scale, 1)) calc(18px * var(--chat-font-scale, 1));
  border-radius: calc(14px * var(--chat-font-scale, 1));
  word-break: break-word;
  transition: all 0.2s ease;
}

/* 助手回复：整幅白底卡片，便于承载表格 / 图表 / 交互面板 */
.assistant-message .message-content {
  width: 100%;
  max-width: 100%;
  background-color: var(--chat-card);
  border: 1px solid var(--chat-border);
  border-radius: calc(16px * var(--chat-font-scale, 1));
  box-shadow: 0 2px 10px rgba(28, 60, 120, 0.04);
  color: var(--chat-text);
}

/* 用户提问：右侧蓝色气泡 */
.user-message .message-content {
  background: linear-gradient(135deg, #3b7bff 0%, #1f5fe8 100%);
  color: #ffffff;
  border-bottom-right-radius: calc(5px * var(--chat-font-scale, 1));
  box-shadow: 0 6px 16px rgba(47, 107, 255, 0.24);
}

.thinking-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.thinking-dots {
  display: flex;
  gap: 4px;
}

.thinking-dots span {
  width: 6px;
  height: 6px;
  background: linear-gradient(135deg, #4a83ff 0%, #2564e0 100%);
  border-radius: 50%;
  animation: thinking 1.4s infinite ease-in-out both;
}

.thinking-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.thinking-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes thinking {
  0%,
  80%,
  100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.thinking-text {
  font-size: calc(12px * var(--chat-font-scale, 1));
  color: var(--chat-text-light);
}

.content-text {
  font-size: calc(15px * var(--chat-font-scale, 1));
  line-height: 1.7;
}

/* 服务端错误提示消息 */
.content-text.error-text {
  color: #ef4444;
}

.content-text code {
  background-color: #f1f5f9;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: calc(13px * var(--chat-font-scale, 1));
  font-family: "SF Mono", Monaco, "Courier New", monospace;
}

/* MCP 图片超链接：后端下发的柱状图/饼图等结果图片以「点击打开图片」链接展示 */
.content-text .mcp-image-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--chat-primary);
  text-decoration: none;
  padding: 2px 10px;
  margin: 2px 0;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  background-color: #eff6ff;
  font-size: calc(14px * var(--chat-font-scale, 1));
  transition: all 0.2s ease;
  cursor: pointer;
}

.content-text .mcp-image-link:hover {
  background-color: #dbeafe;
  border-color: #93c5fd;
  color: #1d4ed8;
}

.content-text .mcp-image-link::before {
  content: "\1F5BC\FE0F"; /* 🖼️ */
  font-size: calc(14px * var(--chat-font-scale, 1));
}

/* ========== marked 渲染的 markdown 元素样式（适配聊天卡片） ========== */

/* 段落：去掉首尾多余边距，保留段间距 */
.content-text p {
  margin: 0 0 calc(8px * var(--chat-font-scale, 1));
}
.content-text p:last-child {
  margin-bottom: 0;
}

/* 标题：聊天场景下压缩尺寸，避免喧宾夺主 */
.content-text h1,
.content-text h2,
.content-text h3,
.content-text h4,
.content-text h5,
.content-text h6 {
  margin: calc(12px * var(--chat-font-scale, 1)) 0 calc(6px * var(--chat-font-scale, 1));
  font-weight: 600;
  line-height: 1.4;
}
.content-text h1:first-child,
.content-text h2:first-child,
.content-text h3:first-child {
  margin-top: 0;
}
.content-text h1 { font-size: calc(20px * var(--chat-font-scale, 1)); }
.content-text h2 { font-size: calc(18px * var(--chat-font-scale, 1)); }
.content-text h3 { font-size: calc(16px * var(--chat-font-scale, 1)); }
.content-text h4,
.content-text h5,
.content-text h6 { font-size: calc(15px * var(--chat-font-scale, 1)); }

/* 围栏代码块：深色背景 + 横向滚动，内部 code 重置为块级样式 */
.content-text pre {
  background-color: #1e293b;
  color: #e2e8f0;
  padding: calc(12px * var(--chat-font-scale, 1));
  border-radius: 8px;
  overflow-x: auto;
  margin: calc(8px * var(--chat-font-scale, 1)) 0;
  font-size: calc(13px * var(--chat-font-scale, 1));
  line-height: 1.6;
}
.content-text pre code {
  background-color: transparent;
  padding: 0;
  border-radius: 0;
  color: inherit;
  font-size: inherit;
  white-space: pre;
}

/* answer 拆出的代码卡片（JSON / Python / SQL 等）：仿编辑器的折叠头 + 代码体（行号 + hljs 高亮）。
   主题：默认浅色，卡片头「深色/浅色」按钮切换。颜色全部走 CSS 变量——.code-card 上给浅色默认值，
   .code-card--dark 覆盖为深色；高亮 token span 经 v-html 注入但仍是 .code-card 后代，变量可继承，
   故 token 规则用 :deep + var() 即可随主题切换，无需引入 hljs 官方主题 */
.code-card {
  --cc-bg: #f6f8fa;
  --cc-chrome-bg: #eaeef2;
  --cc-border: #d0d7de;
  --cc-text: #1f2328;
  --cc-gutter: #8c959f;
  --cc-caret: #59636e;
  --cc-title: #1f2328;
  --cc-lang: #0550ae;
  --cc-lang-bg: rgba(9, 105, 218, 0.1);
  --cc-btn: #59636e;
  --cc-btn-border: #d0d7de;
  --cc-btn-hover: #0969da;
  --cc-shadow: rgba(31, 35, 40, 0.08);
  --cc-tok-keyword: #cf222e;
  --cc-tok-string: #0a3069;
  --cc-tok-number: #0550ae;
  --cc-tok-title: #8250df;
  --cc-tok-attr: #0550ae;
  --cc-tok-literal: #0550ae;
  --cc-tok-built: #953800;
  --cc-tok-comment: #6e7781;
  --cc-tok-params: #1f2328;
  --cc-tok-meta: #1b7c83;
  --cc-tok-name: #116329;
  margin: calc(10px * var(--chat-font-scale, 1)) 0;
  border: 1px solid var(--cc-border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--cc-bg);
  box-shadow: 0 2px 10px var(--cc-shadow);
}

.code-card--dark {
  --cc-bg: #282c34;
  --cc-chrome-bg: #21252b;
  --cc-border: #181a1f;
  --cc-text: #abb2bf;
  --cc-gutter: #5c6370;
  --cc-caret: #9da5b4;
  --cc-title: #e6e6e6;
  --cc-lang: #61afef;
  --cc-lang-bg: rgba(97, 175, 239, 0.14);
  --cc-btn: #abb2bf;
  --cc-btn-border: #3b4048;
  --cc-btn-hover: #61afef;
  --cc-shadow: rgba(15, 23, 42, 0.28);
  --cc-tok-keyword: #c678dd;
  --cc-tok-string: #98c379;
  --cc-tok-number: #d19a66;
  --cc-tok-title: #61afef;
  --cc-tok-attr: #d19a66;
  --cc-tok-literal: #56b6c2;
  --cc-tok-built: #e5c07b;
  --cc-tok-comment: #5c6370;
  --cc-tok-params: #e06c75;
  --cc-tok-meta: #56b6c2;
  --cc-tok-name: #e06c75;
}

.code-card-header {
  display: flex;
  align-items: center;
  gap: calc(8px * var(--chat-font-scale, 1));
  padding: calc(8px * var(--chat-font-scale, 1)) calc(12px * var(--chat-font-scale, 1));
  background: var(--cc-chrome-bg);
  cursor: pointer;
  user-select: none;
}

.code-card-caret {
  color: var(--cc-caret);
  font-size: calc(12px * var(--chat-font-scale, 1));
  width: 1em;
}

.code-card-lang {
  color: var(--cc-lang);
  font-size: calc(11px * var(--chat-font-scale, 1));
  font-weight: 600;
  letter-spacing: 0.5px;
  padding: 1px 7px;
  border-radius: 5px;
  background: var(--cc-lang-bg);
  margin-right: auto;
}

.code-card-theme,
.code-card-copy {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--cc-btn-border);
  background: transparent;
  color: var(--cc-btn);
  line-height: 1;
  padding: 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.code-card-theme:hover,
.code-card-copy:hover {
  border-color: var(--cc-btn-hover);
  color: var(--cc-btn-hover);
}

/* 卡片头图标（子组件根 svg 会继承父 scoped 属性，无需 :deep）；尺寸随字体缩放 */
.code-card-theme .icon,
.code-card-copy .icon {
  display: block;
  width: calc(15px * var(--chat-font-scale, 1));
  height: calc(15px * var(--chat-font-scale, 1));
}

.code-card-body {
  display: flex;
  align-items: stretch;
  max-height: 360px;
  overflow: auto;
  padding: calc(10px * var(--chat-font-scale, 1)) 0;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, Monaco, monospace;
  font-size: calc(12.5px * var(--chat-font-scale, 1));
  line-height: 1.6;
}

/* 行号栏：sticky 左侧，长代码横向滚动时仍固定可见；每号一块与代码行等高对齐 */
.code-gutter {
  position: sticky;
  left: 0;
  z-index: 1;
  flex: 0 0 auto;
  padding: 0 calc(10px * var(--chat-font-scale, 1));
  text-align: right;
  color: var(--cc-gutter);
  background: var(--cc-bg);
  user-select: none;
  white-space: pre;
}

.code-gutter span {
  display: block;
}

.code-pre {
  flex: 1 1 auto;
  margin: 0;
  min-width: 0;
}

/* hljs 根元素：不依赖官方主题，背景透明、文字色随主题；:deep 因高亮 HTML 经 v-html 注入 */
.code-card-body :deep(code.hljs) {
  display: block;
  padding: 0 calc(14px * var(--chat-font-scale, 1)) 0 0;
  background: transparent;
  color: var(--cc-text);
  white-space: pre;
  word-break: normal;
}

/* token 着色：类名由 highlight.js 输出，颜色取主题变量，随 .code-card--light/dark 自动切换 */
.code-card-body :deep(.hljs-keyword),
.code-card-body :deep(.hljs-selector-tag),
.code-card-body :deep(.hljs-type) {
  color: var(--cc-tok-keyword);
}

.code-card-body :deep(.hljs-string),
.code-card-body :deep(.hljs-regexp),
.code-card-body :deep(.hljs-addition) {
  color: var(--cc-tok-string);
}

.code-card-body :deep(.hljs-number) {
  color: var(--cc-tok-number);
}

.code-card-body :deep(.hljs-title),
.code-card-body :deep(.hljs-title.class_),
.code-card-body :deep(.hljs-title.function_) {
  color: var(--cc-tok-title);
}

.code-card-body :deep(.hljs-attr),
.code-card-body :deep(.hljs-attribute),
.code-card-body :deep(.hljs-property),
.code-card-body :deep(.hljs-variable),
.code-card-body :deep(.hljs-template-variable) {
  color: var(--cc-tok-attr);
}

.code-card-body :deep(.hljs-literal),
.code-card-body :deep(.hljs-symbol),
.code-card-body :deep(.hljs-bullet) {
  color: var(--cc-tok-literal);
}

.code-card-body :deep(.hljs-built_in),
.code-card-body :deep(.hljs-class) {
  color: var(--cc-tok-built);
}

.code-card-body :deep(.hljs-comment),
.code-card-body :deep(.hljs-quote),
.code-card-body :deep(.hljs-deletion) {
  color: var(--cc-tok-comment);
  font-style: italic;
}

.code-card-body :deep(.hljs-params) {
  color: var(--cc-tok-params);
}

.code-card-body :deep(.hljs-meta),
.code-card-body :deep(.hljs-doctag) {
  color: var(--cc-tok-meta);
}

.code-card-body :deep(.hljs-name),
.code-card-body :deep(.hljs-tag) {
  color: var(--cc-tok-name);
}

.code-card-body :deep(.hljs-punctuation) {
  color: var(--cc-text);
}

/* 引用块：左侧竖线 + 浅灰背景 */
.content-text blockquote {
  border-left: 3px solid #94a3b8;
  background-color: #f8fafc;
  margin: calc(8px * var(--chat-font-scale, 1)) 0;
  padding: calc(6px * var(--chat-font-scale, 1)) calc(12px * var(--chat-font-scale, 1));
  color: #475569;
  border-radius: 0 6px 6px 0;
}
.content-text blockquote p {
  margin: 0;
}

/* 表格：全宽 + 斑马纹 + 边框，适配 SQL 查询结果展示 */
.content-text table {
  border-collapse: collapse;
  width: 100%;
  margin: calc(8px * var(--chat-font-scale, 1)) 0;
  font-size: calc(13px * var(--chat-font-scale, 1));
  display: block;
  overflow-x: auto;
}
.content-text thead {
  background-color: #f1f5f9;
}
.content-text th,
.content-text td {
  border: 1px solid #e2e8f0;
  padding: calc(6px * var(--chat-font-scale, 1)) calc(10px * var(--chat-font-scale, 1));
  text-align: left;
  white-space: nowrap;
}
.content-text th {
  font-weight: 600;
  color: #334155;
}
.content-text tbody tr:nth-child(even) {
  background-color: #f8fafc;
}

/* 列表：压缩缩进，适配卡片宽度 */
.content-text ul,
.content-text ol {
  margin: calc(6px * var(--chat-font-scale, 1)) 0;
  padding-left: calc(22px * var(--chat-font-scale, 1));
}
.content-text li {
  margin: calc(3px * var(--chat-font-scale, 1)) 0;
}
.content-text li > p {
  margin: 0;
}

/* 普通超链接（非 MCP 图片）：蓝色 + 下划线 */
.content-text a:not(.mcp-image-link) {
  color: var(--chat-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.content-text a:not(.mcp-image-link):hover {
  color: #1d4ed8;
}

/* 内联图片：限制最大宽度防止撑破卡片 */
.content-text img {
  max-width: 100%;
  border-radius: 6px;
  margin: calc(4px * var(--chat-font-scale, 1)) 0;
}

/* 分割线 */
.content-text hr {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: calc(10px * var(--chat-font-scale, 1)) 0;
}

/* GFM 删除线 */
.content-text del {
  color: var(--chat-text-light);
}

/* 加粗 / 斜体：继承字体颜色，仅调整字重/字形 */
.content-text strong {
  font-weight: 600;
}
.content-text em {
  font-style: italic;
}

.message-files {
  display: flex;
  flex-direction: column;
  gap: calc(8px * var(--chat-font-scale, 1));
  margin-top: calc(10px * var(--chat-font-scale, 1));
  max-width: 78%;
}

.message-file-item {
  display: flex;
  align-items: center;
  gap: calc(10px * var(--chat-font-scale, 1));
  font-size: calc(13px * var(--chat-font-scale, 1));
  padding: calc(8px * var(--chat-font-scale, 1)) calc(12px * var(--chat-font-scale, 1));
  background-color: #f8fafd;
  border: 1px solid var(--chat-border);
  border-radius: calc(10px * var(--chat-font-scale, 1));
  min-width: 0;
}

/* 用户气泡内的附件：实心白底卡片 + 深色文字。
   原先是「半透明白底 + 继承气泡白字」，白字压在浅色底上几乎不可读 */
.user-message .message-file-item {
  background-color: #ffffff;
  border-color: #ffffff;
  color: var(--chat-title);
}

.file-icon {
  font-size: calc(15px * var(--chat-font-scale, 1));
  flex-shrink: 0;
}

/* 图片缩略图：固定尺寸 + 裁切填充，避免不同比例图片撑破卡片 */
.file-thumb {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 6px;
  overflow: hidden;
  background-color: rgba(0, 0, 0, 0.06);
  display: block;
}

.file-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.file-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 可点击的附件名（有 accessUrl 时） */
.file-name-link {
  color: var(--chat-primary);
  text-decoration: none;
}

.file-name-link:hover {
  text-decoration: underline;
}

/* 下载入口：默认弱化显示，悬停高亮 */
.file-download {
  flex-shrink: 0;
  color: var(--chat-text-light);
  text-decoration: none;
  padding: 0 4px;
  line-height: 1;
}

.file-download:hover {
  color: var(--chat-primary);
}

.file-size {
  color: var(--chat-text-light);
  flex-shrink: 0;
}

/* 附件名/大小/下载在用户气泡内同样改深色，避免透明白字 */
.user-message .file-size,
.user-message .file-download {
  color: var(--chat-text-sub);
}

.user-message .file-name-link {
  color: var(--chat-primary-strong);
}

.user-message .file-download:hover,
.user-message .file-name-link:hover {
  color: var(--chat-primary);
}

/* 时间 + 复制：同一行，避免空按钮把时间挤到很远的位置 */
.message-footer {
  display: flex;
  align-items: center;
  gap: calc(6px * var(--chat-font-scale, 1));
  margin-top: calc(8px * var(--chat-font-scale, 1));
}

.copy-btn {
  display: flex;
  background: none;
  border: none;
  cursor: pointer;
  padding: calc(5px * var(--chat-font-scale, 1));
  color: #a4b1c4;
  opacity: 0;
  border-radius: calc(7px * var(--chat-font-scale, 1));
  transition: opacity 0.2s, color 0.2s, background-color 0.2s;

  svg {
    width: calc(15px * var(--chat-font-scale, 1));
    height: calc(15px * var(--chat-font-scale, 1));
  }
}

.message-footer:hover .copy-btn {
  opacity: 1;
}

.copy-btn:hover {
  color: var(--chat-primary);
  background-color: var(--chat-primary-soft);
}

.message-time {
  font-size: calc(11px * var(--chat-font-scale, 1));
  color: #b6c2d3;
}

/* ===================== 输入区 ===================== */
.input-section {
  flex-shrink: 0;
  padding: 0 calc(28px * var(--chat-font-scale, 1)) calc(14px * var(--chat-font-scale, 1));
  background-color: transparent;
}

.input-wrapper {
  max-width: var(--chat-content-max, 1040px);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: calc(10px * var(--chat-font-scale, 1));
}

.uploaded-files-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.uploaded-file-item {
  display: flex;
  align-items: center;
  gap: calc(10px * var(--chat-font-scale, 1));
  padding: calc(8px * var(--chat-font-scale, 1)) calc(12px * var(--chat-font-scale, 1));
  background-color: var(--chat-card);
  border: 1px solid var(--chat-border);
  border-radius: calc(10px * var(--chat-font-scale, 1));
  font-size: calc(13px * var(--chat-font-scale, 1));
}

/* 上传中的附件：半透明 + 虚线边框，视觉上与已上传区分 */
.uploaded-file-item.uploading {
  opacity: 0.65;
  border-style: dashed;
}

/* 上传失败的附件：红色边框 + 红色状态文字，保留在输入区由用户手动移除 */
.uploaded-file-item.upload-error {
  border-color: rgba(239, 68, 68, 0.5);
  background-color: rgba(239, 68, 68, 0.06);
}

.uploaded-file-item.upload-error .file-size {
  color: #ef4444;
}

.remove-file-btn {
  background: rgba(239, 68, 68, 0.1);
  border: none;
  cursor: pointer;
  color: #ef4444;
  font-size: calc(16px * var(--chat-font-scale, 1));
  line-height: 1;
  padding: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.remove-file-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

/* 输入卡片：textarea + 底部操作行，整体为一张白底圆角卡 */
.composer {
  background-color: var(--chat-card);
  border: 1px solid var(--chat-border);
  border-radius: calc(18px * var(--chat-font-scale, 1));
  padding: calc(14px * var(--chat-font-scale, 1)) calc(16px * var(--chat-font-scale, 1)) calc(10px * var(--chat-font-scale, 1));
  box-shadow: 0 4px 16px rgba(28, 60, 120, 0.05);
  transition: border-color 0.18s, box-shadow 0.18s;
}

.composer:focus-within {
  border-color: #bcd3ff;
  box-shadow: 0 8px 22px rgba(47, 107, 255, 0.12);
}

.composer :deep(.el-textarea) {
  width: 100%;
}

/* 去掉 Element Plus textarea 的默认边框/底色，融入卡片 */
.composer :deep(.el-textarea__inner) {
  border: none !important;
  box-shadow: none !important;
  background-color: transparent !important;
  padding: 0 !important;
  font-size: calc(15px * var(--chat-font-scale, 1)) !important;
  line-height: 1.65 !important;
  color: var(--chat-text) !important;
  font-family: inherit !important;
  resize: none !important;
}

.composer :deep(.el-textarea__inner::placeholder) {
  color: #a8b5c8 !important;
}

.composer :deep(.el-textarea__inner:disabled) {
  background-color: transparent !important;
}

.composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(12px * var(--chat-font-scale, 1));
  margin-top: calc(10px * var(--chat-font-scale, 1));
}

/* 添加附件：纯文字按钮 + 回形针图标 */
.attach-btn {
  display: inline-flex;
  align-items: center;
  gap: calc(7px * var(--chat-font-scale, 1));
  padding: calc(5px * var(--chat-font-scale, 1)) calc(8px * var(--chat-font-scale, 1));
  border: none;
  border-radius: calc(8px * var(--chat-font-scale, 1));
  background: transparent;
  color: #63748c;
  font-size: calc(13.5px * var(--chat-font-scale, 1));
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.attach-btn:hover:not(:disabled) {
  background-color: var(--chat-primary-soft);
  color: var(--chat-primary);
}

.attach-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.attach-icon {
  width: calc(17px * var(--chat-font-scale, 1));
  height: calc(17px * var(--chat-font-scale, 1));
}

/* 图标组件内写死的 fill 由 CSS 接管，跟随按钮文字颜色 */
.attach-btn :deep(.attach-icon path) {
  fill: currentColor !important;
}

.composer-footer-right {
  display: flex;
  align-items: center;
  gap: calc(10px * var(--chat-font-scale, 1));
}

.hint {
  font-size: calc(12.5px * var(--chat-font-scale, 1));
  color: var(--chat-text-light);
}

/* 发送 / 停止：圆形按钮 */
.round-btn {
  flex-shrink: 0;
  width: calc(38px * var(--chat-font-scale, 1));
  height: calc(38px * var(--chat-font-scale, 1));
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #4a83ff 0%, #2564e0 100%);
  color: #ffffff;
  cursor: pointer;
  box-shadow: 0 6px 14px rgba(47, 107, 255, 0.3);
  transition: box-shadow 0.2s, transform 0.12s, background 0.2s;
}

.round-btn:hover:not(:disabled) {
  box-shadow: 0 8px 20px rgba(47, 107, 255, 0.42);
  transform: translateY(-1px);
}

.round-btn:active:not(:disabled) {
  transform: translateY(0);
}

.round-btn:disabled {
  background: #c7d8f8;
  box-shadow: none;
  cursor: not-allowed;
}

.send-btn:disabled {
  background: #c7d8f8;
}

.stop-btn {
  background: linear-gradient(135deg, #f2685f 0%, #dc2626 100%);
  box-shadow: 0 6px 14px rgba(220, 38, 38, 0.28);
}

.stop-btn:hover:not(:disabled) {
  box-shadow: 0 8px 20px rgba(220, 38, 38, 0.4);
}

.round-icon {
  width: calc(20px * var(--chat-font-scale, 1));
  height: calc(20px * var(--chat-font-scale, 1));
}

/* 输入区下方：回到最新消息 + 免责提示（整体居中） */
.composer-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(10px * var(--chat-font-scale, 1));
}

.scroll-bottom-btn {
  flex-shrink: 0;
  width: calc(30px * var(--chat-font-scale, 1));
  height: calc(30px * var(--chat-font-scale, 1));
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--chat-border);
  border-radius: 50%;
  background-color: var(--chat-card);
  color: #6c7c93;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(28, 60, 120, 0.06);
  transition: color 0.15s, border-color 0.15s;

  svg {
    width: calc(16px * var(--chat-font-scale, 1));
    height: calc(16px * var(--chat-font-scale, 1));
  }
}

.scroll-bottom-btn:hover {
  color: var(--chat-primary);
  border-color: #cfe0ff;
}

.composer-hint-text {
  font-size: calc(12px * var(--chat-font-scale, 1));
  color: var(--chat-text-light);
}

.hidden-file-input {
  display: none;
}

/* ===================== 缩放手柄 ===================== */
.resize-handles {
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  pointer-events: none;
  z-index: 100;
}

.resize-handle {
  position: absolute;
  pointer-events: auto;
  background-color: transparent;
  transition: background-color 0.2s;
}

.resize-handle:hover {
  background-color: rgba(47, 107, 255, 0.3);
}

.resize-n {
  top: 0;
  left: 10%;
  right: 10%;
  height: 12px;
  cursor: n-resize;
}

.resize-s {
  bottom: 0;
  left: 10%;
  right: 10%;
  height: 12px;
  cursor: s-resize;
}

.resize-e {
  right: 0;
  top: 10%;
  bottom: 10%;
  width: 12px;
  cursor: e-resize;
}

.resize-w {
  left: 0;
  top: 10%;
  bottom: 10%;
  width: 12px;
  cursor: w-resize;
}

.resize-ne {
  top: 0;
  right: 0;
  width: 20px;
  height: 20px;
  cursor: ne-resize;
}

.resize-nw {
  top: 0;
  left: 0;
  width: 20px;
  height: 20px;
  cursor: nw-resize;
}

.resize-se {
  bottom: 0;
  right: 0;
  width: 20px;
  height: 20px;
  cursor: se-resize;
}

.resize-sw {
  bottom: 0;
  left: 0;
  width: 20px;
  height: 20px;
  cursor: sw-resize;
}

/* ===================== Flint 图表 ===================== */
.flint-charts-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.flint-chart-item {
  width: 100%;
  height: 360px;
  min-height: 300px;
  box-sizing: border-box;
  flex-shrink: 0;
  background-color: #f8fafd;
  border-radius: 12px;
  border: 1px solid var(--chat-border);
  box-shadow: 0 2px 8px rgba(28, 60, 120, 0.04);
  transition: box-shadow 0.2s ease;
}

.flint-chart-item:hover {
  box-shadow: 0 4px 16px rgba(28, 60, 120, 0.08);
}

/* ===================== HTML 交互面板 ===================== */
.html-interactions-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.html-interaction-panel {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--chat-border);
  background-color: #f8fafd;
}

.html-interaction-panel.resolved {
  opacity: 0.75;
}

.skill-select-panel {
  padding: 16px;
}

.skill-select-message {
  font-size: 14px;
  font-weight: 600;
  color: var(--chat-title);
  margin-bottom: 12px;
}

.skill-select-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.skill-select-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background-color: var(--chat-card);
  border: 1px solid var(--chat-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.skill-select-item:hover {
  border-color: #93c5fd;
  background-color: #eff6ff;
}

.skill-select-item.selected {
  border-color: var(--chat-primary);
  background-color: #eff6ff;
}

.skill-checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid #cbd5e1;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
  font-size: 12px;
  color: white;
  transition: all 0.2s;
}

.skill-select-item.selected .skill-checkbox {
  background: linear-gradient(135deg, #4a83ff 0%, #2564e0 100%);
  border-color: var(--chat-primary);
}

.skill-select-info {
  flex: 1;
  min-width: 0;
}

.skill-select-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--chat-title);
  margin-bottom: 2px;
}

.skill-select-desc {
  font-size: 12px;
  color: var(--chat-text-sub);
  line-height: 1.4;
}

.skill-select-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.skill-btn {
  padding: 7px 20px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.skill-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.skill-confirm-btn {
  background: linear-gradient(135deg, #4a83ff 0%, #2564e0 100%);
  color: white;
}

.skill-confirm-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(47, 107, 255, 0.4);
}

.skill-cancel-btn {
  background-color: #f1f5f9;
  color: var(--chat-text-sub);
  border: 1px solid var(--chat-border);
}

.skill-cancel-btn:hover:not(:disabled) {
  background-color: #e2e8f0;
}

.skill-selected-summary {
  margin-top: 10px;
  padding: 8px 12px;
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  font-size: 12px;
  color: #15803d;
}

/* 技能列表面板样式（只读列表） */
.skill-list-panel {
  padding: 16px;
}

.skill-list-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background-color: var(--chat-card);
  border: 1px solid var(--chat-border);
  border-radius: 8px;
  margin-bottom: 8px;
}

.skill-list-item:last-child {
  margin-bottom: 0;
}

.skill-list-info {
  flex: 1;
  min-width: 0;
}

/* ===================== AI 等待确认 / 任务完成面板 ===================== */
.interrupted-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.interrupted-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.interrupted-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #ffffff;
  font-size: calc(12px * var(--chat-font-scale, 1));
  font-weight: 600;
}

.interrupted-question {
  font-size: calc(15px * var(--chat-font-scale, 1));
  line-height: 1.7;
  color: var(--chat-title);
}

/* 待确认帧的确认/取消按钮行（actions_hint 非空时渲染），按钮外观复用 skill-btn 系列样式 */
.interrupted-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding-top: 4px;
}

.interrupted-context {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 1px dashed var(--chat-border);
  padding-top: 12px;
}

.interrupted-context-title {
  font-size: calc(13px * var(--chat-font-scale, 1));
  font-weight: 600;
  color: #475569;
}

.pending-context-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1px solid var(--chat-border);
  border-radius: 10px;
  overflow: hidden;
  background-color: #f8fafc;
}

.pending-context-key {
  font-size: calc(12px * var(--chat-font-scale, 1));
  font-weight: 600;
  color: #334155;
  padding: 8px 12px;
  background-color: #eef2f7;
  font-family: "SF Mono", Monaco, "Courier New", monospace;
}

.pending-context-code {
  margin: 0;
  padding: 12px;
  font-size: calc(12px * var(--chat-font-scale, 1));
  line-height: 1.5;
  color: #0f172a;
  background-color: #f1f5f9;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: "SF Mono", Monaco, "Courier New", monospace;
}

.pending-context-table {
  width: 100%;
  border-collapse: collapse;
  font-size: calc(12px * var(--chat-font-scale, 1));

  th,
  td {
    padding: 8px 12px;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
    border-right: 1px solid #e2e8f0;
    color: #334155;
  }

  th {
    background-color: #eef2f7;
    font-weight: 600;
  }

  tr:last-child td {
    border-bottom: none;
  }

  td:last-child,
  th:last-child {
    border-right: none;
  }
}

.result-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  font-size: calc(12px * var(--chat-font-scale, 1));
  font-weight: 600;
}
</style>

<style lang="scss">
/* 消息提示已改用 naive-ui 的 message（App.vue 用 n-message-provider 全局包裹）。
   消息容器挂在 body 下，需非 scoped 全局样式：
   1. 把容器 z-index 抬到自绘对话框（9999/10000）之上，否则会被对话框遮住；
   2. 长错误详情保留换行、限制宽度，完整展示后端透出的错误堆栈 */
.n-message-container {
  z-index: 10050 !important; /* 覆盖 naive-ui 内联的默认层级 */

  .n-message {
    max-width: 560px;
  }

  .n-message__content {
    white-space: pre-line;
    word-break: break-all;
    max-height: 40vh;
    overflow-y: auto;
  }
}

/* 自定义二次确认弹窗：替换 ElMessageBox，避免被自绘对话框遮挡 / 左上角错位
   注意：弹窗挂在外层 .custom-dialog-mask 下，no-mask 模式时该遮罩为 pointer-events: none，
   pointer-events 会被继承导致按钮点不了，必须显式恢复 auto */
.dify-real-confirm-mask {
  position: fixed;
  inset: 0;
  z-index: 10100;
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.45);
  animation: dify-confirm-fade-in 0.15s ease;
}

.dify-real-confirm {
  width: 400px;
  max-width: calc(100vw - 32px);
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  padding: 24px;
  animation: dify-confirm-zoom-in 0.15s ease;

  &__title {
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 12px;
  }

  &__message {
    font-size: 14px;
    line-height: 1.6;
    color: #475569;
    margin-bottom: 24px;
    word-break: break-all;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  &__btn {
    height: 34px;
    padding: 0 18px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
    transition: background-color 0.15s, border-color 0.15s, color 0.15s;

    &.cancel {
      background: #f1f5f9;
      border-color: #e2e8f0;
      color: #475569;

      &:hover {
        background: #e2e8f0;
      }
    }

    &.danger {
      background: #ef4444;
      color: #ffffff;

      &:hover {
        background: #dc2626;
      }
    }
  }
}

@keyframes dify-confirm-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes dify-confirm-zoom-in {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}
</style>
