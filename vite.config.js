import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  // Relative paths so the build works on GitHub Pages (any repo name),
  // itch.io, or any static host without changes.
  base: './',
  plugins: [viteSingleFile()],
  build: {
    outDir: 'www',
    emptyOutDir: true,
    cssCodeSplit: false
  }
})
