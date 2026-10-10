<template>
  <div class="login-page" :style="{ backgroundImage: `url(${loginBgUrl})` }">
    <div class="login-card">
      <!-- 品牌区：与 DifyRealDialog 欢迎页同款星光徽标 + 标语 -->
      <div class="login-brand">
        <span class="login-brand-badge"><ChatSparkle /></span>
        <div class="login-brand-title">AI 智能助手</div>
        <div class="login-brand-sub">让想法，更进一步 · 你的智能工作伙伴</div>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <label class="login-field">
          <span class="login-field-icon">
            <LoginUser />
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
            <LoginLock />
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
            <LoginEyeOff v-if="showPassword" />
            <LoginEye v-else />
          </button>
        </label>
        <div v-if="capsOn" class="login-caps-hint">大写锁定已打开</div>

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

      <!-- 匿名登录（免密）：仅在配置了 VITE_APP_ANONYMOUS_TOKEN 时展示 -->
      <template v-if="anonymousToken">
        <div class="login-split">
          <span class="login-split-line"></span>
          <span class="login-split-text">或</span>
          <span class="login-split-line"></span>
        </div>
        <button type="button" class="login-anonymous" @click="handleAnonymousLogin">
          <LoginUser />
          <span>匿名登录</span>
        </button>
      </template>

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
import LoginUser from '@/icons/login-user.vue'
import LoginLock from '@/icons/login-lock.vue'
import LoginEye from '@/icons/login-eye.vue'
import LoginEyeOff from '@/icons/login-eye-off.vue'
import loginBgUrl from '@/assets/images/login-bg.png'

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
    LoginUser,
    LoginLock,
    LoginEye,
    LoginEyeOff,
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

    // 匿名登录（免密）：token 从环境变量取，存原始值；为空则隐藏入口。
    // router.push 的 query 会被自动编码，最终 URL 形如 /#/?token=owgBrqms9%2FFa4Z2Ri3iByg%3D%3D
    const anonymousToken = (import.meta.env.VITE_APP_ANONYMOUS_TOKEN || '').trim()

    // 来源系统标识：登录页 URL 本身不带 srcSystem，故此时从配置（环境变量）取值，
    // 登录成功后拼进跳转 URL（两种登录均如此），供主页面接口改从 URL 读取 X-Src-System
    const srcSystemParam = (import.meta.env.VITE_APP_DIFY_SRC_SYSTEM || 'zutai01').trim()

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
          // 暂时不用获取用户角色菜单接口
          // await UserStore().getRoleMenu()
          localStorage.setItem('loginAccount', loginForm.value.username)
          localStorage.setItem('loginRemember', String(remember.value))
          if (remember.value) {
            localStorage.setItem('loginPassword', loginForm.value.password)
          }
          else {
            localStorage.removeItem('loginPassword')
          }

          router.push({ path: redirect.value || '/', query: { ...otherQuery.value, srcSystem: srcSystemParam } })
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
    // 匿名登录（免密）：不校验用户名密码，直接落到带 token 的免登录 URL。
    // 采用 hash + reload，行为与外部直接粘贴 /#/?token=xxx 链接一致：
    // 路由守卫（getUrlAuthToken 读 window.location.hash）在新一次加载中按 URL token 放行，
    // 从而保证地址栏 URL 与配置完全一致（不经 router 的 query 重编码）。
    const handleAnonymousLogin = () => {
      if (!anonymousToken) {
        ElMessage.warning('匿名登录未启用')
        return
      }
      window.location.hash = `/?token=${anonymousToken}&srcSystem=${srcSystemParam}`
      window.location.reload()
    }
    return {
      loginBgUrl,
      loginForm,
      loading,
      capsOn,
      showPassword,
      redirect,
      otherQuery,
      checkCapslock,
      handleLogin,
      remember,
      anonymousToken,
      handleAnonymousLogin,
    }
  },
})
</script>

<style lang="scss" scoped>
/* AI 智能助手风格：背景图 + 居中白色卡片，
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
  justify-content: flex-end;
  padding-right: 18vw;
  background-repeat: no-repeat;
  background-position: left center;
  background-size: cover;
  background-color: #e8f0fa;
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

/* 匿名登录：分隔线 + 描边幽灵按钮，风格对齐主登录卡片的圆角/描边体系 */
.login-split {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0 14px;
}

.login-split-line {
  flex: 1;
  height: 1px;
  background: $border-soft;
}

.login-split-text {
  font-size: 12px;
  color: #9aa8bd;
}

.login-anonymous {
  width: 100%;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #dfe5ee;
  border-radius: 12px;
  background: #fbfcff;
  color: $text-main;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 1px;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s, box-shadow 0.15s;

  svg {
    width: 18px;
    height: 18px;
    color: $text-muted;
    transition: color 0.15s;
  }

  &:hover {
    border-color: $primary;
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(47, 107, 255, 0.1);

    svg {
      color: $primary;
    }
  }
}
</style>
