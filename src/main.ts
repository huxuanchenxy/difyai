import { createApp } from 'vue'

import ElementPlus from '@/components/element-plus'
import NaiveUI from '@/components/naive-ui'
import '@/styles/index.scss'
import router from './routes'
import App from './App.vue'

const app = createApp(App)

app.use(ElementPlus)
app.use(NaiveUI)
app.use(router)

app.mount('#app')
