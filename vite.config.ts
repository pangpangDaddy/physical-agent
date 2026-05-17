import path from 'path'
import fs from 'fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// ---------------------------------------------------------------------------
// scenarioStaticPlugin
//
// Physics-lab scenarios (in scenario/<slug>/) are self-contained mini-apps —
// pure HTML/JS that load THREE / MediaPipe from CDN via importmap. They are
// NOT part of the React build graph. This plugin serves them at /scenarios/*
// in dev. In production they would be copied to dist/scenarios/.
// ---------------------------------------------------------------------------
function scenarioStaticPlugin(): Plugin {
  const scenarioRoot = path.resolve(__dirname, 'scenario')

  return {
    name: 'physics-scenario-static',
    configureServer(server) {
      server.middlewares.use('/scenarios', (req, res, next) => {
        // strip /scenarios prefix; default to index.html for directory requests
        let relPath = (req.url ?? '/').split('?')[0]
        if (relPath.endsWith('/')) relPath += 'index.html'
        const filePath = path.join(scenarioRoot, relPath)
        // basic path-traversal guard
        if (!filePath.startsWith(scenarioRoot)) {
          res.statusCode = 403
          res.end('forbidden')
          return
        }
        fs.stat(filePath, (err, stat) => {
          if (err || !stat.isFile()) return next()
          const ext = path.extname(filePath).toLowerCase()
          const mime: Record<string, string> = {
            '.html': 'text/html; charset=utf-8',
            '.js':   'application/javascript; charset=utf-8',
            '.mjs':  'application/javascript; charset=utf-8',
            '.css':  'text/css; charset=utf-8',
            '.json': 'application/json; charset=utf-8',
            '.png':  'image/png',
            '.jpg':  'image/jpeg',
            '.svg':  'image/svg+xml',
            '.wasm': 'application/wasm',
          }
          res.setHeader('Content-Type', mime[ext] ?? 'application/octet-stream')
          fs.createReadStream(filePath).pipe(res)
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), scenarioStaticPlugin()],
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:4444',
      '/ws': {
        target: 'http://localhost:4444',
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Keep self-contained CDN-importmap scenarios out of Vite's dep graph.
  optimizeDeps: {
    entries: ['index.html', 'src/**/*.{ts,tsx}'],
    exclude: ['three', '@mediapipe/tasks-vision'],
  },
})
