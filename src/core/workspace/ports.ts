import type { ProjectDocument } from '../../shared/workspace'
import type { OutlineLesson } from '../../shared/outline'
import type { ProjectFileEdit } from '../../shared/project-files'

export interface TopicFolderState { folder: string; device: number; inode: number; content: string | null }
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
