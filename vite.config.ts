import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  base: '/kbw2026-photo-card-pos/',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
