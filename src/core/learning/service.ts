import { ApplicationError } from '../../shared/contracts'
import type { LearningSession, StartSessionRequest, SubmitAnswerRequest } from '../../shared/contracts'
import { courseDefinitions } from './courses'

export interface SessionRepository {
  list(): LearningSession[]
  find(id: string): LearningSession | undefined
  save(session: LearningSession): void
}

export interface LearningDependencies {
  sessions: SessionRepository
  createId(): string
  now(): string
}

export function createLearningService({ sessions, createId, now }: LearningDependencies) {
  const definition = (id: string) => {
    const found = courseDefinitions.find(entry => entry.course.id === id)
    if (!found) throw new ApplicationError('NOT_FOUND', 'That course is unavailable.')
    return found
  }

  return {
    listCourses: () => courseDefinitions.map(entry => structuredClone(entry.course)),
    listSessions: () => sessions.list(),
    startSession(request: StartSessionRequest): LearningSession {
      const { course } = definition(request.courseId)
      const session: LearningSession = {
        id: createId(), courseId: course.id, courseTitle: course.title,
        goal: request.goal, createdAt: now(), completed: false
      }
      sessions.save(session)
      return session
    },
    submitAnswer(request: SubmitAnswerRequest): LearningSession {
      const session = sessions.find(request.sessionId)
      if (!session) throw new ApplicationError('NOT_FOUND', 'That session is unavailable.')
      const lesson = definition(session.courseId)
      if (!lesson.course.question.choices.some(choice => choice.id === request.choiceId)) {
        throw new ApplicationError('INVALID_INPUT', 'Choose one of the available answers.')
      }
      if (session.completed) return session
      const correct = lesson.correctChoiceId === request.choiceId
      const updated: LearningSession = {
        ...session, completed: correct,
        answer: { choiceId: request.choiceId, correct, feedback: correct ? lesson.correctFeedback : lesson.incorrectFeedback }
      }
      sessions.save(updated)
      return updated
    }
  }
}

export type LearningService = ReturnType<typeof createLearningService>
