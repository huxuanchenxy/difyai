/**
 * 后台配置各表的字段元数据
 * 来源：Swagger http://10.89.33.97:8082/v3/api-docs components.schemas（部分表由建表 DDL 补充）
 *
 * 用途：
 *   1. 驱动表格列渲染（label + prop + 格式化）
 *   2. 驱动新增/编辑弹窗的动态表单
 *
 * 对于 Swagger 中 schema 为空的表（如 SessionDialogueLog），
 * 后端未暴露字段结构，此处采用「JSON 原文编辑」模式，避免臆造字段。
 */
import type { BackendTableKey } from '@/api/backendConfig'

/** 字段类型 */
export type FieldKind =
  | 'text'        // 单行字符串
  | 'textarea'    // 多行字符串（长文本）
  | 'md'          // Markdown 长文本（值仍是字符串，接口按普通文本处理；表单弹出左右双栏编辑器编辑）
  | 'mdJson'      // 值本质是 JSON 对象：用 md 双栏编辑器编辑（```json 包裹），提交前再解析回对象，接口与 json 一致
  | 'number'      // 数字（int32/int64/float）
  | 'boolean'     // 布尔
  | 'datetime'    // 时间字符串
  | 'json'        // 对象（additionalProperties）
  | 'stringArray' // 字符串数组

export interface FieldDef {
  /** 后端字段名 */
  prop: string
  /** 中文标签 */
  label: string
  /** 输入类型 */
  kind: FieldKind
  /** 是否为主键（新增时禁用，编辑时只读） */
  isId?: boolean
  /** 是否必填（前端提示，实际以后端为准） */
  required?: boolean
  /** 是否在列表中展示（默认 true） */
  inTable?: boolean
  /** 是否在表单中展示（默认 true） */
  inForm?: boolean
  /** 是否只读（后端自动维护的时间戳等） */
  readonly?: boolean
  /** 数字类型：int 或 float，用于 step 处理 */
  numberType?: 'int' | 'float'
  /** 表格列宽度（px） */
  width?: number
  /** 占位提示 */
  placeholder?: string
}

export interface TableDef {
  key: BackendTableKey
  /** 表中文名 */
  title: string
  /** 主键字段名 */
  idField: string
  /** 是否使用 JSON 原文编辑（无 schema 表） */
  jsonMode?: boolean
  /** 是否提供启用列表接口 */
  hasEnabledList?: boolean
  /** 前端硬编码隐藏：true 时不在后台配置左侧「数据表」菜单中显示（默认显示） */
  hidden?: boolean
  /** 主→次级联：在操作列按此配置渲染弹出按钮，点击后按关联字段过滤 targetTable 的列表 */
  relations?: TableRelation[]
  fields: FieldDef[]
}

/** 表间级联配置：任意表都可通过它获得「二级弹窗」能力，按钮文案/目标表/关联字段均可配 */
export interface TableRelation {
  /** 操作列按钮文案，如「执行配置」 */
  label: string
  /** 目标表 key：点击后弹出该表列表，其 schema 驱动二级列与表单 */
  targetTable: BackendTableKey
  /** 本表关联字段：取行值作为过滤键（如 intentCode） */
  localField: string
  /** 目标表过滤字段：接口按它筛选；默认与 localField 同名 */
  remoteField?: string
  /** 二级列表是否可编辑/复制/删除（默认 true）；false 时仅提供详情（只读） */
  editable?: boolean
}

/** 通用：createdAt / updatedAt 只读时间字段 */
const createdAtField: FieldDef = {
  prop: 'createdAt',
  label: '创建时间',
  kind: 'datetime',
  inTable: true,
  inForm: true,
  readonly: true,
  width: 165,
}
const updatedAtField: FieldDef = {
  prop: 'updatedAt',
  label: '更新时间',
  kind: 'datetime',
  inTable: true,
  inForm: true,
  readonly: true,
  width: 165,
}

