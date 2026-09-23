/**
 * 后台配置服务（AI-Assistant）API 封装
 * Swagger: http://10.89.33.97:8082/swagger-ui/index.html
 *
 * 每张表提供的通用接口：
 *   POST   /api/{table}               新增
 *   PUT    /api/{table}               更新
 *   GET    /api/{table}/{id}          按主键查询单条
 *   DELETE /api/{table}/{id}          删除
 *   GET    /api/{table}/page          分页查询（pageNum、pageSize）
 * 部分表额外提供：
 *   GET    /api/{table}/list/enabled  查询启用列表
 *
 * 该服务与 dashboard 主服务不同域，直接使用独立 axios 实例；
 * 地址通过 VITE_APP_BACKEND_CONFIG_HOST 覆盖，默认 http://10.89.33.97:8082。
 */
import axios, { AxiosInstance } from 'axios'

/** 统一响应结构 */
export interface BackendResult<T = any> {
  code: number
  msg: string
  data: T
}

/** 分页数据结构（对应后端 MyBatis-Plus Page） */
export interface BackendPage<T = any> {
  records: T[]
  total: number
  size: number
  current: number
  pages?: number
}

/** 表 key（对应 URL 段） */
export type BackendTableKey =
  | 'skillParamDefinition'
  | 'sessionSkillConversation'
  | 'sessionFileRecord'
  | 'sessionExecutionInstance'
  | 'intentSkillConfig'
  | 'intentDefinition'
  | 'difySkillRegistry'
  | 'difyFileUpload'
  | 'skillPermission'
  | 'srcSystem'
  | 'sysUser'

/** 各表主键字段（URL 中的 path 参数名） */
export const TABLE_ID_FIELD: Record<BackendTableKey, string> = {
  skillParamDefinition: 'paramId',
  sessionSkillConversation: 'id',
  sessionFileRecord: 'fileId',
  sessionExecutionInstance: 'instanceId',
  intentSkillConfig: 'configId',
  intentDefinition: 'intentId',
  difySkillRegistry: 'skillId',
  difyFileUpload: 'id',
  skillPermission: 'id',
  srcSystem: 'id',
  sysUser: 'id',
}

/** 提供 /list/enabled 接口的表 */
const ENABLED_LIST_TABLES: BackendTableKey[] = [
  'skillParamDefinition',
  'intentSkillConfig',
  'intentDefinition',
  'difySkillRegistry',
]

function resolveBaseURL(): string {
  const envHost = (import.meta as any)?.env?.VITE_APP_BACKEND_CONFIG_HOST
  return envHost || 'http://10.89.33.97:8082'
}

/** 独立 axios 实例：不走主 request 拦截器，避免 token/baseURL 冲突 */
const instance: AxiosInstance = axios.create({
  baseURL: resolveBaseURL(),
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
})

instance.interceptors.response.use(
  resp => {
    const body = resp?.data as BackendResult
    // 后端统一使用 code=200 表示成功，其它一律视为业务错误
    if (body && typeof body.code === 'number' && body.code !== 200) {
      return Promise.reject(new Error(body.msg || 'System Error'))
    }
    return resp
  },
  err => Promise.reject(err),
)

/** 分页参数 */
export interface PageQuery {
  pageNum?: number
  pageSize?: number
}

/**
 * 创建某张表的 CRUD 方法集合。
 * @param table  表 URL 段（单条查询/删除均直接用主键值拼 /api/{table}/{id}）
 */
export function createTableApi<T = any>(table: BackendTableKey) {
  return {
    /** 分页查询 */
    page: (params: PageQuery = {}) =>
      instance.get<BackendResult<BackendPage<T>>>(`/api/${table}/page`, {
        params: { pageNum: 1, pageSize: 10, ...params },
      }).then(r => r.data),

    /** 按 id 查询单条（与删除一致，路径不带主键字段名） */
    getById: (id: number | string) =>
      instance.get<BackendResult<T>>(`/api/${table}/${id}`).then(r => r.data),

    /** 新增 */
    save: (payload: Partial<T>) =>
      instance.post<BackendResult<void>>(`/api/${table}`, payload).then(r => r.data),

    /** 更新（全量字段） */
    update: (payload: Partial<T>) =>
      instance.put<BackendResult<void>>(`/api/${table}`, payload).then(r => r.data),

    /** 删除：后端为 /api/{table}/{id}（路径不带主键字段名） */
    remove: (id: number | string) =>
      instance.delete<BackendResult<void>>(`/api/${table}/${id}`).then(r => r.data),

    /** 查询启用列表（仅部分表提供） */
    listEnabled: () => {
      if (!ENABLED_LIST_TABLES.includes(table)) {
        return Promise.reject(new Error(`表 ${table} 未提供 /list/enabled 接口`))
      }
      return instance.get<BackendResult<T[]>>(`/api/${table}/list/enabled`).then(r => r.data)
    },
  }
}

/** 各表已实例化的 CRUD 集合，便于业务直接引用 */
export const backendConfigApi = {
  skillParamDefinition: createTableApi('skillParamDefinition'),
  sessionSkillConversation: createTableApi('sessionSkillConversation'),
  sessionFileRecord: createTableApi('sessionFileRecord'),
  sessionExecutionInstance: createTableApi('sessionExecutionInstance'),
  intentSkillConfig: createTableApi('intentSkillConfig'),
  intentDefinition: createTableApi('intentDefinition'),
  difySkillRegistry: createTableApi('difySkillRegistry'),
  difyFileUpload: createTableApi('difyFileUpload'),
  skillPermission: createTableApi('skillPermission'),
  srcSystem: createTableApi('srcSystem'),
  sysUser: createTableApi('sysUser'),
} as const
