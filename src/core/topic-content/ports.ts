import type { AiLease } from '../ai/coordinator'
import type { LearningOutline, OutlineLesson } from '../../shared/outline'
import type { ChapterBaseline, ChapterManifest, TopicContentCheckpoint, TopicContentIdentity, TopicImageCandidate } from '../../shared/topic-content'
import type { OpenRouterCallIntent, OpenRouterCallTransition, OpenRouterImageModelId, OpenRouterSettings } from '../../shared/openrouter'

/** Main resolves registry handle -> portable identity, owned root and authoritative learning context. */
export interface TopicContentContext {
  handle: string; identity: TopicContentIdentity; brief: string; outline: LearningOutline; topic: OutlineLesson;
  baseline: ChapterBaseline; textModelId: string; imageModelId: OpenRouterImageModelId | null
}
/** Storage serializes all project mutations and independently validates baselines/locality. */
export interface TopicContentRepository {
  resolve(handle: string, topicId: string): Promise<TopicContentContext>
  load(context: TopicContentContext): Promise<ChapterManifest | null>
  loadCheckpoint(context: TopicContentContext, runId: string): Promise<TopicContentCheckpoint | null>
  saveCheckpoint(context: TopicContentContext, checkpoint: TopicContentCheckpoint): Promise<void>
  publish(context: TopicContentContext, manifest: ChapterManifest): Promise<void>
  saveCandidate(context: TopicContentContext, candidate: TopicImageCandidate): Promise<void>
  discardProgress(context: TopicContentContext, runId: string, checkpointRevision: number): Promise<void>
}
export interface TopicContentEngine {
  /** Execute under the existing lease; child images never claim a second lease. */
  execute(context: TopicContentContext, checkpoint: TopicContentCheckpoint | null, lease: AiLease,
    onCheckpoint: (checkpoint: TopicContentCheckpoint) => Promise<void>): Promise<TopicContentCheckpoint>
}
export interface OpenRouterProviderPort {
  getSettings(): OpenRouterSettings
  /** Persistence precedes dispatch; cancelled/unowned/over-budget intents must be denied. */
  recordIntent(intent: OpenRouterCallIntent, signal: AbortSignal): Promise<void>
  recordTransition(transition: OpenRouterCallTransition): Promise<void>
}
