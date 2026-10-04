import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'

const architecture = process.arch === 'x64' ? '' : `-${process.arch}`
const directory = process.platform === 'darwin' ? `mac${architecture}` : process.platform === 'win32' ? `win${architecture}-unpacked` : `linux${architecture}-unpacked`
const asar = resolve('dist', directory, ...(process.platform === 'darwin' ? ['Learning Studio.app', 'Contents', 'Resources'] : ['resources']), 'app.asar')
if (!existsSync(asar)) {
  console.error('Build the current-platform package first with npm run package.')
  process.exitCode = 1
} else {
  const child = spawn(process.execPath, [resolve('node_modules/@playwright/test/cli.js'), 'test', 'tests/desktop/packaged-worker.spec.ts'], {
    stdio: 'inherit', env: { ...process.env, EDU_PACKAGED_WORKER_ASAR: asar }
  })
  child.once('error', () => { console.error('The packaged-worker check could not start.'); process.exitCode = 1 })
  child.once('exit', code => { process.exitCode = code ?? 1 })
}
