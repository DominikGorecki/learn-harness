import { execFile } from 'node:child_process'
import { createServer } from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { promisify } from 'node:util'

const execute = promisify(execFile)
export const defaultDevPort = 5173
export interface ProcessInfo { pid: number; parentPid: number; started: string; name: string }

async function command(file: string, args: string[]): Promise<string> {
  try {
    return (await execute(file, args, { encoding: 'utf8', timeout: 10_000, maxBuffer: 8 * 1024 * 1024, env: { ...process.env, LC_ALL: 'C' } })).stdout
  } catch (error) {
    const failure = error as { code?: string | number; stdout?: string; stderr?: string }
    // lsof returns 1 when there are no matching sockets.
    if (file === 'lsof' && failure.code === 1 && !failure.stderr?.trim()) return failure.stdout ?? ''
    throw error
  }
}

export function parsePids(output: string): number[] {
  return [...new Set(output.trim().split(/\s+/).filter(value => /^\d+$/.test(value)).map(Number).filter(pid => Number.isSafeInteger(pid) && pid > 1))]
}

export async function listenerPids(port: number): Promise<number[]> {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port must be between 1 and 65535.')
  if (process.platform === 'win32') {
    // Filtering after discovery gives an empty result for a free port, whereas
    // Get-NetTCPConnection's -LocalPort filter reports a CIM lookup error.
    return parsePids(await command('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      `Get-NetTCPConnection -ErrorAction Stop | Where-Object { $_.State -eq 'Listen' -and $_.LocalPort -eq ${port} } | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique`
    ]))
  }
  if (process.platform === 'linux') {
    try {
      const output = await command('ss', ['-H', '-ltnp', `( sport = :${port} )`])
      const pids = parsePids([...output.matchAll(/pid=(\d+)/g)].map(match => match[1]).join('\n'))
      if (output.trim() && pids.length === 0) throw new Error(`Port ${port} is occupied, but its process IDs are not visible to this user.`)
      return pids
    } catch (error) {
      if ((error as { code?: string }).code !== 'ENOENT') throw error
    }
  }
  return parsePids(await command('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t']))
}

export async function processTable(): Promise<ProcessInfo[]> {
  if (process.platform === 'win32') {
    const output = await command('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,CreationDate,Name | ConvertTo-Json -Compress'
    ])
    const parsed: unknown = JSON.parse(output || '[]')
    return (Array.isArray(parsed) ? parsed : [parsed]).flatMap((value: unknown) => {
      if (!value || typeof value !== 'object') return []
      const entry = value as Record<string, unknown>
      if (typeof entry.ProcessId !== 'number' || typeof entry.ParentProcessId !== 'number' || typeof entry.Name !== 'string' || !entry.CreationDate) return []
      return [{ pid: entry.ProcessId, parentPid: entry.ParentProcessId, started: JSON.stringify(entry.CreationDate), name: entry.Name }]
    })
  }
  const output = await command('ps', ['-axo', 'pid=,ppid=,stat=,lstart=,comm='])
  return output.split('\n').flatMap(line => {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.{24})\s+(.+)$/)
    if (!match || match[3]!.includes('Z')) return []
    return [{ pid: Number(match[1]), parentPid: Number(match[2]), started: match[4]!, name: match[5]!.trim() }]
  })
}

export function processTree(roots: number[], table: ProcessInfo[], selfPid: number): ProcessInfo[] {
  const protectedPids = new Set([0, 1, selfPid])
  let ancestor = table.find(entry => entry.pid === selfPid)?.parentPid
  while (ancestor && !protectedPids.has(ancestor)) {
    protectedPids.add(ancestor)
    ancestor = table.find(entry => entry.pid === ancestor)?.parentPid
  }
  const targets = new Set(roots)
  for (const pid of targets) {
    if (protectedPids.has(pid)) throw new Error(`Refusing to stop the kill command or its parent process (PID ${pid}).`)
    for (const child of table.filter(entry => entry.parentPid === pid)) targets.add(child.pid)
  }
  // Descendants are stopped before their parents. Only observed processes qualify.
  return [...targets].reverse().flatMap(pid => {
    const entry = table.find(candidate => candidate.pid === pid)
    return entry ? [entry] : []
  })
}

function matchingProcesses(targets: ProcessInfo[], table: ProcessInfo[]): ProcessInfo[] {
  return targets.filter(target => table.some(current => current.pid === target.pid && current.started === target.started && current.name === target.name))
}

async function signal(targets: ProcessInfo[], kind: NodeJS.Signals): Promise<void> {
  const current = await processTable()
  for (const target of matchingProcesses(targets, current)) {
    try { process.kill(target.pid, kind) }
    catch (error) { if ((error as { code?: string }).code !== 'ESRCH') throw error }
  }
}

async function portIsFree(port: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') resolve(false)
      else reject(error)
    })
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)))
  })
}

export async function stopDevPort(options: { port?: number; dryRun?: boolean; graceMs?: number } = {}, report: (message: string) => void = console.log): Promise<number[]> {
  const port = options.port ?? defaultDevPort
  const roots = await listenerPids(port)
  if (roots.length === 0) {
    if (!await portIsFree(port)) throw new Error(`Port ${port} is occupied, but its owner could not be identified.`)
    report(`Port ${port} is already free.`)
    return []
  }
  const table = await processTable()
  const targets = processTree(roots, table, process.pid)
  if (roots.some(pid => !targets.some(target => target.pid === pid))) throw new Error('A listener changed during discovery. Run kill-dev again.')
  report(`${options.dryRun ? 'Would stop' : 'Stopping'} the listener on port ${port} and its child processes:`)
  for (const target of targets) report(`  PID ${target.pid}: ${target.name}`)
  if (options.dryRun) return targets.map(target => target.pid)

  await signal(targets, 'SIGTERM')
  const deadline = Date.now() + (options.graceMs ?? 3000)
  let remaining = matchingProcesses(targets, await processTable())
  while (remaining.length && Date.now() < deadline) {
    await delay(100)
    remaining = matchingProcesses(targets, await processTable())
  }
  if (remaining.length) {
    report(`Force-stopping ${remaining.length} process(es) that did not exit.`)
    await signal(remaining, 'SIGKILL')
    await delay(200)
  }
  if (matchingProcesses(targets, await processTable()).length) throw new Error('Some target processes are still running. Check your permissions.')
  if ((await listenerPids(port)).length || !await portIsFree(port)) throw new Error(`Port ${port} is still occupied. Its owner may have restarted.`)
  report(`Stopped ${targets.length} process(es). Port ${port} is free.`)
  return targets.map(target => target.pid)
}
