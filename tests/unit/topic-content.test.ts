import { describe, expect, it } from 'vitest'
import {
  contentRelativePath, parseChapterDocument, parseChapterImageAsset, parseChapterManifest, parseChapterPlan,
  parseGenerateTopicContent, parseGenerateTopicImageReplacement, parseGetTopicContent, parseTopicContentCheckpoint,
  parseTopicContentRunRequest, parseTopicContentSnapshot, parseTopicImageCandidate, topicContentPolicy
} from '../../src/shared/topic-content'
import type { ChapterImageAsset, ChapterManifest, ChapterPlan, TopicContentCheckpoint } from '../../src/shared/topic-content'

const digest = 'a'.repeat(64), createdAt = '2026-10-07T14:00:00.000Z'
const identity = { projectId: 'portable-project', topicId: 'topic', chapterId: 'chapter', revisionId: 'revision' }
const plan: ChapterPlan = { projectId: identity.projectId, topicId: identity.topicId, chapterId: identity.chapterId, title: 'Inflation', centralQuestion: 'Why do prices change?', objectives: ['Explain prices', 'Compare policies'],
  sections: [{ id: 'prices', title: 'Prices', purpose: 'Explain the mechanism', objectiveIndices: [0] }, { id: 'policy', title: 'Policy', purpose: 'Compare responses', objectiveIndices: [1] }],
  images: [{ id: 'diagram', sectionId: 'prices', placement: 'after', purpose: 'Explain feedback', prompt: 'Draw a clear causal diagram', caption: 'Causal feedback', alt: 'Prices and demand affect each other', factualConstraints: ['Avoid implying every price rises equally'], skillVersion: 'v1', settings: { n: 1, aspectRatio: '3:2' } }] }
const section = { id: 'prices', markdown: '# Prices\nDemand and supply interact.', examples: ['An example of changing demand.'], misconceptions: [] }
const asset: ChapterImageAsset = { imageId: 'diagram', versionId: 'v1', path: 'topic/content/chapter/revision/images/diagram-v1.png', mime: 'image/png', width: 1024, height: 1024,
  bytes: 5000, digest, createdAt, modelId: 'openai/gpt-image-2', returnedModelId: null, callId: 'call', previousVersionId: null }
const baseline = { topicDigest: digest, learningContextDigest: digest, sources: [{ path: 'notes.md', digest }], expectedManifestDigest: null }
const provenance = { runId: 'run', textModelId: 'gpt-6.1-sol', imageModelId: 'openai/gpt-image-2' as const, createdAt }
const manifest: ChapterManifest = { schemaVersion: 1, ...identity, outputDirectory: 'topic/content/chapter/revision', status: 'illustrated', plan,
  document: { introduction: 'How prices work.', sections: [section, { ...section, id: 'policy' }], synthesis: 'Consider both mechanisms.', sourceNotes: ['Based on notes.md and model knowledge.'] },
  images: [{ imageId: 'diagram', status: 'complete', callId: 'call', asset }], baseline, provenance, previousRevisionIds: [] }
const checkpoint: TopicContentCheckpoint = { schemaVersion: 1, ...identity, runId: 'run', checkpointRevision: 1, mode: 'illustrated', status: 'paused', outputDirectory: manifest.outputDirectory,
  plan, sections: [section], introduction: 'How prices work.', synthesis: null, sourceNotes: [], images: [{ imageId: 'diagram', status: 'unresolved', callId: 'call', asset: null }], baseline, provenance,
  textTurns: 48, imageRequests: 1, activationTextTurns: 48, activationImageRequests: 1, updatedAt: createdAt }

