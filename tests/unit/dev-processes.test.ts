import { execFile, spawn } from 'node:child_process'
import { once } from 'node:events'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'
import { listenerPids, parsePids, processTree, stopDevPort } from '../../scripts/dev-processes.ts'

const execute = promisify(execFile)

async function fixture(stubborn = false) {
  const processHandle = spawn(process.execPath, [resolve('tests/fixtures/dev-listener.ts'), ...(stubborn ? ['--stubborn'] : [])], { stdio: ['ignore', 'pipe', 'pipe'] })
  const output = await once(processHandle.stdout!, 'data')
  const ready = JSON.parse(String(output[0])) as { port: number; childPid: number }
  return { ...ready, processHandle, cleanup() {
    processHandle.kill('SIGKILL')
    try { process.kill(ready.childPid, 'SIGKILL') } catch (error) { if ((error as { code?: string }).code !== 'ESRCH') throw error }
  } }
}

describe('development shutdown', () => {
  it('deduplicates positive PIDs and rejects other output', () => {
    expect(parsePids('42\n42\n77\n0\n1\n-9\nunknown')).toEqual([42, 77])
  })

  it('selects only a listener and its descendants, in child-first order', () => {
    const table = [
      { pid: 10, parentPid: 1, started: 'one', name: 'shell' },
      { pid: 20, parentPid: 10, started: 'two', name: 'vite' },
      { pid: 21, parentPid: 20, started: 'three', name: 'electron' },
      { pid: 22, parentPid: 21, started: 'four', name: 'renderer' },
      { pid: 30, parentPid: 10, started: 'five', name: 'other app' },
      { pid: 40, parentPid: 10, started: 'six', name: 'kill-dev' }
    ]
    expect(processTree([20], table, 40).map(entry => entry.pid)).toEqual([22, 21, 20])
    expect(() => processTree([10], table, 40)).toThrow('parent process')
    expect(() => processTree([40], table, 40)).toThrow('parent process')
  })

  it('previews a real listener and leaves it running', async () => {
    const running = await fixture()
    try {
      const targets = await stopDevPort({ port: running.port, dryRun: true }, () => undefined)
      expect(targets).toContain(running.processHandle.pid)
      expect(targets).toContain(running.childPid)
      expect(await listenerPids(running.port)).toContain(running.processHandle.pid)
    } finally { running.cleanup() }
  }, 20_000)

  it('stops a real listener and its child through the CLI, then succeeds again on the free port', async () => {
    const running = await fixture()
    try {
      const { stdout } = await execute(process.execPath, [resolve('scripts/kill-dev.ts'), '--port', String(running.port)])
      expect(stdout).toContain(`Port ${running.port} is free`)
      expect(stdout).toContain(`PID ${running.childPid}`)
      expect(await listenerPids(running.port)).toEqual([])
      const second = await execute(process.execPath, [resolve('scripts/kill-dev.ts'), '--port', String(running.port)])
      expect(second.stdout).toContain('already free')
    } finally { running.cleanup() }
  }, 20_000)

  it('escalates when a listener ignores graceful termination', async () => {
    const running = await fixture(true)
    const messages: string[] = []
    try {
      await stopDevPort({ port: running.port, graceMs: 200 }, message => messages.push(message))
      expect(await listenerPids(running.port)).toEqual([])
      if (process.platform !== 'win32') expect(messages.some(message => message.includes('Force-stopping'))).toBe(true)
    } finally { running.cleanup() }
  }, 20_000)

  it('rejects an invalid port before looking up or signalling processes', async () => {
    await expect(stopDevPort({ port: -1 })).rejects.toThrow('between 1 and 65535')
    await expect(execute(process.execPath, [resolve('scripts/kill-dev.ts'), '--port', '5173;kill'])).rejects.toThrow()
  })
})
