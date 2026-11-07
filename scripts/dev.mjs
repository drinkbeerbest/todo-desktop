import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1'], { stdio: 'inherit' })
let desktop
const cleanup = () => { vite.kill(); desktop?.kill() }
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
for (let i = 0; i < 100; i++) {
  try { const r = await fetch('http://127.0.0.1:5173'); if (r.ok) break } catch {}
  await new Promise((r) => setTimeout(r, 150))
}
const env = { ...process.env, LIUBAI_DEV_URL: 'http://127.0.0.1:5173' }
delete env.ELECTRON_RUN_AS_NODE
desktop = spawn(require('electron'), ['.'], { stdio: 'inherit', env })
desktop.on('exit', () => { vite.kill(); process.exit(0) })
