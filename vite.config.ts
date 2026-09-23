import type { ConfigEnv, UserConfig } from 'vite'
import { loadEnv, defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

function pathResolve(dir: string) {
  return resolve(process.cwd(), '.', dir)
}

// https://vitejs.dev/config/
export default ({ mode }: ConfigEnv): UserConfig => {
  const env = loadEnv(mode, process.cwd())

  return defineConfig({
    envDir: './viteEnv',
    // 与 dashboard 一致：相对路径 base，可部署在任意子路径下
    base: env.VITE_PUBLIC_PATH || './',
    plugins: [vue()],
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `$--color-primary: #005497;`,
        },
      },
    },
    server: {
      host: '0.0.0.0',
      // 避开 dashboard(9090) 与 aipage(9091)
      port: 9092,
    },
    resolve: {
      alias: {
        '@': pathResolve('./src'),
        'vue': pathResolve('./node_modules/vue'),
      },
    },
    define: {
      __DEV__: process.env.NODE_ENV !== 'production',
    },
    optimizeDeps: {
      include: ['axios', 'echarts', 'element-plus', 'naive-ui', 'vue', 'vue-router'],
    },
    build: {
      sourcemap: false,
      outDir: 'website',
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-vue': ['vue', 'vue-router'],
            'vendor-echarts': ['echarts'],
            'vendor-ui': ['element-plus', 'naive-ui'],
          },
        },
      },
    },
  })
}
