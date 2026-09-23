// 仅保留 difyai 用到的工具函数（自 dashboard utils/util.ts 精简）

/** 密码复杂度校验：至少 1 大写、1 小写、1 数字、1 特殊字符，长度 >= 8 */
export const testPassword = (str: string) => {
  const regStr = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[^\w\s]).{8,}$/
  return regStr.test(str)
}
