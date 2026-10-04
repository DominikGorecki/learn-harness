import { ApplicationError } from './contracts'
import type { ApiResult } from './contracts'
import type { ModelChoice } from './account'
import { parseCoverage, parseOutline } from './outline'
import type { LearningOutline, MaterialCoverage } from './outline'
import { boundedText, identifier, strictRecord, timestamp } from './validation'

export const maximumBriefLength = 32_000
export interface SavedOutline { generatedAt: string; model: ModelChoice; brief: string; document: LearningOutline; coverage: MaterialCoverage }
export interface ProjectDocument {
  version: 1; projectId: string; revision: number; name: string; createdAt: string; updatedAt: string;
  selectedModel: ModelChoice | null; brief: string; outline: SavedOutline | null
}
export type ProjectAvailability = 'available' | 'missing' | 'unreadable'
export interface ProjectSummary {
  id: string; name: string; folderPath: string; lastOpenedAt: string; availability: ProjectAvailability; hasOutline: boolean
}
export interface ProjectSnapshot extends ProjectSummary {
  projectId: string | null; writable: boolean; issue: string | null; sourceHint: 'empty' | 'files' | 'unavailable';
  selectedModel: ModelChoice | null; brief: string; outline: SavedOutline | null; revision: number
}
export interface WorkspaceSnapshot { projects: ProjectSummary[]; activeProject: ProjectSnapshot | null; issue: string | null }
export interface ProjectRequest { projectId: string }
export interface ModelRequest extends ProjectRequest { modelId: string }
export interface BriefRequest extends ProjectRequest { brief: string }
export interface WorkspaceApi {
  getWorkspace(): Promise<ApiResult<WorkspaceSnapshot>>
  openProject(): Promise<ApiResult<WorkspaceSnapshot>>
  selectProject(request: ProjectRequest): Promise<ApiResult<WorkspaceSnapshot>>
  locateProject(request: ProjectRequest): Promise<ApiResult<WorkspaceSnapshot>>
  showDashboard(): Promise<ApiResult<WorkspaceSnapshot>>
  setProjectModel(request: ModelRequest): Promise<ApiResult<WorkspaceSnapshot>>
  saveProjectBrief(request: BriefRequest): Promise<ApiResult<WorkspaceSnapshot>>
  onWorkspaceChanged(listener: (snapshot: WorkspaceSnapshot) => void): () => void
}
export const workspaceChannels = {
  get: 'workspace:get', open: 'workspace:open', select: 'workspace:select', locate: 'workspace:locate',
  dashboard: 'workspace:dashboard', model: 'workspace:model', brief: 'workspace:brief', changed: 'workspace:changed'
} as const

export function parseProjectRequest(value: unknown): ProjectRequest {
  const data = strictRecord(value, ['projectId'])
  return { projectId: identifier(data.projectId) }
}
export function parseModelRequest(value: unknown): ModelRequest {
  const data = strictRecord(value, ['projectId', 'modelId'])
  return { projectId: identifier(data.projectId), modelId: boundedText(data.modelId, 'Model', 128) }
}
export function parseBriefRequest(value: unknown): BriefRequest {
  const data = strictRecord(value, ['projectId', 'brief'])
  return { projectId: identifier(data.projectId), brief: boundedText(data.brief, 'Learning details', maximumBriefLength, true) }
}
export function parseModelChoice(value: unknown): ModelChoice {
  const data = strictRecord(value, ['id', 'name'])
  return { id: boundedText(data.id, 'Model identifier', 128), name: boundedText(data.name, 'Model name', 160) }
}
export function parseSavedOutline(value: unknown): SavedOutline {
  const data = strictRecord(value, ['generatedAt', 'model', 'brief', 'document', 'coverage'])
  return { generatedAt: timestamp(data.generatedAt), model: parseModelChoice(data.model), brief: boundedText(data.brief, 'Learning details', maximumBriefLength, true),
    document: parseOutline(data.document), coverage: parseCoverage(data.coverage) }
}
export function parseProjectDocument(value: unknown): ProjectDocument {
  const data = strictRecord(value, ['version', 'projectId', 'revision', 'name', 'createdAt', 'updatedAt', 'selectedModel', 'brief', 'outline'])
  if (data.version !== 1) throw new ApplicationError('UNAVAILABLE', 'This project was saved in a different format. Its files have been preserved.')
  if (!Number.isSafeInteger(data.revision) || (data.revision as number) < 1) throw new ApplicationError('INVALID_INPUT', 'The saved project revision is invalid.')
  return { version: 1, projectId: identifier(data.projectId), revision: data.revision as number, name: boundedText(data.name, 'Project name', 240),
    createdAt: timestamp(data.createdAt), updatedAt: timestamp(data.updatedAt), selectedModel: data.selectedModel === null ? null : parseModelChoice(data.selectedModel),
    brief: boundedText(data.brief, 'Learning details', maximumBriefLength, true), outline: data.outline === null ? null : parseSavedOutline(data.outline) }
}
