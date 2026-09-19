import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  // '/' for Netlify (domain root); GitHub Pages serves from /<repo>/, so the
  // workflow passes VITE_BASE. Vite exposes the value as import.meta.env.BASE_URL,
  // which main.jsx hands to the router as its basename.
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(process.cwd(), 'src') },
  },
  server: { port: 5173 },
})
