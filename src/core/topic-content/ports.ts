import type { AiLease } from '../ai/coordinator'
import type { LearningOutline, OutlineLesson } from '../../shared/outline'
import type { ChapterBaseline, ChapterManifest, ChapterPlan, ChapterSection, ChapterSource, ChapterImageAsset, TopicContentCheckpoint, TopicContentIdentity, TopicImageCandidate, TopicImageReplacementAttempt, RetryTopicContentImageRequest } from '../../shared/topic-content'
import type { OpenRouterCallIntent, OpenRouterCallTransition, OpenRouterImageModelId, OpenRouterSettings } from '../../shared/openrouter'

/** Main resolves registry handle -> portable identity, owned root and authoritative learning context. */
export interface TopicContentContext {
  handle: string; identity: TopicContentIdentity; brief: string; outline: LearningOutline; topic: OutlineLesson;
  baseline: ChapterBaseline; textModelId: string; imageModelId: OpenRouterImageModelId | null; writable: boolean; topicFolder: string;
  imageSettings?: import('../../shared/openrouter').ImageGenerationSettings
}
/** Storage serializes all project mutations and independently validates baselines/locality. */
export interface TopicContentRepository {
  resolve(handle: string, topicId: string): Promise<TopicContentContext>
  load(context: TopicContentContext): Promise<ChapterManifest | null>
  loadCheckpoint(context: TopicContentContext, runId: string): Promise<TopicContentCheckpoint | null>
  saveCheckpoint(context: TopicContentContext, checkpoint: TopicContentCheckpoint): Promise<void>
  publish(context: TopicContentContext, manifest: ChapterManifest): Promise<void>
  saveCandidate(context: TopicContentContext, candidate: TopicImageCandidate): Promise<void>
  loadCandidate(context: TopicContentContext, candidateId: string): Promise<TopicImageCandidate | null>
  loadReplacementAttempt(context: TopicContentContext, candidateId: string): Promise<TopicImageReplacementAttempt | null>
  saveReplacementAttempt(context: TopicContentContext, attempt: TopicImageReplacementAttempt): Promise<void>
  archiveReplacement(context: TopicContentContext, candidateId: string): Promise<void>
  discardReplacement(context: TopicContentContext, candidateId: string): Promise<void>
  discardProgress(context: TopicContentContext, runId: string, checkpointRevision: number): Promise<void>
  lock(context: TopicContentContext): () => void
  recordSources(context: TopicContentContext, evidence: readonly ChapterSource[]): Promise<void>
  stageAsset(context: TopicContentContext, plan: ChapterPlan, revisionId: string, asset: ChapterImageAsset, bytes: Uint8Array): Promise<void>
  copyAcceptedImages(context: TopicContentContext, plan: ChapterPlan, revisionId: string): Promise<ChapterImageAsset[]>
  retryImage(context: TopicContentContext, checkpoint: TopicContentCheckpoint, request: RetryTopicContentImageRequest): Promise<void>
  readState(context: TopicContentContext): Promise<{ manifest: ChapterManifest | null; stale: boolean; missingImageIds: string[]; issues: string[]; recovery: { kind: 'none' | 'committed' } | { kind: 'pending'; manifest: ChapterManifest } | { kind: 'conflict'; message: string } }>
  progressIds(context: TopicContentContext, kind: 'runs' | 'candidates' | 'image-attempts'): Promise<string[]>
  retryPublication(context: TopicContentContext): Promise<void>
  recover(context: TopicContentContext): Promise<unknown>
  discardPublication(context: TopicContentContext, runId: string, revisionId: string): Promise<void>
}
export interface ReplacementImageSession {
  modelId: OpenRouterImageModelId; settings: import('../../shared/openrouter').ImageGenerationSettings
  generate(context: TopicContentContext, attempt: TopicImageReplacementAttempt, lease: AiLease,
    requested: (callId: string) => Promise<void>, accepted: (asset: ChapterImageAsset, bytes: Uint8Array) => Promise<void>,
    progress: (state: 'waiting' | 'receiving' | 'validating') => void): Promise<void>
  dispose(): void
}
export interface ChapterImageSession {
  modelId: OpenRouterImageModelId; settings: import('../../shared/openrouter').ImageGenerationSettings
  generate(context: TopicContentContext, checkpoint: TopicContentCheckpoint, imageId: string, lease: AiLease,
    requested: (callId: string) => Promise<void>, accepted: (asset: ChapterImageAsset, bytes: Uint8Array) => Promise<void>,
    progress: (state: 'waiting' | 'receiving' | 'validating') => void): Promise<void>
  dispose(): void
}
export type ChapterSubmission = { kind: 'turn' } | { kind: 'sources'; sources: ChapterSource[] } |
  { kind: 'plan'; plan: ChapterPlan } | { kind: 'section'; section: ChapterSection } |
  { kind: 'summary'; introduction: string; synthesis: string; sourceNotes: string[] } | { kind: 'image'; imageId: string }
export interface TopicContentEngine {
  /** Execute under the existing lease; child images never claim a second lease. */
  execute(context: TopicContentContext, checkpoint: TopicContentCheckpoint | null, chapterId: string, lease: AiLease,
    accept: (submission: ChapterSubmission) => Promise<TopicContentCheckpoint | null>): Promise<{ paused: boolean }>
}
export interface OpenRouterProviderPort {
  getSettings(): OpenRouterSettings
  /** Persistence precedes dispatch; cancelled/unowned/over-budget intents must be denied. */
  recordIntent(intent: OpenRouterCallIntent, signal: AbortSignal): Promise<void>
  recordTransition(transition: OpenRouterCallTransition): Promise<void>
}
