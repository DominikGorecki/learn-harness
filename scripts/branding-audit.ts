import { inflateSync } from 'node:zlib'
import { sha256 } from './branding.ts'

/** Decode the pinned canvas export format independently of Chromium's metadata. */
export function pngPixels(png: Buffer): { width: number; height: number; pixels: Buffer } {
  if (!png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('Invalid PNG signature.')
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20)
  if (png[24] !== 8 || png[25] !== 6 || png[28] !== 0) throw new Error('Expected non-interlaced 8-bit RGBA PNG.')
  const chunks: Buffer[] = []
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset), type = png.toString('ascii', offset + 4, offset + 8)
    if (offset + length + 12 > png.length) throw new Error('Truncated PNG.')
    if (type === 'IDAT') chunks.push(png.subarray(offset + 8, offset + 8 + length))
    offset += length + 12
  }
  const scanlines = inflateSync(Buffer.concat(chunks)), stride = width * 4, pixels = Buffer.alloc(stride * height)
  if (scanlines.length !== (stride + 1) * height) throw new Error('Unexpected PNG scanlines.')
  const paeth = (a: number, b: number, c: number) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c }
  for (let y = 0; y < height; y++) {
    const filter = scanlines[y * (stride + 1)]!
    if (filter > 4) throw new Error('Invalid PNG filter.')
    for (let x = 0; x < stride; x++) {
      const left = x >= 4 ? pixels[y * stride + x - 4]! : 0, up = y > 0 ? pixels[(y - 1) * stride + x]! : 0, upperLeft = y > 0 && x >= 4 ? pixels[(y - 1) * stride + x - 4]! : 0
      const prediction = [0, left, up, Math.floor((left + up) / 2), paeth(left, up, upperLeft)][filter]!
      pixels[y * stride + x] = (scanlines[y * (stride + 1) + 1 + x]! + prediction) & 255
    }
  }
  return { width, height, pixels }
}

export function rasterAudit(png: Buffer, size: number): { padding: number; transparent: number; opaque: number } {
  const { width, height, pixels } = pngPixels(png)
  if (width !== size || height !== size) throw new Error(`Invalid ${size}px dimensions.`)
  let padding = size, transparent = 0, opaque = 0
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const alpha = pixels[(y * size + x) * 4 + 3]!
    if (alpha === 0) transparent++; if (alpha === 255) opaque++
    if (alpha > 0) padding = Math.min(padding, x, y, size - 1 - x, size - 1 - y)
  }
  if (padding < Math.max(1, Math.floor(size * .05)) || !transparent || !opaque || pixels[3] !== 0 || pixels[((size >> 1) * size + (size >> 1)) * 4 + 3] !== 255) throw new Error(`Invalid ${size}px alpha or safe padding.`)
  return { padding, transparent, opaque }
}

export function icoFrames(ico: Buffer): Map<number, Buffer> {
  if (ico.readUInt16LE(0) !== 0 || ico.readUInt16LE(2) !== 1) throw new Error('Invalid ICO header.')
  const count = ico.readUInt16LE(4), frames = new Map<number, Buffer>()
  for (let index = 0; index < count; index++) {
    const entry = 6 + index * 16, size = ico[entry] || 256, length = ico.readUInt32LE(entry + 8), offset = ico.readUInt32LE(entry + 12)
    if ((ico[entry + 1] || 256) !== size || ico.readUInt16LE(entry + 4) !== 1 || ico.readUInt16LE(entry + 6) !== 32 || offset < 6 + count * 16 || offset + length > ico.length || frames.has(size)) throw new Error('Invalid ICO frame table.')
    frames.set(size, ico.subarray(offset, offset + length))
  }
  return frames
}

export function icnsFrames(icns: Buffer): Map<string, Buffer> {
  if (icns.toString('ascii', 0, 4) !== 'icns' || icns.readUInt32BE(4) !== icns.length) throw new Error('Invalid ICNS header.')
  const frames = new Map<string, Buffer>()
  for (let offset = 8; offset < icns.length;) {
    const type = icns.toString('ascii', offset, offset + 4), length = icns.readUInt32BE(offset + 4)
    if (length <= 8 || offset + length > icns.length || frames.has(type)) throw new Error('Invalid ICNS chunk table.')
    frames.set(type, icns.subarray(offset + 8, offset + length)); offset += length
  }
  return frames
}

export function equalFrame(actual: Uint8Array, expected: Uint8Array, label: string): void {
  if (sha256(actual) !== sha256(expected)) throw new Error(`Artwork mismatch: ${label}`)
}

/** Eight-neighbour high-opacity page cores; antialiased edges can meet at small sizes. */
export function glyphComponents(png: Buffer): number {
  const { width, height, pixels } = pngPixels(png), visited = new Uint8Array(width * height)
  let components = 0
  for (let pixel = 0; pixel < visited.length; pixel++) {
    if (visited[pixel] || pixels[pixel * 4 + 3]! < 224) continue
    components++; visited[pixel] = 1
    const pending = [pixel]
    while (pending.length) {
      const current = pending.pop()!, x = current % width, y = Math.floor(current / width)
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, next = ny * width + nx
        if (nx < 0 || ny < 0 || nx >= width || ny >= height || visited[next] || pixels[next * 4 + 3]! < 224) continue
        visited[next] = 1; pending.push(next)
      }
    }
  }
  return components
}
