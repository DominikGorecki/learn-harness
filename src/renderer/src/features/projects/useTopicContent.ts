import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ApiResult, ErrorCode } from '../../../../shared/contracts'
import type { TopicContentPage, TopicContentSnapshot } from '../../../../shared/topic-content'
import { assembleChapter } from './chapter-reader'
function contentRecovery(code: ErrorCode): string {
  switch (code) {
    case 'AUTH_REQUIRED': case 'PLAN_PERMISSION_REQUIRED': return 'A connection or permission is needed. Check ChatGPT for unfinished text, or OpenRouter for images, then retry explicitly.'
    case 'BUSY': return 'Another AI operation or save is still settling. Wait for it to finish, then try again.'
    case 'CONFLICT': return 'Saved context or chapter progress changed. Reload it before continuing; keep externally changed files.'
    case 'STORAGE': return 'The chapter could not be read or saved. Check folder access and use Retry save for a retained validated result.'
    case 'UNAVAILABLE': return 'The recorded model or compatible image settings are unavailable. Review connections and model settings, then try again.'
    case 'NETWORK': return 'The provider could not be reached. Saved prose and validated progress remain available.'
    case 'USAGE_LIMIT': case 'ACCESS_RESTRICTED': return 'The provider rejected access or allowance for this action. Review the relevant connection before retrying.'
    default: return 'This content action could not finish. Reload saved content and review its recovery actions.'
  }
}

export function useTopicContent(projectId: string | null, topicId: string | null, projectRevision: number | null) {
  const destination = projectId && topicId ? JSON.stringify([projectId, topicId]) : null
  const [selection, setSelection] = useState({ destination, sequence: 0 })
  if (selection.destination !== destination) setSelection({ destination, sequence: selection.sequence + 1 })
  const key = destination ? JSON.stringify([projectId, topicId, selection.sequence]) : null
  const current = useRef(key)
  useLayoutEffect(() => { current.current = key }, [key])
  const epoch = useRef(0), readEpoch = useRef(0), latest = useRef<TopicContentSnapshot | null>(null)
  const invalidate = useCallback(() => { epoch.current++; readEpoch.current++ }, [])
  const [mediaReload, setMediaReload] = useState(0)
  const context = useRef({ key, revision: projectRevision })
  const [view, setView] = useState<{ key: string | null; ready: boolean; state: TopicContentSnapshot | null; chapter: TopicContentPage | null; error: string | null }>({ key: null, ready: false, state: null, chapter: null, error: null })
  const load = useCallback(async (owner: string, session: number, state: TopicContentSnapshot) => {
    const request = ++readEpoch.current
    const valid = () => current.current === owner && epoch.current === session && readEpoch.current === request && latest.current?.published?.revisionId === state.published?.revisionId && latest.current?.published?.chapterId === state.published?.chapterId
    try {
      const pages: TopicContentPage[] = []; let cursor: string | undefined
      if (state.published) do {
        const reply = await window.learning.getTopicContent({ projectId: state.projectId, topicId: state.topicId, sectionLimit: 4, ...(cursor ? { sectionCursor: cursor } : {}) })
        if (!valid()) return
        if (!reply.ok || !reply.data) throw new Error('Chapter unavailable')
        if (reply.data.identity.chapterId !== state.published.chapterId || reply.data.identity.revisionId !== state.published.revisionId) throw new Error('Chapter changed')
        pages.push(reply.data); cursor = reply.data.nextSectionCursor ?? undefined
        if (pages.length >= 6 && cursor) throw new Error('Unsupported chapter pages')
      } while (cursor)
      if (valid()) setView(previous => ({ ...previous, key: owner, ready: true, chapter: pages.length ? assembleChapter(pages) : null, error: null }))
    } catch { if (valid()) setView(previous => ({ ...previous, key: owner, ready: true, error: 'Saved chapter could not be read. Your topic plan remains available. Try loading it again.' })) }
  }, [])
  const accept = useCallback((state: TopicContentSnapshot, owner: string, session: number) => {
    if (current.current !== owner || epoch.current !== session || state.projectId !== projectId || state.topicId !== topicId || latest.current && state.revision <= latest.current.revision) return
    const changed = !latest.current || state.published?.chapterId !== latest.current.published?.chapterId || state.published?.revisionId !== latest.current.published?.revisionId
    latest.current = state
    setView(previous => previous.key === owner ? { ...previous, state } : { key: owner, state, ready: false, chapter: null, error: null })
    if (changed) void load(owner, session, state)
  }, [load, projectId, topicId])
  useEffect(() => {
    const session = ++epoch.current; latest.current = null; ++readEpoch.current
    if (!key || !projectId || !topicId) return
    const stop = window.learning.onTopicContentChanged(value => accept(value, key, session))
    void window.learning.getTopicContentState({ projectId, topicId }).then(reply => {
      if (reply.ok) accept(reply.data, key, session)
      else if (current.current === key && epoch.current === session && !latest.current) setView({ key, ready: true, state: null, chapter: null, error: contentRecovery(reply.error.code) })
    }).catch(() => { if (current.current === key && epoch.current === session && !latest.current) setView({ key, ready: true, state: null, chapter: null, error: 'Saved content is unavailable. Try loading it again.' }) })
    return () => { stop(); invalidate() }
  }, [key, projectId, topicId, accept, invalidate])
  const refresh = useCallback(async () => {
    if (!key || !projectId || !topicId) return
    const session = epoch.current
    const observed = latest.current?.revision ?? -1
    try {
      const reply = await window.learning.getTopicContentState({ projectId, topicId })
      if (reply.ok) { accept(reply.data, key, session); if (latest.current?.revision === reply.data.revision) { await load(key, session, reply.data); if (current.current === key && epoch.current === session) setMediaReload(value => value + 1) } }
      else if (current.current === key && epoch.current === session && (latest.current?.revision ?? -1) === observed) setView(previous => ({ ...previous, error: 'Saved content could not be refreshed. Check the project folder and try again.' }))
    } catch { if (current.current === key && epoch.current === session && (latest.current?.revision ?? -1) === observed) setView(previous => ({ ...previous, error: 'Saved content could not be refreshed. Try again.' })) }
  }, [key, projectId, topicId, accept, load])
  useEffect(() => {
    const previous = context.current; context.current = { key, revision: projectRevision }
    if (previous.key !== key || previous.revision === projectRevision) return
    if (!key || !projectId || !topicId) return
    const session = epoch.current
    void window.learning.getTopicContentState({ projectId, topicId }).then(reply => { if (reply.ok) accept(reply.data, key, session) }).catch(() => { /* Existing readable content is retained; explicit reload reports recovery. */ })
  }, [projectRevision, key, projectId, topicId, accept])
  const mutate = useCallback(async (action: () => Promise<ApiResult<TopicContentSnapshot>>) => {
    const owner = key, session = epoch.current
    try {
      const reply = await action()
      if (owner && current.current === owner && epoch.current === session) {
        if (reply.ok) { accept(reply.data, owner, session); setView(previous => ({ ...previous, error: null })); return reply.data }
        setView(previous => ({ ...previous, error: contentRecovery(reply.error.code) }))
      }
    } catch { if (current.current === owner && epoch.current === session) setView(previous => ({ ...previous, error: 'The content action could not finish. Review saved progress and try again.' })) }
    return null
  }, [key, accept])
  return { ...(view.key === key ? view : { ready: false, state: null, chapter: null, error: null }), refresh, mutate, mediaReload }
}
