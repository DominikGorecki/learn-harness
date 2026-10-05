import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { safeLogData } from '../../src/shared/diagnostics'
import { aiChannels } from '../../src/shared/ai/activity'
import { createFileLogger, errorDiagnostic, logDiagnostic, setDiagnosticLogger, silentLogger, withDiagnosticRequest } from '../../src/main/logging/logger'

const roots: string[] = []
async function directory() {
  const root = await mkdtemp(join(tmpdir(), 'edu-logging-')); roots.push(root); return root
}
async function records(root: string) {
  const names = (await readdir(root)).filter(name => name.endsWith('.jsonl')).sort()
  const text = (await Promise.all(names.map(name => readFile(join(root, name), 'utf8')))).join('')
  return { text, entries: text.trim().split('\n').filter(Boolean).map(line => JSON.parse(line)), names }
}
afterEach(async () => {
  setDiagnosticLogger(silentLogger)
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('development structured file logging', () => {
  it('recognizes only the fixed activity channels and sanitized project tools', () => {
    for (const channel of Object.values(aiChannels)) expect(safeLogData({ channel, prompt: 'PRIVATE_PROMPT' })).toEqual({ channel })
    for (const tool of ['list_project_files', 'read_project_file', 'write_project_file']) expect(safeLogData({ tool, arguments: { path: 'PRIVATE_PATH' } })).toEqual({ tool })
    expect(safeLogData({ channel: 'ai:PRIVATE_CHANNEL', tool: 'PRIVATE_TOOL', content: 'PRIVATE_CONTENT' })).toEqual({ channel: 'unrecognized', tool: 'unrecognized' })
  })
  it('preserves ordered records, correlation, private permissions and normal-exit flushing', async () => {
    const root = await directory(), logger = await createFileLogger(root)
    setDiagnosticLogger(logger)
    const requestId = randomUUID()
    await withDiagnosticRequest(requestId, async () => {
      logDiagnostic('debug', 'main', 'ipc.started', { channel: 'workspace:open' })
      await Promise.resolve()
      logDiagnostic('info', 'main', 'ipc.completed', { channel: 'workspace:open', elapsedMs: 12 })
    })
    await logger.close()
    logger.log('error', 'main', 'app.start-failed')
    const { entries, names } = await records(root)
    expect(entries).toHaveLength(2)
    expect(entries.map(entry => entry.sequence)).toEqual([1, 2])
    expect(entries.map(entry => entry.data.requestId)).toEqual([requestId, requestId])
    expect(entries[0]).toMatchObject({ schemaVersion: 1, source: 'main', level: 'debug', pid: process.pid })
    expect(entries[1].sessionId).toBe(entries[0].sessionId)
    if (process.platform !== 'win32') {
      expect((await stat(root)).mode & 0o777).toBe(0o700)
      expect((await stat(join(root, names[0]!))).mode & 0o777).toBe(0o600)
    }
  })

  it('rejects raw credentials, text, nested values and provider strings even under known field names', async () => {
    const root = await directory(), logger = await createFileLogger(root)
    const secret = 'Bearer private-token\nforged log'
    const error = new Error(secret)
    error.stack = `Error: ${secret}\n    at privateFunction (C:/Users/private-person/project/out/main/index.js:42:8)`
    logger.log('error', 'main', 'ipc.failed', { token: secret, prompt: secret, message: secret, path: secret,
      code: secret, channel: secret, status: secret, returnedModel: secret, requestId: secret,
      bytes: { token: secret }, ...errorDiagnostic(error) })
    await logger.close()
    const { text, entries } = await records(root)
    for (const value of [secret, 'private-person', 'privateFunction', 'Bearer', 'forged log']) expect(text).not.toContain(value)
    expect(entries[0].data).toEqual({ code: 'unrecognized', channel: 'unrecognized', status: 'unrecognized', returnedModel: 'unrecognized', errorType: 'Error', line: 42, column: 8 })
    expect(safeLogData({ requestedModel: 'gpt-6-luna', httpStatus: 403, hasFinalText: false, providerCode: 'model_not_found', outcome: 'missing_output' }))
      .toEqual({ requestedModel: 'gpt-6-luna', httpStatus: 403, hasFinalText: false, providerCode: 'model_not_found', outcome: 'missing_output' })
  })

  it('rotates at the byte limit and retains only owned log files across launches', async () => {
    const root = await directory()
    await writeFile(join(root, 'keep.jsonl'), 'unrelated')
    for (let session = 0; session < 2; session++) {
      const logger = await createFileLogger(root, { maxFileBytes: 1024, maxFiles: 3 })
      for (let i = 0; i < 20; i++) logger.log('info', 'main', 'ipc.completed', { channel: 'workspace:get', elapsedMs: i })
      await logger.close()
    }
    const names = (await readdir(root)).filter(name => name.startsWith('session-'))
    expect(names).toHaveLength(3)
    for (const name of names) {
      expect((await stat(join(root, name))).size).toBeLessThanOrEqual(1024)
      const lines = (await readFile(join(root, name), 'utf8')).trim().split('\n')
      for (const line of lines) expect(JSON.parse(line).event).toBe('ipc.completed')
    }
    expect(await readFile(join(root, 'keep.jsonl'), 'utf8')).toBe('unrelated')
  })

  it('bounds a burst and reports dropped records', async () => {
    const root = await directory(), logger = await createFileLogger(root, { maxQueue: 4 })
    for (let i = 0; i < 100; i++) logger.log('debug', 'renderer', 'console.output', { line: i })
    await logger.close()
    const { entries } = await records(root)
    expect(entries.length).toBeLessThanOrEqual(6)
    expect(entries.find(entry => entry.event === 'logging.dropped')?.data.dropped).toBeGreaterThan(90)
  })

  it('writes a synchronous safe fatal marker and tolerates malformed diagnostic values', async () => {
    const root = await directory(), logger = await createFileLogger(root)
    const malformed = Object.defineProperty({}, 'status', { enumerable: true, get() { throw new Error('private') } })
    expect(() => logger.log('error', 'main', 'ipc.failed', malformed)).not.toThrow()
    expect(safeLogData({ constructor: 'private', toString: 'private' })).toEqual({})
    logger.emergencyFlush({ origin: 'unhandledRejection', errorType: 'TypeError', token: 'private' })
    const { entries, text } = await records(root)
    expect(entries[0]).toMatchObject({ event: 'process.unhandled', data: { origin: 'unhandledRejection', errorType: 'TypeError' } })
    expect(text).not.toContain('private')
    await logger.close()
  })

  it('fails safely when storage is unavailable without changing application work', async () => {
    const root = await directory(), path = join(root, 'not-a-directory')
    await writeFile(path, 'keep')
    let failures = 0
    const logger = await createFileLogger(path, { onFailure: () => { failures++; throw new Error('ignored') } })
    expect(() => logger.log('info', 'main', 'app.ready')).not.toThrow()
    await logger.close()
    expect(failures).toBe(1)
    expect(await readFile(path, 'utf8')).toBe('keep')
  })

  it.skipIf(process.platform === 'win32')('refuses a symlinked log directory', async () => {
    const root = await directory(), target = await directory(), link = join(root, 'logs')
    await symlink(target, link)
    const logger = await createFileLogger(link)
    logger.log('info', 'main', 'app.ready'); await logger.close()
    expect(await readdir(target)).toEqual([])
  })
})
