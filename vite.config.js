import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/xiaomisu7_test/', // 新增配置（关键！）
  build: {
    outDir: 'dist',   // 新增配置
    assetsInlineLimit: 4096 // 可选：调整资源内联阈值
    }
})

