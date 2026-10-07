import { describe, expect, it } from 'vitest'
import { inspectRaster, validateRasterAsset } from '../../src/main/security/topic-media'
import { parseTopicMediaIdentity, parseTopicMediaUrl, topicMediaUrl } from '../../src/shared/topic-content-media'
import { topicPng } from '../fixtures/topic-content'
import { contentDigest } from '../../src/main/storage/topic-content-files'
import { topicContentPolicy } from '../../src/shared/topic-content'

function pngChunk(name: string, bytes: Uint8Array): Buffer { const chunk = Buffer.alloc(bytes.byteLength + 12); chunk.writeUInt32BE(bytes.byteLength); chunk.write(name, 4, 'ascii'); chunk.set(bytes, 8); return chunk }
function webpChunk(name: string, bytes: Uint8Array): Buffer { const chunk = Buffer.alloc(8 + bytes.length + bytes.length % 2); chunk.write(name, 0, 'ascii'); chunk.writeUInt32LE(bytes.length, 4); chunk.set(bytes, 8); return chunk }
function webp(...chunks: Buffer[]): Buffer { const body = Buffer.concat(chunks), result = Buffer.alloc(12 + body.length); result.write('RIFF', 0); result.writeUInt32LE(result.length - 8, 4); result.write('WEBP', 8); body.copy(result, 12); return result }
describe('bounded raster and opaque media policy', () => {
  it('inspects genuine raster bytes and independently rejects mismatched digest, MIME, size and dimensions', () => {
    expect(inspectRaster(topicPng)).toEqual({ mime: 'image/png', width: 1, height: 1 })
    const asset = { imageId: 'image', versionId: 'v1', path: 'topic/content/chapter/rev/images/image-v1.png', mime: 'image/png' as const, width: 1, height: 1, bytes: topicPng.length, digest: contentDigest(topicPng), createdAt: '2026-10-07', modelId: 'openai/gpt-image-2' as const, returnedModelId: null, callId: 'call', previousVersionId: null }
    expect(() => validateRasterAsset(topicPng, asset)).not.toThrow()
    for (const patch of [{ width: 2 }, { bytes: 2 }, { digest: 'a'.repeat(64) }, { mime: 'image/jpeg' as const }]) expect(() => validateRasterAsset(topicPng, { ...asset, ...patch })).toThrow()
    for (const bytes of [Buffer.from('<svg><script/></svg>'), topicPng.subarray(0, 33), Buffer.alloc(topicContentPolicy.imageBytes + 1)]) expect(() => inspectRaster(bytes)).toThrow()
    const huge = Buffer.from(topicPng); huge.writeUInt32BE(5000, 16); huge.writeUInt32BE(5000, 20)
    expect(() => inspectRaster(huge)).toThrow()
  })
  it('rejects animated PNG/WebP and conflicting extended WebP dimensions or duplicate payloads', () => {
    for (const name of ['acTL', 'fcTL', 'fdAT']) expect(() => inspectRaster(Buffer.concat([topicPng.subarray(0, 33), pngChunk(name, Buffer.alloc(8)), topicPng.subarray(33)]))).toThrow()
    const payload = webpChunk('VP8L', Buffer.from([0x2f, 0, 0, 0, 0])), canvas = Buffer.alloc(10)
    canvas[0] = 2
    expect(() => inspectRaster(webp(webpChunk('VP8X', canvas), payload))).toThrow()
    for (const name of ['ANIM', 'ANMF']) expect(() => inspectRaster(webp(webpChunk(name, Buffer.alloc(6)), payload))).toThrow()
    canvas[0] = 0; canvas[4] = 1
    expect(() => inspectRaster(webp(webpChunk('VP8X', canvas), payload))).toThrow()
    expect(() => inspectRaster(webp(payload, payload))).toThrow()
  })
  it('constructs canonical registry-handle routes and denies aliases, arbitrary paths and remote URLs', () => {
    const identity = { projectHandle: 'handle', topicId: 'topic', chapterId: 'chapter', imageId: 'image', versionId: 'v1', candidateId: 'candidate' }
    const url = topicMediaUrl(identity)
    expect(parseTopicMediaUrl(url)).toEqual(identity)
    expect(() => parseTopicMediaIdentity({ ...identity, path: 'C:/secret' })).toThrow()
    for (const unsafe of ['https://example.com/a.png', url + '&candidate=other', url + '#fragment', url.replace('topic/chapter', 'topic/../chapter'), url.replace('/image/', '/%2e%2e/'), url.replace('learningmedia://topic', 'learningmedia://user@topic'), url.replace('/v1?', '/v1/extra?'), url.replace('?candidate=candidate', '?path=secret')]) expect(() => parseTopicMediaUrl(unsafe)).toThrow()
  })
})
