import type { LearningOutline } from '../../src/shared/outline'

/** Deterministic protocol-test content; never used by the application runtime. */
export function learningOutline(): LearningOutline {
  return {
    title: 'Bayesian reasoning', overview: 'Learn to update beliefs as evidence arrives, and recognize when an intuitive answer ignores the base rate.',
    scope: 'Everyday uncertainty, likelihoods, and conditional probability, without calculus.', level: 'Beginner, comfortable with fractions',
    outcomes: ['Explain how a prior changes when new evidence arrives.', 'Distinguish a likely observation from a likely explanation.'],
    assumptions: ['You are starting with no formal probability background.'],
    additions: [{ topic: 'Base rates', reason: 'A foundation for interpreting evidence without confusing sensitivity with probability.' }],
    startingLessonId: 'beliefs', lessons: [
      { id: 'beliefs', title: 'Beliefs before evidence', question: 'What do you believe before you see the next clue?',
        overview: 'A prior makes your starting assumptions visible. Explore why the same clue can mean different things in different contexts.',
        objectives: ['Describe a prior in ordinary language.', 'Identify assumptions behind a probability estimate.'], prerequisites: [], sources: [],
        modules: [
          { id: 'intuition', title: 'A forecast before the data', purpose: 'Make your starting model explicit.', method: 'Prediction', task: 'Predict tomorrow’s chance of rain before seeing the forecast. Explain what information influenced your estimate.' },
          { id: 'assumptions', title: 'What did you assume?', purpose: 'Notice how background knowledge shapes a prior.', method: 'Assumption hunting', task: 'List three assumptions behind your estimate, then explain which new observation could change each one.' }
        ] },
      { id: 'evidence', title: 'How evidence changes a belief', question: 'When should a new clue change your mind?',
        overview: 'Compare how likely a clue is under competing explanations. Use a concrete population to see why a rare cause can remain unlikely.',
        objectives: ['Compare evidence under two explanations.', 'Explain why base rates matter.'], prerequisites: ['Priors and basic fractions'], sources: [],
        modules: [
          { id: 'examples', title: 'A clue in two different worlds', purpose: 'Ground conditional probability in a concrete example.', method: 'Concrete example', task: 'Imagine two bags of colored marbles. Explain how seeing a red marble changes your guess about which bag it came from.' },
          { id: 'transfer', title: 'Take the idea somewhere new', purpose: 'Apply evidence updating outside the original example.', method: 'Transfer', task: 'Choose a surprising news claim. Name your prior belief, the evidence, and what else you would need to update responsibly.' }
        ] }
    ]
  }
}
