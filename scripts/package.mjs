import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

// Keep native packaging tools and temporary staging on the same writable volume.
const root = process.cwd()
const temporary = path.join(root, '.build-tmp')
const cache = path.join(root, '.builder-cache')
await mkdir(temporary, { recursive: true })
await mkdir(cache, { recursive: true })
const args = process.argv.slice(2)
const child = spawn(process.execPath, [path.join(root, 'node_modules/electron-builder/cli.js'), ...(args.length ? args : ['--win', 'portable', '--x64'])], {
  cwd: root, stdio: 'inherit',
  env: { ...process.env, TEMP: temporary, TMP: temporary, ELECTRON_BUILDER_CACHE: cache },
})
child.on('error', error => { console.error(error.message); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
