import { useState } from 'react'
import type { Course, LearningSession } from '../../../../shared/contracts'

interface Props { course: Course; session: LearningSession; busy: boolean; onAnswer(choiceId: string): void; onNew(): void }

export function SessionView({ course, session, busy, onAnswer, onNew }: Props) {
  const [choiceId, setChoiceId] = useState(session.answer?.choiceId ?? '')
  return <article className="session-view workspace-enter" aria-labelledby="lesson-heading">
    <div className="lesson-meta"><span className="eyebrow">SHORT LESSON</span><span>{course.durationMinutes} min · Demo content</span></div>
    <h1 id="lesson-heading">{course.lesson.title}</h1>
    <div className="session-goal"><span>Your focus</span><p>{session.goal}</p></div>
    <section className="lesson-copy" aria-label="Lesson">{course.lesson.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</section>
    <form className="practice" onSubmit={event => { event.preventDefault(); if (choiceId) onAnswer(choiceId) }}>
      <p className="eyebrow">CHECK YOUR UNDERSTANDING</p>
      <h2>{course.question.prompt}</h2>
      <fieldset disabled={busy || session.completed}>
        <legend className="sr-only">Choose an answer</legend>
        {course.question.choices.map(choice => <label key={choice.id} className={`answer-option ${choiceId === choice.id ? 'selected' : ''}`}>
          <input type="radio" name="answer" value={choice.id} checked={choiceId === choice.id} onChange={() => setChoiceId(choice.id)} />
          <span>{choice.label}</span>
        </label>)}
      </fieldset>
      {!session.completed && <button className="primary-button" disabled={!choiceId || busy} type="submit">{busy ? 'Checking…' : 'Check answer'}<span aria-hidden="true">→</span></button>}
      {session.answer && <div className={`feedback ${session.answer.correct ? 'correct' : ''}`} role="status">
        <strong>{session.answer.correct ? 'Practice complete' : 'Take another look'}</strong><p>{session.answer.feedback}</p>
        {session.completed && <button className="text-button" onClick={onNew} type="button">Start another session <span aria-hidden="true">→</span></button>}
      </div>}
    </form>
  </article>
}
