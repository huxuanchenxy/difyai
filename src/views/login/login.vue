<template>
  <div class="login-container">
    <div class="container-left">
      <div class="div-image">
        <img class="logo-image" src="/images/logo_icon.png">
      </div>
      <div class="div-title">
        <span class="big-title">DifyAI 智能助手</span>
        <span class="small-title">工业组态软件</span>
      </div>
    </div>
    <div class="container-right">
      <div class="login-title">
        <span class="login-title-white">欢迎使用</span>
        <span class="login-title-blue">DifyAI 智能助手</span>
      </div>
      <n-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        label-placement="left"
        size="small"
        class="login-form"
      >
        <n-form-item path="username">
          <n-input
            v-model:value="loginForm.username"
            class="login-input"
            placeholder="用户名"
            type="text"
            :style="inputCSSVars"
            size="large"
          >
            <template #prefix>
              <n-icon style="--n-icon-size:24px;--n-icon-color:#0E62A9">
                <IconAccount />
              </n-icon>
            </template>
          </n-input>
        </n-form-item>
        <n-form-item path="password">
          <n-tooltip :show="capsTooltip" placement="top-start">
            <template #trigger>
              <n-input
                v-model:value="loginForm.password"
                class="login-input"
                placeholder="密码"
                type="password"
                show-password-on="click"
                :style="inputCSSVars"
                size="large"
                @keydown="checkCapslock"
                @blur="capsTooltip = false"
                @keyup.enter="handleLogin"
              >
                <template #prefix>
                  <n-icon style="--n-icon-size:24px;--n-icon-color:#0E62A9">
                    <IconLock />
                  </n-icon>
                </template>
              </n-input>
            </template>
            <span> 大写锁定已打开 </span>
          </n-tooltip>
        </n-form-item>
        <n-form-item path="code">
          <n-input
            v-model:value="loginForm.code"
            class="login-input"
            placeholder="动态口令"
            type="text"
            :style="inputCSSVars"
            size="large"
          >
            <template #prefix>
              <n-icon style="--n-icon-size:24px;--n-icon-color:#0E62A9">
                <IconKey />
              </n-icon>
            </template>
          </n-input>
        </n-form-item>
        <n-form-item>
          <div class="form-item-content">
            <div class="remember-password-container">
              <input
                id="chkRemember"
                v-model="remember"
                type="checkbox"
                class="chk_1"
              >
              <label for="chkRemember" style="margin-right:10px;"></label>
              <label style="color:#999999;font-size:18px;font-family:思源黑体Normal">记住密码</label>
            </div>
          </div>
        </n-form-item>
        <n-button
          :loading="loading"
          type="primary"
          size="large"
          style="width: 100%; margin-bottom: 20px;border-radius: 5px;background-color:#008AFF;font-family:'思源黑体Normal';color:#fff;--n-height:60px;--n-font-size:24px"
          @click="handleLogin"
        >
          登 录
        </n-button>
      </n-form>
    </div>
  </div>
</template>

