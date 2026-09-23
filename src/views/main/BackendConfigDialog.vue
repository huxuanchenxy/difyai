<template>
  <!-- z-index 需高于左侧自绘对话窗（DifyRealDialog 为 9999/10000），否则弹层会被遮挡 -->
  <el-dialog
    :model-value="visible"
    width="90%"
    top="5vh"
    append-to-body
    destroy-on-close
    :show-close="false"
    :z-index="10200"
    custom-class="backend-config-dialog"
    @update:model-value="handleVisibleChange"
    @open="handleOpen"
  >
    <!-- 自绘标题行：内置 × 依赖 el-icon-close 字体（本项目未引入 icon.scss，会是空白），
         改用项目现成的 IconClose SVG 作为右上角关闭按钮 -->
    <template #title>
      <div class="bc-dialog-header">
        <span class="bc-dialog-title">后台配置</span>
        <button
          type="button"
          class="bc-dialog-close"
          aria-label="关闭"
          @click="handleClose"
        >
          <IconClose />
        </button>
      </div>
    </template>
    <div class="bc-layout">
      <!-- 左侧表选择 -->
      <div class="bc-side">
        <div class="bc-side-title">数据表</div>
        <ul class="bc-side-list">
          <li
            v-for="t in tables"
            :key="t.key"
            :class="['bc-side-item', { active: t.key === activeKey }]"
            @click="handleSwitchTable(t.key)"
          >
            <span class="bc-side-name">{{ t.title }}</span>
            <span class="bc-side-code">{{ t.key }}</span>
          </li>
        </ul>
      </div>

      <!-- 右侧内容 -->
      <div class="bc-main">
        <div class="bc-toolbar">
          <div class="bc-toolbar-left">
            <span class="bc-toolbar-title">{{ activeDef?.title }}</span>
            <span class="bc-toolbar-sub">共 {{ total }} 条</span>
          </div>
          <div class="bc-toolbar-right">
            <!-- <el-button
              v-if="activeDef?.hasEnabledList"
              size="small"
              @click="loadEnabledList"
              :loading="loading"
            >仅启用</el-button> -->
            <el-button
              class="bc-ghost-btn"
              size="small"
              :loading="loading"
              @click="loadPage(1)"
            >
              刷新
            </el-button>
            <el-button type="primary" size="small" @click="openForm()">新增</el-button>
          </div>
        </div>

        <!-- 有 schema 的表：结构化表格 -->
        <div class="bc-table-wrap">
          <el-table
            v-if="activeDef && !activeDef.jsonMode"
            v-loading="loading"
            :data="rows"
            border
            stripe
            size="small"
            height="100%"
            class="bc-table"
          >
            <el-table-column
              v-for="col in tableColumns"
              :key="col.prop"
              :prop="col.prop"
              :label="col.label"
              :width="col.width"
              :show-overflow-tooltip="true"
            >
              <!-- 不解构，防止 el-table-column 在初始化阶段以 undefined scope 调用插槽导致渲染中断 -->
              <template #default="scope">
                <span v-if="scope && scope.row">{{ formatCell(scope.row[col.prop], col.kind) }}</span>
              </template>
            </el-table-column>
            <el-table-column
              label="操作"
              :width="200 + 55 * activeRelations.length"
              fixed="right"
              align="center"
            >
              <template #default="scope">
                <template v-if="scope && scope.row">
                  <el-button type="text" size="small" @click="openForm(scope.row)">编辑</el-button>
                  <el-button type="text" size="small" @click="openDetail(scope.row)">详情</el-button>
                  <!-- 级联按钮：由表 schema 的 relations 配置驱动（文案/目标表/关联字段均可配） -->
                  <el-button
                    v-for="rel in activeRelations"
                    :key="rel.label"
                    type="text"
                    size="small"
                    @click="openRelation(rel, scope.row)"
                  >
                    {{ rel.label }}
                  </el-button>
                  <el-button type="text" size="small" @click="handleCopy(scope.row)">复制</el-button>
                  <el-button
                    type="text"
                    size="small"
                    class="bc-danger"
                    @click="handleDelete(scope.row)"
                  >
                    删除
                  </el-button>
                </template>
              </template>
            </el-table-column>
            <template #empty>
              <div class="bc-empty">暂无数据</div>
            </template>
          </el-table>

          <!-- 无 schema 的表：JSON 原文展示 -->
          <el-table
            v-else
            v-loading="loading"
            :data="rows"
            border
            stripe
            size="small"
            height="100%"
            class="bc-table"
          >
            <el-table-column :prop="activeDef?.idField || 'id'" label="ID" width="90" />
            <el-table-column label="原始 JSON">
              <template #default="scope">
                <span v-if="scope && scope.row" class="bc-json-cell">{{ shortJson(scope.row) }}</span>
              </template>
            </el-table-column>
            <el-table-column
              label="操作"
              width="150"
              fixed="right"
              align="center"
            >
              <template #default="scope">
                <template v-if="scope && scope.row">
                  <el-button type="text" size="small" @click="openForm(scope.row)">编辑</el-button>
                  <el-button
                    type="text"
                    size="small"
                    class="bc-danger"
                    @click="handleDelete(scope.row)"
                  >
                    删除
                  </el-button>
                </template>
              </template>
            </el-table-column>
            <template #empty>
              <div class="bc-empty">暂无数据</div>
            </template>
          </el-table>
        </div>

        <div class="bc-pager">
          <el-pagination
            background
            layout="total, sizes, prev, pager, next, jumper"
            :total="total"
            :current-page="pageNum"
            :page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            popper-class="backend-config-popper"
            @current-change="loadPage"
            @size-change="handleSizeChange"
          />
        </div>
      </div>
    </div>

    <!-- 新增 / 编辑 / 详情 弹窗 -->
    <el-dialog
      v-model="formVisible"
      width="720px"
      top="5vh"
      append-to-body
      destroy-on-close
      :show-close="false"
      :z-index="10300"
      custom-class="backend-config-form-dialog"
    >
      <!-- 自绘标题行：与外层一致，用 IconClose 作为右上角关闭 -->
      <template #title>
        <div class="bc-dialog-header">
          <span class="bc-dialog-title">{{ formTitle }}</span>
          <button
            type="button"
            class="bc-dialog-close"
            aria-label="关闭"
            @click="formVisible = false"
          >
            <IconClose />
          </button>
        </div>
      </template>
      <!-- 结构化表单（表单表上下文见 formDef：主列表或二级「执行配置」弹窗） -->
      <el-form
        v-if="formDef && !formDef.jsonMode"
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="130px"
        size="small"
        class="bc-form"
      >
        <el-form-item
          v-for="f in formFields"
          :key="f.prop"
          :prop="f.prop"
          :label="f.label"
          :required="!!f.required && !isReadonlyField(f)"
        >
          <!-- 主键：新增时可空，编辑时只读 -->
          <el-input-number
            v-if="f.kind === 'number'"
            v-model="form[f.prop]"
            :controls="false"
            :precision="f.numberType === 'float' ? 2 : 0"
            :step="f.numberType === 'float' ? 0.01 : 1"
            :disabled="isReadonlyField(f)"
            style="width: 200px"
          />
          <el-switch
            v-else-if="f.kind === 'boolean'"
            v-model="form[f.prop]"
            :disabled="isReadonlyField(f)"
          />
          <el-input
            v-else-if="f.kind === 'datetime'"
            v-model="form[f.prop]"
            :disabled="isReadonlyField(f)"
            :placeholder="f.readonly ? '后端自动生成' : 'YYYY-MM-DD HH:mm:ss'"
          />
          <!-- JSON：使用 textarea 编辑，提交前校验 -->
          <el-input
            v-else-if="f.kind === 'json'"
            v-model="jsonDraft[f.prop]"
            type="textarea"
            :rows="4"
            :disabled="isReadonlyField(f)"
            placeholder="JSON 对象，如 {}"
            @blur="commitJsonField(f.prop)"
          />
          <!-- 字符串数组：一行一个 -->
          <el-input
            v-else-if="f.kind === 'stringArray'"
            v-model="arrayDraft[f.prop]"
            type="textarea"
            :rows="4"
            :disabled="isReadonlyField(f)"
            :placeholder="f.placeholder || '一行一个'"
            @blur="commitArrayField(f.prop)"
          />
          <el-input
            v-else-if="f.kind === 'textarea'"
            v-model="form[f.prop]"
            type="textarea"
            :rows="3"
            :disabled="isReadonlyField(f)"
            :placeholder="f.placeholder || ''"
          />
          <!-- Markdown 长文本 / JSON(mdJson)：可直接编辑，也可点「Markdown 编辑」弹出左右双栏编辑器 -->
          <div v-else-if="f.kind === 'md' || f.kind === 'mdJson'" class="bc-md-field">
            <el-input
              v-model="form[f.prop]"
              type="textarea"
              :rows="3"
              :disabled="isReadonlyField(f)"
              :placeholder="f.placeholder || '可直接输入，或点下方「Markdown 编辑」使用双栏编辑器'"
            />
            <el-button
              size="small"
              type="primary"
              plain
              :disabled="isReadonlyField(f)"
              @click="openMdEditor(f)"
            >
              Markdown 编辑
            </el-button>
          </div>
          <el-input
            v-else
            v-model="form[f.prop]"
            :disabled="isReadonlyField(f)"
            :placeholder="f.placeholder || ''"
          />
        </el-form-item>
      </el-form>

      <!-- JSON 原文编辑 -->
      <div v-else class="bc-json-editor">
        <div class="bc-json-tip">
          该表 Swagger 未定义字段结构，请直接编辑原始 JSON 对象（提交时校验合法性）。
        </div>
        <el-input
          v-model="rawJsonText"
          type="textarea"
          :rows="18"
          :readonly="formMode === 'view'"
          placeholder="{ &quot;id&quot;: 1, &quot;...&quot;: &quot;...&quot; }"
        />
      </div>

      <template v-if="formMode !== 'view'" #footer>
        <el-button
          size="small"
          type="primary"
          :loading="submitting"
          @click="handleSubmit"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 二级弹窗（通用）：由表 schema 的 relations 配置驱动 —— 按关联字段过滤目标表记录。
         列由目标表 schema 驱动，与主列表共用同一套表单弹窗
         （行操作传 relTargetKey，表单表上下文切到目标表）。
         后端按关联字段查询的接口开发中：暂拉一大页在前端过滤，接口就绪后只改 loadRelationData -->
    <el-dialog
      v-model="relDialog.visible"
      width="76%"
      top="7vh"
      append-to-body
      destroy-on-close
      :show-close="false"
      :z-index="10250"
      custom-class="backend-config-form-dialog"
    >
      <template #title>
        <div class="bc-dialog-header">
          <span class="bc-dialog-title">
            {{ relDialog.rel?.label }} - {{ relMatchField }}={{ relDialog.keyValue || '-' }}
          </span>
          <button
            type="button"
            class="bc-dialog-close"
            aria-label="关闭"
            @click="relDialog.visible = false"
          >
            <IconClose />
          </button>
        </div>
      </template>
      <div class="bc-toolbar">
        <div class="bc-toolbar-left">
          <span class="bc-toolbar-title">{{ relTargetDef?.title }}</span>
          <span class="bc-toolbar-sub">共 {{ relRows.length }} 条</span>
        </div>
      </div>
      <el-table
        v-loading="relDialog.loading"
        :data="relRows"
        border
        stripe
        size="small"
        :max-height="460"
      >
        <el-table-column
          v-for="col in relColumns"
          :key="col.prop"
          :prop="col.prop"
          :label="col.label"
          :width="col.width"
          :show-overflow-tooltip="true"
        >
          <!-- 与主列表同规则：不解构，防止初始化阶段以 undefined scope 调用插槽 -->
          <template #default="scope">
            <span v-if="scope && scope.row">{{ formatCell(scope.row[col.prop], col.kind) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="200"
          fixed="right"
          align="center"
        >
          <template #default="scope">
            <template v-if="scope && scope.row">
              <!-- 详情始终提供；编辑/复制/删除受 relation.editable 控制（false = 只读） -->
              <el-button
                v-if="relEditable"
                type="text"
                size="small"
                @click="openForm(scope.row, 'edit', relTargetKey)"
              >
                编辑
              </el-button>
              <el-button type="text" size="small" @click="openDetail(scope.row, relTargetKey)">详情</el-button>
              <el-button
                v-if="relEditable"
                type="text"
                size="small"
                @click="handleCopy(scope.row, relTargetKey)"
              >
                复制
              </el-button>
              <el-button
                v-if="relEditable"
                type="text"
                size="small"
                class="bc-danger"
                @click="handleDelete(scope.row, relTargetKey)"
              >
                删除
              </el-button>
            </template>
          </template>
        </el-table-column>
        <template #empty>
          <div class="bc-empty">暂无关联记录</div>
        </template>
      </el-table>
    </el-dialog>
  </el-dialog>

  <!-- Markdown 双栏编辑器（左原文/右预览），编辑完保存回填到当前 md/mdJson 字段。
       必须放在 el-dialog 之外作为根级兄弟：MdEditorDialog 自身用 Teleport+transition，
       若嵌在 destroy-on-close 的 el-dialog 内，弹窗销毁时会与其 teleport/transition 相互撕开，
       触发 Vue “Cannot read properties of null (reading '_vnode')” 崩溃。 -->
  <MdEditorDialog
    v-model:visible="mdEditor.visible"
    :model-value="mdEditor.value"
    :title="mdEditor.title"
    :z-index="10450"
    @save="handleMdSave"
  />
</template>

<script lang="ts">
import { defineComponent, ref, computed, reactive, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { IconClose } from '@/icons'
import MdEditorDialog from '@/components/dify-chatbot/MdEditorDialog.vue'
import { backendConfigApi, BackendTableKey, BackendPage } from '@/api/backendConfig'
import {
  BACKEND_TABLES,
  getTableDef,
  TableDef,
  TableRelation,
  FieldDef,
  FieldKind,
  buildEmptyForm,
} from './backendConfigSchema'

type FormMode = 'create' | 'edit' | 'view'

export default defineComponent({
  name: 'BackendConfigDialog',
  components: { IconClose, MdEditorDialog },
  props: {
    // 通过 v-model:visible 控制弹层显隐
    visible: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:visible'],
  setup(props, { emit }) {
    // 左侧「数据表」菜单数据源：按 schema 里的 hidden 字段过滤（前端硬编码显隐开关，
    // 见 backendConfigSchema.ts 各表定义的 hidden?: boolean）；activeKey 默认取过滤后首项
    const tables = BACKEND_TABLES.filter(t => !t.hidden)
    const activeKey = ref<BackendTableKey>(tables[0].key)
    const activeDef = computed<TableDef | undefined>(() =>
      tables.find(t => t.key === activeKey.value),
    )

    // 主列表当前表的级联配置（operations 列按此渲染弹出按钮）
    const activeRelations = computed<TableRelation[]>(() => activeDef.value?.relations || [])

    // 表单/删除等写操作的「当前表上下文」：默认跟随主列表 activeKey；
    // 从二级级联弹窗进入时固定为目标表（relTargetKey），
    // 使表单渲染、校验、提交、删除复用同一套逻辑（所有入口都会先重置此 key）
    const formTableKey = ref<BackendTableKey>(activeKey.value)
    const formDef = computed<TableDef | undefined>(() => getTableDef(formTableKey.value))

    // ===== 二级弹窗（通用）：由表 schema 的 relations 配置驱动 =====
    // 后端按关联字段过滤的查询接口开发中：暂拉一大页（pageSize=1000）在前端按 remoteField??localField 过滤；
    // 接口就绪后只需把 loadRelationData 换成带关联字段的服务端查询，其余逻辑不变
    const relDialog = reactive<{
      visible: boolean
      rel: TableRelation | null
      keyValue: string
      loading: boolean
      all: any[]
    }>({
      visible: false,
      rel: null,
      keyValue: '',
      loading: false,
      all: [],
    })
    const relTargetDef = computed<TableDef | undefined>(() =>
      relDialog.rel ? getTableDef(relDialog.rel.targetTable) : undefined,
    )
    const relTargetKey = computed<BackendTableKey | undefined>(() => relDialog.rel?.targetTable)
    const relColumns = computed<FieldDef[]>(() =>
      (relTargetDef.value?.fields || []).filter(f => f.inTable !== false),
    )
    /** 目标表的过滤字段名：remoteField 缺省与 localField 同名 */
    const relMatchField = computed(() =>
      relDialog.rel ? (relDialog.rel.remoteField || relDialog.rel.localField) : '',
    )
    const relRows = computed(() =>
      relDialog.all.filter(r => String(r?.[relMatchField.value] ?? '') === relDialog.keyValue),
    )
    /** 二级列表是否可写（默认是；relations 配 editable:false 则只留详情） */
    const relEditable = computed(() => relDialog.rel?.editable !== false)

    const loadRelationData = async () => {
      if (!relDialog.rel) return
      relDialog.loading = true
      try {
        const resp = await backendConfigApi[relDialog.rel.targetTable].page({ pageNum: 1, pageSize: 1000 })
        const page = (resp?.data || {}) as BackendPage
        relDialog.all = Array.isArray(page.records) ? page.records : []
      } catch (e: any) {
        relDialog.all = []
        ElMessage.error(e?.message || '查询关联记录失败')
      } finally {
        relDialog.loading = false
      }
    }
    /** 行级联按钮：以该行 localField 值为关联键打开目标表列表（每次重新拉取，保证编辑/删除后数据新鲜） */
    const openRelation = (rel: TableRelation, row: any) => {
      relDialog.rel = rel
      relDialog.keyValue = String(row?.[rel.localField] ?? '')
      relDialog.visible = true
      loadRelationData()
    }

    // 列表状态
    const rows = ref<any[]>([])
    const total = ref(0)
    const pageNum = ref(1)
    const pageSize = ref(10)
    const loading = ref(false)

    // 弹窗表单状态
    const formVisible = ref(false)
    // element-plus 1.0.2-beta 未导出 FormInstance 类型，此处仅用到 validate()，用宽松类型接引
    const formRef = ref<{ validate: () => Promise<boolean>; } | null>(null)
    const formMode = ref<FormMode>('create')
    const submitting = ref(false)
    const form = reactive<Record<string, any>>({})
    // JSON / 字符串数组字段使用独立的草稿文本，避免直接双向绑定引用类型
    const jsonDraft = reactive<Record<string, string>>({})
    const arrayDraft = reactive<Record<string, string>>({})
    // 无 schema 表的原始 JSON 文本
    const rawJsonText = ref('')
    // 编辑时保留主键原值，PUT/DELETE 需要
    const editingId = ref<number | string | null>(null)

    // Markdown 弹层编辑器状态（仅对 kind==='md' / 'mdJson' 字段生效）
    const mdEditor = reactive<{ visible: boolean; value: string; title: string; prop: string; kind: FieldKind; }>({
      visible: false,
      value: '',
      title: 'Markdown 编辑',
      prop: '',
      kind: 'md',
    })

    /** 打开 Markdown 编辑器：带入当前字段值（mdJson 自动包 ```json 供预览） */
    const openMdEditor = (f: FieldDef) => {
      mdEditor.prop = f.prop
      mdEditor.kind = f.kind
      const raw = form[f.prop] ?? ''
      mdEditor.value = f.kind === 'mdJson' ? toJsonFence(raw) : raw
      mdEditor.title = f.kind === 'mdJson' ? `${f.label}（JSON）` : `${f.label}（Markdown）`
      mdEditor.visible = true
    }

    /** 编辑器保存：回填到当前字段（mdJson 先去围栏再存回原始 JSON 文本） */
    const handleMdSave = (val: string) => {
      if (!mdEditor.prop) return
      form[mdEditor.prop] = mdEditor.kind === 'mdJson' ? stripJsonFence(val) : val
    }

    // MdEditorDialog 已提到根级，需在其宿主弹窗/表单关闭时主动收起，避免悬空编辑器
    watch(formVisible, val => { if (!val) mdEditor.visible = false })
    watch(() => props.visible, val => { if (!val) { mdEditor.visible = false; formVisible.value = false; relDialog.visible = false } })

    const tableColumns = computed<FieldDef[]>(() =>
      (activeDef.value?.fields || []).filter(f => f.inTable !== false),
    )
    const formFields = computed<FieldDef[]>(() =>
      (formDef.value?.fields || []).filter(f => f.inForm !== false),
    )

    /**
     * 由表元数据驱动 el-form 校验规则（readonly 字段不参与）：
     *   - required：普通字段直接用 required 规则（读 form[prop]）；
     *     json/stringArray 输入绑定的是草稿，改用自定义校验器读 jsonDraft/arrayDraft。
     *   - json 字段额外校验 JSON 合法性。
     */
    const rules = computed<Record<string, any[]>>(() => {
      const def = formDef.value
      const result: Record<string, any[]> = {}
      if (!def || def.jsonMode) return result
      const trigger = ['blur', 'change']
      def.fields.forEach(f => {
        if (f.readonly) return
        const list: any[] = []
        if (f.required) {
          if (f.kind === 'json' || f.kind === 'stringArray') {
            list.push({
              validator: (_r: any, _v: any, cb: (e?: Error) => void) => {
                const src = f.kind === 'json' ? jsonDraft[f.prop] : arrayDraft[f.prop]
                cb(src && src.trim() ? undefined : new Error(`请填写「${f.label}」`))
              },
              trigger,
            })
          } else {
            list.push({ required: true, message: `请填写「${f.label}」`, trigger })
          }
        }
        if (f.kind === 'json') {
          list.push({
            validator: (_r: any, _v: any, cb: (e?: Error) => void) => {
              const r = parseJsonObject(jsonDraft[f.prop])
              cb(r.ok ? undefined : new Error(`「${f.label}」${r.msg}`))
            },
            trigger,
          })
        }
        if (f.kind === 'mdJson') {
          list.push({
            validator: (_r: any, _v: any, cb: (e?: Error) => void) => {
              // form[prop] 存的是原始 JSON 文本（可能带 ```json 围栏），去围栏后校验
              const r = parseJsonObject(form[f.prop], true)
              cb(r.ok ? undefined : new Error(`「${f.label}」${r.msg}`))
            },
            trigger,
          })
        }
        if (list.length) result[f.prop] = list
      })
      return result
    })
    const formTitle = computed(() => {
      const t = formDef.value?.title || ''
      if (formMode.value === 'create') return `新增 - ${t}`
      if (formMode.value === 'edit') return `编辑 - ${t}`
      return `详情 - ${t}`
    })

    const isReadonlyField = (f: FieldDef): boolean => {
      if (formMode.value === 'view') return true
      if (f.readonly) return true
      // 编辑态下主键只读，避免误改
      if (f.isId && formMode.value === 'edit') return true
      return false
    }

    const formatCell = (val: any, kind: FieldDef['kind']): string => {
      if (val === null || val === undefined || val === '') return '-'
      if (kind === 'boolean') return val ? '是' : '否'
      if (kind === 'json' || kind === 'stringArray') return shortJson(val)
      if (typeof val === 'object') return shortJson(val)
      return String(val)
    }

    const shortJson = (val: any): string => {
      try {
        const s = typeof val === 'string' ? val : JSON.stringify(val)
        return s && s.length > 120 ? `${s.slice(0, 120)  }…` : s
      } catch {
        return String(val ?? '')
      }
    }

    /** 拉取分页数据 */
    const loadPage = async (num?: number) => {
      if (!activeDef.value) return
      if (num) pageNum.value = num
      loading.value = true
      try {
        const api = backendConfigApi[activeKey.value]
        const resp = await api.page({ pageNum: pageNum.value, pageSize: pageSize.value })
        const page = (resp?.data || {}) as BackendPage
        rows.value = Array.isArray(page.records) ? page.records : []
        total.value = Number(page.total || 0)
      } catch (e: any) {
        rows.value = []
        total.value = 0
        ElMessage.error(e?.message || '分页查询失败')
      } finally {
        loading.value = false
      }
    }

    /** 加载启用列表（部分表提供） */
    const loadEnabledList = async () => {
      if (!activeDef.value?.hasEnabledList) return
      loading.value = true
      try {
        const api = backendConfigApi[activeKey.value]
        const resp = await api.listEnabled()
        rows.value = Array.isArray(resp?.data) ? resp.data : []
        total.value = rows.value.length
        ElMessage.success(`已加载 ${rows.value.length} 条启用记录`)
      } catch (e: any) {
        ElMessage.error(e?.message || '加载启用列表失败')
      } finally {
        loading.value = false
      }
    }

    const handleSizeChange = (size: number) => {
      pageSize.value = size
      loadPage(1)
    }

    const handleSwitchTable = (key: BackendTableKey) => {
      if (key === activeKey.value) return
      activeKey.value = key
      rows.value = []
      total.value = 0
      pageNum.value = 1
      loadPage(1)
    }

    /** 用记录回填表单：record 为 null 表示新增（给空值）。会先清空草稿/form */
    const fillRecord = (def: TableDef, record: any) => {
      Object.keys(jsonDraft).forEach(k => delete jsonDraft[k])
      Object.keys(arrayDraft).forEach(k => delete arrayDraft[k])
      Object.keys(form).forEach(k => delete form[k])
      editingId.value = record ? record[def.idField] ?? null : null

      if (def.jsonMode) {
        rawJsonText.value = record ? JSON.stringify(record, null, 2) : '{\n  \n}'
        return
      }

      const base = buildEmptyForm(def)
      Object.assign(form, base)
      // 先给 json/stringArray 草稿一个字符串初值，避免新增态或记录缺字段时
      // el-input 绑定 undefined 触发 ElementPlus「binding value must be a string or number」。
      def.fields.forEach(f => {
        if (f.kind === 'json') jsonDraft[f.prop] = ''
        else if (f.kind === 'stringArray') arrayDraft[f.prop] = ''
      })
      if (record) {
        def.fields.forEach(f => {
          if (!(f.prop in record)) return
          const v = record[f.prop]
          if (f.kind === 'json') {
            form[f.prop] = v ?? null
            jsonDraft[f.prop] = v == null ? '' : safeStringify(v)
          } else if (f.kind === 'stringArray') {
            form[f.prop] = Array.isArray(v) ? v : []
            arrayDraft[f.prop] = Array.isArray(v) ? v.join('\n') : ''
          } else if (f.kind === 'mdJson') {
            // 存原始美化 JSON 文本（不包 ```），让用户在文本框里直接编辑无需写反引号；
            // ```json 包裹仅在点开 md 双栏弹层时动态加上。
            form[f.prop] = v == null ? '' : (typeof v === 'string' ? v : safeStringify(v))
          } else {
            form[f.prop] = v ?? base[f.prop]
          }
        })
      } else {
        // 新增时主键留空，由后端生成
        def.fields.forEach(f => {
          if (f.isId) form[f.prop] = null
        })
      }
    }

    /**
     * 打开表单弹窗：row 为空表示新增；tableKeyOverride 表示来自二级级联弹窗
     * （传入 relation.targetTable，表单表上下文切到目标表，与主列表共用同一套表单）。
     * 编辑/详情采用「接口优先 + 行数据兜底」：先用列表行占位立即弹窗，
     * 再调 getById 拉取最新完整记录覆盖（避免列表裁剪字段导致全量 PUT 覆盖丢数据）。
     */
    const openForm = async (row?: any, mode: FormMode = 'edit', tableKeyOverride?: BackendTableKey) => {
      formTableKey.value = tableKeyOverride ?? activeKey.value
      if (!formDef.value) return
      const def = formDef.value

      if (!row) {
        formMode.value = 'create'
        fillRecord(def, null)
        formVisible.value = true
        return
      }

      formMode.value = mode
      fillRecord(def, row) // 先用列表行占位，避免接口往返时弹窗空白
      formVisible.value = true

      const id = row[def.idField]
      if (id === null || id === undefined || id === '') return
      try {
        const resp = await backendConfigApi[formTableKey.value].getById(id)
        const fresh = resp?.data
        // 接口成功且返回对象：用权威记录覆盖；失败/空则保留列表行数据
        if (fresh && typeof fresh === 'object') {
          fillRecord(def, fresh)
        }
      } catch (e: any) {
        ElMessage.warning(e?.message || '获取单条详情失败，已使用列表数据')
      }
    }

    const openDetail = (row: any, tableKeyOverride?: BackendTableKey) =>
      openForm(row, 'view', tableKeyOverride)

    /**
     * 复制：以该行数据为模板开「新增」表单（预填字段、清空主键），提交走 save。
     * 与编辑一致先拉 getById 取完整记录，避免列表裁剪字段。
     */
    const handleCopy = async (row: any, tableKeyOverride?: BackendTableKey) => {
      formTableKey.value = tableKeyOverride ?? activeKey.value
      const def = formDef.value
      if (!def || !row) return
      let record = row
      const id = row[def.idField]
      if (id !== null && id !== undefined && id !== '') {
        try {
          const resp = await backendConfigApi[formTableKey.value].getById(id)
          if (resp?.data && typeof resp.data === 'object') record = resp.data
        } catch (e: any) {
          ElMessage.warning(e?.message || '获取详情失败，已用列表数据复制')
        }
      }
      // 复制即新增：先按记录回填，再清空主键与 editingId，避免沿用原 ID 提交
      formMode.value = 'create'
      fillRecord(def, record)
      def.fields.forEach(f => { if (f.isId) form[f.prop] = null })
      editingId.value = null
      formVisible.value = true
    }

    const safeStringify = (v: any): string => {
      try { return JSON.stringify(v, null, 2) } catch { return String(v ?? '') }
    }

    /** mdJson 字段：把对象/原始 JSON 文本包成 ```json 代码块（已包裹则原样返回），仅供弹层预览 */
    const toJsonFence = (v: any): string => {
      const body = typeof v === 'string' ? v : safeStringify(v)
      if (/^```[\s\S]*```$/.test(body.trim())) return body
      return `\`\`\`json\n${body}\n\`\`\``
    }
    /** mdJson 字段：去 ```json 包裹（若未包裹则按原文） */
    const stripJsonFence = (text: string): string => {
      const t = (text || '').trim()
      const m = t.match(/^```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```$/)
      return m ? (m[1] || '').trim() : t
    }
    /**
     * 统一解析并校验 json / mdJson 字段的文本（与 jsonMode 一致，顶层必须是对象）：
     *   空→{ok:true,value:null}；语法非法→msg；顶层非对象(数组/标量/null)→msg。
     * @param fenced 文本是否带 ```json 围栏（mdJson 为 true）
     */
    const parseJsonObject = (rawText: string, fenced = false): { ok: boolean; value?: any; msg?: string; } => {
      const text = fenced ? stripJsonFence(rawText) : (rawText || '').trim()
      if (!text) return { ok: true, value: null }
      let parsed: any
      try { parsed = JSON.parse(text) } catch { return { ok: false, msg: '不是合法 JSON' } }
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ok: false, msg: '顶层必须是 JSON 对象 {...}' }
      }
      return { ok: true, value: parsed }
    }

    /** JSON 输入框失焦：尝试解析并回填 form；解析失败保留文本，提交时统一校验 */
    const commitJsonField = (prop: string) => {
      const text = (jsonDraft[prop] || '').trim()
      if (!text) { form[prop] = null; return }
      try {
        form[prop] = JSON.parse(text)
      } catch {
        // 保持原值，等待提交时报错
      }
    }
    const commitArrayField = (prop: string) => {
      const text = arrayDraft[prop] || ''
      form[prop] = text
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0)
    }

    /** 提交（新增/更新）：表单表上下文由 formTableKey 决定（主列表或二级执行配置） */
    const handleSubmit = async () => {
      const def = formDef.value
      if (!def) return
      const api = backendConfigApi[formTableKey.value]
      let payload: Record<string, any>

      if (def.jsonMode) {
        const text = (rawJsonText.value || '').trim()
        if (!text) { ElMessage.warning('请填写 JSON 内容'); return }
        try {
          payload = JSON.parse(text)
        } catch {
          ElMessage.error('JSON 格式不合法')
          return
        }
        if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
          ElMessage.error('JSON 顶层必须是对象')
          return
        }
      } else {
        // 结构化表单：走 el-form 规则校验（必填 / JSON 合法性，字段下方内联红字提示）
        if (formRef.value) {
          try {
            await formRef.value.validate()
          } catch {
            ElMessage.warning('请检查表单填写')
            return
          }
        }
        // 硬兜底：逐个校验 json 字段草稿合法性（旧版 el-form + async-validator 对无
        // required/type 的自定义 validator 在值为空时可能不拦截），确保非法/非对象一定拦下。
        for (const f of def.fields) {
          if (f.readonly || f.kind !== 'json') continue
          const r = parseJsonObject(jsonDraft[f.prop])
          if (!r.ok) {
            ElMessage.error(`「${f.label}」${r.msg}`)
            return
          }
        }
        // mdJson 字段：去 ```json 围栏并解析回对象（接口仍按对象提交）；非法/非对象则拦截
        for (const f of def.fields) {
          if (f.readonly || f.kind !== 'mdJson') continue
          const r = parseJsonObject(form[f.prop], true)
          if (!r.ok) {
            ElMessage.error(`「${f.label}」${r.msg}`)
            return
          }
          form[f.prop] = r.value
        }
        // 校验通过后把 jsonDraft / arrayDraft 落到 form
        def.fields.forEach(f => {
          if (f.kind === 'json') commitJsonField(f.prop)
          if (f.kind === 'stringArray') commitArrayField(f.prop)
        })
        // 剔除只读的时间戳字段，避免覆盖后端值
        payload = {}
        def.fields.forEach(f => {
          if (f.readonly) return
          if (!(f.prop in form)) return
          const v = form[f.prop]
          if (v === '' && (f.kind === 'number' || f.kind === 'json')) return
          payload[f.prop] = v
        })
        // 编辑态：主键必须回传
        if (formMode.value === 'edit' && editingId.value !== null) {
          payload[def.idField] = editingId.value
        }
      }

      submitting.value = true
      try {
        if (formMode.value === 'create') {
          await api.save(payload)
          ElMessage.success('新增成功')
        } else {
          await api.update(payload)
          ElMessage.success('更新成功')
        }
        formVisible.value = false
        // 来自二级级联弹窗的提交：刷新其前端过滤列表；否则刷新主列表
        if (relDialog.visible && formTableKey.value === relDialog.rel?.targetTable) loadRelationData()
        else loadPage()
      } catch (e: any) {
        ElMessage.error(e?.message || '保存失败')
      } finally {
        submitting.value = false
      }
    }

    /** 删除：传 tableKeyOverride（= relation.targetTable）时删的是二级级联列表里的目标表记录 */
    const handleDelete = async (row: any, tableKeyOverride?: BackendTableKey) => {
      formTableKey.value = tableKeyOverride ?? activeKey.value
      const def = formDef.value
      if (!def) return
      const id = row?.[def.idField]
      if (id === null || id === undefined || id === '') {
        ElMessage.error(`记录缺少主键 ${def.idField}`)
        return
      }
      try {
        await ElMessageBox.confirm(`确认删除 ${def.title} 中 ID=${id} 的记录？`, '删除确认', {
          type: 'warning',
          confirmButtonText: '删除',
          cancelButtonText: '取消',
        })
      } catch {
        return // 取消
      }
      try {
        await backendConfigApi[formTableKey.value].remove(id)
        ElMessage.success('删除成功')
        if (tableKeyOverride && relDialog.visible) {
          // 二级列表为前端过滤 + 本地滚动（无翻页）：重拉保持数据新鲜
          loadRelationData()
        } else {
          // 若删的是当前页最后一条，回退一页
          if (rows.value.length === 1 && pageNum.value > 1) pageNum.value -= 1
          loadPage()
        }
      } catch (e: any) {
        ElMessage.error(e?.message || '删除失败')
      }
    }

    const handleOpen = () => {
      // 弹窗打开时加载首个表数据
      if (rows.value.length === 0 && total.value === 0) loadPage(1)
    }

    const handleVisibleChange = (val: boolean) => {
      emit('update:visible', val)
    }
    const handleClose = () => {
      emit('update:visible', false)
    }

    return {
      tables,
      activeKey,
      activeDef,
      formDef,
      activeRelations,
      relDialog,
      relTargetDef,
      relTargetKey,
      relColumns,
      relMatchField,
      relRows,
      relEditable,
      openRelation,
      rows,
      total,
      pageNum,
      pageSize,
      loading,
      tableColumns,
      formFields,
      formVisible,
      formRef,
      rules,
      formMode,
      formTitle,
      form,
      jsonDraft,
      arrayDraft,
      rawJsonText,
      submitting,
      mdEditor,
      openMdEditor,
      handleMdSave,
      formatCell,
      shortJson,
      isReadonlyField,
      loadPage,
      loadEnabledList,
      handleSizeChange,
      handleSwitchTable,
      openForm,
      openDetail,
      handleCopy,
      commitJsonField,
      commitArrayField,
      handleSubmit,
      handleDelete,
      handleOpen,
      handleVisibleChange,
      handleClose,
    }
  },
})
</script>

