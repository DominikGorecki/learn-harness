import type { ProjectDocument } from '../../shared/workspace'

export interface RegisteredProject {
  id: string; path: string; name: string; projectId: string | null; lastOpenedAt: string; hasOutline: boolean
}
export interface LoadedProject {
  document: ProjectDocument | null; digest: string | null; writable: boolean; sourceHint: 'empty' | 'files'
}
export interface ProjectStorage {
  canonicalPath(path: string): Promise<{ path: string; name: string }>
  load(path: string): Promise<LoadedProject>
  save(path: string, document: ProjectDocument, expectedDigest: string | null): Promise<LoadedProject>
}
export interface ProjectRegistry {
  read(): Promise<RegisteredProject[]>
  write(projects: RegisteredProject[]): Promise<void>
}
