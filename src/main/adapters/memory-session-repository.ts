import type { SessionRepository } from '../../core/learning/service'
import type { LearningSession } from '../../shared/contracts'

export function createMemorySessionRepository(): SessionRepository {
  const sessions = new Map<string, LearningSession>()
  return {
    list: () => [...sessions.values()].reverse().map(session => structuredClone(session)),
    find: id => { const session = sessions.get(id); return session && structuredClone(session) },
    save: session => { sessions.set(session.id, structuredClone(session)) }
  }
}
