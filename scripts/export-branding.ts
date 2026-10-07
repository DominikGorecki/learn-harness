import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { geometryModule, iconSizes, makeIcns, makeIco, masterGeometry, sha256, tileSvg } from './branding.ts'

const root = resolve(import.meta.dirname, '..'), assets = join(root, 'assets/branding')
const check = process.argv.includes('--check')
const temporary = await mkdtemp(join(tmpdir(), 'edu-branding-'))
try {
  const master = await readFile(join(assets, 'sculpted-aperture.svg'), 'utf8')
  const tile = tileSvg(master), { viewBox, paths } = masterGeometry(master)
  const previews = [16, 22, 24, 32, 36, 48]
  const glyph = (color: string, size: number) => `<svg x="0" y="0" width="${size}" height="${size}" viewBox="${viewBox}" fill="${color}">${paths.map(path => `<path d="${path}"/>`).join('')}</svg>`
  let preview = '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="400" viewBox="0 0 720 400"><rect width="720" height="400" fill="#EFEFF2"/>'
  for (const [row, color] of ['#7944CA', '#B58AF8', '#222426'].entries()) {
    const y = 28 + row * 90
    preview += `<rect x="8" y="${y - 8}" width="704" height="82" rx="8" fill="${row === 1 ? '#1B1E1E' : '#F5FAFB'}"/>`
    preview += `<text x="20" y="${y + 23}" font-family="sans-serif" font-size="14" fill="${row === 1 ? '#F3F3F3' : '#222426'}">${['Light', 'Dark', 'Mono'][row]}</text>`
    for (const [index, size] of previews.entries()) preview += `<g transform="translate(${116 + index * 90} ${y + 24 - size / 2})">${glyph(color, size)}<text x="0" y="${size + 18}" font-family="sans-serif" font-size="11" fill="${row === 1 ? '#F3F3F3' : '#222426'}">${size}px</text></g>`
  }
  preview += '<text x="20" y="330" font-family="sans-serif" font-size="14" fill="#222426">Native</text>'
  for (const [index, size] of [16, 24, 32, 48, 64].entries()) preview += `<svg x="${110 + index * 110}" y="310" width="${size}" height="${size}" viewBox="0 0 1024 1024">${tile.replace(/<svg[^>]+>|<\/svg>/g, '')}</svg>`
  preview += '</svg>\n'
  const jobs: Array<{ name: string; width: number; height: number; svg: string }> = iconSizes.map(size => ({ name: `icon-${size}.png`, width: size, height: size, svg: Buffer.from(tile).toString('base64') }))
  jobs.push(...previews.map(size => ({ name: `glyph-${size}.png`, width: size, height: size, svg: Buffer.from(glyph('#222426', size).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')).toString('base64') })))
  jobs.push({ name: 'preview.png', width: 720, height: 400, svg: Buffer.from(preview).toString('base64') })
  const input = join(temporary, 'input.json'), reportPath = join(temporary, 'report.json')
  await writeFile(input, JSON.stringify({ profile: join(temporary, 'profile'), output: temporary, report: reportPath, jobs }))
  const electron = createRequire(import.meta.url)('electron') as string
  await new Promise<void>((accept, reject) => {
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !['ELECTRON_RUN_AS_NODE', 'ELECTRON_RENDERER_URL', 'NODE_OPTIONS', 'NODE_INSPECT_RESUME_ON_START'].includes(key)))
    const child = spawn(electron, [join(root, 'scripts/rasterize-branding.cjs'), input], { env, windowsHide: true, stdio: 'inherit' })
    const timeout = setTimeout(() => { child.kill(); reject(new Error('Branding rasterization timed out.')) }, 60_000)
    child.once('error', error => { clearTimeout(timeout); reject(error) })
    child.once('exit', code => { clearTimeout(timeout); if (code === 0) accept(); else reject(new Error(`Branding rasterization exited ${code}.`)) })
  })
  const report = JSON.parse(await readFile(reportPath, 'utf8')) as { electron: string; chromium: string; results: Array<{ name: string; width: number; height: number; alpha: { left: number; top: number; right: number; bottom: number; transparent: number; opaque: number } }> }
  if (report.electron !== '44.5.1') throw new Error('Use the pinned Electron 44.5.1 export runtime.')
  const outputs = new Map<string, string | Buffer>([['app-icon.svg', tile], ['preview.svg', preview]])
  const pngs = new Map<number, Buffer>()
  for (const size of iconSizes) {
    const png = await readFile(join(temporary, `icon-${size}.png`)), metadata = report.results.find(item => item.name === `icon-${size}.png`)!
    if (png.readUInt32BE(16) !== size || png.readUInt32BE(20) !== size || metadata.alpha.transparent === 0 || metadata.alpha.opaque === 0 || metadata.alpha.left < 0 || metadata.alpha.top < 0 || metadata.alpha.right >= size || metadata.alpha.bottom >= size) throw new Error(`Invalid ${size}px raster.`)
    pngs.set(size, png); outputs.set(`icon-${size}.png`, png)
  }
  outputs.set('icon.png', pngs.get(256)!); outputs.set('icon.ico', makeIco(pngs)); outputs.set('icon.icns', makeIcns(pngs))
  for (const size of previews) outputs.set(`glyph-${size}.png`, await readFile(join(temporary, `glyph-${size}.png`)))
  outputs.set('preview.png', await readFile(join(temporary, 'preview.png')))
  outputs.set('exports.json', JSON.stringify({ schemaVersion: 1, masterSha256: sha256(master), electron: report.electron, chromium: report.chromium,
    files: [...outputs].filter(([name]) => name !== 'preview.png').map(([name, data]) => {
      const raster = report.results.find(item => item.name === name)
      return { name, sha256: sha256(data), bytes: Buffer.byteLength(data), ...(raster ? { width: raster.width, height: raster.height, alpha: raster.alpha } : {}) }
    }) }, null, 2) + '\n')
  // PNG base64 is never included in the small checked-in metadata report.
  await mkdir(assets, { recursive: true })
  for (const [name, data] of outputs) {
    const destination = join(assets, name)
    if (check) { if (sha256(await readFile(destination)) !== sha256(data)) throw new Error(`Stale branding output: ${name}`) }
    else await writeFile(destination, data)
  }
  const geometryPath = join(root, 'src/renderer/src/components/brand-geometry.ts'), geometry = geometryModule(master)
  if (check) { if (await readFile(geometryPath, 'utf8') !== geometry) throw new Error('Stale renderer brand geometry.') }
  else await writeFile(geometryPath, geometry)
  console.info(`${check ? 'Verified' : 'Exported'} three-page master, ${iconSizes.length} PNG sizes, ICO, ICNS and renderer geometry with Electron ${report.electron}.`)
} finally { await rm(temporary, { recursive: true, force: true }) }
