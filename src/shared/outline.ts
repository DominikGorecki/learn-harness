import { ApplicationError } from './contracts'
import { boundedText, identifier, strictRecord, textList } from './validation'

export const learningMethods = [
  'Explore', 'Explain from scratch', 'Metaphor generation', 'Explanation ladder', 'Why-chain', 'Assumption hunting',
  'Counterexample search', 'Prediction', 'Compare and contrast', 'Classification', 'Reverse engineering', 'Teach-back',
  'Steelman opposition', 'Constraint removal', 'Compression', 'Concrete example', 'Transfer', 'Review'
] as const
export type LearningMethod = typeof learningMethods[number]
export interface OutlineModule { id: string; title: string; purpose: string; method: LearningMethod; task: string }
export interface OutlineLesson {
  id: string; title: string; question: string; overview: string; objectives: string[]; prerequisites: string[];
  sources: string[]; modules: OutlineModule[]
}
export interface LearningOutline {
  title: string; overview: string; scope: string; level: string; outcomes: string[]; assumptions: string[];
  additions: { topic: string; reason: string }[]; startingLessonId: string; lessons: OutlineLesson[]
}
export interface MaterialCoverage {
  files: { path: string; status: 'read' | 'not-read' | 'unsupported' | 'unreadable' | 'too-large' | 'binary'; reason: string | null }[]
  limitations: string[]
}

export function materialPath(value: unknown): string {
  const path = boundedText(value, 'Material path', 2048)
  if (path.startsWith('/') || path.includes('\\') || /^[A-Za-z]:/.test(path) || path.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new ApplicationError('INVALID_INPUT', 'Material references must stay inside the project.')
  }
  return path
}

export function parseOutline(value: unknown): LearningOutline {
  const data = strictRecord(value, ['title', 'overview', 'scope', 'level', 'outcomes', 'assumptions', 'additions', 'startingLessonId', 'lessons'])
  if (!Array.isArray(data.lessons) || data.lessons.length < 1 || data.lessons.length > 40) throw new ApplicationError('INVALID_INPUT', 'An outline needs between 1 and 40 complete lessons.')
  const titles = new Set<string>()
  const ids = new Set<string>()
  const lessons = data.lessons.map(value => {
    const lesson = strictRecord(value, ['id', 'title', 'question', 'overview', 'objectives', 'prerequisites', 'sources', 'modules'])
    const id = identifier(lesson.id)
    const title = boundedText(lesson.title, 'Lesson title', 240)
    if (ids.has(id) || titles.has(title.toLocaleLowerCase('en-US'))) throw new ApplicationError('INVALID_INPUT', 'Outline lessons must be distinct.')
    ids.add(id); titles.add(title.toLocaleLowerCase('en-US'))
    if (!Array.isArray(lesson.modules) || lesson.modules.length < 1 || lesson.modules.length > 12) throw new ApplicationError('INVALID_INPUT', 'Each lesson needs meaningful module plans.')
    const moduleIds = new Set<string>()
    const modules = lesson.modules.map(value => {
      const module = strictRecord(value, ['id', 'title', 'purpose', 'method', 'task'])
      const id = identifier(module.id)
      if (moduleIds.has(id)) throw new ApplicationError('INVALID_INPUT', 'Module identifiers must be distinct within a lesson.')
      moduleIds.add(id)
      if (!learningMethods.includes(module.method as LearningMethod)) throw new ApplicationError('INVALID_INPUT', 'Choose a supported learning method.')
      return { id, title: boundedText(module.title, 'Module title', 240), purpose: boundedText(module.purpose, 'Module purpose', 3000),
        method: module.method as LearningMethod, task: boundedText(module.task, 'Learner task', 5000) }
    })
    const sources = textList(lesson.sources, 'Sources', 100, 2048).map(materialPath)
    return { id, title, question: boundedText(lesson.question, 'Central question', 2000), overview: boundedText(lesson.overview, 'Lesson overview', 5000),
      objectives: textList(lesson.objectives, 'Lesson objectives', 12, 2000, 1), prerequisites: textList(lesson.prerequisites, 'Prerequisites', 20, 2000), sources, modules }
  })
  const startingLessonId = identifier(data.startingLessonId)
  if (!ids.has(startingLessonId)) throw new ApplicationError('INVALID_INPUT', 'The recommended starting lesson must appear in the outline.')
  if (!Array.isArray(data.additions) || data.additions.length > 40) throw new ApplicationError('INVALID_INPUT', 'The added coverage list is invalid.')
  const additions = data.additions.map(value => {
    const addition = strictRecord(value, ['topic', 'reason'])
    return { topic: boundedText(addition.topic, 'Added topic', 240), reason: boundedText(addition.reason, 'Reason for addition', 3000) }
  })
  return {
    title: boundedText(data.title, 'Project title', 240), overview: boundedText(data.overview, 'Subject overview', 10_000),
    scope: boundedText(data.scope, 'Learning scope', 5000), level: boundedText(data.level, 'Learning depth', 1000),
    outcomes: textList(data.outcomes, 'Learning outcomes', 20, 2000, 1), assumptions: textList(data.assumptions, 'Assumptions', 30, 2000),
    additions, startingLessonId, lessons
  }
}

export function parseCoverage(value: unknown): MaterialCoverage {
  const data = strictRecord(value, ['files', 'limitations'])
  if (!Array.isArray(data.files) || data.files.length > 1000) throw new ApplicationError('INVALID_INPUT', 'The material coverage is invalid.')
  const allowed = ['read', 'not-read', 'unsupported', 'unreadable', 'too-large', 'binary']
  return {
    files: data.files.map(value => {
      const file = strictRecord(value, ['path', 'status', 'reason'])
      if (!allowed.includes(file.status as string)) throw new ApplicationError('INVALID_INPUT', 'The material status is invalid.')
      return { path: materialPath(file.path), status: file.status as MaterialCoverage['files'][number]['status'],
        reason: file.reason === null ? null : boundedText(file.reason, 'Coverage explanation', 2000) }
    }),
    limitations: textList(data.limitations, 'Coverage limits', 40, 2000)
  }
}