<style scoped>
/* 自绘标题行与右上角关闭按钮（内置 × 已禁用） */
.bc-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.bc-dialog-title {
  font-size: 16px;
  color: #303133;
  font-weight: 600;
}
.bc-dialog-close {
  border: none;
  background: transparent;
  padding: 2px;
  cursor: pointer;
  line-height: 1;
  color: #909399;
  display: inline-flex;
  align-items: center;
  transition: color 0.15s;
}
.bc-dialog-close:hover {
  color: #409eff;
}
.bc-dialog-close :deep(svg) {
  width: 16px;
  height: 16px;
}

.bc-layout {
  display: flex;
  height: 100%;
  gap: 12px;
}

/* 左侧表选择 */
.bc-side {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid #e5e7eb;
  padding-right: 10px;
  overflow-y: auto;
}
.bc-side-title {
  font-size: 13px;
  color: #64748b;
  padding: 4px 8px 10px;
  letter-spacing: 1px;
}
.bc-side-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.bc-side-item {
  padding: 8px 10px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 2px;
  transition: background 0.15s;
}
.bc-side-item:hover {
  background: #f1f5f9;
}
.bc-side-item.active {
  background: #e0edff;
}
.bc-side-item.active .bc-side-name {
  color: #1d4ed8;
  font-weight: 600;
}
.bc-side-name {
  font-size: 13px;
  color: #1f2937;
}
.bc-side-code {
  font-size: 11px;
  color: #94a3b8;
  font-family: Consolas, Monaco, monospace;
}

