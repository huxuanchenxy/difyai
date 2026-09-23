<template>
  <div class="login-page">
    <!-- 背景装饰：柔和光斑（纯 CSS，替代原工业组态背景图） -->
    <div class="login-blob login-blob-1"></div>
    <div class="login-blob login-blob-2"></div>
    <div class="login-blob login-blob-3"></div>

    <div class="login-card">
      <!-- 品牌区：与 DifyRealDialog 欢迎页同款星光徽标 + 标语 -->
      <div class="login-brand">
        <span class="login-brand-badge"><ChatSparkle /></span>
        <div class="login-brand-title">DifyAI 智能助手</div>
        <div class="login-brand-sub">让想法，更进一步 · 你的智能工作伙伴</div>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <label class="login-field">
          <span class="login-field-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle
                cx="12"
                cy="8"
                r="3.4"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
              />
              <path
                d="M4.8 19.4c.9-3.2 3.7-5 7.2-5s6.3 1.8 7.2 5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
              />
            </svg>
          </span>
          <input
            v-model.trim="loginForm.username"
            type="text"
            placeholder="用户名"
            autocomplete="username"
          >
        </label>

        <label class="login-field">
          <span class="login-field-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect
                x="5"
                y="10.5"
                width="14"
                height="9.5"
                rx="2.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
              />
              <path
                d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
              />
            </svg>
          </span>
          <input
            v-model="loginForm.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="密码"
            autocomplete="current-password"
            @keydown="checkCapslock"
            @blur="capsOn = false"
            @keyup.enter="handleLogin"
          >
          <button
            type="button"
            class="login-eye"
            :title="showPassword ? '隐藏密码' : '显示密码'"
            @click="showPassword = !showPassword"
          >
            <svg v-if="showPassword" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M2.8 12S6.4 5.9 12 5.9 21.2 12 21.2 12 17.6 18.1 12 18.1 2.8 12 2.8 12Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linejoin="round"
              />
              <circle
                cx="12"
                cy="12"
                r="2.9"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
              />
              <line
                x1="4.6"
                y1="4.6"
                x2="19.4"
                y2="19.4"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
              />
            </svg>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M2.8 12S6.4 5.9 12 5.9 21.2 12 21.2 12 17.6 18.1 12 18.1 2.8 12 2.8 12Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linejoin="round"
              />
              <circle
                cx="12"
                cy="12"
                r="2.9"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
              />
            </svg>
          </button>
        </label>
        <div v-if="capsOn" class="login-caps-hint">大写锁定已打开</div>

        <label class="login-field">
          <span class="login-field-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle
                cx="8.2"
                cy="15.6"
                r="3.8"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
              />
              <path
                d="M10.9 12.9 19 4.8M15.2 8.6l2.6 2.6M17.6 6.2l2.6 2.6"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
              />
            </svg>
          </span>
          <input
            v-model.trim="loginForm.code"
            type="text"
            placeholder="动态口令"
            autocomplete="off"
            @keyup.enter="handleLogin"
          >
        </label>

        <div class="login-aux">
          <label class="login-remember">
            <input v-model="remember" type="checkbox">
            <span>记住密码</span>
          </label>
        </div>

        <button type="submit" class="login-submit" :disabled="loading">
          <span v-if="loading" class="login-spinner"></span>
          <span>{{ loading ? '登 录 中…' : '登 录' }}</span>
        </button>
      </form>

      <div class="login-footer">登录后即可与智能助手开始对话</div>
    </div>
  </div>
</template>

<script lang='ts'>
import { defineComponent, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { UserStore, passwordExpiryError } from '@/domains/user'
import ChatSparkle from '@/icons/chat-sparkle.vue'

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
    ChatSparkle,
  },
  setup() {
    const loginForm = ref({
      username: '',
      password: '',
      code: '',
    })

    const loading = ref(false)
    const capsOn = ref(false)
    const showPassword = ref(false)
    const redirect = ref('')
    const otherQuery = ref({})
    const remember = ref(false)

    const route = useRoute()
    const router = useRouter()

    loginForm.value.username = localStorage.getItem('loginAccount') || ''
    remember.value = localStorage.getItem('loginRemember') == 'true'
    if (remember.value) {
      loginForm.value.password = localStorage.getItem('loginPassword') || ''
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
          capsOn.value = true
        } else {
          capsOn.value = false
        }
      }

      if (key === 'CapsLock' && capsOn.value === true) {
        capsOn.value = false
      }
    }
    const handleLogin = () => {
      if (!loginForm.value.username) {
        ElMessage.warning('请输入用户名')
        return
      }
      if (!loginForm.value.password) {
        ElMessage.warning('请输入密码')
        return
      }
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
            ElMessage.error(result.message)
            // 密码过期：短暂提示后跳改密页（替代原 n-message onAfterLeave 回调）
            setTimeout(() => {
              router.push({ name: 'UpdatePassword', params: { userName: loginForm.value.username } })
            }, 1200)
          }
          else {
            ElMessage.error(result.message)
          }
        })
        .finally(() => {
          loading.value = false
        })
    }
    return {
      loginForm,
      loading,
      capsOn,
      showPassword,
      redirect,
      otherQuery,
      checkCapslock,
      handleLogin,
      remember,
    }
  },
})
</script>

