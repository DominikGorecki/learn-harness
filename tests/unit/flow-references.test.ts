import { afterEach, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { digest, pngSize, publishFlow, renderCaptures } from '../flows/artifacts'
import type { CaptureManifest, CapturePlatform } from '../flows/artifacts'
import { flowDefinition } from '../flows/catalog'

const roots: string[] = []
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64')
const prose = '# Appearance\n\nAuthored journey and assertions.\n\n<!-- flow-captures:start -->\nPending.\n<!-- flow-captures:end -->\n\nAuthored limitations.\n'
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })

async function setup() {
  const root = await mkdtemp(join(tmpdir(), 'edu-flow-reference-')); roots.push(root)
  const directory = join(root, 'appearance'), staged = join(root, 'staged')
  await mkdir(directory); await mkdir(staged)
  await writeFile(join(directory, 'index.md'), prose)
  for (const id of Object.keys(flowDefinition('appearance').screenshots)) await writeFile(join(staged, `${id}.png`), png)
  return { root, directory, staged }
}
function manifest(platform: CapturePlatform = 'windows'): CaptureManifest {
  return { schemaVersion: 1, flow: 'appearance', platform, capturedAt: '2026-10-05T12:00:00.000Z', testFile: 'tests/desktop/appearance.spec.ts', testTitle: 'Appearance',
    testSha256: 'a'.repeat(64), revision: null, sourceDirty: true, evidence: 'isolated-fixture',
    captures: Object.entries(flowDefinition('appearance').screenshots).map(([id, caption]) => ({ id, caption, ...pngSize(png), viewport: { width: 1, height: 1 }, theme: 'light', zoom: 1, method: 'playwright', maskedLocalPaths: false, sha256: digest(png) })) }
}

it('replaces the complete platform set, removes obsolete images and preserves prose and other platforms', async () => {
  const { root, directory, staged } = await setup()
  await publishFlow(root, staged, manifest('linux'))
  await publishFlow(root, staged, manifest())
  await writeFile(join(directory, 'screenshots/windows/obsolete.png'), png)
  const refreshed = manifest(); refreshed.capturedAt = '2026-10-05T13:00:00.000Z'
  await publishFlow(root, staged, refreshed)
  expect((await readdir(join(directory, 'screenshots/windows'))).sort()).toEqual(['manifest.json', ...refreshed.captures.map(capture => `${capture.id}.png`)].sort())
  const index = await readFile(join(directory, 'index.md'), 'utf8')
  expect(index).toBe(renderCaptures(prose, [manifest('linux'), refreshed]))
  expect(JSON.parse(await readFile(join(directory, 'screenshots/linux/manifest.json'), 'utf8'))).toEqual(manifest('linux'))
  expect((await readdir(directory)).sort()).toEqual(['index.md', 'screenshots'])
})

it('preserves the last complete set and its index when a refresh is incomplete or corrupt', async () => {
  const { root, directory, staged } = await setup()
  await publishFlow(root, staged, manifest())
  const before = await readFile(join(directory, 'index.md'), 'utf8')
  const incomplete = manifest(); incomplete.captures.pop()
  await expect(publishFlow(root, staged, incomplete)).rejects.toThrow('Incomplete')
  await writeFile(join(staged, 'settings-light.png'), Buffer.from('broken capture'))
  await expect(publishFlow(root, staged, manifest())).rejects.toThrow('Invalid PNG')
  expect(await readFile(join(directory, 'index.md'), 'utf8')).toBe(before)
  expect(await readFile(join(directory, 'screenshots/windows/settings-light.png'))).toEqual(png)
  expect((await readdir(join(directory, 'screenshots'))).sort()).toEqual(['windows'])
  expect((await readdir(directory)).sort()).toEqual(['index.md', 'screenshots'])
})

it('rejects overlapping publication without changing another run’s lock or references', async () => {
  const { root, directory, staged } = await setup()
  await writeFile(join(directory, '.capture.lock'), 'owned by another run')
  await expect(publishFlow(root, staged, manifest())).rejects.toMatchObject({ code: 'EEXIST' })
  expect(await readFile(join(directory, 'index.md'), 'utf8')).toBe(prose)
  expect(await readFile(join(directory, '.capture.lock'), 'utf8')).toBe('owned by another run')
})

it('requires exactly one generated block before replacing authored text', () => {
  expect(() => renderCaptures('# Missing markers', [])).toThrow('one generated capture block')
  expect(() => renderCaptures(prose + prose, [])).toThrow('one generated capture block')
})
