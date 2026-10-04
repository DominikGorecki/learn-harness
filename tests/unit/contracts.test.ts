import { describe, expect, it } from 'vitest'
import { parseStartSession, parseSubmitAnswer } from '../../src/shared/contracts'

describe('request parsing', () => {
  it('normalizes surrounding whitespace', () => {
    expect(parseStartSession({ courseId: ' web ', goal: ' Learn HTTP ' })).toEqual({ courseId: 'web', goal: 'Learn HTTP' })
    expect(parseSubmitAnswer({ sessionId: ' one ', choiceId: ' status ' })).toEqual({ sessionId: 'one', choiceId: 'status' })
  })

  it.each([null, [], 'course', 7, {}, { courseId: 'web' }, { courseId: false, goal: 'Learn' }, { courseId: 'web', goal: '  ' }, { courseId: 'web', goal: 'a'.repeat(501) }, { courseId: 'web', goal: 'Learn', path: '/tmp/file' }])('rejects malformed session request %#', input => {
    expect(() => parseStartSession(input)).toThrow()
  })

  it.each([null, {}, { sessionId: 'one', choiceId: 1 }, { sessionId: 'one', choiceId: '' }, { sessionId: 'x'.repeat(81), choiceId: 'status' }, { sessionId: 'one', choiceId: 'status', correct: true }])('rejects malformed answer request %#', input => {
    expect(() => parseSubmitAnswer(input)).toThrow()
  })
})
