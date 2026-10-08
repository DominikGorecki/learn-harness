import { ApplicationError } from './contracts'
import type { ApiResult, ErrorCode } from './contracts'
import { boundedText, identifier, strictRecord, textList, timestamp } from './validation'
import { projectFilePath } from './project-files'
import { utf8Bytes } from './ai/activity'
import { openRouterPolicy, parseImageGenerationSettings, parseOpenRouterImageModel } from './openrouter'
import type { ImageGenerationSettings, OpenRouterImageModelId } from './openrouter'

export const topicContentPolicy = {
  schemaVersion: 1, maximumSections: 24, textTurnsPerActivation: 48, maximumImages: 6,
  maximumObjectives: 12, sectionBytes: 256 * 1024, chapterTextBytes: 2 * 1024 * 1024,
  imageBytes: 16 * 1024 * 1024, imagePixels: 16_000_000, chapterMediaBytes: 64 * 1024 * 1024,
  maximumSources: 100, readerSectionsPerPage: 4, readerFrameBytes: 2 * 1024 * 1024,
  checkpointBytes: 3 * 1024 * 1024, maximumRetainedPointers: 100
} as const
// An accepted asset has bounded 100-character IDs, 2048-character path, decimal
// dimensions/bytes, SHA-256 digest and fixed enums. 16 KiB also covers JSON's
// six-byte escapes for every unpaired surrogate in a legal metadata path.
// envelope even at every field bound; existing paid-attempt lineage is counted.
export const readerMissingAssetReserveBytes = 16 * 1024
export type TopicContentMode = 'illustrated' | 'text-only'
/** Portable project ID in stored DTOs; registry handle in renderer capability requests. Main resolves the mapping. */
export interface TopicContentIdentity { projectId: string; topicId: string }
export interface ChapterIdentity extends TopicContentIdentity { chapterId: string; revisionId: string }
export interface ChapterSectionPlan { id: string; title: string; purpose: string; objectiveIndices: number[] }
export interface ChapterImagePlan {
  id: string; sectionId: string; placement: 'before' | 'after'; purpose: string; prompt: string;
  caption: string; alt: string; factualConstraints: string[]; skillVersion: string; settings: ImageGenerationSettings
}
/** Objective indices refer to the immutable saved topic objectives, in their original order. */
export interface ChapterPlan extends TopicContentIdentity {
  chapterId: string; title: string; centralQuestion: string; objectives: string[];
  sections: ChapterSectionPlan[]; images: ChapterImagePlan[]
}
export interface ChapterSection { id: string; markdown: string; examples: string[]; misconceptions: string[] }
export interface ChapterDocument { introduction: string; sections: ChapterSection[]; synthesis: string; sourceNotes: string[] }
export interface ChapterSource { path: string; digest: string }
export interface ChapterBaseline { topicDigest: string; learningContextDigest: string; sources: ChapterSource[]; expectedManifestDigest: string | null }
export interface ChapterImageAsset {
  imageId: string; versionId: string; path: string; mime: 'image/png' | 'image/jpeg' | 'image/webp';
  width: number; height: number; bytes: number; digest: string; createdAt: string;
  modelId: OpenRouterImageModelId; returnedModelId: OpenRouterImageModelId | null; callId: string;
  previousVersionId: string | null
}
export interface ChapterImageProgress {
  imageId: string; status: 'planned' | 'requested' | 'complete' | 'failed' | 'unresolved';
  callId: string | null; asset: ChapterImageAsset | null
  /** Prior explicitly retried paid attempts remain immutable audit correlations. */
  previousAttempts?: { callId: string; status: 'failed' | 'unresolved'; uncertaintyAcknowledged: boolean }[]
}
export interface ChapterProvenance { runId: string; textModelId: string; imageModelId: OpenRouterImageModelId | null; createdAt: string }
export interface ChapterManifest extends ChapterIdentity {
  schemaVersion: 1; outputDirectory: string; status: 'illustrated' | 'text-only' | 'needs-images';
  plan: ChapterPlan; document: ChapterDocument; images: ChapterImageProgress[]; baseline: ChapterBaseline;
  provenance: ChapterProvenance; previousRevisionIds: string[]
}
export interface TopicContentCheckpoint extends ChapterIdentity {
  schemaVersion: 1; runId: string; checkpointRevision: number; mode: TopicContentMode;
  status: 'paused' | 'cancelled' | 'interrupted' | 'working' | 'unsaved'; outputDirectory: string;
  plan: ChapterPlan; sections: ChapterSection[]; introduction: string | null; synthesis: string | null; sourceNotes: string[];
  images: ChapterImageProgress[]; baseline: ChapterBaseline; provenance: ChapterProvenance;
  textTurns: number; imageRequests: number; activationTextTurns: number; activationImageRequests: number; updatedAt: string
}
export interface TopicImageCandidate extends ChapterIdentity {
  schemaVersion: 1; candidateId: string; imageId: string; expectedRevisionId: string; expectedImageVersionId: string; expectedManifestDigest: string;
  prompt: string; caption: string; alt: string; asset: ChapterImageAsset; createdAt: string;
  /** Older unactivated records remain readable; every new replacement records actual settings. */
  settings?: ImageGenerationSettings
}
export interface TopicImageReplacementAttempt extends ChapterIdentity {
  outputDirectory: string; acceptedAsset?: ChapterImageAsset;
  schemaVersion: 1; candidateId: string; imageId: string; expectedRevisionId: string; expectedImageVersionId: string; expectedManifestDigest: string;
  sequence: number; status: 'planned' | 'requested' | 'interrupted' | 'complete'; callId: string | null;
  prompt: string; caption: string; alt: string; settings: ImageGenerationSettings; modelId: OpenRouterImageModelId; createdAt: string
}
export interface TopicContentRequest extends TopicContentIdentity { sectionCursor?: string; sectionLimit?: number }
export interface GenerateTopicContentRequest extends TopicContentIdentity { mode: TopicContentMode; replace: boolean; expectedRevisionId: string | null }
export interface TopicContentRunRequest extends TopicContentIdentity { chapterId: string; runId: string; checkpointRevision: number }
export interface RetryTopicContentSaveRequest extends TopicContentRunRequest { pendingResultId: string }
export type CompleteTopicContentImagesRequest = ChapterIdentity
export interface RetryTopicContentImageRequest extends TopicContentRunRequest { imageId: string; priorCallId: string; acknowledgeUncertainCharge: boolean }
export interface GenerateTopicImageReplacementRequest extends ChapterIdentity { imageId: string; expectedImageVersionId: string; prompt: string }
export interface TopicImageCandidateRequest extends ChapterIdentity { imageId: string; candidateId: string; expectedImageVersionId: string }
export interface AcceptTopicImageReplacementRequest extends TopicImageCandidateRequest { caption: string; alt: string }
export interface RetryTopicImageReplacementSaveRequest extends TopicImageCandidateRequest { pendingResultId: string }
export interface TopicContentSnapshot {
  revision: number; projectId: string; topicId: string;
  published: { chapterId: string; revisionId: string; status: ChapterManifest['status']; runId?: string } | null;
  progress: { chapterId: string; runId: string; checkpointRevision: number; status: TopicContentCheckpoint['status']; mode: TopicContentMode; baselineStatus?: 'current' | 'stale' | 'unavailable'; textModelId?: string; completedSectionIds: string[]; pendingImageIds: string[]; unresolvedImageIds: string[]; pendingResultId?: string; imageSlots?: { imageId: string; status: ChapterImageProgress['status']; callId: string | null; settings?: ImageGenerationSettings }[] } | null;
  candidate: TopicImageCandidate | null;
  replacement?: { candidateId: string; chapterId: string; revisionId: string; imageId: string; expectedImageVersionId: string; status: 'working' | 'interrupted' | 'unsaved' | 'published'; callId: string | null; prompt: string; modelId: OpenRouterImageModelId; pendingResultId?: string };
  stale: boolean; missingImageIds: string[]; errorCode: ErrorCode | null; message: string | null
}
/** Reader pages carry bounded section content; retained revisions never enter public snapshots. */
export interface TopicContentPage {
  identity: ChapterIdentity; plan: ChapterPlan; introduction: string; synthesis: string; sourceNotes: string[];
  sections: ChapterSection[]; images: ChapterImageProgress[]; status: ChapterManifest['status']; nextSectionCursor: string | null
}
/** Every legal cursor/limit window must fit, including windows crossing fixed batches. */
export function validateChapterPageability(identity: ChapterIdentity, plan: ChapterPlan, document: ChapterDocument, images: ChapterImageProgress[], status: ChapterManifest['status'], reserveMissingAssets = false): void {
  const envelope: TopicContentPage = { identity: { projectId: identity.projectId, topicId: identity.topicId, chapterId: identity.chapterId, revisionId: identity.revisionId }, plan, ...document, sections: [], images, status, nextSectionCursor: null }
  const base = utf8Bytes(JSON.stringify(envelope)), sizes = document.sections.map(section => utf8Bytes(JSON.stringify(section)))
  const reserve = reserveMissingAssets ? images.filter(image => !image.asset).length * readerMissingAssetReserveBytes : 0
  // Serialize large repeated metadata once. Replacing [] adds section bytes and
  // commas; replacing null adds exactly the serialized legal next cursor delta.
  for (let start = 0; start < sizes.length; start++) {
    let sectionBytes = 0
    for (let count = 1; count <= topicContentPolicy.readerSectionsPerPage && start + count <= sizes.length; count++) {
      sectionBytes += sizes[start + count - 1]!
      const cursor = plan.sections[start + count]?.id ?? null
      if (base + sectionBytes + count - 1 + utf8Bytes(JSON.stringify(cursor)) - 4 + reserve > topicContentPolicy.readerFrameBytes) throw new ApplicationError('INVALID_INPUT', 'The complete chapter is too large for bounded reading pages. Shorten the prose or illustration plan before generating images.')
    }
  }
}
export interface TopicContentApi {
  getTopicContentState(request: TopicContentIdentity): Promise<ApiResult<TopicContentSnapshot>>
  getTopicContent(request: TopicContentRequest): Promise<ApiResult<TopicContentPage | null>>
  generateTopicContent(request: GenerateTopicContentRequest): Promise<ApiResult<TopicContentSnapshot>>
  continueTopicContent(request: TopicContentRunRequest): Promise<ApiResult<TopicContentSnapshot>>
  discardTopicContentProgress(request: TopicContentRunRequest): Promise<ApiResult<TopicContentSnapshot>>
  retryTopicContentSave(request: RetryTopicContentSaveRequest): Promise<ApiResult<TopicContentSnapshot>>
  completeTopicContentImages(request: CompleteTopicContentImagesRequest): Promise<ApiResult<TopicContentSnapshot>>
  retryTopicContentImage(request: RetryTopicContentImageRequest): Promise<ApiResult<TopicContentSnapshot>>
  generateTopicImageReplacement(request: GenerateTopicImageReplacementRequest): Promise<ApiResult<TopicContentSnapshot>>
  acceptTopicImageReplacement(request: AcceptTopicImageReplacementRequest): Promise<ApiResult<TopicContentSnapshot>>
  discardTopicImageReplacement(request: TopicImageCandidateRequest): Promise<ApiResult<TopicContentSnapshot>>
  retryTopicImageReplacementSave(request: RetryTopicImageReplacementSaveRequest): Promise<ApiResult<TopicContentSnapshot>>
  onTopicContentChanged(listener: (snapshot: TopicContentSnapshot) => void): () => void
}
export function parseTopicContentPage(value: unknown): TopicContentPage {
  const data = strictRecord(value, ['identity', 'plan', 'introduction', 'synthesis', 'sourceNotes', 'sections', 'images', 'status', 'nextSectionCursor'])
  const identityData = strictRecord(data.identity, ['projectId', 'topicId', 'chapterId', 'revisionId']), identity = chapterIdentity(identityData), plan = parseChapterPlan(data.plan)
  boundPlan(plan, identity)
  const sections = sectionSet(data.sections, plan, false)
  if (sections.length > topicContentPolicy.readerSectionsPerPage) invalid()
  // Paths are metadata only. Main authorizes opaque media identities; renderer never opens these paths.
  const images = list(data.images, topicContentPolicy.maximumImages, value => {
    const image = strictRecord(value, ['imageId', 'status', 'callId', 'asset', 'previousAttempts'])
    const imageId = identifier(image.imageId), status = choice(image.status, ['planned', 'requested', 'complete', 'failed', 'unresolved']), asset = image.asset === null ? null : parseChapterImageAsset(image.asset)
    const callId = image.callId === null ? null : identifier(image.callId)
    if (!plan.images.some(image => image.id === imageId) || (status === 'complete') !== (asset !== null) || status === 'planned' && callId !== null || status !== 'planned' && !callId || asset && (asset.imageId !== imageId || asset.callId !== callId || asset.path.split('/').length !== 6 || asset.path.split('/').slice(1, 3).join('/') !== `content/${identity.chapterId}` || asset.path.split('/')[4] !== 'images')) invalid()
    return { imageId, status, callId, asset, ...attempts(image.previousAttempts, callId) }
  })
  distinct(images.map(image => image.imageId))
  const result: TopicContentPage = { identity, plan, introduction: prose(data.introduction), synthesis: prose(data.synthesis), sourceNotes: textList(data.sourceNotes, 'Source notes', 40, 2000, 1), sections, images,
    status: choice(data.status, ['illustrated', 'text-only', 'needs-images']), nextSectionCursor: data.nextSectionCursor === null ? null : identifier(data.nextSectionCursor) }
  if (utf8Bytes(JSON.stringify(result)) > topicContentPolicy.readerFrameBytes) invalid()
  return result
}
export function parseTopicContentSnapshot(value: unknown): TopicContentSnapshot {
  const data = strictRecord(value, ['revision', 'projectId', 'topicId', 'published', 'progress', 'candidate', 'replacement', 'stale', 'missingImageIds', 'errorCode', 'message'])
  const published = data.published === null ? null : strictRecord(data.published, ['chapterId', 'revisionId', 'status', 'runId'])
  const progress = data.progress === null ? null : strictRecord(data.progress, ['chapterId', 'runId', 'checkpointRevision', 'status', 'mode', 'baselineStatus', 'textModelId', 'completedSectionIds', 'pendingImageIds', 'unresolvedImageIds', 'pendingResultId', 'imageSlots'])
  if (typeof data.stale !== 'boolean') invalid()
  const ids = (value: unknown, max: number) => { const result = list(value, max, identifier); distinct(result); return result }
  const result: TopicContentSnapshot = { revision: natural(data.revision), ...topicRequest(data),
    published: published && { chapterId: identifier(published.chapterId), revisionId: identifier(published.revisionId), status: choice(published.status, ['illustrated', 'text-only', 'needs-images']), ...(published.runId !== undefined ? { runId: identifier(published.runId) } : {}) },
    progress: progress && { chapterId: identifier(progress.chapterId), runId: identifier(progress.runId), checkpointRevision: natural(progress.checkpointRevision, Number.MAX_SAFE_INTEGER, 1), status: choice(progress.status, ['paused', 'cancelled', 'interrupted', 'working', 'unsaved']), mode: choice(progress.mode, ['illustrated', 'text-only']),
      ...(progress.baselineStatus !== undefined ? { baselineStatus: choice(progress.baselineStatus, ['current', 'stale', 'unavailable'] as const) } : {}),
      ...(progress.textModelId !== undefined ? { textModelId: boundedText(progress.textModelId, 'Continuation model', 128) } : {}),
      completedSectionIds: ids(progress.completedSectionIds, topicContentPolicy.maximumSections), pendingImageIds: ids(progress.pendingImageIds, topicContentPolicy.maximumImages), unresolvedImageIds: ids(progress.unresolvedImageIds, topicContentPolicy.maximumImages),
      ...(progress.pendingResultId !== undefined ? { pendingResultId: identifier(progress.pendingResultId) } : {}),
      ...(progress.imageSlots !== undefined ? { imageSlots: list(progress.imageSlots, topicContentPolicy.maximumImages, value => { const slot = strictRecord(value, ['imageId', 'status', 'callId', 'settings']); return { imageId: identifier(slot.imageId), status: choice(slot.status, ['planned', 'requested', 'complete', 'failed', 'unresolved']), callId: slot.callId === null ? null : identifier(slot.callId), ...(slot.settings !== undefined ? { settings: parseImageGenerationSettings(slot.settings) } : {}) } }) } : {}) },
    candidate: data.candidate === null ? null : parseTopicImageCandidate(data.candidate), stale: data.stale, missingImageIds: ids(data.missingImageIds, topicContentPolicy.maximumImages),
    errorCode: data.errorCode === null ? null : choice(data.errorCode, ['INVALID_INPUT', 'NOT_FOUND', 'FORBIDDEN', 'INTERNAL', 'AUTH_REQUIRED', 'PLAN_PERMISSION_REQUIRED', 'ACCESS_RESTRICTED', 'USAGE_LIMIT', 'NETWORK', 'CANCELLED', 'BUSY', 'UNAVAILABLE', 'STORAGE', 'CONFLICT'] as const),
    message: data.message === null ? null : boundedText(data.message, 'Content status', 2000) }
  if (data.replacement !== undefined) {
    const replacement = strictRecord(data.replacement, ['candidateId', 'chapterId', 'revisionId', 'imageId', 'expectedImageVersionId', 'status', 'callId', 'prompt', 'modelId', 'pendingResultId'])
    result.replacement = { candidateId: identifier(replacement.candidateId), chapterId: identifier(replacement.chapterId), revisionId: identifier(replacement.revisionId), imageId: identifier(replacement.imageId), expectedImageVersionId: identifier(replacement.expectedImageVersionId), status: choice(replacement.status, ['working', 'interrupted', 'unsaved', 'published']), callId: replacement.callId === null ? null : identifier(replacement.callId), prompt: boundedText(replacement.prompt, 'Image prompt', openRouterPolicy.promptCharacters), modelId: parseOpenRouterImageModel(replacement.modelId), ...(replacement.pendingResultId !== undefined ? { pendingResultId: identifier(replacement.pendingResultId) } : {}) }
  }
  // A public snapshot uses a registry handle; candidate portable project identity is checked by main.
  if (result.candidate && (result.candidate.topicId !== result.topicId || !result.published || result.candidate.chapterId !== result.published.chapterId || result.candidate.expectedRevisionId !== result.published.revisionId)) invalid()
  if (result.progress?.unresolvedImageIds.some(id => !result.progress!.pendingImageIds.includes(id)) || utf8Bytes(JSON.stringify(result)) > topicContentPolicy.readerFrameBytes) invalid()
  return result
}
function invalid(): never { throw new ApplicationError('INVALID_INPUT', 'Invalid topic content.') }
function choice<T extends string>(value: unknown, choices: readonly T[]): T { if (!choices.includes(value as T)) invalid(); return value as T }
function natural(value: unknown, max = Number.MAX_SAFE_INTEGER, min = 0): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) invalid(); return value }
function list<T>(value: unknown, max: number, parse: (value: unknown) => T, min = 0): T[] { if (!Array.isArray(value) || value.length < min || value.length > max) invalid(); return value.map(parse) }
function distinct(values: string[]): void { if (new Set(values).size !== values.length) invalid() }
function prose(value: unknown, max = topicContentPolicy.sectionBytes): string {
  if (typeof value !== 'string' || !value.trim() || value.includes('\0') || utf8Bytes(value) > max) invalid()
  return value
}
export function parseContentDigest(value: unknown): string { if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) invalid(); return value }
export function contentRelativePath(value: unknown): string {
  const path = projectFilePath(value)
  if (path.split('/').some(part => ['.edu', '.git'].includes(part.toLowerCase())) || path.includes('%')) invalid()
  return path
}
export function parseTopicContentIdentity(value: unknown): TopicContentIdentity {
  const data = strictRecord(value, ['projectId', 'topicId'])
  return { projectId: identifier(data.projectId), topicId: identifier(data.topicId) }
}
function chapterIdentity(data: Record<string, unknown>): ChapterIdentity {
  return { projectId: identifier(data.projectId), topicId: identifier(data.topicId), chapterId: identifier(data.chapterId), revisionId: identifier(data.revisionId) }
}
function outputDirectory(value: unknown, identity: ChapterIdentity): string {
  const path = contentRelativePath(value), parts = path.split('/')
  if (parts.length !== 4 || parts[1] !== 'content' || parts[2] !== identity.chapterId || parts[3] !== identity.revisionId) invalid()
  return path
}
export function parseChapterPlan(value: unknown, expected?: TopicContentIdentity & { objectives: readonly string[] }): ChapterPlan {
  const data = strictRecord(value, ['projectId', 'topicId', 'chapterId', 'title', 'centralQuestion', 'objectives', 'sections', 'images'])
  const objectives = textList(data.objectives, 'Objectives', topicContentPolicy.maximumObjectives, 2000, 1)
  if (expected && (data.projectId !== expected.projectId || data.topicId !== expected.topicId || objectives.length !== expected.objectives.length || objectives.some((objective, index) => objective !== expected.objectives[index]))) invalid()
  const sections = list(data.sections, topicContentPolicy.maximumSections, value => {
    const section = strictRecord(value, ['id', 'title', 'purpose', 'objectiveIndices'])
    const objectiveIndices = list(section.objectiveIndices, objectives.length, value => natural(value, objectives.length - 1), 1)
    distinct(objectiveIndices.map(String))
    return { id: identifier(section.id), title: boundedText(section.title, 'Section title', 240), purpose: boundedText(section.purpose, 'Section purpose', 2000), objectiveIndices }
  }, 1)
  distinct(sections.map(section => section.id))
  if (new Set(sections.flatMap(section => section.objectiveIndices)).size !== objectives.length) invalid()
  const images = list(data.images, topicContentPolicy.maximumImages, value => {
    const image = strictRecord(value, ['id', 'sectionId', 'placement', 'purpose', 'prompt', 'caption', 'alt', 'factualConstraints', 'skillVersion', 'settings'])
    const sectionId = identifier(image.sectionId)
    if (!sections.some(section => section.id === sectionId)) invalid()
    return { id: identifier(image.id), sectionId, placement: choice(image.placement, ['before', 'after']), purpose: boundedText(image.purpose, 'Image purpose', 2000),
      prompt: boundedText(image.prompt, 'Image prompt', openRouterPolicy.promptCharacters), caption: boundedText(image.caption, 'Caption', 2000), alt: boundedText(image.alt, 'Alternative text', 2000),
      factualConstraints: textList(image.factualConstraints, 'Factual constraints', 20, 2000), skillVersion: identifier(image.skillVersion), settings: parseImageGenerationSettings(image.settings) }
  })
  distinct(images.map(image => image.id))
  return { projectId: identifier(data.projectId), topicId: identifier(data.topicId), chapterId: identifier(data.chapterId), title: boundedText(data.title, 'Chapter title', 240),
    centralQuestion: boundedText(data.centralQuestion, 'Central question', 2000), objectives, sections, images }
}
export function parseChapterSection(value: unknown): ChapterSection {
  const data = strictRecord(value, ['id', 'markdown', 'examples', 'misconceptions'])
  const result = { id: identifier(data.id), markdown: prose(data.markdown), examples: textList(data.examples, 'Examples', 12, 10_000, 1), misconceptions: textList(data.misconceptions, 'Misconceptions', 12, 5000) }
  if (utf8Bytes(JSON.stringify(result)) > topicContentPolicy.sectionBytes) invalid()
  return result
}
function sectionSet(value: unknown, plan: ChapterPlan, complete: boolean): ChapterSection[] {
  const sections = list(value, topicContentPolicy.maximumSections, parseChapterSection)
  distinct(sections.map(section => section.id))
  if (sections.some(section => !plan.sections.some(item => item.id === section.id)) || complete && (sections.length !== plan.sections.length || sections.some((section, index) => section.id !== plan.sections[index]!.id))) invalid()
  return sections
}
export function parseChapterDocument(value: unknown, plan: ChapterPlan): ChapterDocument {
  const data = strictRecord(value, ['introduction', 'sections', 'synthesis', 'sourceNotes'])
  const result = { introduction: prose(data.introduction), sections: sectionSet(data.sections, plan, true), synthesis: prose(data.synthesis), sourceNotes: textList(data.sourceNotes, 'Source notes', 40, 2000, 1) }
  if (utf8Bytes(JSON.stringify(result)) > topicContentPolicy.chapterTextBytes) invalid()
  return result
}
export function parseChapterBaseline(value: unknown): ChapterBaseline {
  const data = strictRecord(value, ['topicDigest', 'learningContextDigest', 'sources', 'expectedManifestDigest'])
  const sources = list(data.sources, topicContentPolicy.maximumSources, value => {
    const source = strictRecord(value, ['path', 'digest'])
    const path = contentRelativePath(source.path)
    return { path, digest: parseContentDigest(source.digest) }
  })
  distinct(sources.map(source => source.path.toLowerCase()))
  return { topicDigest: parseContentDigest(data.topicDigest), learningContextDigest: parseContentDigest(data.learningContextDigest), sources,
    expectedManifestDigest: data.expectedManifestDigest === null ? null : parseContentDigest(data.expectedManifestDigest) }
}
export function parseChapterImageAsset(value: unknown): ChapterImageAsset {
  const data = strictRecord(value, ['imageId', 'versionId', 'path', 'mime', 'width', 'height', 'bytes', 'digest', 'createdAt', 'modelId', 'returnedModelId', 'callId', 'previousVersionId'])
  const mime = choice(data.mime, ['image/png', 'image/jpeg', 'image/webp']), path = contentRelativePath(data.path)
  const width = natural(data.width, topicContentPolicy.imagePixels, 1), height = natural(data.height, topicContentPolicy.imagePixels, 1)
  const extension = mime === 'image/png' ? 'png' : mime === 'image/jpeg' ? 'jpg' : 'webp'
  if (width * height > topicContentPolicy.imagePixels || path.split('/').at(-1) !== `${identifier(data.imageId)}-${identifier(data.versionId)}.${extension}`) invalid()
  return { imageId: identifier(data.imageId), versionId: identifier(data.versionId), path, mime, width, height, bytes: natural(data.bytes, topicContentPolicy.imageBytes, 1), digest: parseContentDigest(data.digest),
    createdAt: timestamp(data.createdAt), modelId: parseOpenRouterImageModel(data.modelId), returnedModelId: data.returnedModelId === null ? null : parseOpenRouterImageModel(data.returnedModelId),
    callId: identifier(data.callId), previousVersionId: data.previousVersionId === null ? null : identifier(data.previousVersionId) }
}
function imageSet(value: unknown, plan: ChapterPlan, directory: string, retainedRevisionIds: string[] = []): ChapterImageProgress[] {
  const images = list(value, topicContentPolicy.maximumImages, value => {
    const data = strictRecord(value, ['imageId', 'status', 'callId', 'asset', 'previousAttempts'])
    const imageId = identifier(data.imageId), status = choice(data.status, ['planned', 'requested', 'complete', 'failed', 'unresolved'])
    const asset = data.asset === null ? null : parseChapterImageAsset(data.asset), callId = data.callId === null ? null : identifier(data.callId)
    if (!plan.images.some(image => image.id === imageId) || (status === 'complete') !== (asset !== null) || status === 'planned' && callId !== null || status !== 'planned' && !callId) invalid()
    if (asset) {
      const parts = directory.split('/'), assetParts = asset.path.split('/')
      if (asset.imageId !== imageId || asset.callId !== callId || assetParts.length !== 6 || assetParts.slice(0, 3).join('/') !== parts.slice(0, 3).join('/') || ![parts[3], ...retainedRevisionIds].includes(assetParts[3]) || assetParts[4] !== 'images') invalid()
    }
    return { imageId, status, callId, asset, ...attempts(data.previousAttempts, callId) }
  })
  distinct(images.map(image => image.imageId))
  if (images.length !== plan.images.length || images.reduce((sum, image) => sum + (image.asset?.bytes ?? 0), 0) > topicContentPolicy.chapterMediaBytes) invalid()
  return images
}
function attempts(value: unknown, currentCallId: string | null): Pick<ChapterImageProgress, 'previousAttempts'> {
  if (value === undefined) return {}
  const previousAttempts = list(value, 100, value => {
    const data = strictRecord(value, ['callId', 'status', 'uncertaintyAcknowledged'])
    const status = choice(data.status, ['failed', 'unresolved'])
    if (data.uncertaintyAcknowledged !== true) invalid()
    return { callId: identifier(data.callId), status, uncertaintyAcknowledged: data.uncertaintyAcknowledged }
  })
  distinct(previousAttempts.map(attempt => attempt.callId))
  if (previousAttempts.some(attempt => attempt.callId === currentCallId)) invalid()
  return { previousAttempts }
}
function parseProvenance(value: unknown): ChapterProvenance {
  const data = strictRecord(value, ['runId', 'textModelId', 'imageModelId', 'createdAt'])
  return { runId: identifier(data.runId), textModelId: boundedText(data.textModelId, 'Text model', 128), imageModelId: data.imageModelId === null ? null : parseOpenRouterImageModel(data.imageModelId), createdAt: timestamp(data.createdAt) }
}
function boundPlan(plan: ChapterPlan, identity: ChapterIdentity): void { if (plan.projectId !== identity.projectId || plan.topicId !== identity.topicId || plan.chapterId !== identity.chapterId) invalid() }
export function parseChapterManifest(value: unknown): ChapterManifest {
  const data = strictRecord(value, ['schemaVersion', 'projectId', 'topicId', 'chapterId', 'revisionId', 'outputDirectory', 'status', 'plan', 'document', 'images', 'baseline', 'provenance', 'previousRevisionIds'])
  if (data.schemaVersion !== 1) invalid()
  const identity = chapterIdentity(data), directory = outputDirectory(data.outputDirectory, identity), plan = parseChapterPlan(data.plan)
  boundPlan(plan, identity)
  const previousRevisionIds = list(data.previousRevisionIds, topicContentPolicy.maximumRetainedPointers, identifier)
  distinct(previousRevisionIds)
  if (previousRevisionIds.includes(identity.revisionId)) invalid()
  const images = imageSet(data.images, plan, directory, previousRevisionIds), status = choice(data.status, ['illustrated', 'text-only', 'needs-images'])
  if (status === 'illustrated' && (!images.length || images.some(image => image.status !== 'complete')) || status === 'needs-images' && (!images.length || images.every(image => image.status === 'complete'))) invalid()
  const document = parseChapterDocument(data.document, plan)
  validateChapterPageability(identity, plan, document, images, status)
  return { schemaVersion: 1, ...identity, outputDirectory: directory, status, plan, document, images, baseline: parseChapterBaseline(data.baseline), provenance: parseProvenance(data.provenance), previousRevisionIds }
}
export function parseTopicContentCheckpoint(value: unknown): TopicContentCheckpoint {
  const data = strictRecord(value, ['schemaVersion', 'projectId', 'topicId', 'chapterId', 'revisionId', 'runId', 'checkpointRevision', 'mode', 'status', 'outputDirectory', 'plan', 'sections', 'introduction', 'synthesis', 'sourceNotes', 'images', 'baseline', 'provenance', 'textTurns', 'imageRequests', 'activationTextTurns', 'activationImageRequests', 'updatedAt'])
  if (data.schemaVersion !== 1) invalid()
  const identity = chapterIdentity(data), directory = outputDirectory(data.outputDirectory, identity), plan = parseChapterPlan(data.plan)
  boundPlan(plan, identity)
  const provenance = parseProvenance(data.provenance), runId = identifier(data.runId), images = imageSet(data.images, plan, directory)
  if (provenance.runId !== runId) invalid()
  const result: TopicContentCheckpoint = { schemaVersion: 1, ...identity, runId, checkpointRevision: natural(data.checkpointRevision, Number.MAX_SAFE_INTEGER, 1), mode: choice(data.mode, ['illustrated', 'text-only']),
    status: choice(data.status, ['paused', 'cancelled', 'interrupted', 'working', 'unsaved']), outputDirectory: directory, plan, sections: sectionSet(data.sections, plan, false),
    introduction: data.introduction === null ? null : prose(data.introduction), synthesis: data.synthesis === null ? null : prose(data.synthesis), sourceNotes: textList(data.sourceNotes, 'Source notes', 40, 2000), images,
    baseline: parseChapterBaseline(data.baseline), provenance, textTurns: natural(data.textTurns), imageRequests: natural(data.imageRequests),
    activationTextTurns: natural(data.activationTextTurns, topicContentPolicy.textTurnsPerActivation), activationImageRequests: natural(data.activationImageRequests, topicContentPolicy.maximumImages), updatedAt: timestamp(data.updatedAt) }
  if (result.mode === 'illustrated' && !plan.images.length || result.activationTextTurns > result.textTurns || result.activationImageRequests > result.imageRequests || result.imageRequests < images.filter(image => image.callId !== null).length || utf8Bytes(JSON.stringify(result)) > topicContentPolicy.checkpointBytes) invalid()
  if (result.introduction && result.synthesis && result.sourceNotes.length && result.sections.length === plan.sections.length) {
    const document = parseChapterDocument({ introduction: result.introduction, synthesis: result.synthesis, sourceNotes: result.sourceNotes, sections: result.sections }, plan)
    validateChapterPageability(identity, plan, document, images, 'needs-images', result.mode === 'illustrated')
  }
  return result
}
export function parseTopicImageCandidate(value: unknown): TopicImageCandidate {
  const data = strictRecord(value, ['schemaVersion', 'projectId', 'topicId', 'chapterId', 'revisionId', 'candidateId', 'imageId', 'expectedRevisionId', 'expectedImageVersionId', 'expectedManifestDigest', 'prompt', 'caption', 'alt', 'asset', 'createdAt', 'settings'])
  if (data.schemaVersion !== 1) invalid()
  const identity = chapterIdentity(data), asset = parseChapterImageAsset(data.asset), imageId = identifier(data.imageId)
  if (asset.imageId !== imageId || asset.path.split('/').length !== 6 || asset.path.split('/').slice(1, 5).join('/') !== `content/${identity.chapterId}/${identity.revisionId}/images`) invalid()
  const expectedRevisionId = identifier(data.expectedRevisionId)
  if (expectedRevisionId === identity.revisionId || asset.previousVersionId !== data.expectedImageVersionId) invalid()
  return { schemaVersion: 1, ...identity, candidateId: identifier(data.candidateId), imageId, expectedRevisionId, expectedImageVersionId: identifier(data.expectedImageVersionId), expectedManifestDigest: parseContentDigest(data.expectedManifestDigest),
    prompt: boundedText(data.prompt, 'Image prompt', openRouterPolicy.promptCharacters), caption: boundedText(data.caption, 'Caption', 2000), alt: boundedText(data.alt, 'Alternative text', 2000), asset, createdAt: timestamp(data.createdAt), ...(data.settings === undefined ? {} : { settings: parseImageGenerationSettings(data.settings) }) }
}
export function parseTopicImageReplacementAttempt(value: unknown): TopicImageReplacementAttempt {
  const data = strictRecord(value, ['schemaVersion', 'projectId', 'topicId', 'chapterId', 'revisionId', 'outputDirectory', 'acceptedAsset', 'candidateId', 'imageId', 'expectedRevisionId', 'expectedImageVersionId', 'expectedManifestDigest', 'sequence', 'status', 'callId', 'prompt', 'caption', 'alt', 'settings', 'modelId', 'createdAt'])
  if (data.schemaVersion !== 1) invalid()
  const status = choice(data.status, ['planned', 'requested', 'interrupted', 'complete']), callId = data.callId === null ? null : identifier(data.callId), identity = chapterIdentity(data)
  if (status === 'planned' && callId !== null || status !== 'planned' && callId === null || identity.revisionId === data.expectedRevisionId) invalid()
  const result: TopicImageReplacementAttempt = { schemaVersion: 1, ...identity, outputDirectory: outputDirectory(data.outputDirectory, identity), candidateId: identifier(data.candidateId), imageId: identifier(data.imageId), expectedRevisionId: identifier(data.expectedRevisionId), expectedImageVersionId: identifier(data.expectedImageVersionId), expectedManifestDigest: parseContentDigest(data.expectedManifestDigest), sequence: natural(data.sequence, Number.MAX_SAFE_INTEGER, 1), status, callId, prompt: boundedText(data.prompt, 'Image prompt', openRouterPolicy.promptCharacters), caption: boundedText(data.caption, 'Caption', 2000), alt: boundedText(data.alt, 'Alternative text', 2000), settings: parseImageGenerationSettings(data.settings), modelId: parseOpenRouterImageModel(data.modelId), createdAt: timestamp(data.createdAt) }
  if (data.acceptedAsset !== undefined) {
    result.acceptedAsset = parseChapterImageAsset(data.acceptedAsset)
    if (result.acceptedAsset.imageId !== result.imageId || result.acceptedAsset.callId !== result.callId || result.acceptedAsset.modelId !== result.modelId || result.acceptedAsset.previousVersionId !== result.expectedImageVersionId || !result.acceptedAsset.path.startsWith(result.outputDirectory + '/images/')) invalid()
  }
  if (status === 'complete' && !result.acceptedAsset || status === 'planned' && result.acceptedAsset || utf8Bytes(JSON.stringify(result)) > 256 * 1024) invalid()
  return result
}
function topicRequest(data: Record<string, unknown>): TopicContentIdentity { return { projectId: identifier(data.projectId), topicId: identifier(data.topicId) } }
export function parseGetTopicContent(value: unknown): TopicContentRequest {
  const data = strictRecord(value, ['projectId', 'topicId', 'sectionCursor', 'sectionLimit']), result: TopicContentRequest = topicRequest(data)
  if (data.sectionCursor !== undefined) result.sectionCursor = identifier(data.sectionCursor)
  if (data.sectionLimit !== undefined) result.sectionLimit = natural(data.sectionLimit, topicContentPolicy.readerSectionsPerPage, 1)
  return result
}
export function parseGenerateTopicContent(value: unknown): GenerateTopicContentRequest {
  const data = strictRecord(value, ['projectId', 'topicId', 'mode', 'replace', 'expectedRevisionId'])
  if (typeof data.replace !== 'boolean' || !data.replace && data.expectedRevisionId !== null || data.replace && data.expectedRevisionId === null) invalid()
  return { ...topicRequest(data), mode: choice(data.mode, ['illustrated', 'text-only']), replace: data.replace, expectedRevisionId: data.expectedRevisionId === null ? null : identifier(data.expectedRevisionId) }
}
export function parseTopicContentRunRequest(value: unknown): TopicContentRunRequest {
  const data = strictRecord(value, ['projectId', 'topicId', 'chapterId', 'runId', 'checkpointRevision'])
  return { ...topicRequest(data), chapterId: identifier(data.chapterId), runId: identifier(data.runId), checkpointRevision: natural(data.checkpointRevision, Number.MAX_SAFE_INTEGER, 1) }
}
export function parseRetryTopicContentSave(value: unknown): RetryTopicContentSaveRequest {
  const data = strictRecord(value, ['projectId', 'topicId', 'chapterId', 'runId', 'checkpointRevision', 'pendingResultId'])
  return { ...parseTopicContentRunRequest({ projectId: data.projectId, topicId: data.topicId, chapterId: data.chapterId, runId: data.runId, checkpointRevision: data.checkpointRevision }), pendingResultId: identifier(data.pendingResultId) }
}
export function parseCompleteTopicContentImages(value: unknown): CompleteTopicContentImagesRequest {
  const data = strictRecord(value, ['projectId', 'topicId', 'chapterId', 'revisionId'])
  return chapterIdentity(data)
}
export function parseRetryTopicContentImage(value: unknown): RetryTopicContentImageRequest {
  const data = strictRecord(value, ['projectId', 'topicId', 'chapterId', 'runId', 'checkpointRevision', 'imageId', 'priorCallId', 'acknowledgeUncertainCharge'])
  if (typeof data.acknowledgeUncertainCharge !== 'boolean') invalid()
  return { ...parseTopicContentRunRequest({ projectId: data.projectId, topicId: data.topicId, chapterId: data.chapterId, runId: data.runId, checkpointRevision: data.checkpointRevision }), imageId: identifier(data.imageId), priorCallId: identifier(data.priorCallId), acknowledgeUncertainCharge: data.acknowledgeUncertainCharge }
}
export const topicContentChannels = {
  state: 'topic-content:state', get: 'topic-content:get', generate: 'topic-content:generate', continue: 'topic-content:continue',
  discard: 'topic-content:discard', retrySave: 'topic-content:retry-save', completeImages: 'topic-content:complete-images', retryImage: 'topic-content:retry-image', changed: 'topic-content:changed',
  replacement: 'topic-content:image-replacement', acceptReplacement: 'topic-content:accept-image-replacement', discardReplacement: 'topic-content:discard-image-replacement', retryReplacementSave: 'topic-content:retry-image-replacement-save'
} as const
export type TopicChapterApi = TopicContentApi
export function parseGenerateTopicImageReplacement(value: unknown): GenerateTopicImageReplacementRequest {
  const data = strictRecord(value, ['projectId', 'topicId', 'chapterId', 'revisionId', 'imageId', 'expectedImageVersionId', 'prompt'])
  return { ...chapterIdentity(data), imageId: identifier(data.imageId), expectedImageVersionId: identifier(data.expectedImageVersionId), prompt: boundedText(data.prompt, 'Image prompt', openRouterPolicy.promptCharacters) }
}
export function parseTopicImageCandidateRequest(value: unknown): TopicImageCandidateRequest {
  const data = strictRecord(value, ['projectId', 'topicId', 'chapterId', 'revisionId', 'imageId', 'candidateId', 'expectedImageVersionId'])
  return { ...chapterIdentity(data), imageId: identifier(data.imageId), candidateId: identifier(data.candidateId), expectedImageVersionId: identifier(data.expectedImageVersionId) }
}
export function parseAcceptTopicImageReplacement(value: unknown): AcceptTopicImageReplacementRequest {
  const data = strictRecord(value, ['projectId', 'topicId', 'chapterId', 'revisionId', 'imageId', 'candidateId', 'expectedImageVersionId', 'caption', 'alt'])
  return { ...parseTopicImageCandidateRequest(Object.fromEntries(Object.entries(data).filter(([key]) => !['caption', 'alt'].includes(key)))), caption: boundedText(data.caption, 'Caption', 2000), alt: boundedText(data.alt, 'Alternative text', 2000) }
}
export function parseRetryTopicImageReplacementSave(value: unknown): RetryTopicImageReplacementSaveRequest {
  const data = strictRecord(value, ['projectId', 'topicId', 'chapterId', 'revisionId', 'imageId', 'candidateId', 'expectedImageVersionId', 'pendingResultId'])
  return { ...parseTopicImageCandidateRequest(Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'pendingResultId'))), pendingResultId: identifier(data.pendingResultId) }
}
