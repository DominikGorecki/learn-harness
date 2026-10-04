import { contextBridge, ipcRenderer } from 'electron'
import { channels } from '../shared/contracts'
import type { LearningApi } from '../shared/contracts'

const learning: LearningApi = {
  listCourses: () => ipcRenderer.invoke(channels.listCourses),
  listSessions: () => ipcRenderer.invoke(channels.listSessions),
  startSession: request => ipcRenderer.invoke(channels.startSession, request),
  submitAnswer: request => ipcRenderer.invoke(channels.submitAnswer, request)
}

contextBridge.exposeInMainWorld('learning', learning)
