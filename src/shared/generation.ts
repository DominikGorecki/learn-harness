import type { ApiResult, ErrorCode } from './contracts'
import type { SavedOutline } from './workspace'
import type { LearningOutline } from './outline'
import { maximumBriefLength } from './workspace'
import { boundedText, identifier, strictRecord } from './validation'
import { ApplicationError } from './contracts'

export type GenerationStatus = 'preparing' | 'planning' | 'validating' | 'saving' | 'saved' | 'needs-details' | 'cancelled' | 'failed' | 'unsaved'
export type OutlineEngineResult = { kind: 'outline'; document: LearningOutline } | { kind: 'needs-details'; question: string; reason: string }
export type EnginePhase = 'planning' | 'validating'
export interface OutlineRun {
  id: string; projectId: string; status: GenerationStatus; brief: string; modelId: string;
  message: string; errorCode: ErrorCode | null; result: SavedOutline | null; question: string | null
}
export interface GenerationSnapshot { runs: OutlineRun[]; activeRunId: string | null }
export interface StartOutlineRequest { projectId: string; brief: string; modelId: string; replace: boolean }
export interface RunRequest { projectId: string; runId: string }
export interface GenerationApi {
  getGeneration(): Promise<ApiResult<GenerationSnapshot>>
  createOutline(request: StartOutlineRequest): Promise<ApiResult<GenerationSnapshot>>
  cancelOutline(request: RunRequest): Promise<ApiResult<GenerationSnapshot>>
  retryOutlineSave(request: RunRequest): Promise<ApiResult<GenerationSnapshot>>
  onGenerationChanged(listener: (snapshot: GenerationSnapshot) => void): () => void
}
export const generationChannels = { get: 'outline:get', start: 'outline:start', cancel: 'outline:cancel', save: 'outline:save', changed: 'outline:changed' } as const
export function parseStartOutline(value: unknown): StartOutlineRequest {
  const data = strictRecord(value, ['projectId', 'brief', 'modelId', 'replace'])
  if (typeof data.replace !== 'boolean') throw new ApplicationError('INVALID_INPUT', 'Choose whether to replace the saved outline.')
  return { projectId: identifier(data.projectId), brief: boundedText(data.brief, 'Learning details', maximumBriefLength, true),
    modelId: boundedText(data.modelId, 'Model', 128), replace: data.replace }
}
export function parseRunRequest(value: unknown): RunRequest {
  const data = strictRecord(value, ['projectId', 'runId'])
  return { projectId: identifier(data.projectId), runId: identifier(data.runId) }
}
export function runIsBusy(run: OutlineRun | null | undefined): boolean {
  return Boolean(run && ['preparing', 'planning', 'validating', 'saving'].includes(run.status))
}
