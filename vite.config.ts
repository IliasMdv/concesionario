import react from '@vitejs/plugin-react'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'

/**
 * Solo en desarrollo: recibe los fotogramas renderizados por src/lib/renders.ts
 * y los guarda en public/renders/ (galería y modo sin WebGL).
 */
function rendersPlugin(): Plugin {
  return {
    name: 'poniente-renders',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__renders', async (req, res) => {
        const name = new URL(req.url ?? '', 'http://localhost').searchParams.get('name') ?? ''
        if (req.method !== 'POST' || !/^[a-z0-9-]+$/.test(name)) {
          res.statusCode = 400
          res.end('Petición no válida')
          return
        }
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk as Buffer)
        const match = Buffer.concat(chunks)
          .toString()
          .match(/^data:image\/(webp|png|jpeg);base64,(.+)$/)
        if (!match) {
          res.statusCode = 415
          res.end('Se esperaba una imagen en data URL')
          return
        }
        const dir = path.resolve(server.config.root, 'public/renders')
        await mkdir(dir, { recursive: true })
        await writeFile(path.join(dir, `${name}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`), Buffer.from(match[2], 'base64'))
        res.end('ok')
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), rendersPlugin()],
  build: {
    // three.js ocupa ~650 kB sin comprimir; es la dependencia principal de la página.
    chunkSizeWarningLimit: 1100,
  },
})
