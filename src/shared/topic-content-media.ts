import { ApplicationError } from './contracts'
import { identifier, strictRecord } from './validation'

export interface TopicMediaIdentity { projectHandle: string; topicId: string; chapterId: string; imageId: string; versionId: string; candidateId?: string }
const forbidden = () => new ApplicationError('FORBIDDEN', 'This illustration reference is unsupported.')
export function parseTopicMediaIdentity(value: unknown): TopicMediaIdentity {
  const data = strictRecord(value, ['projectHandle', 'topicId', 'chapterId', 'imageId', 'versionId', 'candidateId'])
  const result: TopicMediaIdentity = { projectHandle: identifier(data.projectHandle), topicId: identifier(data.topicId), chapterId: identifier(data.chapterId), imageId: identifier(data.imageId), versionId: identifier(data.versionId) }
  if (data.candidateId !== undefined) result.candidateId = identifier(data.candidateId)
  return result
}
/** Uses the current registry handle; no portable project IDs, paths or remote image URLs. */
export function topicMediaUrl(identity: TopicMediaIdentity): string {
  const value = parseTopicMediaIdentity(identity)
  return `learningmedia://topic/${value.projectHandle}/${value.topicId}/${value.chapterId}/${value.imageId}/${value.versionId}${value.candidateId ? `?candidate=${value.candidateId}` : ''}`
}
export function parseTopicMediaUrl(value: string): TopicMediaIdentity {
  let url: URL
  try { url = new URL(value) } catch { throw forbidden() }
  if (url.protocol !== 'learningmedia:' || url.hostname !== 'topic' || url.port || url.username || url.password || url.hash || /[%\\]/.test(value)) throw forbidden()
  const parts = url.pathname.split('/').slice(1), keys = [...url.searchParams.keys()]
  if (parts.length !== 5 || keys.length > 1 || keys.some(key => key !== 'candidate')) throw forbidden()
  const result = parseTopicMediaIdentity({ projectHandle: parts[0], topicId: parts[1], chapterId: parts[2], imageId: parts[3], versionId: parts[4], ...(url.searchParams.has('candidate') ? { candidateId: url.searchParams.get('candidate') } : {}) })
  // Reject normalization, aliases, duplicate query parameters and encoded traversal.
  if (topicMediaUrl(result) !== value) throw forbidden()
  return result
}
