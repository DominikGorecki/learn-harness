import { Type } from '@earendil-works/pi-ai'
import { learningMethods } from '../../shared/outline'

const text = (maxLength: number) => Type.String({ minLength: 1, maxLength })
const id = Type.String({ minLength: 1, maxLength: 128, pattern: '^[A-Za-z0-9_-]+$' })
const texts = (maxItems: number, maxLength: number, minItems = 0) => Type.Array(text(maxLength), { minItems, maxItems })
const module = Type.Object({
  id, title: text(240), purpose: text(3000), method: Type.Union(learningMethods.map(method => Type.Literal(method))), task: text(5000)
}, { additionalProperties: false })
const lesson = Type.Object({
  id, title: text(240), question: text(2000), overview: text(5000), objectives: texts(12, 2000, 1),
  prerequisites: texts(20, 2000), sources: texts(100, 2048), modules: Type.Array(module, { minItems: 1, maxItems: 12 })
}, { additionalProperties: false })

export const outlineSchema = Type.Object({
  title: text(240), overview: text(10_000), scope: text(5000), level: text(1000), outcomes: texts(20, 2000, 1), assumptions: texts(30, 2000),
  additions: Type.Array(Type.Object({ topic: text(240), reason: text(3000) }, { additionalProperties: false }), { maxItems: 40 }),
  startingLessonId: id, lessons: Type.Array(lesson, { minItems: 1, maxItems: 40 })
}, { additionalProperties: false })

export const clarificationSchema = Type.Object({ question: text(2000), reason: text(2000) }, { additionalProperties: false })
