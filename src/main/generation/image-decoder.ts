import sharp from 'sharp'
import { ApplicationError } from '../../shared/contracts'
import { inspectRaster } from '../security/topic-media'
import { contentDigest } from '../storage/topic-content-files'
import type { DecodedImage } from './image-worker-contract'

/** Utility only: metadata inspection alone does not prove a valid raster. */
export async function decodeImage(bytes: Uint8Array, identity: { callId: string; imageSlotId: string }): Promise<DecodedImage> {
  const expected = inspectRaster(bytes)
  try {
    const image = sharp(bytes, { failOn: 'warning', limitInputPixels: 16_000_000, unlimited: false, sequentialRead: true, pages: 1 })
    const metadata = await image.metadata()
    if ((metadata.pages ?? 1) !== 1 || metadata.delay?.length || metadata.width !== expected.width || metadata.height !== expected.height) throw new Error('Invalid raster')
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true })
    if (info.width !== expected.width || info.height !== expected.height || info.channels > 4 || data.byteLength > 64 * 1024 * 1024 || data.byteLength !== info.width * info.height * info.channels) throw new Error('Invalid raster')
    return { kind: 'image', callId: identity.callId, imageSlotId: identity.imageSlotId, bytes, ...expected, digest: contentDigest(bytes) }
  } catch { throw new ApplicationError('UNAVAILABLE', 'The illustration could not be decoded safely.') }
}
