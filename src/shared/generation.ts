import type { ApiResult, ErrorCode } from './contracts'
import type { SavedOutline } from './workspace'
import type { LearningOutline, MaterialCoverage } from './outline'
import { maximumBriefLength } from './workspace'
import { boundedText, identifier, strictRecord } from './validation'
import { ApplicationError } from './contracts'

export type GenerationStatus = 'preparing' | 'examining' | 'planning' | 'validating' | 'saving' | 'saved' | 'needs-details' | 'cancelled' | 'failed' | 'unsaved'
export type OutlineEngineResult = ({ kind: 'outline'; document: LearningOutline } | { kind: 'needs-details'; question: string; reason: string }) & { coverage?: MaterialCoverage }
export type EnginePhase = 'examining' | 'planning' | 'validating'
export interface OutlineRun {
  id: string; projectId: string; status: GenerationStatus; brief: string; modelId: string;
  message: string; errorCode: ErrorCode | null; result: SavedOutline | null; question: string | null; coverage: MaterialCoverage | null
}
export interface GenerationSnapshot { runs: OutlineRun[]; activeRunId: string | null }
export interface StartOutlineRequest { projectId: string; brief: string; modelId: string; replace: boolean }
export interface RewriteOutlineRequest { projectId: string; modelId: string; changes: string }
export interface RunRequest { projectId: string; runId: string }
export interface SaveOutlineRequest extends RunRequest { replaceChanged?: boolean }
export interface GenerationApi {
  getGeneration(): Promise<ApiResult<GenerationSnapshot>>
  createOutline(request: StartOutlineRequest): Promise<ApiResult<GenerationSnapshot>>
  rewriteOutline(request: RewriteOutlineRequest): Promise<ApiResult<GenerationSnapshot>>
  cancelOutline(request: RunRequest): Promise<ApiResult<GenerationSnapshot>>
  retryOutlineSave(request: SaveOutlineRequest): Promise<ApiResult<GenerationSnapshot>>
  onGenerationChanged(listener: (snapshot: GenerationSnapshot) => void): () => void
}
export const generationChannels = { get: 'outline:get', start: 'outline:start', rewrite: 'outline:rewrite', cancel: 'outline:cancel', save: 'outline:save', changed: 'outline:changed' } as const
export function parseRewriteOutline(value: unknown): RewriteOutlineRequest {
  const data = strictRecord(value, ['projectId', 'modelId', 'changes'])
  return { projectId: identifier(data.projectId), modelId: boundedText(data.modelId, 'Model', 128),
    changes: boundedText(data.changes, 'Outline changes', maximumBriefLength) }
}
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
export function parseSaveOutline(value: unknown): SaveOutlineRequest {
  const data = strictRecord(value, ['projectId', 'runId', 'replaceChanged'])
  if (data.replaceChanged !== undefined && typeof data.replaceChanged !== 'boolean') throw new ApplicationError('INVALID_INPUT', 'Choose whether to replace changed project content.')
  return { projectId: identifier(data.projectId), runId: identifier(data.runId), replaceChanged: data.replaceChanged === true }
}
export function runIsBusy(run: OutlineRun | null | undefined): boolean {
  return Boolean(run && ['preparing', 'examining', 'planning', 'validating', 'saving'].includes(run.status))
}
