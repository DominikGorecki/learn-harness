import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { windowIconPath } from '../../src/main/branding/icon'
import { geometryModule, icnsTypes, icoSizes, iconSizes, masterGeometry, tileSvg } from '../../scripts/branding'
import { equalFrame, glyphComponents, icoFrames, icnsFrames, rasterAudit } from '../../scripts/branding-audit'

const asset = (name: string) => readFileSync(resolve('assets/branding', name))

describe('fixed branding resources', () => {
  it('resolves the compiled development directory and packaged resources independently of app/profile/project paths', () => {
    expect(windowIconPath(false, resolve('unrelated/resources'), resolve('out/main'))).toBe(resolve('assets/branding/icon.png'))
    expect(windowIconPath(true, resolve('dist/host/resources'), resolve('unrelated/main'))).toBe(resolve('dist/host/resources/branding/icon.png'))
  })
  it('derives both renderer and native SVG from exactly three master page paths', () => {
    const master = asset('sculpted-aperture.svg').toString()
    expect(masterGeometry(master).paths).toHaveLength(3)
    expect(readFileSync(resolve('src/renderer/src/components/brand-geometry.ts'), 'utf8')).toBe(geometryModule(master))
    expect(asset('app-icon.svg').toString()).toBe(tileSvg(master))
    expect(() => masterGeometry(master.replace('</svg>', '<path id="extra" d="M0 0"/></svg>'))).toThrow()
  })
  it('keeps native PNG alpha and safe padding at every size, and embeds exact export payloads in ICO/ICNS', () => {
    const ico = icoFrames(asset('icon.ico')), icns = icnsFrames(asset('icon.icns'))
    expect([...ico.keys()]).toEqual(icoSizes); expect([...icns.keys()]).toEqual([...icnsTypes.values()])
    for (const size of iconSizes) {
      const png = asset(`icon-${size}.png`)
      expect(rasterAudit(png, size).padding).toBeGreaterThanOrEqual(1)
      if (ico.has(size)) equalFrame(ico.get(size)!, png, `ICO ${size}`)
      if (icnsTypes.has(size)) equalFrame(icns.get(icnsTypes.get(size)!)!, png, `ICNS ${size}`)
    }
    equalFrame(asset('icon.png'), asset('icon-256.png'), 'runtime PNG')
    for (const size of [16, 22, 24, 32, 36, 48]) expect(glyphComponents(asset(`glyph-${size}.png`))).toBe(3)
  })
})
