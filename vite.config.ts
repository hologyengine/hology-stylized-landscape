import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
  esbuild: {
    target: "es2020",
  },
  plugins: [
    basicSsl(),
    VitePWA({ 
      registerType: "autoUpdate", 
      workbox: {
        globPatterns: ["**/*"],
    },
      includeAssets: [
          "**/*",
      ],
      devOptions: {
        enabled: true,
        type: 'module',
      } 
    }),
    react({
      babel: {
        plugins: [
          ["@babel/plugin-proposal-decorators", { version: "2022-03" }],
        ],
      },
    
    }),
  ],
})
