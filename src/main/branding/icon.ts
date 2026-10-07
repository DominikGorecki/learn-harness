import { resolve } from 'node:path'

/** Fixed app-owned artwork; no renderer/profile/project path is accepted. */
export function windowIconPath(packaged: boolean, resourcesDirectory: string, mainDirectory: string): string {
  return packaged ? resolve(resourcesDirectory, 'branding/icon.png') : resolve(mainDirectory, '../../assets/branding/icon.png')
}
