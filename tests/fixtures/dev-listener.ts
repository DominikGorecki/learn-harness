import { spawn } from 'node:child_process'
import { createServer } from 'node:net'

const stubborn = process.argv.includes('--stubborn')
if (stubborn) process.on('SIGTERM', () => undefined)
const child = spawn(process.execPath, ['-e', `${stubborn ? "process.on('SIGTERM', () => {});" : ''}setInterval(() => {}, 1000)`], { stdio: 'ignore' })
const server = createServer()
server.listen(0, '127.0.0.1', () => {
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No TCP address')
  console.log(JSON.stringify({ port: address.port, childPid: child.pid }))
})