<style lang="scss" scoped>
/* AI 智能助手风格：浅色渐变底 + 居中白色卡片，
   色板 / 圆角 / 描边图标全部对齐 DifyRealDialog（--chat-primary #2f6bff 体系） */
$primary: #2f6bff;
$primary-strong: #1c56e6;
$text-main: #2a3547;
$text-muted: #7d8b9f;
$border-soft: #e6ebf4;

.login-page {
  position: relative;
  width: 100%;
  height: 100vh;
  min-height: 640px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(165deg, #f6f8fc 0%, #eef4ff 55%, #e8efff 100%);
}

/* 背景光斑：主色半透明大圆 + 高斯模糊，营造 AI 产品的轻盈氛围 */
.login-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
}

.login-blob-1 {
  width: 480px;
  height: 480px;
  left: -120px;
  top: -140px;
  background: rgba(47, 107, 255, 0.16);
}

.login-blob-2 {
  width: 420px;
  height: 420px;
  right: -100px;
  bottom: -120px;
  background: rgba(124, 92, 255, 0.12);
}

.login-blob-3 {
  width: 300px;
  height: 300px;
  right: 18%;
  top: -80px;
  background: rgba(47, 107, 255, 0.08);
}

.login-card {
  position: relative;
  width: 420px;
  max-width: calc(100vw - 48px);
  padding: 44px 44px 32px;
  background: #ffffff;
  border: 1px solid $border-soft;
  border-radius: 18px;
  box-shadow: 0 24px 64px rgba(47, 107, 255, 0.12), 0 4px 16px rgba(42, 53, 71, 0.05);
}

.login-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32px;
}

.login-brand-badge {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: linear-gradient(135deg, $primary 0%, #6a5cff 100%);
  color: #ffffff;
  box-shadow: 0 10px 24px rgba(47, 107, 255, 0.35);

  svg {
    width: 30px;
    height: 30px;
  }
}

.login-brand-title {
  margin-top: 16px;
  font-size: 22px;
  font-weight: 700;
  color: $text-main;
  letter-spacing: 1px;
}

.login-brand-sub {
  margin-top: 6px;
  font-size: 13px;
  color: $text-muted;
}

.login-form {
  display: flex;
  flex-direction: column;
}

/* 输入框：描边圆角 + 前缀图标，聚焦时主色描边 + 柔光晕 */
.login-field {
  position: relative;
  display: flex;
  align-items: center;
  height: 48px;
  margin-bottom: 16px;
  background: #fbfcff;
  border: 1px solid #dfe5ee;
  border-radius: 12px;
  transition: border-color 0.15s, box-shadow 0.15s, background-color 0.15s;

  &:focus-within {
    border-color: $primary;
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(47, 107, 255, 0.12);
  }

  input {
    flex: 1;
    min-width: 0;
    height: 100%;
    padding: 0 12px 0 0;
    border: none;
    outline: none;
    background: transparent;
    font-size: 15px;
    color: $text-main;

    &::placeholder {
      color: #9aa8bd;
    }
  }
}

.login-field-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  margin: 0 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text-muted;
  transition: color 0.15s;

  svg {
    width: 20px;
    height: 20px;
  }
}

.login-field:focus-within .login-field-icon {
  color: $primary;
}

.login-eye {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  margin-right: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: #9aa8bd;
  cursor: pointer;
  transition: color 0.15s, background-color 0.15s;

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover {
    color: $primary;
    background: #eef4ff;
  }
}

.login-caps-hint {
  margin: -8px 2px 12px;
  font-size: 12px;
  color: #e6a23c;
}

.login-aux {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.login-remember {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  color: $text-muted;
  cursor: pointer;
  user-select: none;

  input {
    width: 15px;
    height: 15px;
    accent-color: $primary;
    cursor: pointer;
  }
}

.login-submit {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(90deg, $primary 0%, $primary-strong 100%);
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 4px;
  cursor: pointer;
  transition: opacity 0.15s, box-shadow 0.15s, transform 0.15s;

  &:hover:not(:disabled) {
    box-shadow: 0 10px 24px rgba(47, 107, 255, 0.35);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
}

.login-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: login-spin 0.8s linear infinite;
}

@keyframes login-spin {
  to {
    transform: rotate(360deg);
  }
}

.login-footer {
  margin-top: 26px;
  text-align: center;
  font-size: 12px;
  color: #9aa8bd;
}
</style>