/* 右侧主区域 */
.bc-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.bc-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0 10px;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 8px;
}
.bc-toolbar-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}
.bc-toolbar-sub {
  margin-left: 10px;
  font-size: 12px;
  color: #94a3b8;
}
.bc-toolbar-right {
  display: flex;
  gap: 6px;
}
.bc-table-wrap {
  flex: 1;
  min-height: 0;
  position: relative;
}
.bc-table {
  height: 100%;
}
.bc-pager {
  padding-top: 10px;
  display: flex;
  justify-content: flex-end;
}
.bc-empty {
  padding: 40px 0;
  color: #94a3b8;
  font-size: 13px;
}
.bc-danger {
  color: #ef4444 !important;
}
.bc-json-cell {
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  color: #475569;
}

/* 表单弹窗 */
.bc-form :deep(.el-form-item) {
  margin-bottom: 14px;
}
/* Markdown 字段：只读预览 + 编辑按钮上下排列，按钮靠右 */
.bc-md-field {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  width: 100%;
}
.bc-md-field :deep(.el-textarea) {
  width: 100%;
}
.bc-json-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bc-json-tip {
  font-size: 12px;
  color: #64748b;
  background: #f8fafc;
  padding: 6px 10px;
  border-radius: 4px;
  border-left: 3px solid #94a3b8;
}
</style>

