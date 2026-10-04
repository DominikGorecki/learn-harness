import { useEffect, useRef, useState } from 'react'
import type { Course, LearningSession } from '../../../shared/contracts'
import { Mark } from '../components/Mark'
import { StartView } from '../features/learning/StartView'
import { SessionView } from '../features/learning/SessionView'
import { errorMessage, request } from '../lib/learning-client'
import { AccountPanel } from '../features/account/AccountPanel'
import { useAccount } from '../features/account/useAccount'

export function App() {
  const account = useAccount()
  const [accountOpen, setAccountOpen] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [sessions, setSessions] = useState<LearningSession[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const busyRef = useRef(false)
  const active = sessions.find(session => session.id === activeId)
  const course = courses.find(entry => entry.id === active?.courseId)

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(async () => {
      if (!window.learning) throw new Error('Open Learning Studio in the desktop app to connect to your sessions.')
      return Promise.all([request(window.learning.listCourses()), request(window.learning.listSessions())])
    }).then(([loadedCourses, loadedSessions]) => {
      if (!cancelled) { setCourses(loadedCourses); setSessions(loadedSessions); setError(null) }
    }).catch(error => { if (!cancelled) setError(errorMessage(error)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [reloadKey])

  async function mutate(operation: () => Promise<LearningSession>) {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true); setError(null)
    try {
      const result = await operation()
      setSessions(previous => [result, ...previous.filter(session => session.id !== result.id)])
      setActiveId(result.id)
    } catch (error) { setError(errorMessage(error)) }
    finally { busyRef.current = false; setBusy(false) }
  }

  return <div className="app-shell">
    <a className="skip-link" href="#workspace">Skip to workspace</a>
    <aside className="sidebar" aria-label="Learning navigation">
      <div className="brand"><Mark small /><span>Learning Studio</span></div>
      <button className={`new-session ${!active ? 'active' : ''}`} disabled={busy} onClick={() => setActiveId(null)}><span aria-hidden="true">＋</span> New session</button>
      <p className="sidebar-label">YOUR SESSIONS</p>
      <nav aria-label="Sessions">
        {sessions.length === 0 && <p className="empty-sessions">Your sessions will appear here.</p>}
        {sessions.map(session => <button className={`session-link ${activeId === session.id ? 'active' : ''}`} key={session.id}
          disabled={busy} onClick={() => setActiveId(session.id)} aria-current={activeId === session.id ? 'page' : undefined}>
          <span className="session-dot" aria-hidden="true">{session.completed ? '✓' : '○'}</span><span>{session.courseTitle}</span>
        </button>)}
      </nav>
      <div className="sidebar-bottom"><span className="local-dot" aria-hidden="true" /><span>Local demo workspace</span><small>Progress lasts for this app session.</small></div>
    </aside>
    <div className="workbench">
      <header className="workspace-header"><span>Workspace <span className="breadcrumb-divider">/</span> <strong>{active?.courseTitle ?? 'New session'}</strong></span>
        <button className="account-trigger" onClick={() => setAccountOpen(true)} aria-label="Account settings"><span>{account.snapshot?.name ?? 'Connect ChatGPT'}</span></button></header>
      <div className="workspace-columns">
        <main id="workspace" className="workspace" tabIndex={-1} aria-busy={loading || busy}>
          {error && <div className="error-banner" role="alert"><p>{error}</p>
            {courses.length === 0 && <button className="text-button" onClick={() => { setLoading(true); setReloadKey(value => value + 1) }}>Try again</button>}
          </div>}
          {loading ? <div className="loading" role="status">Opening your workspace…</div> : courses.length > 0 && (
            active && course ? <SessionView key={active.id} course={course} session={active} busy={busy}
              onAnswer={choiceId => { void mutate(() => request(window.learning.submitAnswer({ sessionId: active.id, choiceId }))) }} onNew={() => setActiveId(null)} />
              : <StartView courses={courses} busy={busy} onStart={(courseId, goal) => { void mutate(() => request(window.learning.startSession({ courseId, goal }))) }} />
          )}
        </main>
        <aside className="context-panel" aria-label="Session context">
          <p className="eyebrow">{active ? 'SESSION FOCUS' : 'A LITTLE STRUCTURE'}</p>
          <h2>{active ? active.courseTitle : 'One idea at a time.'}</h2>
          <p>{active ? active.goal : 'A short session gives you room to read, think, and try an answer.'}</p>
          <ol className="session-steps">
            <li><span>01</span><div><strong>Understand</strong><p>Read the idea in your own time.</p></div></li>
            <li><span>02</span><div><strong>Practice</strong><p>Choose an answer and get feedback.</p></div></li>
            <li><span>03</span><div><strong>Reflect</strong><p>Explain the idea in your own words.</p></div></li>
          </ol>
          {active?.completed && <p className="completion-note">✓ You completed this practice question.</p>}
          <div className="context-note"><span aria-hidden="true">✳</span><p>These are sample lessons. A correct answer is a checkpoint, not a measure of mastery.</p></div>
        </aside>
      </div>
      <footer className="status-bar"><span>{account.snapshot?.status === 'connected' ? 'ChatGPT connected · Demo lessons' : 'Demo lessons · Connect ChatGPT from your account'}</span><span>Demo progress resets when you quit</span></footer>
    </div>
    <AccountPanel open={accountOpen} onClose={() => setAccountOpen(false)} account={account} />
  </div>
}