export const BACKEND_TABLES: TableDef[] = [
  {
    key: 'intentDefinition',
    title: '意图定义',
    idField: 'intentId',
    hasEnabledList: true,
    // 行操作列弹出「执行配置」：按本行 intentCode 过滤 intentSkillConfig（其同名字段）
    relations: [
      {
        label: '技能配置',
        targetTable: 'intentSkillConfig',
        localField: 'intentCode',
      },
    ],
    fields: [
      { prop: 'intentId', label: '意图ID', kind: 'number', isId: true, numberType: 'int', width: 90 },
      { prop: 'intentCode', label: '意图编码', kind: 'text', required: true, width: 140 },
      { prop: 'intentName', label: '意图名称', kind: 'text', required: true, width: 140 },
      { prop: 'intentDesc', label: '意图描述', kind: 'textarea', inTable: false },
      { prop: 'intentExamples', label: '示例语句', kind: 'stringArray', inTable: false, placeholder: '一行一个示例' },
      { prop: 'extractionConfig', label: '抽取配置', kind: 'json', inTable: false },
      { prop: 'isAllowedSkipConfirm', label: '允许跳过确认', kind: 'boolean', width: 120 },
      { prop: 'priority', label: '优先级', kind: 'number', numberType: 'int', width: 90 },
      { prop: 'isEnabled', label: '是否启用', kind: 'boolean', width: 100 },
      { prop: 'defaultEvaluationMode', label: '默认评估模式', kind: 'text', width: 140 },
      { prop: 'isSupportEvaluationSkip', label: '支持评估跳过', kind: 'number', numberType: 'int', width: 130 },
      { prop: 'categories', label: '分类', kind: 'number', numberType: 'int', width: 80 },
      createdAtField,
      updatedAtField,
    ],
  },
  {
    key: 'difySkillRegistry',
    title: 'Dify技能注册表',
    idField: 'skillId',
    hasEnabledList: true,
    fields: [
      { prop: 'skillId', label: '技能ID', kind: 'number', isId: true, numberType: 'int', width: 90 },
      { prop: 'skillCode', label: '技能编码', kind: 'text', required: true, width: 140 },
      { prop: 'skillName', label: '技能名称', kind: 'text', required: true, width: 140 },
      { prop: 'skillType', label: '技能类型', kind: 'text', width: 110 },
      { prop: 'difyAppId', label: 'Dify AppId', kind: 'text', width: 180 },
      { prop: 'difyApiSecretEncrypted', label: 'Dify 密钥(加密)', kind: 'text', inTable: false },
      { prop: 'difyApiEndpoint', label: 'Dify Endpoint', kind: 'text', width: 220 },
      { prop: 'apiPath', label: 'API 路径', kind: 'text', width: 180 },
      { prop: 'skillDesc', label: '技能描述', kind: 'textarea', inTable: false },
      { prop: 'generationPrompt', label: '生成提示词', kind: 'md', inTable: false },
      { prop: 'timeoutSeconds', label: '超时秒', kind: 'number', numberType: 'int', width: 90 },
      { prop: 'maxRetryTimes', label: '最大重试', kind: 'number', numberType: 'int', width: 100 },
      { prop: 'defaultOutputConfidence', label: '默认置信度', kind: 'number', numberType: 'float', width: 120 },
      { prop: 'isAllowSkipEvaluation', label: '允许跳过评估', kind: 'number', numberType: 'int', width: 130 },
      { prop: 'supportsFileInput', label: '支持文件输入', kind: 'boolean', width: 130 },
      { prop: 'isEnabled', label: '是否启用', kind: 'boolean', width: 100 },
      { prop: 'requestTemplate', label: '请求模板', kind: 'mdJson', inTable: false },
      { prop: 'responseExtractRule', label: '响应抽取规则', kind: 'json', inTable: false },
      { prop: 'slotTransforms', label: '槽位转换', kind: 'json', inTable: false },
      { prop: 'engineConfig', label: '引擎参数', kind: 'json', inTable: false, placeholder: 'OPENCODE 类型参数: provider_id/model_id' },
      createdAtField,
      updatedAtField,
    ],
  },
  {
    key: 'intentSkillConfig',
    title: '意图-技能执行配置',
    idField: 'configId',
    hasEnabledList: true,
    hidden: true, // 前端硬编码隐藏：不在后台配置左侧菜单中显示
    fields: [
      { prop: 'configId', label: '配置ID', kind: 'number', isId: true, numberType: 'int', width: 90 },
      { prop: 'intentCode', label: '意图编码', kind: 'text', required: true, width: 140, placeholder: '关联意图编码' },
      { prop: 'skillId', label: '技能ID', kind: 'number', numberType: 'int', required: true, width: 90, placeholder: '关联技能ID(dify_skill_registry)' },
      { prop: 'callOrder', label: '步骤顺序', kind: 'number', numberType: 'int', required: true, width: 100, placeholder: '从1开始' },
      { prop: 'stepCode', label: '步骤标识', kind: 'text', required: true, width: 120, placeholder: '同一意图内唯一' },
      { prop: 'isForceSkip', label: '强制跳过', kind: 'boolean', width: 100 },
      { prop: 'isEnabled', label: '是否生效', kind: 'boolean', width: 100 },
      { prop: 'repeatPolicy', label: '确认/重试策略', kind: 'json', inTable: false },
      { prop: 'preCheckSlots', label: '前置槽位校验', kind: 'json', inTable: false, placeholder: '执行前必存在的黑板状态键' },
      { prop: 'inputMapping', label: '输入映射', kind: 'json', inTable: false, placeholder: '{"参数名":"stepX.参数名"}；特殊键"query"覆盖chatflow的query' },
      createdAtField,
      updatedAtField,
    ],
  },
  {
    key: 'skillParamDefinition',
    title: 'Skill参数定义',
    idField: 'paramId',
    hasEnabledList: true,
    fields: [
      { prop: 'paramId', label: '参数ID', kind: 'number', isId: true, numberType: 'int', width: 90 },
      { prop: 'skillId', label: '技能ID', kind: 'number', numberType: 'int', required: true, width: 90 },
      { prop: 'paramCode', label: '参数编码', kind: 'text', required: true, width: 140 },
      { prop: 'paramName', label: '参数名称', kind: 'text', required: true, width: 140 },
      { prop: 'direction', label: '方向', kind: 'text', width: 90, placeholder: 'in / out' },
      { prop: 'dataType', label: '数据类型', kind: 'text', width: 110 },
      { prop: 'isRequired', label: '是否必填', kind: 'boolean', width: 100 },
      { prop: 'isEnabled', label: '是否启用', kind: 'boolean', width: 100 },
      { prop: 'sortOrder', label: '排序', kind: 'number', numberType: 'int', width: 80 },
      { prop: 'normalizeSql', label: '归一化SQL', kind: 'number', numberType: 'int', width: 110 },
      { prop: 'paramDesc', label: '参数描述', kind: 'textarea', inTable: false },
      createdAtField,
    ],
  },
  {
    key: 'sessionExecutionInstance',
    title: '会话执行实例',
    idField: 'instanceId',
    fields: [
      { prop: 'instanceId', label: '实例ID', kind: 'number', isId: true, numberType: 'int', width: 90 },
      { prop: 'conversationId', label: '会话ID', kind: 'text', width: 200 },
      { prop: 'turnIndex', label: '轮次', kind: 'number', numberType: 'int', width: 80 },
      { prop: 'intentCode', label: '意图编码', kind: 'text', width: 130 },
      { prop: 'orchestrationStatus', label: '编排状态', kind: 'text', width: 110 },
      { prop: 'totalSkillCount', label: '技能总数', kind: 'number', numberType: 'int', width: 100 },
      { prop: 'successSkillCount', label: '成功数', kind: 'number', numberType: 'int', width: 90 },
      { prop: 'orchestrationCostMs', label: '编排耗时(ms)', kind: 'number', numberType: 'int', width: 130 },
      { prop: 'evaluationStatus', label: '评估状态', kind: 'text', width: 110 },
      { prop: 'evaluationSkipType', label: '评估跳过类型', kind: 'text', width: 130 },
      { prop: 'evaluateRetryCount', label: '评估重试次数', kind: 'number', numberType: 'int', width: 130 },
      { prop: 'outputEvaluateResult', label: '评估结果', kind: 'json', inTable: false },
      createdAtField,
      updatedAtField,
    ],
  },
  {
    key: 'sessionFileRecord',
    title: '会话文件登记',
    idField: 'fileId',
    fields: [
      { prop: 'fileId', label: '文件ID', kind: 'number', isId: true, numberType: 'int', width: 90 },
      { prop: 'conversationId', label: '会话ID', kind: 'text', width: 200 },
      { prop: 'turnIndex', label: '轮次', kind: 'number', numberType: 'int', width: 80 },
      { prop: 'originalName', label: '原始文件名', kind: 'text', width: 180 },
      { prop: 'mimeType', label: 'MIME类型', kind: 'text', width: 140 },
      { prop: 'fileSize', label: '文件大小', kind: 'number', numberType: 'int', width: 110 },
      { prop: 'storedPath', label: '存储路径', kind: 'text', inTable: false },
      { prop: 'accessUrl', label: '访问URL', kind: 'text', inTable: false },
      createdAtField,
    ],
  },
  {
    key: 'difyFileUpload',
    title: '网关文件上传记录',
    idField: 'id',
    fields: [
      { prop: 'id', label: 'ID', kind: 'number', isId: true, numberType: 'int', width: 90 },
      { prop: 'skillId', label: '技能ID', kind: 'number', numberType: 'int', width: 90 },
      { prop: 'uploadFileId', label: '上传文件ID', kind: 'text', width: 200 },
      { prop: 'storagePath', label: '存储路径', kind: 'text', width: 260 },
      { prop: 'uploadedAt', label: '上传时间', kind: 'datetime', width: 165, readonly: true },
    ],
  },
  {
    key: 'sessionSkillConversation',
    title: '业务会话-Dify会话映射',
    idField: 'id',
    fields: [
      { prop: 'id', label: 'ID', kind: 'number', isId: true, numberType: 'int', width: 90 },
      { prop: 'bizKey', label: '业务会话ID', kind: 'text', required: true, width: 220, placeholder: '网关 conversation_id' },
      { prop: 'skillCode', label: '技能编码', kind: 'text', required: true, width: 140 },
      { prop: 'difyConversationId', label: 'Dify会话ID', kind: 'text', required: true, width: 220 },
      createdAtField,
      updatedAtField,
    ],
  },
  {
    key: 'skillPermission',
    title: '角色技能权限',
    idField: 'id',
    fields: [
      { prop: 'id', label: 'ID', kind: 'number', isId: true, numberType: 'int', width: 90 },
      { prop: 'srcSysId', label: '来源系统', kind: 'number', numberType: 'int', required: true, width: 110, placeholder: 'src_system.id' },
      { prop: 'role', label: '角色', kind: 'text', required: true, width: 140, placeholder: '单个角色一行，如 管理员' },
      { prop: 'skillCode', label: '技能编码', kind: 'text', required: true, width: 160, placeholder: 'dify_skill_registry.skill_code' },
      { prop: 'allowed', label: '是否可用', kind: 'boolean', required: true, width: 100 },
      createdAtField,
      updatedAtField,
    ],
  },
  {
    key: 'srcSystem',
    title: '外部来源系统',
    idField: 'id',
    fields: [
      { prop: 'id', label: 'ID', kind: 'number', isId: true, numberType: 'int', width: 90 },
      { prop: 'sysCode', label: '系统标识', kind: 'text', required: true, width: 140, placeholder: '调用方经 X-Src-System 传入' },
      { prop: 'sysName', label: '系统名称', kind: 'text', width: 140 },
      { prop: 'authVerifyUrl', label: '验权端点', kind: 'text', width: 240, placeholder: 'token 换用户信息端点（网关代验）' },
      { prop: 'verifyConfig', label: '验权约定', kind: 'json', inTable: false, placeholder: '{"method","token_header","token_prefix","body"}；NULL=GET+Authorization+Bearer' },
      { prop: 'permMode', label: '兜底策略', kind: 'text', required: true, width: 120, placeholder: 'BLACKLIST=默认允许 / WHITELIST=默认拒绝' },
      { prop: 'defaultRole', label: '默认角色', kind: 'text', required: true, width: 130, placeholder: '新用户默认角色（保留名）' },
      { prop: 'apiKeyHash', label: 'API Key 哈希', kind: 'text', inTable: false, placeholder: 'sha256(X-Api-Key)' },
      { prop: 'machineTokenHash', label: '机器Token哈希', kind: 'text', inTable: false, placeholder: 'sha256 机器账号 token' },
      { prop: 'isEnabled', label: '是否启用', kind: 'boolean', width: 100 },
      createdAtField,
      updatedAtField,
    ],
  },
  {
    key: 'sysUser',
    title: '外部用户映射',
    idField: 'id',
    fields: [
      { prop: 'id', label: 'ID', kind: 'number', isId: true, numberType: 'int', width: 90 },
      { prop: 'srcSysId', label: '来源系统', kind: 'number', numberType: 'int', required: true, width: 110, placeholder: 'src_system.id' },
      { prop: 'externalUserId', label: '外部用户ID', kind: 'text', required: true, width: 160, placeholder: 'zutai01=data.userId' },
      { prop: 'username', label: '用户名', kind: 'text', width: 140 },
      { prop: 'displayName', label: '显示名', kind: 'text', width: 140 },
      { prop: 'email', label: '邮箱', kind: 'text', width: 180 },
      { prop: 'sourceRole', label: '角色', kind: 'stringArray', inTable: false, placeholder: '一行一个角色' },
      { prop: 'extra', label: '其余字段', kind: 'json', inTable: false, placeholder: '验权响应剩余字段（已脱敏）' },
      { prop: 'lastSeenAt', label: '最近活跃', kind: 'datetime', readonly: true, width: 165 },
      createdAtField,
      updatedAtField,
    ],
  },

]

/** 按 key 快速取表定义 */
export function getTableDef(key: BackendTableKey): TableDef | undefined {
  return BACKEND_TABLES.find(t => t.key === key)
}

/** 空表单初值：按字段类型给出默认值，避免 v-model 绑定 undefined */
export function buildEmptyForm(def: TableDef): Record<string, any> {
  if (def.jsonMode) return {}
  const form: Record<string, any> = {}
  def.fields.forEach(f => {
    // 注意：不能跳过 readonly 字段——它们的 el-input(v-model) 仍需一个字符串初值，
    // 否则绑定 undefined 会触发 ElementPlus「binding value must be a string or number」。
    // 提交时 handleSubmit 已按 readonly 剔除，不会把默认值发给后端。
    switch (f.kind) {
      case 'number':
        form[f.prop] = null
        break
      case 'boolean':
        form[f.prop] = false
        break
      case 'json':
        form[f.prop] = null
        break
      case 'stringArray':
        form[f.prop] = []
        break
      default:
        form[f.prop] = ''
    }
  })
  return form
}
