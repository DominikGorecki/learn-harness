import { ApplicationError } from '../../shared/contracts'
import { boundedText, identifier, strictRecord, textList } from '../../shared/validation'
import { parseOutline } from '../../shared/outline'
import type { LearningOutline } from '../../shared/outline'
import { parseChapterPlan, parseChapterSection, parseContentDigest, contentRelativePath, parseTopicContentCheckpoint } from '../../shared/topic-content'
import type { TopicContentCheckpoint } from '../../shared/topic-content'
import { parseImageGenerationSettings } from '../../shared/openrouter'
import type { ImageGenerationSettings } from '../../shared/openrouter'
import type { ChapterSubmission } from '../../core/topic-content/ports'

export interface ChapterWorkerInput {
  model: { id: string; name: string }; accessToken: string; baseUrl: string; path: string; brief: string;
  outline: LearningOutline; topicId: string; projectId: string; chapterId: string;
  checkpoint: TopicContentCheckpoint | null; settings: ImageGenerationSettings | null
  excludedSourcePaths: string[]
}
export interface ChapterWorkerResult { kind: 'chapter'; paused: boolean }
export function parseChapterWorkerInput(value: unknown): ChapterWorkerInput {
  const data = strictRecord(value, ['model', 'accessToken', 'baseUrl', 'path', 'brief', 'outline', 'topicId', 'projectId', 'chapterId', 'checkpoint', 'settings', 'excludedSourcePaths'])
  const model = strictRecord(data.model, ['id', 'name'])
  const result = { model: { id: boundedText(model.id, 'Model', 128), name: boundedText(model.name, 'Model name', 240) },
    accessToken: boundedText(data.accessToken, 'Authorization', 32_000), baseUrl: boundedText(data.baseUrl, 'Destination', 2048),
    path: boundedText(data.path, 'Project location', 32_000), brief: boundedText(data.brief, 'Learning details', 32_000, true),
    outline: parseOutline(data.outline), topicId: identifier(data.topicId), projectId: identifier(data.projectId), chapterId: identifier(data.chapterId),
    checkpoint: data.checkpoint === null ? null : parseTopicContentCheckpoint(data.checkpoint), settings: data.settings === null ? null : parseImageGenerationSettings(data.settings), excludedSourcePaths: textList(data.excludedSourcePaths, 'Excluded sources', 1000, 2048).map(contentRelativePath) }
  if (!result.outline.lessons.some(topic => topic.id === result.topicId) || result.checkpoint && (result.checkpoint.projectId !== result.projectId || result.checkpoint.topicId !== result.topicId || result.checkpoint.chapterId !== result.chapterId)) throw new ApplicationError('INVALID_INPUT', 'Invalid chapter authority.')
  return result
}
export function parseChapterSubmission(value: unknown): ChapterSubmission {
  const data = strictRecord(value, ['kind', 'sources', 'plan', 'section', 'introduction', 'synthesis', 'sourceNotes', 'imageId'])
  switch (data.kind) {
    case 'turn': strictRecord(value, ['kind']); return { kind: 'turn' }
    case 'sources': {
      strictRecord(value, ['kind', 'sources'])
      if (!Array.isArray(data.sources) || data.sources.length > 100) break
      return { kind: 'sources', sources: data.sources.map(value => { const source = strictRecord(value, ['path', 'digest']); return { path: contentRelativePath(source.path), digest: parseContentDigest(source.digest) } }) }
    }
    case 'plan': strictRecord(value, ['kind', 'plan']); return { kind: 'plan', plan: parseChapterPlan(data.plan) }
    case 'section': strictRecord(value, ['kind', 'section']); return { kind: 'section', section: parseChapterSection(data.section) }
    case 'image': strictRecord(value, ['kind', 'imageId']); return { kind: 'image', imageId: identifier(data.imageId) }
    case 'summary': strictRecord(value, ['kind', 'introduction', 'synthesis', 'sourceNotes']); return { kind: 'summary', introduction: boundedText(data.introduction, 'Introduction', 256 * 1024), synthesis: boundedText(data.synthesis, 'Synthesis', 256 * 1024), sourceNotes: textList(data.sourceNotes, 'Source notes', 40, 2000, 1) }
  }
  throw new ApplicationError('INVALID_INPUT', 'Invalid chapter submission.')
}
