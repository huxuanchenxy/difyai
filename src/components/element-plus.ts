import type { App } from 'vue'

import {
  ElTabPane,
  ElTabs,
  ElDialog,
  ElInput,
  ElInputNumber,
  ElButton,
  // 后台配置弹窗（BackendConfigDialog）需要以下组件；未注册时 <el-table> 会被当成
  // 未知原生标签渲染，导致 el-table-column 内部 inject 父表格上下文为 undefined，
  // 抛 "Cannot read properties of undefined (reading 'deep')"。
  ElTable,
  ElTableColumn,
  ElForm,
  ElFormItem,
  ElSwitch,
  ElPagination,
  ElTooltip,
  // 表单字段的 refDisplay 关联下拉需要；未注册时 <el-select> 会被当未知标签渲染为空
  ElSelect,
  ElOption,
  ElLoading,
  // 该版本（1.0.2-beta）Element Plus 文案由全局单例 locale 提供。
  // 必须从顶层 'element-plus' 引入 locale（即内部 use），与组件共享同一
  // 预打包模块实例；若从 'element-plus/es/locale' 深层引入会是另一份实例，设置不生效。
  locale as useLocale,
} from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'dayjs/locale/zh-cn'

const components = [
  ElTabPane,
  ElTabs,
  ElDialog,
  ElInput,
  ElInputNumber,
  ElButton,
  ElTable,
  ElTableColumn,
  ElForm,
  ElFormItem,
  ElSwitch,
  ElPagination,
  ElTooltip,
  ElSelect,
  ElOption,
]

const install = (app: App): void => {
  // 设置 Element Plus 内置文案为中文（需在组件渲染前执行一次）
  useLocale(zhCn)

  app.config.globalProperties.$ELEMENT = { size: 'medium' }

  components.forEach(component => {
    app.component(component.name, component)
  })

  // v-loading 指令（Element Plus 未通过 app.use 全量安装，需手动注册）
  app.directive('loading', ElLoading.directive)
  // 供 ElLoading.service() 使用（如全屏 loading）
  app.config.globalProperties.$loading = ElLoading.service
}

export default {
  install,
}
