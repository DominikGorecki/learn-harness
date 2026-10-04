import type { Course } from '../../shared/contracts'

export interface CourseDefinition {
  course: Course
  correctChoiceId: string
  correctFeedback: string
  incorrectFeedback: string
}

export const courseDefinitions: CourseDefinition[] = [
  {
    course: {
      id: 'typescript', title: 'TypeScript essentials', summary: 'Make the shape of your data explicit.', durationMinutes: 5,
      lesson: {
        title: 'Types describe what a value can be',
        paragraphs: [
          'JavaScript runs your program. TypeScript checks the shapes of values before it runs. A type can describe a string, a number, or an object with named fields.',
          'For example, a learner can have a name that is a string and a lessonsCompleted count that is a number. The checker can catch a misspelled field or a string used where a number is expected.',
          'Those types are erased when the program is built. Data arriving from a file, network, or another process still needs validation while the program runs.'
        ]
      },
      question: {
        prompt: 'A value arrives from an external API. Does declaring a TypeScript type prove that the value has that shape?',
        choices: [
          { id: 'compile', label: 'Yes. TypeScript checks incoming data at runtime.' },
          { id: 'validate', label: 'No. The incoming value still needs runtime validation.' },
          { id: 'convert', label: 'Yes. A type declaration converts the value automatically.' }
        ]
      }
    },
    correctChoiceId: 'validate',
    correctFeedback: 'Exactly. A type helps you write code, but a runtime check establishes whether incoming data actually matches it.',
    incorrectFeedback: 'Think about when the checker runs: before the program executes. The arriving value needs a runtime check. Try again.'
  },
  {
    course: {
      id: 'web', title: 'How the web works', summary: 'Follow a request from browser to server.', durationMinutes: 4,
      lesson: {
        title: 'A request starts a conversation',
        paragraphs: [
          'A browser sends an HTTP request to a server. The request identifies a resource and an action, such as asking to read a page.',
          'The server responds with a status, headers, and usually a body. The body might contain HTML, an image, or structured data.',
          'The browser uses HTML for structure, CSS for presentation, and JavaScript for interactions. A page often makes several requests for the resources it needs.'
        ]
      },
      question: {
        prompt: 'Which part of an HTTP response indicates whether a request succeeded?',
        choices: [
          { id: 'style', label: 'The CSS stylesheet.' },
          { id: 'status', label: 'The response status code.' },
          { id: 'address', label: 'The browser window size.' }
        ]
      }
    },
    correctChoiceId: 'status', correctFeedback: 'Yes. The status code communicates the outcome of the request; for example, 200 indicates success.',
    incorrectFeedback: 'Look for the part of the response that communicates its outcome, rather than how the page looks. Try again.'
  },
  {
    course: {
      id: 'learning', title: 'Practice remembering', summary: 'Try recalling an idea before looking it up.', durationMinutes: 3,
      lesson: {
        title: 'Give yourself a chance to recall',
        paragraphs: [
          'After reading an idea, close the material and try to explain it in your own words. This gives you a way to notice what you can recall and where you need another look.',
          'Compare your explanation with the material. Correct the gaps, then try a related question or example.',
          'A single correct answer is a useful checkpoint. It does not tell you whether you will remember the idea next week or use it in a new situation.'
        ]
      },
      question: {
        prompt: 'Which action gives you a direct check of what you can recall?',
        choices: [
          { id: 'highlight', label: 'Highlighting every paragraph while it is open.' },
          { id: 'reread', label: 'Looking at the same paragraph again immediately.' },
          { id: 'recall', label: 'Closing the material and explaining the idea from memory.' }
        ]
      }
    },
    correctChoiceId: 'recall', correctFeedback: 'Yes. Explaining from memory gives you something concrete to compare with the original idea.',
    incorrectFeedback: 'Try an action that asks you to produce the idea while the material is out of sight. Try again.'
  }
]
