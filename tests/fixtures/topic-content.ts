import { mkdir, mkdtemp, realpath } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { ProjectDocument } from '../../src/shared/workspace'
import type { ChapterManifest, ChapterPlan, TopicContentCheckpoint } from '../../src/shared/topic-content'
import { WorkspaceService } from '../../src/core/workspace/service'
import { createProjectStorage } from '../../src/main/storage/project-storage'
import { createProjectRegistry } from '../../src/main/storage/project-registry'
import { createTopicContentStorage } from '../../src/main/storage/topic-content'
import type { TopicContentAuthority, TopicContentStorage } from '../../src/main/storage/topic-content'
import { contentDigest } from '../../src/main/storage/topic-content-files'
import { learningOutline } from './learning-outline'

export const topicContentTimestamp = '2026-10-07T14:00:00.000Z'
export const topicPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Y5S8AAAAASUVORK5CYII=', 'base64')
export async function topicContentProject(registerRoot: (root: string) => void, identity: { projectId: string; name: string } = { projectId: 'portable-project', name: 'Bayesian reasoning' }) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'edu-content-'))); registerRoot(root)
  const path = join(root, 'project'); await mkdir(path)
  const projectStorage = createProjectStorage()
  const document: ProjectDocument = { version: 1, projectId: identity.projectId, revision: 1, name: identity.name, createdAt: topicContentTimestamp, updatedAt: topicContentTimestamp,
    selectedModel: { id: 'offline-model', name: 'Offline model' }, brief: 'Learn Bayesian reasoning',
    outline: { generatedAt: topicContentTimestamp, model: { id: 'offline-model', name: 'Offline model' }, brief: 'Learn Bayesian reasoning', inferredBrief: null, document: learningOutline(), coverage: { files: [], limitations: [] } } }
  await projectStorage.save(path, document, null)
  let id = 0
  const workspace = new WorkspaceService({ storage: projectStorage, registry: createProjectRegistry(join(root, 'profile')), models: () => [], createId: () => `handle-${++id}`, now: () => topicContentTimestamp })
  await workspace.initialize()
  const handle = (await workspace.open(path)).activeProject!.id
  const storage = createTopicContentStorage({ projectStorage })
  const authority = await storage.prepare(await workspace.readTopicContent(handle, 'beliefs'))
  return { root, path, handle, document, workspace, projectStorage, storage, authority }
}
export function contentPlan(authority: TopicContentAuthority, illustrated = false): ChapterPlan {
  return { projectId: authority.prepared.projectId, topicId: authority.prepared.topicId, chapterId: 'chapter', title: 'Reasoning about priors', centralQuestion: authority.prepared.topic.question,
    objectives: authority.prepared.topic.objectives, sections: authority.prepared.topic.objectives.map((_, index) => ({ id: `section-${index}`, title: `Section ${index + 1}`, purpose: 'Explain and apply the objective', objectiveIndices: [index] })),
    images: illustrated ? [{ id: 'illustration', sectionId: 'section-0', placement: 'after', purpose: 'Explain a prior distribution', prompt: 'Draw a clear comparison of starting beliefs', caption: 'Compare starting beliefs', alt: 'Two people begin with different priors', factualConstraints: ['A prior is not a certainty'], skillVersion: 'v1', settings: { n: 1, aspectRatio: '1:1' } }] : [] }
}
export async function contentManifest(storage: TopicContentStorage, authority: TopicContentAuthority, revisionId = 'revision-1', illustrated = false): Promise<ChapterManifest> {
  const plan = contentPlan(authority, illustrated), previous = (await storage.read(authority)).manifest
  const asset = illustrated ? { imageId: 'illustration', versionId: revisionId, path: `${authority.folderName}/content/chapter/${revisionId}/images/illustration-${revisionId}.png`, mime: 'image/png' as const, width: 1, height: 1,
    bytes: topicPng.byteLength, digest: contentDigest(topicPng), createdAt: topicContentTimestamp, modelId: 'openai/gpt-image-2' as const, returnedModelId: null, callId: `call-${revisionId}`, previousVersionId: null } : null
  if (asset) await storage.stageAsset(authority, plan, revisionId, asset, topicPng)
  return { schemaVersion: 1, projectId: authority.prepared.projectId, topicId: authority.prepared.topicId, chapterId: 'chapter', revisionId, outputDirectory: `${authority.folderName}/content/chapter/${revisionId}`,
    status: illustrated ? 'illustrated' : 'text-only', plan, document: { introduction: 'A prior describes what we believe before a new clue.', sections: plan.sections.map(section => ({ id: section.id, markdown: 'The explanation connects assumptions to a prior.', examples: ['A weather forecast uses past observations.'], misconceptions: ['A prior is not a claim of certainty.'] })), synthesis: 'Make assumptions visible before updating beliefs.', sourceNotes: ['Uses project context and model knowledge; no web verification.'] },
    images: asset ? [{ imageId: asset.imageId, status: 'complete', callId: asset.callId, asset }] : [], baseline: await storage.captureBaseline(authority),
    provenance: { runId: 'run', textModelId: 'offline-model', imageModelId: illustrated ? 'openai/gpt-image-2' : null, createdAt: topicContentTimestamp }, previousRevisionIds: previous ? [...previous.previousRevisionIds, previous.revisionId] : [] }
}
export async function contentCheckpoint(storage: TopicContentStorage, authority: TopicContentAuthority, revisionId = 'candidate-1'): Promise<TopicContentCheckpoint> {
  const plan = contentPlan(authority, true)
  return { schemaVersion: 1, projectId: authority.prepared.projectId, topicId: authority.prepared.topicId, chapterId: 'chapter', revisionId, runId: 'run', checkpointRevision: 1, mode: 'illustrated', status: 'paused', outputDirectory: `${authority.folderName}/content/chapter/${revisionId}`,
    plan, sections: [{ id: 'section-0', markdown: 'A valid partial section.', examples: ['A clear example.'], misconceptions: [] }], introduction: 'Beginning the chapter.', synthesis: null, sourceNotes: [],
    images: [{ imageId: 'illustration', status: 'unresolved', callId: 'paid-intent', asset: null }], baseline: await storage.captureBaseline(authority),
    provenance: { runId: 'run', textModelId: 'offline-model', imageModelId: 'openai/gpt-image-2', createdAt: topicContentTimestamp }, textTurns: 48, imageRequests: 1, activationTextTurns: 48, activationImageRequests: 1, updatedAt: topicContentTimestamp }
}
