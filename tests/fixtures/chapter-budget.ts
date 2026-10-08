import { startChatGPTFixture } from './chatgpt-provider'
import { writeToolResponse } from './responses-stream'
import { chapterFixturePlan } from './chapter-provider'

/** Actual responses transport; harmless reads exhaust the real Pi activation loop. */
export async function startChapterBudgetFixture(validPlan: boolean) {
  let calls = 0, resumed = false, resumeStep = 0
  const fixture = await startChatGPTFixture({ onInference(response, payload) {
    const chapterId = /chapterId: ([a-zA-Z0-9_-]+)/.exec(JSON.stringify(payload.input))?.[1]
    if (!chapterId) return false
    const plan = chapterFixturePlan(chapterId), step = calls++
    if (resumed) {
      if (resumeStep++ === 0) writeToolResponse(response, { name: 'submit_chapter_section', args: { id: 'section-1', markdown: 'Resume only the missing objective.', examples: ['Use a new observation.'], misconceptions: ['Evidence is not certainty.'] } })
      else writeToolResponse(response, { name: 'submit_chapter_summary', args: { introduction: 'Make assumptions visible.', synthesis: 'Connect assumptions and evidence.', sourceNotes: ['Read extra-progress.md as project source; remaining explanation is model knowledge.'] } })
    } else if (validPlan && step === 0) writeToolResponse(response, { name: 'read_material', args: { path: 'extra-progress.md' } })
    else if (validPlan && step === 1) writeToolResponse(response, { name: 'submit_chapter_plan', args: plan })
    else if (validPlan && step === 2) writeToolResponse(response, { name: 'submit_chapter_section', args: { id: 'section-0', markdown: 'Retained accepted explanation of the first objective.', examples: ['Compare a weather forecast.'], misconceptions: ['A prior is not certainty.'] } })
    else writeToolResponse(response, { name: 'list_materials', args: {} })
    return true
  } })
  return { ...fixture, resume() { resumed = true } }
}
