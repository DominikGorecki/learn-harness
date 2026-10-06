import { createHash, randomUUID } from 'node:crypto'
import { lstat, mkdir, open, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { flowDefinition } from './catalog.ts'

export const platforms = ['windows', 'linux', 'macos'] as const
export type CapturePlatform = typeof platforms[number]
export interface Capture {
  id: string
  caption: string
  width: number
  height: number
  viewport: { width: number; height: number }
  theme: string | null
  zoom: number
  method: 'playwright' | 'electron'
  maskedLocalPaths: boolean
  sha256: string
}
export interface CaptureManifest {
  schemaVersion: 1
  flow: string
  platform: CapturePlatform
  capturedAt: string
  testFile: string
  testTitle: string
  testSha256: string
  revision: string | null
  sourceDirty: boolean | null
  evidence: 'isolated-fixture'
  captures: Capture[]
}

export function pngSize(bytes: Buffer): { width: number; height: number } {
  if (bytes.length < 33 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || bytes.toString('ascii', 12, 16) !== 'IHDR') throw new Error('Invalid PNG capture')
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20)
  if (!width || !height) throw new Error('Empty PNG capture')
  return { width, height }
}

export function digest(bytes: Buffer): string { return createHash('sha256').update(bytes).digest('hex') }

export function validateManifest(manifest: CaptureManifest): void {
  const definition = flowDefinition(manifest.flow)
  if (manifest.schemaVersion !== 1 || !platforms.includes(manifest.platform) || manifest.evidence !== 'isolated-fixture' || manifest.testFile !== `tests/desktop/${definition.testFile}`) throw new Error('Invalid flow manifest')
  const expected = Object.keys(definition.screenshots).sort()
  const actual = manifest.captures.map(item => item.id).sort()
  if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error(`Incomplete or duplicate captures for ${manifest.flow}`)
  for (const capture of manifest.captures) {
    if (!/^[a-z][a-z0-9-]*$/.test(capture.id) || capture.caption !== definition.screenshots[capture.id] || !capture.width || !capture.height) throw new Error('Invalid capture checkpoint')
  }
}

const start = '<!-- flow-captures:start -->', end = '<!-- flow-captures:end -->'
export function renderCaptures(index: string, manifests: CaptureManifest[]): string {
  if (index.split(start).length !== 2 || index.split(end).length !== 2 || index.indexOf(start) > index.indexOf(end)) throw new Error('Flow index needs one generated capture block')
  const lines: string[] = []
  for (const manifest of [...manifests].sort((a, b) => a.platform.localeCompare(b.platform))) {
    lines.push(`### ${manifest.platform}`, '', `Last successful run: ${manifest.capturedAt}. Source revision: ${manifest.revision ?? 'unavailable'}; source changes present: ${manifest.sourceDirty ?? 'unknown'}.`, '',
      `[Capture metadata](screenshots/${manifest.platform}/manifest.json) records the test digest, image dimensions, viewport, theme, zoom and capture method.`, '')
    if (!manifest.captures.length) lines.push('This is a nonvisual flow; its assertions are the evidence. No screenshots are generated.', '')
    else {
      lines.push('| Screenshot | Observed checkpoint | Pixels |', '| --- | --- | --- |')
      for (const capture of manifest.captures) lines.push(`| [${capture.id}](screenshots/${manifest.platform}/${capture.id}.png) | ${capture.caption} | ${capture.width} × ${capture.height} |`)
      lines.push('')
    }
  }
  return index.slice(0, index.indexOf(start) + start.length) + '\n\n' + lines.join('\n') + '\n' + index.slice(index.indexOf(end))
}

function inside(parent: string, child: string): string {
  const target = resolve(child)
  if (!target.startsWith(resolve(parent) + sep)) throw new Error('Flow output escaped its owned directory')
  return target
}

async function exists(path: string): Promise<boolean> {
  try { await lstat(path); return true } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error }
}

