<template>
  <div class="divWindow">
    <div class="divPwdTitle">
      修改登录密码
    </div>
    <br>
    <n-form ref="formRef" :model="model" :rules="rules">
      <n-form-item path="userName" label="用户名">
        <n-input
          v-model:value="model.userName"
          placeholder="请输入用户名"
          disabled
          @keydown.enter.prevent
        />
      </n-form-item>
      <n-form-item path="password" label="原密码">
        <n-input
          v-model:value="model.password"
          type="password"
          placeholder="请输入原密码"
          @keydown.enter.prevent
        />
      </n-form-item>
      <n-form-item path="newpassword" label="新密码">
        <n-input
          v-model:value="model.newpassword"
          type="password"
          placeholder="请输入新密码"
          maxlength="20"
          @input="handlePasswordInput"
          @keydown.enter.prevent
        />
      </n-form-item>
      <n-form-item
        ref="rPasswordFormItemRef"
        first
        path="confirmpassword"
        label="重复密码"
      >
        <n-input
          v-model:value="model.confirmpassword"
          :disabled="!model.newpassword"
          placeholder="请输入重复密码"
          type="password"
          @keydown.enter.prevent
        />
      </n-form-item>
      <n-row :gutter="[0, 24]">
        <n-col :span="24">
          <div style="display: flex; justify-content: flex-end">
            <n-button
              type="primary"
              @click="handleUpdatePassword"
            >
              确 定
            </n-button>
          </div>
        </n-col>
      </n-row>
    </n-form>
  </div>
</template>

<script lang='ts'>
import { defineComponent, PropType, ref } from 'vue'
import { useMessage, FormRules, FormItemRule, FormItemInst, FormInst } from 'naive-ui'
import { testPassword } from '@/utils/util'
import { updatePassword } from '@/api/user'
import router from '@/routes'
interface ModelType {
    userName: string | null
    password: string | null
    newpassword: string | null
    confirmpassword: string | null
}

export default defineComponent({
  name: 'UpdatePassword',
  props:{
    userName:{
      type: Object as PropType<string>,
      required: true,
      //default: localStorage.getItem('loginAccount'),
    },
  },
  setup(props) {
    const formRef = ref<FormInst | null>(null)
    const rPasswordFormItemRef = ref<FormItemInst | null>(null)

    const nMessage = useMessage()

    const model = ref<ModelType>({
      userName: props.userName,
      password: null,
      newpassword: null,
      confirmpassword: null,
    })

    const validatePasswordStartWith = ( rule: FormItemRule, value: string ) => {
      return (
        !!model.value.newpassword && model.value.newpassword.startsWith(value) && model.value.newpassword.length >= value.length
      )
    }

    const validatePasswordSame = (rule: FormItemRule, value: string) => {
      return value === model.value.newpassword
    }

    const validatePasswordComplexity = (rule: FormItemRule, value: string) => {
      return value && testPassword(value)
    }

    const handlePasswordInput = () => {
      if (model.value.confirmpassword) {
        rPasswordFormItemRef.value?.validate({ trigger: 'password-input' })
      }
    }

    const rules: FormRules = {
      userName: [
        {
          required: true,
          message: '请输入用户名',
          trigger: ['input', 'blur'],
        },
      ],
      password: [
        {
          required: true,
          message: '请输入原密码',
        },
      ],
      newpassword: [
        {
          required: true,
          message: '请输入新密码',
        },
        {
          validator: validatePasswordComplexity,
          message: '密码必须包含1个大写字母、1个小写字母、1个数字和1个特殊字符，长度不少于8位',
          trigger: ['input', 'blur'],
        },
      ],
      confirmpassword: [
        {
          required: true,
          message: '请再次输入密码',
          trigger: ['input', 'blur'],
        },
        {
          validator: validatePasswordStartWith,
          message: '两次密码输入不一致',
          trigger: 'input',
        },
        {
          validator: validatePasswordSame,
          message: '两次密码输入不一致',
          trigger: ['blur', 'password-input'],
        },
      ],
    }

    const handleUpdatePassword = (e: MouseEvent) => {
      e.preventDefault()
      formRef.value?.validate(errors => {
        if (!errors) {
          updatePassword(model.value.userName,model.value.password,model.value.newpassword).then(res=>{
            if(res.data.code == 200)
            {
              nMessage.success('修改成功',
                {
                  onAfterLeave : () => {
                    router.push({ name : 'Login' })
                  },
                })
            }
            else{
              nMessage.error(res.data.msg)
            }
          }).catch((result:any)=>{
            nMessage.error(result.message)
            //console.log('login catch error',result)
          })
        } else {
        }
      })
    }

    return {
      formRef,
      model,
      rules,
      validatePasswordStartWith,
      handlePasswordInput,
      validatePasswordSame,
      rPasswordFormItemRef,
      handleUpdatePassword,
      validatePasswordComplexity,
    }
  },
})
</script>

<style>
.divWindow
{
    width:800px;
    height:100%;
    margin: 20px auto;
}

.divPwdTitle
{
    font-size: 12pt;
    font-weight: bold;
}
</style>
