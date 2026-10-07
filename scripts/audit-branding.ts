import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { geometryModule, icnsTypes, icoSizes, iconSizes, sha256, tileSvg } from './branding.ts'
import { equalFrame, glyphComponents, icnsFrames, icoFrames, rasterAudit } from './branding-audit.ts'
import { windowIconPath } from '../src/main/branding/icon.ts'

const root = resolve(import.meta.dirname, '..'), assets = join(root, 'assets/branding')
const read = (name: string) => readFile(join(assets, name))
const master = await read('sculpted-aperture.svg')
equalFrame(await read('app-icon.svg'), Buffer.from(tileSvg(master.toString())), 'app-tile/master')
equalFrame(await readFile(join(root, 'src/renderer/src/components/brand-geometry.ts')), Buffer.from(geometryModule(master.toString())), 'renderer/master')
const manifest = JSON.parse((await read('exports.json')).toString()) as { masterSha256: string; files: Array<{ name: string; sha256: string; bytes: number }> }
if (manifest.masterSha256 !== sha256(master)) throw new Error('Stale master export manifest.')
for (const item of manifest.files) { const file = await read(item.name); if (sha256(file) !== item.sha256 || file.length !== item.bytes) throw new Error(`Stale export: ${item.name}`) }
const pngs = new Map<number, Buffer>()
for (const size of iconSizes) { const png = await read(`icon-${size}.png`); console.info(`PNG ${size}:`, rasterAudit(png, size)); pngs.set(size, png) }
for (const size of [16, 22, 24, 32, 36, 48]) {
  if (glyphComponents(await read(`glyph-${size}.png`)) !== 3) throw new Error(`Glyph pages/gaps do not survive at ${size}px.`)
}
console.info('Glyph high-opacity cores: three separate pages at 16/22/24/32/36/48px; antialiased edges can meet.')
equalFrame(await read('icon.png'), pngs.get(256)!, 'runtime/256px')
const ico = icoFrames(await read('icon.ico')), icns = icnsFrames(await read('icon.icns'))
if (JSON.stringify([...ico.keys()]) !== JSON.stringify(icoSizes) || JSON.stringify([...icns.keys()]) !== JSON.stringify([...icnsTypes.values()])) throw new Error('Incorrect native icon size set.')
for (const [size, png] of ico) equalFrame(png, pngs.get(size)!, `ICO ${size}`)
for (const [size, type] of icnsTypes) equalFrame(icns.get(type)!, pngs.get(size)!, `ICNS ${type}`)
if (process.argv.includes('--package')) {
  const architecture = process.arch === 'x64' ? '' : `-${process.arch}`
  const directory = process.platform === 'darwin' ? `mac${architecture}/Learning Studio.app/Contents/Resources` : `${process.platform === 'win32' ? 'win' : 'linux'}${architecture}-unpacked/resources`
  const resources = join(root, 'dist', directory)
  equalFrame(await readFile(windowIconPath(true, resources, 'unused')), pngs.get(256)!, 'packaged runtime PNG')
  const { extractFile } = createRequire(import.meta.url)('@electron/asar') as typeof import('@electron/asar')
  const main = extractFile(join(resources, 'app.asar'), join('out', 'main', 'index.js')).toString('utf8')
  equalFrame(Buffer.from(main), await readFile(join(root, 'out/main/index.js')), 'packaged main/current compiled main')
  if (!main.includes('branding/icon.png') || !main.includes('process.resourcesPath')) throw new Error('Compiled main lacks the fixed packaged icon consumer.')
  if (process.platform === 'win32') {
    // electron-builder's locked resource parser is build tooling, never a runtime dependency.
    const { NtExecutable, NtExecutableResource } = createRequire(import.meta.url)('pe-library') as typeof import('pe-library')
    const exe = await readFile(join(resources, '..', 'Learning Studio.exe'))
    const entries = NtExecutableResource.from(NtExecutable.from(exe, { ignoreCert: true })).entries
    const groups = entries.filter(entry => entry.type === 14)
    if (!groups.length) throw new Error('Packaged EXE has no icon group.')
    let matched = false
    for (const group of groups) {
      const table = Buffer.from(group.bin), count = table.readUInt16LE(4), sizes: number[] = []
      for (let index = 0; index < count; index++) {
        const offset = 6 + index * 14, size = table[offset] || 256, id = table.readUInt16LE(offset + 12)
        const entry = entries.find(item => item.type === 3 && item.id === id && item.lang === group.lang)
        if (!entry || !pngs.has(size)) throw new Error('Unexpected EXE icon frame.')
        equalFrame(new Uint8Array(entry.bin), pngs.get(size)!, `EXE RT_ICON ${id}/${size}`); sizes.push(size)
      }
      if (JSON.stringify(sizes) === JSON.stringify(icoSizes)) matched = true
      console.info(`EXE icon group ${group.id}: ${sizes.join('/')} px; PNG payload hashes match master exports.`)
    }
    if (!matched) throw new Error('Packaged EXE icon group lacks the required size set.')
  }
  console.info('Packaged fixed runtime icon and available-host build resources verified.')
}
console.info(`Branding audit passed: ${iconSizes.length} RGBA PNG sizes, ${ico.size} ICO frames, ${icns.size} ICNS PNG chunks, consistent master/consumers and hashes.`)
