<template>
  <n-config-provider
    :theme-overrides="themeOverrides"
    abstract
    :locale="zhCN"
    :date-locale="dateZhCN"
  >
    <n-message-provider closable keep-alive-on-hover>
      <n-dialog-provider>
        <router-view />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { themeOverrides } from '@/styles/themes/naive-ui-theme-overrides'
import { zhCN, dateZhCN } from 'naive-ui'

export default defineComponent({
  name: 'App',
  setup() {
    return {
      themeOverrides,
      zhCN,
      dateZhCN,
    }
  },
})
</script>
