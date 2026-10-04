import type { SavedOutline } from '../../../../shared/workspace'
import { Icon } from '../../components/Icon'

export function OutlineView({ saved, unsaved = false }: { saved: SavedOutline; unsaved?: boolean }) {
  const outline = saved.document
  const sources = saved.coverage.files.filter(file => file.status === 'read')
  return <article className="outline-view workspace-enter" aria-labelledby="outline-heading">
    <header className="outline-introduction"><div className="outline-meta"><span className="eyebrow">Your learning outline</span><span className="saved-indicator"><Icon name={unsaved ? 'info' : 'check'} size={14} />{unsaved ? 'Not saved yet' : 'Saved'}</span></div>
      <h1 id="outline-heading" tabIndex={-1}>{outline.title}</h1><p className="outline-overview">{outline.overview}</p>
      <div className="outline-facts"><span>{outline.lessons.length} {outline.lessons.length === 1 ? 'lesson' : 'lessons'}</span><span>{outline.level}</span></div>
    </header>
    <section className="learning-outcomes"><h2>What you’ll work toward</h2><ul>{outline.outcomes.map((outcome, index) => <li key={index}><Icon name="arrow" size={15} /><span>{outcome}</span></li>)}</ul></section>
    <section className="lesson-path" aria-labelledby="lesson-path-heading"><div className="section-introduction"><h2 id="lesson-path-heading">Your path through the subject</h2><p>A foundation to build on, one idea at a time.</p></div>
      {outline.lessons.map((lesson, index) => <details className="lesson-disclosure" key={lesson.id}>
        <summary><span className="lesson-number">{String(index + 1).padStart(2, '0')}</span><span className="lesson-summary"><span className="lesson-title">{lesson.title}</span><span>{lesson.question}</span></span>
          {lesson.id === outline.startingLessonId && <span className="starting-label">Start here</span>}<Icon name="down" size={16} /></summary>
        <div className="lesson-detail"><p className="lesson-overview">{lesson.overview}</p><h3>Learning objectives</h3>
          <ul className="plain-list">{lesson.objectives.map((objective, index) => <li key={index}>{objective}</li>)}</ul>
          {lesson.prerequisites.length > 0 && <p className="lesson-prerequisites"><strong>Builds on</strong> {lesson.prerequisites.join(' · ')}</p>}
          <h3>Ways to explore this idea</h3><ol className="module-list">{lesson.modules.map(module => <li key={module.id}><span className="module-method">{module.method}</span><h4>{module.title}</h4><p>{module.purpose}</p><p className="module-task">{module.task}</p></li>)}</ol>
          {lesson.sources.length > 0 && <p className="lesson-sources"><strong>From your material</strong> {lesson.sources.join(' · ')}</p>}
        </div>
      </details>)}
    </section>
    <section className="outline-context" aria-label="Outline context">
      <details><summary>Scope and assumptions<Icon name="down" size={14} /></summary><p>{outline.scope}</p><ul className="plain-list">{outline.assumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}</ul></details>
      {outline.additions.length > 0 && <details><summary>Connections and gaps to explore<Icon name="down" size={14} /></summary>{outline.additions.map((addition, index) => <div className="added-topic" key={index}><strong>{addition.topic}</strong><p>{addition.reason}</p></div>)}</details>}
      <details><summary>{sources.length ? 'Project material and coverage' : 'How this outline was shaped'}<Icon name="down" size={14} /></summary>
        {saved.brief && <p><strong>Your direction</strong> {saved.brief}</p>}
        <p>Created with {saved.model.name} on {new Date(saved.generatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}.</p>
        {saved.coverage.files.length > 0 && <ul className="coverage-list">{saved.coverage.files.map((file, index) => <li key={index}><span>{file.path}</span><span>{file.status === 'read' ? 'Read' : file.reason ?? 'Not used'}</span></li>)}</ul>}
        {saved.coverage.limitations.length > 0 && <ul className="plain-list">{saved.coverage.limitations.map((limit, index) => <li key={index}>{limit}</li>)}</ul>}
      </details>
    </section>
    <p className="outline-endnote">A learning plan is a starting point. Understanding grows through the questions you ask along the way.</p>
  </article>
}
