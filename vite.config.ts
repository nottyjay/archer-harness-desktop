/// <reference types="vitest" />
import process from 'node:process'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const host = process.env.TAURI_DEV_HOST

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', { target: '19' }]],
      },
    }),
    tailwindcss(),
  ],

  // 多页入口：主窗口（index.html）与桌宠外置窗口（pet.html，独立透明窗口）。
  build: {
    rollupOptions: {
      input: {
        main: '/index.html',
        pet: '/pet.html',
      },
    },
  },

  resolve: {
    alias: {
      '@': '/src',
    },
  },

  // Vite options tailored for Tauri development.
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },

  // Vitest 只跑工作区包、应用自有状态机与根 test（不含 source/* 参考子模块）。
  test: {
    include: [
      'packages/**/*.{test,spec}.?(c|m)[jt]s?(x)',
      'src/**/*.{test,spec}.?(c|m)[jt]s?(x)',
      'test/**/*.{test,spec}.?(c|m)[jt]s?(x)',
    ],
  },
}))