<style>
/* 后台配置弹层占满屏幕 90%：宽 90%（配合 top=5vh 垂直居中），高 90vh；
   用 custom-class 精确命中 .el-dialog，仅作用于本弹层，不影响全站其它 dialog。
   弹层设为纵向 flex，内容区 flex:1 撑满并在超出时滚动。 */
.backend-config-dialog {
  display: flex;
  flex-direction: column;
  height: 90vh;
  margin-bottom: 0;
}

.backend-config-dialog .el-dialog__body {
  flex: 1;
  overflow: hidden;
  padding-top: 10px;
  padding-bottom: 10px;
}

/* 内嵌表单弹窗：限高 + 三段式 flex 布局（与外层弹窗同构）。
   字段多时弹窗不再撑破视口：抬头（标题+×）与底栏（保存）固定，
   只.el-dialog__body 内部滚动，min-height:0 保证 flex 子项可收缩出滚动条。 */
.backend-config-form-dialog {
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.backend-config-form-dialog .el-dialog__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* 表格横向滚动条加粗：
   该版本 el-table 的 body-wrapper 用原生滚动条（overflow-x:auto），而全局
   styles/themes/index.scss 把 ::-webkit-scrollbar 统一设为了 4px，导致横向条极细、很难拖到。
   这里仅针对本弹窗表格的 body-wrapper 把横向滚动条加高，不影响其它区域。 */
.backend-config-dialog .el-table__body-wrapper::-webkit-scrollbar {
  height: 10px;
}
.backend-config-dialog .el-table__body-wrapper::-webkit-scrollbar-thumb {
  background: rgb(100, 116, 139, 0.6);
  border-radius: 7px;
}
.backend-config-dialog .el-table__body-wrapper::-webkit-scrollbar-thumb:hover {
  background: rgb(71, 85, 105, 0.9);
}

/* 次级描边按钮（刷新）：白底 + 浅描边 + 中性字，hover 转主色，与实心「新增」形成主次层级 */
.backend-config-dialog .bc-ghost-btn.el-button {
  background-color: #ffffff;
  border-color: #d6def0;
  color: #5b6b82;
  border-radius: 8px;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
}

.backend-config-dialog .bc-ghost-btn.el-button:hover,
.backend-config-dialog .bc-ghost-btn.el-button:focus {
  background-color: #eef4ff;
  border-color: #2f6bff;
  color: #2f6bff;
}

.backend-config-dialog .bc-ghost-btn.el-button:active {
  background-color: #dbe8ff;
  border-color: #1c56e6;
  color: #1c56e6;
}

.backend-config-dialog .bc-ghost-btn.el-button.is-loading {
  background-color: #ffffff;
  border-color: #d6def0;
  color: #9aa8bd;
}

/* ===================== 分页控件 ===================== */
/* 修复箭头乱码方块：该版本 element-plus（1.0.2-beta.55）的 prev/next 与条・页下拉 caret
   都是 element-icons 字体图标，但包内并未附带该字体文件（node_modules 全局无
   element-icons.woff/ttf），::before 的私有区字符只能渲染成方块乱码。
   这里去掉字体字形，用描边伪元素自绘左右 / 下箭头 */
.backend-config-dialog .el-pagination .btn-prev .el-icon::before,
.backend-config-dialog .el-pagination .btn-next .el-icon::before,
.backend-config-dialog .el-pagination .el-select .el-input__icon::before {
  content: none;
}

.backend-config-dialog .el-pagination .btn-prev .el-icon::after {
  content: '';
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-top: -2px;
  border-top: 1.6px solid currentColor;
  border-left: 1.6px solid currentColor;
  transform: rotate(-45deg);
}

.backend-config-dialog .el-pagination .btn-next .el-icon::after {
  content: '';
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-top: -2px;
  border-top: 1.6px solid currentColor;
  border-right: 1.6px solid currentColor;
  transform: rotate(45deg);
}

/* 展开时 el-select__caret 自身 rotate 180°，自绘箭头会随之翻向，无需额外处理 */
.backend-config-dialog .el-pagination .el-select .el-input__icon::after {
  content: '';
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-top: -3px;
  border-right: 1.6px solid currentColor;
  border-bottom: 1.6px solid currentColor;
  transform: rotate(45deg);
}

/* prev/next 与页码按钮：描边胶囊风格，hover/active 走 AI 主色 #2f6bff，
   与工具栏「刷新 / 新增」同一套按钮语言 */
.backend-config-dialog .el-pagination .btn-prev,
.backend-config-dialog .el-pagination .btn-next,
.backend-config-dialog .el-pagination .el-pager li {
  border: 1px solid #d6def0;
  border-radius: 6px;
  background: #ffffff;
  color: #5b6b82;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
}

.backend-config-dialog .el-pagination .btn-prev:hover:not([disabled]),
.backend-config-dialog .el-pagination .btn-next:hover:not([disabled]),
.backend-config-dialog .el-pagination .el-pager li:hover {
  color: #2f6bff;
  border-color: #2f6bff;
  background: #eef4ff;
}

.backend-config-dialog .el-pagination .btn-prev[disabled],
.backend-config-dialog .el-pagination .btn-next[disabled] {
  color: #c0c8d4;
  border-color: #e5eaf2;
  background: #f7f9fc;
}

.backend-config-dialog .el-pagination .el-pager li.active {
  background: #2f6bff;
  border-color: #2f6bff;
  color: #ffffff;
}

/* 主色按钮（新增 / 保存）统一为 AI 助手主色：Element 默认 primary 走 DataV 深色主题变量，
   与本弹层浅色风格脱节；这里对齐登录页 / 对话窗的 #2f6bff 主色体系，两个弹层观感一致。
   （两个 el-dialog 均 append-to-body，scoped 样式穿不到，故写在全局块里用 custom-class 精确限定） */
.backend-config-dialog .el-button--primary,
.backend-config-form-dialog .el-button--primary {
  background-color: #2f6bff;
  border-color: #2f6bff;
  color: #ffffff;
  border-radius: 8px;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
}

.backend-config-dialog .el-button--primary:hover,
.backend-config-dialog .el-button--primary:focus,
.backend-config-form-dialog .el-button--primary:hover,
.backend-config-form-dialog .el-button--primary:focus {
  background-color: #1c56e6;
  border-color: #1c56e6;
  color: #ffffff;
}

.backend-config-dialog .el-button--primary:active,
.backend-config-form-dialog .el-button--primary:active {
  background-color: #1a4fd1;
  border-color: #1a4fd1;
  color: #ffffff;
}

/* plain 变体（表单里的「Markdown 编辑」按钮）：浅蓝底 + 主色字，hover 反转为实心 */
.backend-config-form-dialog .el-button--primary.is-plain {
  background-color: #eef4ff;
  border-color: #c6dbff;
  color: #2f6bff;
}

.backend-config-form-dialog .el-button--primary.is-plain:hover,
.backend-config-form-dialog .el-button--primary.is-plain:focus {
  background-color: #2f6bff;
  border-color: #2f6bff;
  color: #ffffff;
}

/* 禁用 / 加载中（保存提交时）：淡主色，保持同色系不断层 */
.backend-config-dialog .el-button--primary.is-disabled,
.backend-config-dialog .el-button--primary.is-loading,
.backend-config-form-dialog .el-button--primary.is-disabled,
.backend-config-form-dialog .el-button--primary.is-loading {
  background-color: #a9c3ff;
  border-color: #a9c3ff;
  color: #ffffff;
}

/* 删除确认框（ElMessageBox）层级修复：
   本弹层为盖过左侧自绘对话窗把 dialog 手工抬到了 10200/10300，而 MessageBox 的层级由
   PopupManager 递增计数器分配（约 2000 出头），会被压在 dialog 后面看不到。
   MessageBox 的遮罩与箱体在同一个 .el-overlay.is-message-box 上（内联 z-index），
   这里用 !important 覆盖内联值，确保确认框始终在最上层可见可点。 */
.el-overlay.is-message-box {
  z-index: 10400 !important;
}

/* ElMessage 轻提示（新增/更新/删除/查询 的成功与失败 toast）：
   .el-message 箱体直挂 body、z-index 由 PopupManager 分配（约 2000 出头），
   会被本弹层（dialog 10200/10300、message box 10400）盖住，导致“弹了但看不见”。
   这里抬到 message box 之上，保证 toast 始终可见。 */
.el-message {
  z-index: 10500 !important;
}

/* 分页“条/页”下拉层级修复：
   el-pagination 的 sizes 下拉本质是 el-select，其弹层被 teleport 到 body，
   z-index 由 PopupManager 分配（约 2000 出头），同样会被抬到 10200 的 dialog 遮罩盖住，
   导致点开只看到当前“10条/页”、其余选项被遮挡不可选。
   通过 popper-class 精确命中本弹层的下拉，用 !important 覆盖内联值抬到 dialog 之上。 */
.backend-config-popper.el-popper {
  z-index: 10350 !important;
}
</style>
