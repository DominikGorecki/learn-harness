import { lstat, mkdir, readdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { ApplicationError } from '../../shared/contracts'
import { identifier, strictRecord } from '../../shared/validation'
import { contentRelativePath, parseChapterBaseline, parseChapterImageAsset, parseChapterManifest, parseChapterPlan, parseContentDigest, parseTopicContentCheckpoint, parseTopicImageCandidate, topicContentPolicy } from '../../shared/topic-content'
import type { ChapterBaseline, ChapterImageAsset, ChapterManifest, ChapterPlan, TopicContentCheckpoint, TopicImageCandidate, RetryTopicContentImageRequest } from '../../shared/topic-content'
import type { PreparedTopicContent, ProjectStorage, TopicFolderState } from '../../core/workspace/ports'
import { atomicWrite } from './atomic-file'
import { projectTarget } from './project-files'
import { createProjectStorage } from './project-storage'
import { validateRasterAsset } from '../security/topic-media'
import {
  assertContentRoot, contentConflict, contentDigest, contentMissing, contentRootIdentity, contentStorageError,
  readContentBytes, readContentText, finishImmutableContentWrite, topicCandidatePath, topicCheckpointPath, topicJournalPath,
  topicManifestPath, writeImmutableContent
} from './topic-content-files'
import type { ContentFileIdentity } from './topic-content-files'
import type { TopicMediaIdentity } from '../../shared/topic-content-media'

export const topicStoragePolicy = { manifestBytes: 3 * 1024 * 1024, journalBytes: 4 * 1024 * 1024, progressEntries: 100 } as const
export interface TopicContentAuthority {
  readonly prepared: PreparedTopicContent; readonly rootIdentity: ContentFileIdentity;
  readonly folderName: string; folder: TopicFolderState | null
}
export type PublicationRecovery = { kind: 'none' | 'committed' } | { kind: 'pending'; manifest: ChapterManifest } | { kind: 'conflict'; message: string }
export interface TopicContentReadState {
  manifest: ChapterManifest | null; manifestDigest: string | null; stale: boolean; missingImageIds: string[];
  issues: string[]; recovery: PublicationRecovery
}
interface PublicationFile { path: string; digest: string; bytes: number }
interface PublicationJournal {
  schemaVersion: 1; projectId: string; topicId: string; previousManifestDigest: string | null;
  nextManifestDigest: string; manifest: ChapterManifest; files: PublicationFile[]
}
export type TopicStorageFault = 'after-journal' | 'after-tree' | 'before-marker' | 'after-marker' | 'before-cleanup'
function serialize(value: unknown): string { return JSON.stringify(value, null, 2) + '\n' }
function contextFingerprint(prepared: PreparedTopicContent): string {
  const { title, overview, scope, level, outcomes, assumptions, additions } = prepared.outline.document
  return contentDigest(JSON.stringify({ brief: prepared.brief, title, overview, scope, level, outcomes, assumptions, additions }))
}
function markdown(manifest: ChapterManifest): string {
  const { plan, document } = manifest
  const illustration = (sectionId: string, placement: 'before' | 'after') => plan.images.filter(image => image.sectionId === sectionId && image.placement === placement).flatMap(image => {
    const asset = manifest.images.find(item => item.imageId === image.id)?.asset
    if (!asset) return []
    const path = asset.path.startsWith(manifest.outputDirectory + '/') ? asset.path.slice(manifest.outputDirectory.length + 1) : '../' + asset.path.split('/').slice(3).join('/')
    const escape = (value: string) => value.replace(/[[\]\\]/g, '\\$&').replace(/\r?\n/g, ' ')
    return [`![${escape(image.alt)}](${path})\n\n${image.caption}`]
  }).join('\n\n')
  const sections = plan.sections.map((section, index) => {
    const content = document.sections[index]!
    return [illustration(section.id, 'before'), `## ${section.title}`, content.markdown,
      '### Examples\n\n' + content.examples.join('\n\n'), content.misconceptions.length ? '### Common misconceptions\n\n' + content.misconceptions.join('\n\n') : '', illustration(section.id, 'after')].filter(Boolean).join('\n\n')
  })
  return [`# ${plan.title}`, plan.centralQuestion, document.introduction, ...sections, '## Synthesis', document.synthesis, '## Sources and assumptions', ...document.sourceNotes].join('\n\n') + '\n'
}
function chapterFiles(manifest: ChapterManifest): Map<string, string> {
  const files = new Map<string, string>([[`${manifest.outputDirectory}/chapter.md`, markdown(manifest)]])
  for (const section of manifest.document.sections) files.set(`${manifest.outputDirectory}/sections/section-${Buffer.from(section.id).toString('hex')}.md`, section.markdown + '\n')
  return files
}

/** Unactivated main adapter. All public-facing writes must enter WorkspaceService's mutation queue. */
export function createTopicContentStorage(options: { projectStorage?: ProjectStorage; write?: typeof atomicWrite; fault?: (point: TopicStorageFault) => void | Promise<void> } = {}) {
  const projectStorage = options.projectStorage ?? createProjectStorage(), write = options.write ?? atomicWrite
  const fault = async (point: TopicStorageFault) => { await options.fault?.(point) }

  async function current(authority: TopicContentAuthority): Promise<PreparedTopicContent> {
    const { prepared, rootIdentity } = authority
    await assertContentRoot(prepared.path, rootIdentity)
    const loaded = await projectStorage.load(prepared.path), document = loaded.document
    if (!document || document.projectId !== prepared.projectId || !document.outline || !loaded.digest) throw contentConflict('The original project or outline is missing. Its chapter files have been preserved.')
    const index = document.outline.document.lessons.findIndex(topic => topic.id === prepared.topicId)
    if (index < 0) throw new ApplicationError('NOT_FOUND', 'This topic is no longer in the saved outline.')
    const topic = document.outline.document.lessons[index]!
    const folder = await projectStorage.prepareTopicFolder(prepared.path, prepared.projectId, topic, index + 1, document.outline.document.lessons.filter(topic => topic.id !== prepared.topicId))
    if (folder && folder.folder !== authority.folderName || authority.folder && (!folder || folder.device !== authority.folder.device || folder.inode !== authority.folder.inode)) throw contentConflict('The owned topic folder changed. Its files have been preserved.')
    return { ...prepared, writable: loaded.writable, projectDigest: loaded.digest, brief: document.brief, name: document.name, selectedModel: document.selectedModel, outline: document.outline, topic, topicNumber: index + 1, topicFolder: folder }
  }
  async function ensureFolder(authority: TopicContentAuthority): Promise<void> {
    const latest = await current(authority)
    if (!latest.writable) throw new ApplicationError('STORAGE', 'This project is read-only. Saving content requires a writable folder.')
    if (authority.folder && authority.folder.content !== latest.topicFolder?.content) throw contentConflict('The owned topic plan changed during this operation. Its bytes have been preserved.')
    const root = authority.prepared.path, folder = authority.folderName
    if (!authority.folder) {
      const target = join(root, folder)
      try { await lstat(target); throw contentConflict('A new file or folder now occupies this topic location. Reopen the project before generating content.') }
      catch (error) { if (!contentMissing(error)) throw error }
      await assertContentRoot(root, authority.rootIdentity)
      await mkdir(target, { mode: 0o700 })
      const stat = await lstat(target)
      // Capture owned identity before mirror persistence so a failed write remains safely retryable.
      authority.folder = { folder, device: stat.dev, inode: stat.ino, content: null }
    }
    if (authority.folder.content === null) {
      const path = `${folder}/.edu/topic.json`, target = await projectTarget(root, path, true)
      if (await readContentText(root, path, topicContentPolicy.sectionBytes) !== null) throw contentConflict()
      const mirror = serialize({ version: 1, projectId: latest.projectId, topicId: latest.topicId, generatedAt: latest.outline.generatedAt, topic: latest.topic })
      await write(target, mirror)
      authority.folder = { ...authority.folder, content: mirror }
    }
    await assertContentRoot(root, authority.rootIdentity)
  }
  async function generatedSource(authority: TopicContentAuthority, path: string): Promise<boolean> {
    const parts = path.split('/')
    if (parts.length < 4 || parts[1] !== 'content') return false
    const root = authority.prepared.path, mirrorText = await readContentText(root, `${parts[0]}/.edu/topic.json`, topicContentPolicy.sectionBytes)
    if (!mirrorText) return false
    let topicId: string
    try { const mirror = JSON.parse(mirrorText); if (mirror.version !== 1 || mirror.projectId !== authority.prepared.projectId) return false; topicId = identifier(mirror.topicId) } catch { return false }
    const manifestText = await readContentText(root, topicManifestPath(topicId), topicStoragePolicy.manifestBytes)
    if (manifestText) {
      try {
        const manifest = parseChapterManifest(JSON.parse(manifestText))
        if (manifest.projectId === authority.prepared.projectId && manifest.topicId === topicId && manifest.outputDirectory.split('/')[0] === parts[0] &&
          (path === manifest.outputDirectory || path.startsWith(manifest.outputDirectory + '/') || manifest.chapterId === parts[2] && manifest.previousRevisionIds.includes(parts[3]!) || manifest.images.some(image => image.asset?.path === path))) return true
      } catch { /* Unknown chapter bytes do not authorize a generated namespace. */ }
    }
    for (const [folder, parser, maximum] of [
      ['.edu/content-runs', parseTopicContentCheckpoint, topicContentPolicy.checkpointBytes],
      ['.edu/content-abandoned', parseTopicContentCheckpoint, topicContentPolicy.checkpointBytes],
      ['.edu/content-candidates', parseTopicImageCandidate, 256 * 1024]
    ] as const) {
      await projectTarget(root, folder + '/__scope__')
      const entries = await readdir(join(root, ...folder.split('/')), { withFileTypes: true }).catch(error => { if (contentMissing(error)) return []; throw error })
      if (entries.length > topicStoragePolicy.progressEntries) throw new ApplicationError('UNAVAILABLE', 'Too many content recovery records to validate generated source ownership.')
      for (const entry of entries) {
        if (!entry.isFile() || entry.isSymbolicLink() || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*\.json$/.test(entry.name)) continue
        const text = await readContentText(root, `${folder}/${entry.name}`, maximum)
        try {
          const record = parser(JSON.parse(text!))
          if (record.projectId === authority.prepared.projectId && record.topicId === topicId && record.chapterId === parts[2] && record.revisionId === parts[3] && ('outputDirectory' in record ? record.outputDirectory.split('/')[0] === parts[0] : record.asset.path.split('/')[0] === parts[0])) return true
        } catch { /* Malformed progress never blocks published reading or becomes source authority. */ }
      }
    }
    return false
  }
  async function rawManifest(authority: TopicContentAuthority): Promise<{ content: string | null; digest: string | null; manifest: ChapterManifest | null }> {
    await current(authority)
    const content = await readContentText(authority.prepared.path, topicManifestPath(authority.prepared.topicId), topicStoragePolicy.manifestBytes)
    if (content === null) return { content: null, digest: null, manifest: null }
    let manifest: ChapterManifest
    try {
      manifest = parseChapterManifest(JSON.parse(content))
      assertOwned(authority, manifest)
    } catch (error) { throw contentStorageError(error instanceof ApplicationError && error.code === 'FORBIDDEN' ? error : new ApplicationError('STORAGE', 'The chapter manifest is unreadable or from an unsupported version. Its bytes have been preserved.')) }
    return { content, digest: contentDigest(content), manifest }
  }
  function assertOwned(authority: TopicContentAuthority, value: { projectId: string; topicId: string; chapterId: string; revisionId: string; outputDirectory?: string }): void {
    if (value.projectId !== authority.prepared.projectId || value.topicId !== authority.prepared.topicId || value.outputDirectory !== undefined && value.outputDirectory !== `${authority.folderName}/content/${value.chapterId}/${value.revisionId}`) throw new ApplicationError('FORBIDDEN', 'This chapter does not belong to the selected project and topic folder.')
  }
  async function validateBaseline(authority: TopicContentAuthority, baselineValue: ChapterBaseline, marker = true, requireWritable = true): Promise<void> {
    const baseline = parseChapterBaseline(baselineValue), latest = await current(authority)
    if (requireWritable && !latest.writable) throw new ApplicationError('STORAGE', 'This project is read-only. Saving content requires a writable folder.')
    if (requireWritable && authority.folder && authority.folder.content !== latest.topicFolder?.content) throw contentConflict('The owned topic plan changed during this operation. Its bytes have been preserved.')
    if (contentDigest(JSON.stringify(authority.prepared.topic)) !== baseline.topicDigest || contextFingerprint(authority.prepared) !== baseline.learningContextDigest || contentDigest(JSON.stringify(latest.topic)) !== baseline.topicDigest || contextFingerprint(latest) !== baseline.learningContextDigest) throw contentConflict('The topic or learning context changed. Generate fresh content rather than replacing the previous chapter.')
    let total = 0
    for (const source of baseline.sources) {
      if (await generatedSource(authority, source.path)) throw new ApplicationError('FORBIDDEN', 'Generated chapter output cannot be used as a primary source.')
      const bytes = await readContentBytes(latest.path, source.path, topicContentPolicy.sectionBytes)
      if (!bytes || contentDigest(bytes) !== source.digest) throw contentConflict('An inspected source changed or disappeared. Its files and previous chapter have been preserved.')
      total += bytes.byteLength
      if (total > topicContentPolicy.chapterTextBytes) throw new ApplicationError('FORBIDDEN', 'Inspected chapter sources exceed the context limit.')
    }
    if (marker && (await rawManifest(authority)).digest !== baseline.expectedManifestDigest) throw contentConflict('The published chapter changed. Its current revision has been preserved.')
  }
  async function verifyAsset(authority: TopicContentAuthority, asset: ChapterImageAsset): Promise<Uint8Array> {
    const bytes = await readContentBytes(authority.prepared.path, asset.path, topicContentPolicy.imageBytes)
    if (!bytes) throw new ApplicationError('NOT_FOUND', 'A saved illustration is missing. The chapter text remains available.')
    validateRasterAsset(bytes, asset)
    return bytes
  }
  function inventory(manifest: ChapterManifest): PublicationFile[] {
    const files: PublicationFile[] = [...chapterFiles(manifest)].map(([path, text]) => ({ path, digest: contentDigest(text), bytes: Buffer.byteLength(text) }))
    for (const image of manifest.images) if (image.asset) files.push({ path: image.asset.path, digest: image.asset.digest, bytes: image.asset.bytes })
    if (new Set(files.map(file => file.path.toLowerCase())).size !== files.length) throw contentConflict('Chapter files cannot share a filesystem path.')
    return files
  }
  function parseJournal(authority: TopicContentAuthority, value: unknown): PublicationJournal {
    const data = strictRecord(value, ['schemaVersion', 'projectId', 'topicId', 'previousManifestDigest', 'nextManifestDigest', 'manifest', 'files'])
    if (data.schemaVersion !== 1 || identifier(data.projectId) !== authority.prepared.projectId || identifier(data.topicId) !== authority.prepared.topicId) throw contentConflict()
    const manifest = parseChapterManifest(data.manifest)
    assertOwned(authority, manifest)
    const previousManifestDigest = data.previousManifestDigest === null ? null : parseContentDigest(data.previousManifestDigest), nextManifestDigest = parseContentDigest(data.nextManifestDigest)
    if (previousManifestDigest !== manifest.baseline.expectedManifestDigest || nextManifestDigest !== contentDigest(serialize(manifest)) || !Array.isArray(data.files)) throw contentConflict()
    const expected = inventory(manifest)
    if (data.files.length !== expected.length || data.files.some((value, index) => {
      const file = strictRecord(value, ['path', 'digest', 'bytes'])
      return file.path !== expected[index]!.path || file.digest !== expected[index]!.digest || file.bytes !== expected[index]!.bytes
    })) throw contentConflict()
    return { schemaVersion: 1, projectId: authority.prepared.projectId, topicId: authority.prepared.topicId, previousManifestDigest, nextManifestDigest, manifest, files: expected }
  }
  async function journal(authority: TopicContentAuthority): Promise<PublicationJournal | null> {
    const content = await readContentText(authority.prepared.path, topicJournalPath(authority.prepared.topicId), topicStoragePolicy.journalBytes)
    if (content === null) return null
    try { return parseJournal(authority, JSON.parse(content)) } catch { throw contentConflict('The content-publication recovery record is unknown or corrupt. Its bytes and chapter files have been preserved.') }
  }
  async function verifyInventory(authority: TopicContentAuthority, record: PublicationJournal, allowMissing: boolean): Promise<void> {
    for (const file of record.files) {
      const bytes = await readContentBytes(authority.prepared.path, file.path, Math.max(topicContentPolicy.chapterTextBytes + 256 * 1024, file.bytes))
      if (!bytes && allowMissing) continue
      if (!bytes || bytes.byteLength !== file.bytes || contentDigest(bytes) !== file.digest) throw contentConflict('An interrupted chapter file changed or is missing. The publication record has been preserved.')
    }
    for (const image of record.manifest.images) if (image.asset && !allowMissing) await verifyAsset(authority, image.asset)
  }
  async function removeJournal(authority: TopicContentAuthority): Promise<void> {
    await assertContentRoot(authority.prepared.path, authority.rootIdentity)
    const target = await projectTarget(authority.prepared.path, topicJournalPath(authority.prepared.topicId))
    await unlink(target).catch(error => { if (!contentMissing(error)) throw error })
  }
  async function inspectRecovery(authority: TopicContentAuthority): Promise<PublicationRecovery> {
    await current(authority)
    const record = await journal(authority)
    if (!record) return { kind: 'none' }
    const actual = await rawManifest(authority)
    if (actual.digest === record.nextManifestDigest) {
      await verifyInventory(authority, record, false)
      return { kind: 'committed' }
    }
    if (actual.digest !== record.previousManifestDigest) throw contentConflict('The chapter manifest changed during interrupted publication. Its external version and recovery record have been preserved.')
    await validateBaseline(authority, record.manifest.baseline, true, false)
    await verifyInventory(authority, record, true)
    return { kind: 'pending', manifest: record.manifest }
  }
  async function recover(authority: TopicContentAuthority): Promise<PublicationRecovery> {
    const latest = await current(authority)
    if (!latest.writable) throw new ApplicationError('STORAGE', 'This project is read-only. Recovery cleanup requires a writable folder.')
    const record = await journal(authority)
    if (record) {
      const marker = (await rawManifest(authority)).digest
      if (marker !== record.previousManifestDigest && marker !== record.nextManifestDigest) throw contentConflict()
      for (const file of record.files) await finishImmutableContentWrite(authority.prepared.path, file.path, file.digest, file.bytes)
    }
    const result = await inspectRecovery(authority)
    if (result.kind === 'committed') await removeJournal(authority)
    return result
  }
  async function publish(authority: TopicContentAuthority, value: ChapterManifest): Promise<void> {
    const manifest = parseChapterManifest(value)
    assertOwned(authority, manifest)
    parseChapterPlan(manifest.plan, { projectId: authority.prepared.projectId, topicId: authority.prepared.topicId, objectives: authority.prepared.topic.objectives })
    await ensureFolder(authority)
    const previous = await rawManifest(authority), nextContent = serialize(manifest), nextDigest = contentDigest(nextContent)
    let existing = await journal(authority)
    if (existing && previous.digest === existing.nextManifestDigest && existing.nextManifestDigest !== nextDigest) {
      await recover(authority)
      existing = await journal(authority)
    }
    if (Buffer.byteLength(nextContent) > topicStoragePolicy.manifestBytes) throw new ApplicationError('STORAGE', 'This chapter manifest exceeds its storage limit.')
    if (existing && existing.nextManifestDigest !== nextDigest) throw contentConflict('Another chapter publication is pending. Save or resolve it before replacing this chapter.')
    if (previous.digest === nextDigest) {
      // Exact committed retries verify the immutable assets independently of journal cleanup.
      await validateBaseline(authority, manifest.baseline, false)
      await verifyInventory(authority, { schemaVersion: 1, projectId: manifest.projectId, topicId: manifest.topicId,
        previousManifestDigest: manifest.baseline.expectedManifestDigest, nextManifestDigest: nextDigest, manifest, files: inventory(manifest) }, false)
      if (existing) await recover(authority)
      return
    }
    await validateBaseline(authority, manifest.baseline)
    if (existing) for (const file of existing.files) await finishImmutableContentWrite(authority.prepared.path, file.path, file.digest, file.bytes)
    if (previous.manifest) {
      const retained = [previous.manifest.revisionId, ...previous.manifest.previousRevisionIds]
      if (retained.includes(manifest.revisionId) || retained.some(revisionId => !manifest.previousRevisionIds.includes(revisionId))) throw contentConflict('A replacement must publish a new immutable revision and retain every accepted revision pointer.')
    }
    if (previous.manifest && manifest.chapterId !== previous.manifest.chapterId && manifest.images.some(image => image.asset && !image.asset.path.startsWith(manifest.outputDirectory + '/'))) throw contentConflict()
    // Reused media must be a currently accepted asset, not an arbitrary historical path.
    for (const image of manifest.images) if (image.asset) {
      if (!image.asset.path.startsWith(manifest.outputDirectory + '/') && !previous.manifest?.images.some(current => current.asset && JSON.stringify(current.asset) === JSON.stringify(image.asset))) throw contentConflict('Only currently accepted media can be retained in a new revision.')
      await verifyAsset(authority, image.asset)
    }
    const record: PublicationJournal = existing ?? { schemaVersion: 1, projectId: manifest.projectId, topicId: manifest.topicId, previousManifestDigest: previous.digest, nextManifestDigest: nextDigest, manifest, files: inventory(manifest) }
    if (existing) await verifyInventory(authority, existing, true)
    else {
      const content = serialize(record)
      if (Buffer.byteLength(content) > topicStoragePolicy.journalBytes) throw new ApplicationError('STORAGE', 'This content-publication record exceeds its storage limit.')
      await assertContentRoot(authority.prepared.path, authority.rootIdentity)
      await write(await projectTarget(authority.prepared.path, topicJournalPath(manifest.topicId), true), content)
    }
    await fault('after-journal')
    for (const [path, text] of chapterFiles(manifest)) {
      await assertContentRoot(authority.prepared.path, authority.rootIdentity)
      await writeImmutableContent(authority.prepared.path, path, text)
    }
    await fault('after-tree')
    await verifyInventory(authority, record, false)
    await validateBaseline(authority, manifest.baseline)
    await fault('before-marker')
    await validateBaseline(authority, manifest.baseline)
    await write(await projectTarget(authority.prepared.path, topicManifestPath(manifest.topicId), true), nextContent)
    await fault('after-marker')
    await verifyInventory(authority, record, false)
    await fault('before-cleanup')
    // Manifest is durable; a cleanup failure is verified on the next read, never reported as lost publication.
    await removeJournal(authority).catch(() => {})
  }
  return {
    async excludedSources(authority: TopicContentAuthority, paths: readonly string[]): Promise<string[]> {
      if (paths.length > 1000) throw new ApplicationError('UNAVAILABLE', 'Too many source paths.')
      const excluded: string[] = []
      for (const path of paths) if (await generatedSource(authority, contentRelativePath(path))) excluded.push(path)
      return excluded
    },
    async prepare(prepared: PreparedTopicContent): Promise<TopicContentAuthority> {
      const rootIdentity = await contentRootIdentity(prepared.path), folderName = prepared.topicFolder?.folder ?? identifier(prepared.topicId)
      contentRelativePath(folderName)
      const authority = { prepared: structuredClone(prepared), rootIdentity, folderName, folder: structuredClone(prepared.topicFolder) }
      await current(authority)
      return authority
    },
    async captureBaseline(authority: TopicContentAuthority, sourcePaths: readonly string[] = []): Promise<ChapterBaseline> {
      const latest = await current(authority), manifest = await rawManifest(authority)
      if (contentDigest(JSON.stringify(latest.topic)) !== contentDigest(JSON.stringify(authority.prepared.topic)) || contextFingerprint(latest) !== contextFingerprint(authority.prepared)) throw contentConflict('Learning context changed before source inspection completed.')
      if (sourcePaths.length > topicContentPolicy.maximumSources || new Set(sourcePaths.map(path => path.toLowerCase())).size !== sourcePaths.length) throw new ApplicationError('INVALID_INPUT', 'Inspected source references must be bounded and distinct.')
      let total = 0
      const sources = []
      for (const value of sourcePaths) {
        const path = contentRelativePath(value)
        if (await generatedSource(authority, path)) throw new ApplicationError('FORBIDDEN', 'Generated chapter output cannot be used as a primary source.')
        const bytes = await readContentBytes(latest.path, path, topicContentPolicy.sectionBytes)
        if (!bytes) throw new ApplicationError('NOT_FOUND', 'An inspected source is no longer available.')
        total += bytes.byteLength
        if (total > topicContentPolicy.chapterTextBytes) throw new ApplicationError('FORBIDDEN', 'Inspected sources exceed the chapter context limit.')
        sources.push({ path, digest: contentDigest(bytes) })
      }
      return { topicDigest: contentDigest(JSON.stringify(latest.topic)), learningContextDigest: contextFingerprint(latest), sources, expectedManifestDigest: manifest.digest }
    },
    async read(authority: TopicContentAuthority): Promise<TopicContentReadState> {
      const state: TopicContentReadState = { manifest: null, manifestDigest: null, stale: false, missingImageIds: [], issues: [], recovery: { kind: 'none' } }
      try {
        const actual = await rawManifest(authority)
        state.manifest = actual.manifest; state.manifestDigest = actual.digest
      } catch (error) { state.issues.push(contentStorageError(error).message); return state }
      // Inspection is read-only. Recovery cleanup is a separate workspace-serialized mutation.
      try { state.recovery = await inspectRecovery(authority) } catch (error) { const message = contentStorageError(error).message; state.issues.push(message); state.recovery = { kind: 'conflict', message } }
      if (state.manifest) {
        const latest = await current(authority), baseline = state.manifest.baseline
        state.stale = contentDigest(JSON.stringify(latest.topic)) !== baseline.topicDigest || contextFingerprint(latest) !== baseline.learningContextDigest
        for (const source of baseline.sources) {
          try { const bytes = await readContentBytes(latest.path, source.path, topicContentPolicy.sectionBytes); if (!bytes || contentDigest(bytes) !== source.digest) state.stale = true }
          catch { state.stale = true }
        }
        for (const image of state.manifest.images) if (image.asset) {
          try { await verifyAsset(authority, image.asset) } catch { state.missingImageIds.push(image.imageId) }
        }
        for (const [path, text] of chapterFiles(state.manifest)) {
          try { if (await readContentText(latest.path, path, topicContentPolicy.chapterTextBytes + 256 * 1024) !== text) state.issues.push('A readable chapter file is missing or externally changed. Its bytes have been preserved; saved chapter metadata remains readable.') }
          catch { state.issues.push('A readable chapter file could not be checked. Its bytes have been preserved.') }
        }
      }
      return state
    },
    recover, publish,
    async discardPublication(authority: TopicContentAuthority, runId: string, revisionId: string): Promise<void> {
      if (!(await current(authority)).writable) throw new ApplicationError('STORAGE', 'This project is read-only.')
      const record = await journal(authority), actual = await rawManifest(authority)
      if (actual.manifest && [actual.manifest.revisionId, ...actual.manifest.previousRevisionIds].includes(revisionId)) throw contentConflict('A published chapter cannot be discarded as unfinished progress.')
      if (!record) return
      if (record.manifest.provenance.runId !== runId || record.manifest.revisionId !== revisionId || actual.digest !== record.previousManifestDigest) throw contentConflict('This publication recovery record belongs to different or already committed content. Its bytes have been preserved.')
      for (const file of record.files) await finishImmutableContentWrite(authority.prepared.path, file.path, file.digest, file.bytes)
      await verifyInventory(authority, record, true)
      await removeJournal(authority)
      // Explicit discard abandons only the proven control record, never immutable or external trees.
    },
    async retryPublication(authority: TopicContentAuthority): Promise<void> {
      const record = await journal(authority)
      if (!record) throw new ApplicationError('NOT_FOUND', 'No interrupted content publication is available to retry.')
      await publish(authority, record.manifest)
    },
    async stageAsset(authority: TopicContentAuthority, planValue: ChapterPlan, revisionId: string, asset: ChapterImageAsset, bytes: Uint8Array): Promise<void> {
      asset = parseChapterImageAsset(asset)
      const plan = parseChapterPlan(planValue, { projectId: authority.prepared.projectId, topicId: authority.prepared.topicId, objectives: authority.prepared.topic.objectives })
      identifier(revisionId)
      const published = await rawManifest(authority)
      if (published.manifest?.chapterId === plan.chapterId && [published.manifest.revisionId, ...published.manifest.previousRevisionIds].includes(revisionId)) throw contentConflict('Published revision trees are immutable. Stage this illustration in a new candidate revision.')
      if (!plan.images.some(image => image.id === asset.imageId) || asset.path !== `${authority.folderName}/content/${plan.chapterId}/${revisionId}/images/${asset.imageId}-${asset.versionId}.${asset.mime === 'image/png' ? 'png' : asset.mime === 'image/jpeg' ? 'jpg' : 'webp'}`) throw new ApplicationError('FORBIDDEN', 'This illustration is outside the selected chapter revision.')
      validateRasterAsset(bytes, asset)
      await ensureFolder(authority)
      await writeImmutableContent(authority.prepared.path, asset.path, bytes)
      await verifyAsset(authority, asset)
    },
    async copyAcceptedImages(authority: TopicContentAuthority, planValue: ChapterPlan, revisionId: string): Promise<ChapterImageAsset[]> {
      const plan = parseChapterPlan(planValue, { projectId: authority.prepared.projectId, topicId: authority.prepared.topicId, objectives: authority.prepared.topic.objectives }), published = await rawManifest(authority)
      identifier(revisionId)
      if (!published.manifest || plan.chapterId !== published.manifest.chapterId || [published.manifest.revisionId, ...published.manifest.previousRevisionIds].includes(revisionId)) throw contentConflict('Continue image completion in a new immutable revision of the current chapter.')
      const assets: ChapterImageAsset[] = []
      for (const image of published.manifest.images) if (image.asset && plan.images.some(slot => slot.id === image.imageId)) {
        if (JSON.stringify(plan.images.find(slot => slot.id === image.imageId)) !== JSON.stringify(published.manifest.plan.images.find(slot => slot.id === image.imageId))) throw contentConflict('Changed illustration plans require explicit new image generation.')
        const asset = { ...image.asset, path: `${authority.folderName}/content/${plan.chapterId}/${revisionId}/images/${image.asset.path.split('/').at(-1)}` }
        const bytes = await verifyAsset(authority, image.asset)
        await writeImmutableContent(authority.prepared.path, asset.path, bytes)
        await verifyAsset(authority, asset)
        assets.push(asset)
      }
      if ((await rawManifest(authority)).digest !== published.digest) throw contentConflict()
      return assets
    },
    async loadCheckpoint(authority: TopicContentAuthority, runId: string): Promise<TopicContentCheckpoint | null> {
      await current(authority)
      const content = await readContentText(authority.prepared.path, topicCheckpointPath(runId), topicContentPolicy.checkpointBytes)
      if (content === null) return null
      try {
        const checkpoint = parseTopicContentCheckpoint(JSON.parse(content))
        assertOwned(authority, checkpoint)
        if (checkpoint.runId !== runId) throw contentConflict()
        return checkpoint
      } catch { throw contentConflict('Topic progress is unreadable or belongs to different content. It has been preserved; the published chapter remains readable.') }
    },
    async saveCheckpoint(authority: TopicContentAuthority, value: TopicContentCheckpoint, retry?: RetryTopicContentImageRequest): Promise<void> {
      const checkpoint = parseTopicContentCheckpoint(value)
      const content = serialize(checkpoint)
      if (Buffer.byteLength(content) > topicContentPolicy.checkpointBytes) throw contentStorageError('The progress record exceeds its storage limit.')
      assertOwned(authority, checkpoint)
      parseChapterPlan(checkpoint.plan, { projectId: authority.prepared.projectId, topicId: authority.prepared.topicId, objectives: authority.prepared.topic.objectives })
      await validateBaseline(authority, checkpoint.baseline)
      const published = await rawManifest(authority)
      if (published.manifest?.chapterId === checkpoint.chapterId && [published.manifest.revisionId, ...published.manifest.previousRevisionIds].includes(checkpoint.revisionId)) throw contentConflict('Published trees cannot be reused as mutable progress. Begin a new candidate revision.')
      const path = topicCheckpointPath(checkpoint.runId), existing = await readContentText(authority.prepared.path, path, topicContentPolicy.checkpointBytes)
      if (existing !== null) {
        let previous: TopicContentCheckpoint
        try { previous = parseTopicContentCheckpoint(JSON.parse(existing)); assertOwned(authority, previous) } catch { throw contentConflict('The previous progress record is unreadable. It has been preserved.') }
        if (previous.runId !== checkpoint.runId || previous.chapterId !== checkpoint.chapterId || previous.revisionId !== checkpoint.revisionId || checkpoint.checkpointRevision !== previous.checkpointRevision + 1) {
          if (serialize(previous) === serialize(checkpoint)) return
          throw contentConflict('The saved progress revision changed. Its bytes have been preserved.')
        }
        let retried = false
        for (const image of previous.images) {
          const next = checkpoint.images.find(current => current.imageId === image.imageId)
          if (!next) throw contentConflict()
          if (retry && image.imageId === retry.imageId) {
            const uncertain = image.status === 'unresolved' || image.status === 'requested'
            if (retry.projectId !== authority.prepared.projectHandle || retry.topicId !== previous.topicId || retry.chapterId !== previous.chapterId || retry.runId !== previous.runId || retry.checkpointRevision !== previous.checkpointRevision || retry.priorCallId !== image.callId || !['failed', 'requested', 'unresolved'].includes(image.status) || !retry.acknowledgeUncertainCharge || next.status !== 'planned' || next.callId !== null || next.asset !== null) throw contentConflict('This image retry no longer matches the saved attempt.')
            const expected = [...(image.previousAttempts ?? []), { callId: image.callId, status: uncertain ? 'unresolved' : 'failed', uncertaintyAcknowledged: retry.acknowledgeUncertainCharge }]
            if (JSON.stringify(next.previousAttempts) !== JSON.stringify(expected)) throw contentConflict('The previous image attempt must remain recorded.')
            retried = true
          } else if (image.callId !== null && image.callId !== next.callId || JSON.stringify(image.previousAttempts) !== JSON.stringify(next.previousAttempts)) throw contentConflict('A dispatched image intent cannot be forgotten by a checkpoint update.')
        }
        if (retry && !retried) throw contentConflict()
        if (checkpoint.textTurns < previous.textTurns || checkpoint.imageRequests < previous.imageRequests) throw contentConflict('Lifetime request counters cannot be reset by continuation.')
        if (JSON.stringify(previous.plan) !== JSON.stringify(checkpoint.plan) || previous.images.some(image => image.status === 'complete' && !checkpoint.images.some(current => JSON.stringify(current) === JSON.stringify(image))) || previous.baseline.sources.some(source => !checkpoint.baseline.sources.some(current => current.path === source.path && current.digest === source.digest))) throw contentConflict('Validated plans, accepted images and inspected source evidence cannot be silently replaced by continuation.')
      } else if (checkpoint.checkpointRevision !== 1) throw contentConflict('The original progress record is missing. Its chapter files have been preserved.')
      for (const image of checkpoint.images) if (image.asset) await verifyAsset(authority, image.asset)
      await ensureFolder(authority)
      await write(await projectTarget(authority.prepared.path, path, true), content)
    },
    async loadCandidate(authority: TopicContentAuthority, candidateId: string): Promise<TopicImageCandidate | null> {
      await current(authority)
      const content = await readContentText(authority.prepared.path, topicCandidatePath(candidateId), 256 * 1024)
      if (content === null) return null
      try {
        const candidate = parseTopicImageCandidate(JSON.parse(content))
        assertOwned(authority, candidate)
        if (candidate.candidateId !== candidateId || !candidate.asset.path.startsWith(`${authority.folderName}/content/${candidate.chapterId}/${candidate.revisionId}/images/`)) throw contentConflict()
        return candidate
      } catch { throw contentConflict('The image candidate is unreadable or belongs to different content. Its files have been preserved.') }
    },
    async saveCandidate(authority: TopicContentAuthority, value: TopicImageCandidate): Promise<void> {
      const candidate = parseTopicImageCandidate(value)
      const content = serialize(candidate)
      if (Buffer.byteLength(content) > 256 * 1024) throw contentStorageError('The candidate record exceeds its storage limit.')
      assertOwned(authority, candidate)
      const current = await rawManifest(authority), image = current.manifest?.images.find(image => image.imageId === candidate.imageId)?.asset
      if (current.digest !== candidate.expectedManifestDigest || current.manifest?.chapterId !== candidate.chapterId || current.manifest.revisionId !== candidate.expectedRevisionId || image?.versionId !== candidate.expectedImageVersionId) throw contentConflict('The original chapter or image changed before candidate storage. The original remains current.')
      if (!candidate.asset.path.startsWith(`${authority.folderName}/content/${candidate.chapterId}/${candidate.revisionId}/images/`)) throw contentConflict()
      await verifyAsset(authority, candidate.asset)
      await ensureFolder(authority)
      await writeImmutableContent(authority.prepared.path, topicCandidatePath(candidate.candidateId), content)
    },
    async discardProgress(authority: TopicContentAuthority, runId: string, expectedRevision: number): Promise<void> {
      if (!(await current(authority)).writable) throw new ApplicationError('STORAGE', 'This project is read-only. Discarding progress requires a writable folder.')
      const path = topicCheckpointPath(runId), content = await readContentText(authority.prepared.path, path, topicContentPolicy.checkpointBytes)
      if (!content) throw new ApplicationError('NOT_FOUND', 'This progress record is no longer available.')
      let checkpoint: TopicContentCheckpoint
      try { checkpoint = parseTopicContentCheckpoint(JSON.parse(content)); assertOwned(authority, checkpoint) } catch { throw contentConflict() }
      if (checkpoint.runId !== runId || checkpoint.checkpointRevision !== expectedRevision || await journal(authority)) throw contentConflict('Progress changed or has an interrupted publication. Resolve it before discarding.')
      // Retain provenance for preserved generated trees without offering them as resumable progress.
      const archivedPath = `.edu/content-abandoned/${identifier(runId)}-${checkpoint.checkpointRevision}.json`
      await projectTarget(authority.prepared.path, archivedPath)
      const archived: string[] = await readdir(join(authority.prepared.path, '.edu/content-abandoned'), { encoding: 'utf8' }).catch(error => { if (contentMissing(error)) return [] as string[]; throw error })
      if (!archived.includes(archivedPath.split('/').at(-1)!) && archived.length >= topicStoragePolicy.progressEntries) throw new ApplicationError('STORAGE', 'Generated provenance archive is full. Existing records and unfinished progress have been preserved.')
      await writeImmutableContent(authority.prepared.path, archivedPath, serialize(checkpoint))
      await unlink(await projectTarget(authority.prepared.path, path))
      // Immutable assets/history remain intact. Garbage collection is a later capability.
    },
    async discardCandidate(authority: TopicContentAuthority, candidateId: string, expectedRevisionId: string): Promise<void> {
      if (!(await current(authority)).writable) throw new ApplicationError('STORAGE', 'This project is read-only. Discarding a candidate requires a writable folder.')
      const path = topicCandidatePath(candidateId), content = await readContentText(authority.prepared.path, path, 256 * 1024)
      if (!content) throw new ApplicationError('NOT_FOUND', 'This image candidate is no longer available.')
      let candidate: TopicImageCandidate
      try { candidate = parseTopicImageCandidate(JSON.parse(content)); assertOwned(authority, candidate) } catch { throw contentConflict() }
      if (candidate.candidateId !== candidateId || candidate.expectedRevisionId !== expectedRevisionId || await journal(authority)) throw contentConflict()
      await unlink(await projectTarget(authority.prepared.path, path))
    },
    async progressIds(authority: TopicContentAuthority, kind: 'runs' | 'candidates'): Promise<string[]> {
      await current(authority)
      const folder = kind === 'runs' ? '.edu/content-runs' : '.edu/content-candidates'
      await projectTarget(authority.prepared.path, folder + '/__scope__')
      let entries
      try { entries = await readdir(join(authority.prepared.path, ...folder.split('/')), { withFileTypes: true }) } catch (error) { if (contentMissing(error)) return []; throw error }
      if (entries.length > topicStoragePolicy.progressEntries) throw new ApplicationError('UNAVAILABLE', 'There are too many content recovery records to inspect in one request. Existing records are preserved.')
      return entries.filter(entry => entry.isFile() && !entry.isSymbolicLink() && /^[a-zA-Z0-9][a-zA-Z0-9_-]*\.json$/.test(entry.name)).map(entry => entry.name.slice(0, -5)).sort()
    },
    async resolveMedia(authority: TopicContentAuthority, identity: TopicMediaIdentity): Promise<{ bytes: Uint8Array; mime: ChapterImageAsset['mime'] }> {
      if (identity.projectHandle !== authority.prepared.projectHandle || identity.topicId !== authority.prepared.topicId) throw new ApplicationError('FORBIDDEN', 'This illustration belongs to another project or topic.')
      const current = await rawManifest(authority)
      let asset: ChapterImageAsset | null = null
      if (identity.candidateId) {
        const content = await readContentText(authority.prepared.path, topicCandidatePath(identity.candidateId), 256 * 1024)
        if (content) {
          const candidate = parseTopicImageCandidate(JSON.parse(content))
          assertOwned(authority, candidate)
          if (candidate.candidateId !== identity.candidateId || candidate.chapterId !== identity.chapterId || candidate.imageId !== identity.imageId || candidate.asset.versionId !== identity.versionId || candidate.expectedManifestDigest !== current.digest || candidate.expectedRevisionId !== current.manifest?.revisionId || candidate.expectedImageVersionId !== current.manifest.images.find(image => image.imageId === identity.imageId)?.asset?.versionId || !candidate.asset.path.startsWith(`${authority.folderName}/content/${candidate.chapterId}/${candidate.revisionId}/images/`)) throw new ApplicationError('FORBIDDEN', 'This illustration candidate expired or belongs to another image.')
          asset = candidate.asset
        }
      } else if (current.manifest?.chapterId === identity.chapterId) asset = current.manifest.images.find(image => image.imageId === identity.imageId && image.asset?.versionId === identity.versionId)?.asset ?? null
      if (!asset) throw new ApplicationError('NOT_FOUND', 'This illustration is no longer authorized for the current chapter.')
      const bytes = await verifyAsset(authority, asset)
      return { bytes, mime: asset.mime }
    }
  }
}
export type TopicContentStorage = ReturnType<typeof createTopicContentStorage>
