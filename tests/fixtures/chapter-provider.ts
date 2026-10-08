import { startChatGPTFixture } from './chatgpt-provider'
import { writeToolResponse } from './responses-stream'
import { learningOutline } from './learning-outline'
import type { ChapterPlan } from '../../src/shared/topic-content'

export function chapterFixturePlan(chapterId: string): ChapterPlan {
  const topic = learningOutline().lessons[0]!
  return { projectId: 'portable-project', topicId: topic.id, chapterId, title: 'Reasoning about starting beliefs', centralQuestion: topic.question,
    objectives: topic.objectives, sections: topic.objectives.map((_, index) => ({ id: `section-${index}`, title: `Objective ${index + 1}`, purpose: 'Explain the objective with a worked example', objectiveIndices: [index] })),
    images: [0, 1].map(index => ({ id: `illustration-${index}`, sectionId: `section-${index}`, placement: 'after', purpose: index === 0 ? 'Compare starting beliefs' : 'Show the effect of new evidence', prompt: index === 0 ? 'Compare two different starting beliefs using simple shapes.' : 'Show how evidence updates a belief using a clear sequence.',
    caption: index === 0 ? 'Starting beliefs differ.' : 'Evidence changes a belief.', alt: index === 0 ? 'Two starting distributions differ.' : 'A prior distribution shifts after evidence.', factualConstraints: ['A belief is not certainty'], skillVersion: 'educational-images-v1', settings: { n: 1, aspectRatio: '1:1' } })) }
}

/** Deterministic multi-call teaching fixture; no claims about live model pedagogy. */
export async function startChapterFixture() {
  const runs = new Map<string, number>()
  let hold = false
  const fixture = await startChatGPTFixture({ onInference(response, payload) {
    const text = JSON.stringify(payload.input), chapterId = /chapterId: ([a-zA-Z0-9_-]+)/.exec(text)?.[1]
    if (!chapterId) return false
    if (hold) { response.writeHead(200, { 'content-type': 'text/event-stream' }); response.write(': fixture held\n\n'); return true }
    const step = runs.get(chapterId) ?? 0; runs.set(chapterId, step + 1)
    const plan = chapterFixturePlan(chapterId)
    if (step === 0) writeToolResponse(response, { name: 'read_material', args: { path: 'notes.md' } })
    else if (step === 1) writeToolResponse(response, { name: 'submit_chapter_plan', args: plan })
    else if (step < 2 + plan.sections.length) { const section = plan.sections[step - 2]!; writeToolResponse(response, { name: 'submit_chapter_section', args: { id: section.id, markdown: `# ${section.title}\nState assumptions before interpreting a clue.`, examples: ['Compare a familiar weather forecast with a new observation.'], misconceptions: ['A prior is not certainty.'] } }) }
    else if (step === 2 + plan.sections.length) writeToolResponse(response, { name: 'submit_chapter_summary', args: { introduction: 'Begin with visible assumptions.', synthesis: 'Connect starting beliefs, observations and revised beliefs.', sourceNotes: ['Read notes.md; other explanation comes from model knowledge without web verification.'] } })
    else writeToolResponse(response, { name: 'generate_topic_image', args: { imageId: `illustration-${step - 3 - plan.sections.length}` } })
    return true
  } })
  return { ...fixture, hold(value: boolean) { hold = value }, runs }
}
