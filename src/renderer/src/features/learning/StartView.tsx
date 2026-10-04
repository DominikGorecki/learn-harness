import { useState } from 'react'
import type { Course } from '../../../../shared/contracts'
import { Mark } from '../../components/Mark'

interface Props { courses: Course[]; busy: boolean; onStart(courseId: string, goal: string): void }

export function StartView({ courses, busy, onStart }: Props) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '')
  const [goal, setGoal] = useState('')
  const selected = courses.find(course => course.id === courseId)

  return <section className="start-view workspace-enter" aria-labelledby="start-heading">
    <Mark />
    <p className="eyebrow">YOUR LEARNING WORKSPACE</p>
    <h1 id="start-heading">What would you like<br />to understand?</h1>
    <p className="intro">Choose a short lesson. Read an idea, try it, and see what you remember.</p>
    <form className="goal-composer" onSubmit={event => {
      event.preventDefault()
      if (selected) onStart(selected.id, goal.trim() || `Understand ${selected.title.toLowerCase()}`)
    }}>
      <label htmlFor="learning-goal">Give your session a focus <span>(optional)</span></label>
      <textarea id="learning-goal" value={goal} onChange={event => setGoal(event.target.value)} maxLength={500} rows={3}
        placeholder="For example, understand when TypeScript checks my code…" disabled={busy} />
      <div className="composer-footer"><span>{selected?.durationMinutes} minute demo lesson</span>
        <button className="primary-button" disabled={busy || !selected} type="submit">{busy ? 'Starting…' : 'Start session'}<span aria-hidden="true">↗</span></button>
      </div>
    </form>
    <fieldset className="course-picker" disabled={busy}>
      <legend>CHOOSE A STARTING POINT</legend>
      {courses.map((course, index) => <label className={`course-option ${course.id === courseId ? 'selected' : ''}`} key={course.id}>
        <input type="radio" name="course" value={course.id} checked={course.id === courseId} onChange={() => setCourseId(course.id)} />
        <span className="course-number">0{index + 1}</span>
        <span className="course-copy"><strong>{course.title}</strong><span>{course.summary}</span></span>
        <span className="course-time">{course.durationMinutes} min</span>
      </label>)}
    </fieldset>
  </section>
}
