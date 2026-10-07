import { join } from 'node:path'
import { unlink } from 'node:fs/promises'
import type { SecretEncryption } from '../auth/credential-store'
import { parseOpenRouterImageModel, parseOpenRouterModelMetadata, parseSaveOpenRouterKey, openRouterPolicy } from '../../shared/openrouter'
import type { OpenRouterImageModelId, OpenRouterModelMetadata } from '../../shared/openrouter'
import { identifier, strictRecord } from '../../shared/validation'
import { missing, privateDirectory, readPrivate, replacePrivate, storageError } from './private-files'

export interface OpenRouterCredential { key: string; epoch: string }
export function createOpenRouterSettingsStore(directory: string, encryption: SecretEncryption) {
  const keyPath = join(directory, 'openrouter-key.json'), settingsPath = join(directory, 'openrouter-settings.json'), cachePath = join(directory, 'openrouter-cache.json')
  const protectedStorage = encryption.available()
  const parse = (value: unknown): OpenRouterCredential => { const data = strictRecord(value, ['key', 'epoch']); return { key: parseSaveOpenRouterKey({ key: data.key }).key, epoch: identifier(data.epoch) } }
  const store = {
    protection: protectedStorage ? 'protected' as const : 'local' as const,
    async readKey(): Promise<OpenRouterCredential | null> {
      try {
        if (!await privateDirectory(directory, false)) return null
        const content = await readPrivate(keyPath, 8192); if (content === null) return null
        const envelope = strictRecord(JSON.parse(content), ['version', 'storage', 'credential', 'ciphertext'])
        if (envelope.version !== 1) throw storageError()
        let credential: OpenRouterCredential
        if (envelope.storage === 'protected') {
          strictRecord(envelope, ['version', 'storage', 'ciphertext'])
          if (!protectedStorage || typeof envelope.ciphertext !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(envelope.ciphertext)) throw storageError()
          credential = parse(JSON.parse(encryption.decrypt(Buffer.from(envelope.ciphertext, 'base64'))))
        } else if (envelope.storage === 'local') { strictRecord(envelope, ['version', 'storage', 'credential']); credential = parse(envelope.credential); if (protectedStorage) await store.writeKey(credential) }
        else throw storageError()
        return credential
      } catch { throw storageError() }
    },
    async writeKey(value: OpenRouterCredential): Promise<void> {
      try {
        const credential = parse(value); await privateDirectory(directory)
        const envelope = protectedStorage ? { version: 1, storage: 'protected', ciphertext: Buffer.from(encryption.encrypt(JSON.stringify(credential))).toString('base64') } : { version: 1, storage: 'local', credential }
        await replacePrivate(keyPath, envelope, 8192)
      } catch { throw storageError() }
    },
    async clearKey(): Promise<void> { if (!await privateDirectory(directory, false)) return; await readPrivate(keyPath, 8192); await unlink(keyPath).catch(error => { if (!missing(error)) throw storageError() }) },
    async readModel(): Promise<OpenRouterImageModelId> { if (!await privateDirectory(directory, false)) return openRouterPolicy.defaultImageModel; const content = await readPrivate(settingsPath, 4096); if (!content) return openRouterPolicy.defaultImageModel; const data = strictRecord(JSON.parse(content), ['version', 'modelId']); if (data.version !== 1) throw storageError(); return parseOpenRouterImageModel(data.modelId) },
    async writeModel(modelId: OpenRouterImageModelId): Promise<void> { await privateDirectory(directory); await replacePrivate(settingsPath, { version: 1, modelId: parseOpenRouterImageModel(modelId) }, 4096) },
    async readCache(): Promise<{ epoch: string; models: OpenRouterModelMetadata[] } | null> { if (!await privateDirectory(directory, false)) return null; const content = await readPrivate(cachePath, openRouterPolicy.metadataBytes); if (!content) return null; const data = strictRecord(JSON.parse(content), ['version', 'epoch', 'models']); if (data.version !== 1 || !Array.isArray(data.models) || data.models.length !== 3) throw storageError(); const models = data.models.map(parseOpenRouterModelMetadata); if (new Set(models.map(model => model.modelId)).size !== 3) throw storageError(); return { epoch: identifier(data.epoch), models } },
    async writeCache(models: OpenRouterModelMetadata[], epoch: string): Promise<void> { const checked = models.map(parseOpenRouterModelMetadata); if (checked.length !== 3 || new Set(checked.map(model => model.modelId)).size !== 3) throw storageError(); await privateDirectory(directory); await replacePrivate(cachePath, { version: 1, epoch: identifier(epoch), models: checked }, openRouterPolicy.metadataBytes) }
  }
  return store
}
export type OpenRouterSettingsStore = ReturnType<typeof createOpenRouterSettingsStore>