describe('portable chapter contract boundaries', () => {
  it('requires exact saved objective identity and complete coverage without truncation', () => {
    expect(parseChapterPlan(plan, { projectId: identity.projectId, topicId: identity.topicId, objectives: plan.objectives })).toEqual(plan)
    for (const patch of [{ objectives: ['Replacement objective'] }, { topicId: 'other' }, { sections: [plan.sections[0]] }, { sections: [{ ...plan.sections[0], objectiveIndices: [0, 2] }] }, { sections: Array(25).fill(plan.sections[0]) }, { images: [{ ...plan.images[0], sectionId: 'missing' }] }]) {
      expect(() => parseChapterPlan({ ...plan, ...patch }, { projectId: identity.projectId, topicId: identity.topicId, objectives: plan.objectives })).toThrow()
    }
  })
  it('accepts only complete ordered sections for publication while keeping partial checkpoints', () => {
    expect(parseChapterManifest(manifest)).toEqual(manifest)
    expect(parseTopicContentCheckpoint(checkpoint)).toEqual(checkpoint)
    expect(() => parseChapterDocument({ ...manifest.document, sections: [section] }, plan)).toThrow()
    expect(() => parseChapterDocument({ ...manifest.document, sections: [...manifest.document.sections].reverse() }, plan)).toThrow()
    expect(() => parseChapterManifest({ ...manifest, topicId: 'other' })).toThrow()
    expect(() => parseChapterManifest({ ...manifest, status: 'illustrated', images: [{ ...checkpoint.images[0] }] })).toThrow()
    expect(parseChapterManifest({ ...manifest, status: 'needs-images', images: checkpoint.images }).status).toBe('needs-images')
  })
  it('binds assets to chapter, slot, version, dimensions and media budgets', () => {
    for (const patch of [{ imageId: 'other' }, { path: 'topic/content/other/revision/images/diagram-v1.png' }, { mime: 'image/svg+xml' }, { path: 'topic/content/chapter/revision/images/diagram-v1.jpg' }, { width: 5000, height: 5000 }, { bytes: topicContentPolicy.imageBytes + 1 }]) {
      expect(() => parseChapterManifest({ ...manifest, images: [{ ...manifest.images[0], asset: { ...asset, ...patch } }] })).toThrow()
    }
    expect(parseChapterManifest({ ...manifest, revisionId: 'new', outputDirectory: 'topic/content/chapter/new', previousRevisionIds: ['revision'] }).images[0]!.asset).toEqual(asset)
    expect(() => parseChapterManifest({ ...manifest, revisionId: 'new', outputDirectory: 'topic/content/chapter/new' })).toThrow()
    expect(() => parseChapterImageAsset({ ...asset, digest: 'not-a-digest' })).toThrow()
  })
  it('preserves unresolved paid intents and separates activation budgets from lifetime counts', () => {
    expect(parseTopicContentCheckpoint({ ...checkpoint, textTurns: 96, activationTextTurns: 0 }).images[0]!.status).toBe('unresolved')
    for (const patch of [{ activationTextTurns: 49 }, { imageRequests: 0 }, { images: [{ ...checkpoint.images[0], callId: null }] }, { sections: [{ ...section, id: 'other' }] }, { token: 'private' }]) expect(() => parseTopicContentCheckpoint({ ...checkpoint, ...patch })).toThrow()
  })
  it('rejects traversal, aliases, OS device names and owned application state', () => {
    for (const path of ['../notes.md', 'C:/notes.md', 'topic\\notes.md', 'topic//notes.md', 'topic/%2e%2e/notes.md', 'topic/.edu/topic.json', 'topic/.git/config', 'topic/CON.txt', 'topic/notes.']) expect(() => contentRelativePath(path)).toThrow()
    expect(contentRelativePath('topic/notes.md')).toBe('topic/notes.md')
  })
  it('bounds Unicode text and rejects hidden privileged fields at each nested level', () => {
    expect(() => parseChapterDocument({ ...manifest.document, introduction: '😀'.repeat(topicContentPolicy.sectionBytes) }, plan)).toThrow()
    for (const value of [{ ...plan, baseUrl: 'https://evil.test' }, { ...plan, images: [{ ...plan.images[0], prompt: 'x'.repeat(16_001) }] }, { ...plan, images: [{ ...plan.images[0], settings: { n: 2, aspectRatio: '1:1' } }] }]) expect(() => parseChapterPlan(value)).toThrow()
  })
  it('requires a separate candidate revision and exact original image version', () => {
    const candidate = { schemaVersion: 1, ...identity, revisionId: 'replacement', candidateId: 'candidate', imageId: 'diagram', expectedRevisionId: 'revision', expectedImageVersionId: 'v1', expectedManifestDigest: digest,
      prompt: 'Show feedback more clearly', caption: 'Feedback', alt: 'Two linked feedback loops', asset: { ...asset, versionId: 'v2', previousVersionId: 'v1', path: 'topic/content/chapter/replacement/images/diagram-v2.png' }, createdAt }
    expect(parseTopicImageCandidate(candidate)).toEqual(candidate)
    expect(() => parseTopicImageCandidate({ ...candidate, expectedImageVersionId: 'changed' })).toThrow()
    expect(() => parseTopicImageCandidate({ ...candidate, imageId: 'other' })).toThrow()
  })
  it('strictly bounds named capabilities without caller-supplied paths, models or endpoints', () => {
    expect(parseGenerateTopicContent({ projectId: 'handle', topicId: 'topic', mode: 'text-only', replace: false, expectedRevisionId: null }).mode).toBe('text-only')
    expect(parseTopicContentRunRequest({ projectId: 'handle', topicId: 'topic', chapterId: 'chapter', runId: 'run', checkpointRevision: 1 }).chapterId).toBe('chapter')
    for (const patch of [{ replace: true }, { mode: 'speech' }, { modelId: 'other' }, { expectedRevisionId: '../rev' }]) expect(() => parseGenerateTopicContent({ projectId: 'handle', topicId: 'topic', mode: 'illustrated', replace: false, expectedRevisionId: null, ...patch })).toThrow()
    expect(() => parseGetTopicContent({ projectId: 'handle', topicId: 'topic', sectionLimit: 5 })).toThrow()
    expect(() => parseGenerateTopicImageReplacement({ ...identity, imageId: 'diagram', expectedImageVersionId: 'v1', prompt: 'x', path: 'arbitrary' })).toThrow()
  })
  it('loads progress without a chapter and bounds safe state projections', () => {
    const snapshot = { revision: 1, projectId: 'handle', topicId: 'topic', published: null, progress: { chapterId: 'chapter', runId: 'run', checkpointRevision: 1, status: 'paused', mode: 'illustrated', completedSectionIds: ['prices'], pendingImageIds: ['diagram'], unresolvedImageIds: ['diagram'] }, candidate: null, stale: false, missingImageIds: [], errorCode: null, message: null }
    expect(parseTopicContentSnapshot(snapshot)).toEqual(snapshot)
    expect(() => parseTopicContentSnapshot({ ...snapshot, progress: { ...snapshot.progress, pendingImageIds: [] } })).toThrow()
    expect(() => parseTopicContentSnapshot({ ...snapshot, credential: 'secret' })).toThrow()
  })
})
