import {
  NButton,
  NCol,
  NConfigProvider,
  NDialogProvider,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NMessageProvider,
  NRow,
  NTooltip,
  create,
} from 'naive-ui'

// difyai 仅登录模块 / 修改密码页使用 naive-ui，按用到的组件精简注册
export default create({
  components: [
    NConfigProvider,
    NMessageProvider,
    NDialogProvider,
    NButton,
    NForm,
    NFormItem,
    NInput,
    NIcon,
    NTooltip,
    NRow,
    NCol,
  ],
})
