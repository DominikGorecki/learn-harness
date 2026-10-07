import { ApplicationError } from '../../shared/contracts'
import { topicContentPolicy } from '../../shared/topic-content'
import type { ChapterImageAsset } from '../../shared/topic-content'
import { contentDigest } from '../storage/topic-content-files'

export { parseTopicMediaIdentity, parseTopicMediaUrl, topicMediaUrl } from '../../shared/topic-content-media'
export type { TopicMediaIdentity } from '../../shared/topic-content-media'
export interface RasterDimensions { mime: ChapterImageAsset['mime']; width: number; height: number }
const forbidden = () => new ApplicationError('FORBIDDEN', 'This illustration is missing, corrupt or unsupported.')
function u16(bytes: Uint8Array, offset: number): number { if (offset + 2 > bytes.length) throw forbidden(); return (bytes[offset]! << 8) | bytes[offset + 1]! }
function u32(bytes: Uint8Array, offset: number, little = false): number {
  if (offset + 4 > bytes.length) throw forbidden()
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, little)
}
function ascii(bytes: Uint8Array, offset: number, length: number): string { return String.fromCharCode(...bytes.subarray(offset, offset + length)) }
/** Main performs bounded container/signature inspection; a sanctioned worker must fully decode before staging. */
export function inspectRaster(bytes: Uint8Array): RasterDimensions {
  if (!bytes.byteLength || bytes.byteLength > topicContentPolicy.imageBytes) throw forbidden()
  let result: RasterDimensions | null = null
  if (bytes.length >= 33 && [...bytes.subarray(0, 8)].join(',') === '137,80,78,71,13,10,26,10') {
    if (u32(bytes, 8) !== 13 || ascii(bytes, 12, 4) !== 'IHDR') throw forbidden()
    const width = u32(bytes, 16), height = u32(bytes, 20)
    let offset = 8, imageData = false, ended = false
    while (offset + 12 <= bytes.length) {
      const length = u32(bytes, offset), name = ascii(bytes, offset + 4, 4)
      if (length > bytes.length - offset - 12) throw forbidden()
      if (['acTL', 'fcTL', 'fdAT'].includes(name) || name === 'IHDR' && offset !== 8) throw forbidden()
      if (name === 'IDAT' && length > 0) imageData = true
      offset += 12 + length
      if (name === 'IEND') { if (length !== 0 || offset !== bytes.length) throw forbidden(); ended = true; break }
    }
    if (!imageData || !ended || bytes[26] !== 0 || bytes[27] !== 0 || ![0, 1].includes(bytes[28]!)) throw forbidden()
    result = { mime: 'image/png', width, height }
  } else if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    if (u32(bytes, 4, true) + 8 !== bytes.length) throw forbidden()
    let offset = 12, canvas: { width: number; height: number } | null = null
    while (offset + 8 <= bytes.length) {
      const kind = ascii(bytes, offset, 4), length = u32(bytes, offset + 4, true), start = offset + 8
      if (length > bytes.length - start) throw forbidden()
      if (['ANIM', 'ANMF'].includes(kind)) throw forbidden()
      if (kind === 'VP8X') {
        if (canvas || offset !== 12 || length !== 10 || bytes[start]! & 2) throw forbidden()
        const read24 = (at: number) => bytes[at]! | bytes[at + 1]! << 8 | bytes[at + 2]! << 16
        canvas = { width: read24(start + 4) + 1, height: read24(start + 7) + 1 }
      }
      if (kind === 'VP8 ' && length >= 10) {
        if (result) throw forbidden()
        if (ascii(bytes, start + 3, 3) !== '\x9d\x01\x2a') throw forbidden()
        result = { mime: 'image/webp', width: (bytes[start + 6]! | bytes[start + 7]! << 8) & 0x3fff, height: (bytes[start + 8]! | bytes[start + 9]! << 8) & 0x3fff }
      } else if (kind === 'VP8L' && length >= 5) {
        if (result) throw forbidden()
        if (bytes[start] !== 0x2f) throw forbidden()
        const packed = u32(bytes, start + 1, true)
        result = { mime: 'image/webp', width: (packed & 0x3fff) + 1, height: ((packed >>> 14) & 0x3fff) + 1 }
      }
      offset = start + length + (length % 2)
    }
    if (offset !== bytes.length || canvas && result && (canvas.width !== result.width || canvas.height !== result.height)) throw forbidden()
  } else if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9) {
    let offset = 2, scanned = false
    while (offset + 4 <= bytes.length - 2) {
      if (bytes[offset++] !== 0xff) throw forbidden()
      while (bytes[offset] === 0xff) offset++
      const marker = bytes[offset++]!, length = u16(bytes, offset)
      if (length < 2 || offset + length > bytes.length) throw forbidden()
      if ([0xc0, 0xc1, 0xc2].includes(marker)) {
        if (length < 8) throw forbidden()
        result = { mime: 'image/jpeg', height: u16(bytes, offset + 3), width: u16(bytes, offset + 5) }
      }
      if (marker === 0xda) { scanned = true; break }
      offset += length
    }
    if (!scanned) throw forbidden()
  }
  if (!result || result.width < 1 || result.height < 1 || result.width * result.height > topicContentPolicy.imagePixels) throw forbidden()
  return result
}
export function validateRasterAsset(bytes: Uint8Array, asset: ChapterImageAsset): void {
  const actual = inspectRaster(bytes)
  if (bytes.byteLength !== asset.bytes || contentDigest(bytes) !== asset.digest || actual.mime !== asset.mime || actual.width !== asset.width || actual.height !== asset.height) throw forbidden()
}