async function rejectLink(path: string): Promise<void> {
  if (await exists(path) && (await lstat(path)).isSymbolicLink()) throw new Error('Flow output must not contain symbolic links')
}

// Windows scanners can briefly retain a completed capture directory. Retry
// only transient sharing failures; sustained errors still trigger rollback.
export async function renameFlowPath(source: string, destination: string, options: {
  platform?: NodeJS.Platform;
  move?: (source: string, destination: string) => Promise<void>;
  wait?: (milliseconds: number) => Promise<void>
} = {}): Promise<void> {
  const move = options.move ?? rename
  const wait = options.wait ?? (milliseconds => new Promise(resolveWait => setTimeout(resolveWait, milliseconds)))
  for (let attempt = 0; ; attempt++) {
    try { await move(source, destination); return }
    catch (error) {
      if ((options.platform ?? process.platform) !== 'win32' || !['EPERM', 'EBUSY'].includes((error as NodeJS.ErrnoException).code ?? '') || attempt >= 5) throw error
      await wait(50 * (attempt + 1))
    }
  }
}

// Publish only a fully captured, passing journey. A lock prevents overlapping runs
// from losing another platform's index block. Retained backup permits crash recovery.
export async function publishFlow(root: string, staged: string, manifest: CaptureManifest): Promise<void> {
  validateManifest(manifest)
  const directory = inside(root, join(root, manifest.flow))
  await rejectLink(directory)
  const screenshots = inside(directory, join(directory, 'screenshots'))
  await rejectLink(screenshots)
  await mkdir(screenshots, { recursive: true })
  const lockPath = inside(directory, join(directory, '.capture.lock'))
  const lock = await open(lockPath, 'wx')
  const current = inside(screenshots, join(screenshots, manifest.platform))
  const backup = inside(screenshots, join(screenshots, `.${manifest.platform}.previous`))
  const next = inside(screenshots, join(screenshots, `.${manifest.platform}.next-${randomUUID()}`))
  const indexPath = inside(directory, join(directory, 'index.md'))
  const nextIndex = inside(directory, join(directory, `.index-${randomUUID()}.md`))
  let moved = false, installed = false, committed = false
  try {
    for (const path of [current, backup, indexPath]) await rejectLink(path)
    // An interrupted prior publication restores its last complete set first.
    if (await exists(backup)) {
      if (await exists(current)) await rm(backup, { recursive: true })
      else await renameFlowPath(backup, current)
    }
    const index = await readFile(indexPath, 'utf8')
    await mkdir(next)
    for (const capture of manifest.captures) {
      const bytes = await readFile(join(staged, `${capture.id}.png`))
      const size = pngSize(bytes)
      if (digest(bytes) !== capture.sha256 || size.width !== capture.width || size.height !== capture.height) throw new Error('Capture bytes do not match their manifest')
      await writeFile(inside(next, join(next, `${capture.id}.png`)), bytes)
    }
    await writeFile(join(next, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
    const manifests = [manifest]
    for (const platform of platforms.filter(value => value !== manifest.platform)) {
      const other = inside(screenshots, join(screenshots, platform))
      await rejectLink(other)
      if (await exists(other)) {
        const otherManifest = JSON.parse(await readFile(join(other, 'manifest.json'), 'utf8')) as CaptureManifest
        // Other platforms may be older; retain their captions and declared age.
        manifests.push(otherManifest)
      }
    }
    await writeFile(nextIndex, renderCaptures(index, manifests))
    if (await exists(current)) { await renameFlowPath(current, backup); moved = true }
    await renameFlowPath(next, current); installed = true
    await renameFlowPath(nextIndex, indexPath); committed = true
    if (moved) await rm(backup, { recursive: true })
  } catch (error) {
    if (!committed) {
      if (installed) await rm(current, { recursive: true })
      if (moved) await renameFlowPath(backup, current)
    }
    throw error
  } finally {
    try {
      await rm(next, { recursive: true, force: true })
      await rm(nextIndex, { force: true })
    } finally {
      await lock.close()
      await rm(lockPath)
    }
  }
}

export async function checkFlowReferences(root: string): Promise<void> {
  const { flows } = await import('./catalog.ts')
  const pattern = await readFile(join(root, '../patterns-flow.md'), 'utf8')
  const specFiles = (await readdir(join(root, '../../tests/desktop'))).filter(file => file.endsWith('.spec.ts')).sort()
  if (JSON.stringify(specFiles) !== JSON.stringify([...new Set(Object.values(flows).map(flow => flow.testFile))].sort())) throw new Error('Desktop spec files disagree with flow catalog')
  for (const file of new Set(Object.values(flows).map(flow => flow.testFile))) {
    const source = await readFile(join(root, '../../tests/desktop', file), 'utf8')
    const registered = Object.entries(flows).filter(([, flow]) => flow.testFile === file).map(([id]) => id).sort()
    const declared = [...source.matchAll(/annotation: \{ type: 'flow', description: '([^']+)' \}/g)].map(match => match[1]).sort()
    const tags = [...source.matchAll(/tag: '@([^']+)'/g)].map(match => match[1]).sort()
    if (!source.includes("from '../flows/fixture'") || JSON.stringify(registered) !== JSON.stringify(declared) || JSON.stringify(registered) !== JSON.stringify(tags) || [...source.matchAll(/^test\(/gm)].length !== registered.length) throw new Error(`Unregistered desktop test: ${file}`)
    const expected = registered.flatMap(id => Object.keys(flowDefinition(id).screenshots)).sort()
    const captured = [...source.matchAll(/flow\.capture\(desktop, page, '([^']+)'/g)].map(match => match[1]).sort()
    if (JSON.stringify(expected) !== JSON.stringify(captured)) throw new Error(`Capture declarations disagree with catalog: ${file}`)
  }
  for (const [id, definition] of Object.entries(flows)) {
    if (!pattern.includes(`flows/${id}/index.md`)) throw new Error(`Missing flow index entry: ${id}`)
    const directory = join(root, id)
    const index = await readFile(join(directory, 'index.md'), 'utf8')
    renderCaptures(index, []) // Validate the generated block without modifying prose.
    if (!index.includes(`../../../tests/desktop/${definition.testFile}`)) throw new Error(`Missing test link: ${id}`)
    const manifests: CaptureManifest[] = []
    for (const platform of platforms) {
      const captures = join(directory, 'screenshots', platform)
      if (!await exists(captures)) continue
      const manifest = JSON.parse(await readFile(join(captures, 'manifest.json'), 'utf8')) as CaptureManifest
      if (manifest.flow !== id || manifest.platform !== platform) throw new Error('Misplaced flow manifest')
      if (manifest.captures.some(capture => !/^[a-z][a-z0-9-]*$/.test(capture.id)) || new Set(manifest.captures.map(capture => capture.id)).size !== manifest.captures.length) throw new Error('Invalid stored capture names')
      manifests.push(manifest)
      const names = await readdir(captures)
      if (JSON.stringify(names.sort()) !== JSON.stringify(['manifest.json', ...manifest.captures.map(item => `${item.id}.png`)].sort())) throw new Error(`Unlisted images: ${id}/${platform}`)
      for (const capture of manifest.captures) {
        const bytes = await readFile(join(captures, `${capture.id}.png`))
        const size = pngSize(bytes)
        if (digest(bytes) !== capture.sha256 || size.width !== capture.width || size.height !== capture.height) throw new Error('Invalid stored screenshot')
        if (!index.includes(`screenshots/${platform}/${capture.id}.png`)) throw new Error('Missing screenshot link')
      }
    }
    if (manifests.length && renderCaptures(index, manifests) !== index) throw new Error(`Generated screenshot index is stale: ${id}`)
  }
  for (const directory of await readdir(root, { withFileTypes: true })) {
    if (directory.isDirectory() && !Object.hasOwn(flows, directory.name)) throw new Error(`Unregistered flow directory: ${directory.name}`)
  }
}
