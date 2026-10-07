import type { ProjectDocument, SavedOutline } from '../../shared/workspace'
import type { ModelChoice } from '../../shared/account'
import type { OutlineLesson } from '../../shared/outline'
import type { ProjectFileEdit } from '../../shared/project-files'

export interface TopicFolderState { folder: string; device: number; inode: number; content: string | null }
/** Main-private authority preparation; projectHandle is profile identity, projectId is portable identity. */
export interface PreparedTopicContent {
  projectHandle: string; projectId: string; topicId: string; path: string; projectDigest: string;
  writable: boolean; brief: string; name: string; selectedModel: ModelChoice | null;
  outline: SavedOutline; topic: OutlineLesson; topicNumber: number; topicFolder: TopicFolderState | null
}
export interface TopicContentMutationLease {
  mutate<T>(topicId: string, action: (prepared: PreparedTopicContent) => Promise<T>): Promise<T>
  release(): void
}
export interface TopicUpdate { topicId: string; folder: TopicFolderState | null }
export interface ProjectChanges { edits: ProjectFileEdit[]; topic?: TopicUpdate }

export interface RegisteredProject {
  id: string; path: string; name: string; projectId: string | null; lastOpenedAt: string; hasOutline: boolean
}
export interface LoadedProject {
  document: ProjectDocument | null; digest: string | null; writable: boolean; sourceHint: 'empty' | 'files'
}
export interface ProjectStorage {
  canonicalPath(path: string): Promise<{ path: string; name: string }>
  load(path: string): Promise<LoadedProject>
  prepareTopicFolder(path: string, projectId: string, lesson: OutlineLesson, number: number, otherLessons: OutlineLesson[]): Promise<TopicFolderState | null>
  save(path: string, document: ProjectDocument, expectedDigest: string | null, changes?: ProjectChanges): Promise<LoadedProject>
}
export interface ProjectRegistry {
  read(): Promise<RegisteredProject[]>
  write(projects: RegisteredProject[]): Promise<void>
}
