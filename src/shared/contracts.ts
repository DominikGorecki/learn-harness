export interface Choice { id: string; label: string }

export interface Course {
  id: string
  title: string
  summary: string
  durationMinutes: number
  lesson: { title: string; paragraphs: string[] }
  question: { prompt: string; choices: Choice[] }
}

export interface LearningSession {
  id: string
  courseId: string
  courseTitle: string
  goal: string
  createdAt: string
  completed: boolean
  answer?: { choiceId: string; correct: boolean; feedback: string }
}

export interface StartSessionRequest { courseId: string; goal: string }
export interface SubmitAnswerRequest { sessionId: string; choiceId: string }
export type ErrorCode = 'INVALID_INPUT' | 'NOT_FOUND' | 'FORBIDDEN' | 'INTERNAL' |
  'AUTH_REQUIRED' | 'PLAN_PERMISSION_REQUIRED' | 'ACCESS_RESTRICTED' | 'USAGE_LIMIT' |
  'NETWORK' | 'CANCELLED' | 'BUSY' | 'UNAVAILABLE' | 'STORAGE' | 'CONFLICT'
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: { code: ErrorCode; message: string } }

export interface LearningApi {
  listCourses(): Promise<ApiResult<Course[]>>
  listSessions(): Promise<ApiResult<LearningSession[]>>
  startSession(request: StartSessionRequest): Promise<ApiResult<LearningSession>>
  submitAnswer(request: SubmitAnswerRequest): Promise<ApiResult<LearningSession>>
}

export const channels = {
  listCourses: 'learning:list-courses',
  listSessions: 'learning:list-sessions',
  startSession: 'learning:start-session',
  submitAnswer: 'learning:submit-answer'
} as const

export class ApplicationError extends Error {
  constructor(public readonly code: ErrorCode, message: string) { super(message) }
}

function record(input: unknown, keys: string[]): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ApplicationError('INVALID_INPUT', 'Expected a request object.')
  }
  const value = input as Record<string, unknown>
  if (Object.keys(value).some(key => !keys.includes(key))) {
    throw new ApplicationError('INVALID_INPUT', 'Unexpected request field.')
  }
  return value
}

function textField(value: unknown, name: string, maxLength: number): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength) {
    throw new ApplicationError('INVALID_INPUT', `${name} must be between 1 and ${maxLength} characters.`)
  }
  return value.trim()
}

export function parseStartSession(input: unknown): StartSessionRequest {
  const value = record(input, ['courseId', 'goal'])
  return { courseId: textField(value.courseId, 'Course', 80), goal: textField(value.goal, 'Goal', 500) }
}

export function parseSubmitAnswer(input: unknown): SubmitAnswerRequest {
  const value = record(input, ['sessionId', 'choiceId'])
  return { sessionId: textField(value.sessionId, 'Session', 80), choiceId: textField(value.choiceId, 'Answer', 80) }
}
