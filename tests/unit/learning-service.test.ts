import { beforeEach, describe, expect, it } from 'vitest'
import { createLearningService } from '../../src/core/learning/service'
import { createMemorySessionRepository } from '../../src/main/adapters/memory-session-repository'

describe('learning behavior', () => {
  const sessions = createMemorySessionRepository()
  let nextId = 0
  let service: ReturnType<typeof createLearningService>
  beforeEach(() => {
    nextId = 0
    service = createLearningService({ sessions: createMemorySessionRepository(), createId: () => `session-${++nextId}`, now: () => '2026-10-04T12:00:00.000Z' })
  })

  it('returns public lesson DTOs without answer keys and without shared mutable fixtures', () => {
    const courses = service.listCourses()
    expect(courses).toHaveLength(3)
    expect(courses[0]).not.toHaveProperty('correctChoiceId')
    courses[0]!.title = 'Changed'
    expect(service.listCourses()[0]!.title).toBe('TypeScript essentials')
  })

  it('creates a goal-labelled session through injected identity and time', () => {
    const session = service.startSession({ courseId: 'typescript', goal: 'Understand runtime checks' })
    expect(session).toMatchObject({ id: 'session-1', goal: 'Understand runtime checks', createdAt: '2026-10-04T12:00:00.000Z', completed: false })
    expect(service.listSessions()).toEqual([session])
  })

  it('rejects unavailable courses without storing a session', () => {
    expect(() => service.startSession({ courseId: 'missing', goal: 'A goal' })).toThrow('That course is unavailable.')
    expect(service.listSessions()).toEqual([])
  })

  it('provides feedback, permits retry, and completes only on a valid correct choice', () => {
    const session = service.startSession({ courseId: 'typescript', goal: 'Understand types' })
    const incorrect = service.submitAnswer({ sessionId: session.id, choiceId: 'compile' })
    expect(incorrect.completed).toBe(false)
    expect(incorrect.answer).toMatchObject({ correct: false, choiceId: 'compile' })
    const correct = service.submitAnswer({ sessionId: session.id, choiceId: 'validate' })
    expect(correct.completed).toBe(true)
    expect(correct.answer).toMatchObject({ correct: true, choiceId: 'validate' })
    expect(service.listSessions()[0]).toEqual(correct)
  })

  it('keeps a completed result stable on repeated submissions', () => {
    const session = service.startSession({ courseId: 'typescript', goal: 'Understand types' })
    const completed = service.submitAnswer({ sessionId: session.id, choiceId: 'validate' })
    expect(service.submitAnswer({ sessionId: session.id, choiceId: 'compile' })).toEqual(completed)
  })

  it('rejects a choice from another course and an unavailable session', () => {
    const session = service.startSession({ courseId: 'typescript', goal: 'Understand types' })
    expect(() => service.submitAnswer({ sessionId: session.id, choiceId: 'status' })).toThrow('Choose one of the available answers.')
    expect(service.listSessions()[0]?.answer).toBeUndefined()
    expect(() => service.submitAnswer({ sessionId: 'missing', choiceId: 'validate' })).toThrow('That session is unavailable.')
  })

  it('protects stored sessions from mutations of saved or returned snapshots', () => {
    const session = service.startSession({ courseId: 'web', goal: 'HTTP basics' })
    sessions.save(session)
    session.goal = 'Changed outside'
    const returned = sessions.find(session.id)!
    returned.goal = 'Changed again'
    sessions.list()[0]!.goal = 'Changed a third time'
    expect(sessions.find(session.id)?.goal).toBe('HTTP basics')
  })
})