<script lang='ts'>
import { defineComponent, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { UserStore, passwordExpiryError } from '@/domains/user'
import { IconAccount, IconKey, IconLock } from '@/icons'
import { useMessage } from 'naive-ui'

const validateUsername = (rule: any, value: string, callback: Function) => {
  if (!value) {
    callback(new Error('请输入用户名'))
  } else {
    callback()
  }
}

const validatePassword = (rule: any, value: string, callback: Function) => {
  if (!value) {
    callback(new Error('请输入密码'))
  } else {
    callback()
  }
}

const getOtherQuery = (query: any) => {
  return Object.keys(query).reduce((acc: any, cur) => {
    if (cur !== 'redirect') {
      acc[cur] = query[cur]
    }
    return acc
  }, {})
}

export default defineComponent({
  name: 'Login',
  components: {
    IconAccount,
    IconKey,
    IconLock,
  },
  setup() {
    const nMessage = useMessage()
    const loginForm = ref({
      username: '',
      password: '',
      code: '',
    })
    const loginRules = ref({
      username: [{ required: true, trigger: 'blur', validator: validateUsername }],
      password: [{ required: true, trigger: 'blur', validator: validatePassword }],
    })

    const loginFormRef = ref(null)
    const capsTooltip = ref(false)
    const loading = ref(false)
    const redirect = ref('')
    const otherQuery = ref({})
    const remember = ref(false)

    const inputCSSVars = {
      '--n-height': '60px',
      '--n-font-size': '24px',
    }

    const route = useRoute()
    const router = useRouter()

    loginForm.value.username = localStorage.getItem('loginAccount')
    remember.value = localStorage.getItem('loginRemember') == 'true'
    if (remember.value) {
      loginForm.value.password = localStorage.getItem('loginPassword')
    }

    const paramsToObject = (queryString: string) => {
      const paramsArr = queryString.split('&')
      const paramObj: any = {}
      paramsArr.forEach(param => {
        const [key, value] = param.split('=')
        paramObj[key] = decodeURIComponent(value)
      })
      return paramObj
    }

    watch(route, ({ query }) => {
      if (query) {
        let redirectStr = query.redirect as string
        // 兜底处理嵌套 redirect：如 /login?redirect=/login?redirect=/xxx
        while (redirectStr && redirectStr.startsWith('/login')) {
          const qIndex = redirectStr.indexOf('?')
          if (qIndex > -1) {
            const params = paramsToObject(redirectStr.substring(qIndex + 1))
            redirectStr = params['redirect'] || ''
          } else {
            redirectStr = ''
            break
          }
        }
        if (redirectStr && redirectStr.indexOf('?') > -1) {
          redirect.value = redirectStr.split('?')[0]
          otherQuery.value = getOtherQuery(paramsToObject(redirectStr.split('?')[1]))
        }
        else {
          redirect.value = redirectStr
          otherQuery.value = getOtherQuery(query)
        }
      }
    }, { immediate: true })

    const checkCapslock = ({ shiftKey, key }: any) => {
      if (key && key.length === 1) {
        if (shiftKey && (key >= 'a' && key <= 'z') || !shiftKey && (key >= 'A' && key <= 'Z')) {
          capsTooltip.value = true
        } else {
          capsTooltip.value = false
        }
      }

      if (key === 'CapsLock' && capsTooltip.value === true) {
        capsTooltip.value = false
      }
    }
    const handleLogin = () => {
      (loginFormRef.value as any).validate((errors: any) => {
        if (!errors) {
          loading.value = true
          UserStore().doLogin(loginForm.value.username, loginForm.value.password, loginForm.value.code)
            .then(async () => {
              await UserStore().getRoleMenu()
              localStorage.setItem('loginAccount', loginForm.value.username)
              localStorage.setItem('loginRemember', String(remember.value))
              if (remember.value) {
                localStorage.setItem('loginPassword', loginForm.value.password)
              }
              else {
                localStorage.removeItem('loginPassword')
              }

              router.push({ path: redirect.value || '/', query: otherQuery.value })
            })
            .catch((result: any) => {
              if (result instanceof passwordExpiryError) {
                nMessage.error(
                  result.message,
                  {
                    onAfterLeave: () => {
                      router.push({ name: 'UpdatePassword', params: { userName: loginForm.value.username } })
                    },
                  })
              }
              else {
                nMessage.error(result.message)
              }
            })
            .finally(() => {
              loading.value = false
            })
        }
      })
    }
    return {
      loginForm,
      loginRules,
      loginFormRef,
      capsTooltip,
      loading,
      redirect,
      otherQuery,
      inputCSSVars,
      checkCapslock,
      handleLogin,
      remember,
    }
  },
})
</script>

<style lang="scss">
.login-container {
  width: 100%;
  min-height: 950px;
  height: 100vh;

  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  overflow: hidden;
  background-image: url('/images/login-bground.png');
  background-repeat: no-repeat;
  background-size: cover;
  margin: 0;

  .container-left {
    min-width: 50%;
    width: 50%;
    height: 100%;
    overflow: hidden;
    background-image: url('/images/newlogin.png');
    background-repeat: no-repeat;
    background-size: contain;
    background-position: center;

    .div-image {
      position: absolute;
      display: flex;
      align-items: center;
      left: 86px;
      top: 52px;

      .logo-image {
        width: 72px;
        height: 72px;
      }
    }

    .div-title {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      left: 200px;
      top: 67px;
      color: #ffffff;
    }

    .big-title {
      font-size: 30px;
      font-weight: 400;
      font-family: "思源黑体Normal";
    }

    .small-title {
      font-size: 18px;
      font-weight: 400;
      font-family: "思源黑体Normal";
    }
  }

  .container-right {
    flex-grow: 0;
    flex-direction: column;
    min-width: 825px;
    width: 825px;
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    position: relative;
    margin-left: 200px;
  }

  .login-title {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    color: #ffffff;
    margin-left: 40px;
  }

  .login-title-white {
    font-size: 18px;
    font-weight: 400;
    font-family: "思源黑体Normal";
    color: #FFFFFF;
  }

  .login-title-blue {
    font-size: 24px;
    font-weight: 700;
    font-family: "思源黑体Normal";
    color: #008AFF;
  }

  .login-form {
    width: 500px;
    padding: 0 30px;
    overflow: hidden;
    margin-top: 75px;
  }

  .chk_1 {
    display: none;
  }

  /*******STYLE 1*******/
  .chk_1+label {
    background-color: #FFF;
    border: 1px solid #C1CACA;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05), inset 0px -15px 10px -12px rgba(0, 0, 0, 0.05);
    padding: 9px;
    border-radius: 5px;
    display: inline-block;
    position: relative;
    margin-right: 30px;
  }

  .chk_1+label:active {
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05), inset 0px 1px 3px rgba(0, 0, 0, 0.1);
  }

  .chk_1:checked+label {
    background-color: #ECF2F7;
    border: 1px solid #92A1AC;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05), inset 0px -15px 10px -12px rgba(0, 0, 0, 0.05), inset 15px 10px -12px rgba(255, 255, 255, 0.1);
    color: #243441;
  }

  .chk_1:checked+label:after {
    content: '\2714';
    position: absolute;
    top: 0px;
    left: 0px;
    color: #758794;
    width: 100%;
    text-align: center;
    padding: -1px 0 0 0;
    vertical-align: text-top;
  }

  .login-input {
    .n-input__prefix {
      margin-right: 20px !important;
    }
  }

  .form-item-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .remember-password-container {
    display: flex;
    align-items: center;
  }

  .remember-password-container label {
    margin-left: 5px;
  }
}
</style>
