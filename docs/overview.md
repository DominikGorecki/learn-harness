# Education Harness: product overview

Date: 2026-10-04  
Status: Product direction from the initial discussion; describes intended behavior.  
Working application name: Learning Studio.

This document captures the broad product approach. The [starting-point PRD](../ref/prds/01-project-setup-and-outline.md) defines the first functional milestone on top of the existing desktop skeleton. Future capabilities described here are not requirements for that milestone unless the PRD includes them.

## Product purpose

Build a personal learning workspace for Windows, macOS, and Linux where AI helps someone research a subject, construct an understanding of it, test that understanding, and return to it over time.

The education harness gives each learning journey a persistent home. A project brings together its purpose, outline, source material, lessons, activities, and the learner's evolving explanations. Someone returning after a week should be able to understand where they left off and what would be useful to do next.

The experience should feel like a focused desktop learning workspace inspired by the user-supplied ChatGPT desktop screenshots ([light](chatgpt-app-light.png), [dark](chatgpt-app-dark.png)). Follow the [design system](../ref/patterns-design-system.md) for neutral surfaces, readable system typography, and restrained visual hierarchy, and [UX patterns](../ref/patterns-ux.md) for project navigation, learner input, progress, and recovery. Make the current task obvious and expose additional complexity when it serves the activity. The project workspace now implements this direction. The [implementation validation record](../ref/work/01-project-setup-and-outline/validation.md) separates completed local behavior from outstanding live-provider and manual account acceptance.

## Learner and product principles

The working audience assumption is a self-directed adult pursuing a subject for personal or professional reasons. This has not yet been confirmed as an exclusive audience. Students following a curriculum and educators authoring material remain possible future directions.

The product follows these principles:

1. **A topic is enough to start.** A learner can enter a few words or a detailed brief. The AI builds a useful outline from either.
2. **Existing material is a starting point.** The AI uses project content to understand the subject and expands the learning path to fill relevant gaps and prerequisites.
3. **Understanding becomes visible through activity.** Explanations, predictions, counterexamples, and revisions give the learner something concrete to examine.
4. **The learner controls the journey.** They can change scope, choose a different activity, ask for help, and challenge the tutor's feedback.
5. **Structure remains revisable.** The outline provides direction while accommodating discoveries and changing interests.
6. **Continuity matters.** Goals, learning work, and useful context survive returning to the project.
7. **Every control has a purpose.** Beautiful presentation comes from composition, typography, spacing, and clear behavior.

## Projects and ownership

A learning project is an ordinary folder representing a topic, subject, or learning goal. It does not need to be a Git repository. The learner can open an existing folder or choose an empty folder for a new subject.

The dashboard lists known projects and makes them easy to reopen. As the product develops, a project entry can communicate its purpose, recent activity, and a useful place to resume. Missing or moved folders should have understandable recovery options.

The project follows prescribed conventions, with all project metadata held in a `.edu` folder at its root. The learning outline is also saved there. Existing source material remains available in the project and is preserved during AI work.

Project state should travel with the folder. Account credentials belong to the person's application connection and must stay outside the learning project. The application remembers where projects are located without turning their folder paths into dependencies of the learning content itself.

The exact organization of future lesson documents, notes, and other learner artifacts is still to be decided. Human-readable learning work and practical portability are desired product qualities.

## Learning hierarchy

| Element | Purpose | Example |
| --- | --- | --- |
| Project | Overall subject, learning purpose, scope, and route | Understanding inflation |
| Lesson | A coherent subtopic with its own objectives | Money creation and prices |
| Module | A focused activity that develops or examines understanding | Predict how a change in money supply affects prices |
| Session | An attempt at an activity, including responses and feedback | Today's prediction exercise and revised explanation |

A lesson represents a subtopic. Larger projects may benefit from sections grouping lessons, but an additional mandatory topic layer would add unnecessary structure at the outset.

Each level provides appropriate orientation. The project overview explains the journey. The lesson overview introduces its central question and concepts. The module introduction explains the activity and its purpose. Sessions preserve the learner's work so they can revisit an activity without losing earlier attempts.

Lessons can eventually support manual ordering and views such as order added or chronological order. Intended learning order, display order, and the AI's recommended next activity are distinct concepts. Changing a view should preserve the learning plan.

## Starting a learning project

Opening a folder establishes the active workspace. It does not automatically start inference, rewrite content, or begin a lesson. The learner starts outline creation with a clear action.

### Starting with existing content

The AI examines supported material in the chosen folder and identifies the apparent subject, themes, depth, and missing foundations. It builds a complete proposed outline informed by that content.

The application shows its interpretation with the outline. For example: “These materials focus on urban planning, especially housing density, transport, and zoning.” The learner can correct the direction or add a goal.

Materials provide evidence about the subject. The learner's prior understanding remains an assumption until they describe it or demonstrate it through learning activities.

### Starting with a description

An empty project presents a large input field in the main workspace:

> **What would you like to learn?**  
> Enter a topic, describe a goal, or give as much context as you like.

“Bayesian reasoning” is sufficient input. A longer description can specify an intended application, starting knowledge, desired depth, particular questions, or an existing syllabus. Optional guidance helps someone express their intent without requiring a questionnaire.

If the folder has no usable content, the same experience lets the learner supply a topic. Mixed or ambiguous material can be clarified through the input field.

### Combining material and intent

The learner's explicit description directs the interpretation of the folder. If existing material concerns urban planning but the learner asks to focus on housing economics, the outline should follow that goal while using relevant material.

Sparse input should produce reasonable, visible assumptions about scope and depth. The learner can refine those assumptions after seeing the first useful result.

## A complete proposed outline

The outline should describe a coherent learning path within an explicit scope. It includes:

- A project title and subject overview.
- Learning outcomes and a proposed level of depth.
- Assumptions made from incomplete information.
- An ordered sequence of lessons, including necessary foundations.
- A short overview, central question, and objectives for each lesson.
- Proposed modules with purposes and suitable learning methods.
- Connections to supplied materials and reasons for suggested additions.
- A recommended starting lesson.

The AI should fill relevant gaps even when those topics do not appear in the folder. Foundations, conceptual connections, applications, and competing perspectives can be necessary additions. A complete outline is comprehensive within its stated purpose; it should not claim to cover every possible aspect of a subject.

The learner should be able to distinguish material informed by their sources from AI-proposed additions. Suggested references must be identified as suggestions, and sources should never be fabricated.

The complete outline can exist before every lesson is fully authored. Written lesson material and exercises can develop as the learner progresses. How much material to prepare in advance is a later product decision.

## Socratic learning experience

[Socratic learning](socratic-learning.md) provides the conceptual foundation: a repertoire of intellectual pressure tests that make an explanation more precise, useful, and defensible.

A representative learning loop is:

1. Establish the learner's current intuition.
2. Ask them to construct an explanation, analogy, argument, or model.
3. Examine the causal links and assumptions in that model.
4. Introduce a useful counterexample, competing explanation, or boundary case.
5. Ask the learner to predict or apply the revised idea.
6. Explore transfer to another situation.
7. Capture a concise explanation and the remaining uncertainties.

The tutor chooses useful methods for the topic and the learner's response. Every session does not need to follow every step. The activity should have a purpose and a recognizable stopping point.

| Module family | Learner's activity | Possible methods |
| --- | --- | --- |
| Explore | Investigate material and form initial questions | Concrete examples, concept construction from examples |
| Explain | Construct and communicate an understanding | Explain from scratch, metaphor generation, explanation ladder, teach-back |
| Examine | Identify mechanisms, assumptions, and distinctions | Why-chain, assumption hunting, compare/contrast, classification |
| Apply | Use a model in an unfamiliar situation | Prediction, reverse engineering, transfer, constraint removal |
| Challenge | Test the limits of an explanation or argument | Counterexample search, adversarial dialogue, steelman opposition |
| Synthesize and revisit | Capture and later examine the current understanding | Compression, retrieval, fresh examples |

These families make the product understandable while allowing the tutor to select specific techniques. A learner can follow a guided route or deliberately choose a method such as counterexample hunting.

## Tutor relationship and learner control

The AI should provide useful challenge at a manageable level. A learner who lacks a prerequisite may need an explanation before further questioning. A learner who is stuck may need a hint, a smaller question, or another example.

The learner should be able to ask for an explanation, request a worked example, change the level of challenge, switch methods, pause, and summarize. They should also be able to dispute feedback.

Feedback should distinguish a factual correction, a weakness in reasoning, and a question with multiple defensible positions. The tutor should state uncertainty and make the basis for its feedback understandable.

The learner's own explanations remain important artifacts. An AI summary can help organize them, but the application should preserve what the learner actually said and how it changed.

## Research and evidence of learning

Research should feed the learning journey. A question discovered during a session can lead to investigating material, adding a prerequisite, or revising an explanation. The learner should be able to distinguish a source's position, the AI's interpretation, and their own conclusion.

The long-term project records explanations, examples, predictions, revised beliefs, unresolved questions, and concepts worth revisiting. Progress can describe what the learner demonstrated and what support they needed.

Module completion is a record of participation. Claims about understanding or retention require appropriate evidence, such as applying an idea to a fresh case or explaining it again later. A single mastery score, grading policy, and review schedule have not been decided.

## Interface direction

The visual thesis is a calm desktop workspace with a softly tinted outer shell, system sans-serif typography, generous spacing, and a restrained purple accent. The supplied ChatGPT screenshots inspire a slim icon rail, compact project navigation, an inset working surface and a rounded composer. Settings → Appearance offers Light and Dark, applies immediately and remembers the choice on this device. With no saved choice, the initial mode follows the OS preference. The theme covers learning content, controls and dialogs; native window chrome remains managed by the OS. Shared visual values live in the [design system](../ref/patterns-design-system.md); input, navigation, feedback, and recovery contracts live in the [UX patterns](../ref/patterns-ux.md).

The content hierarchy is simple: dashboard for choosing a project; project workspace for the current task; optional details for information needed occasionally. Project title and model choice orient the learner. An empty project's large input field is the dominant interaction. A completed outline becomes the dominant reading surface.

Prefer project rows, document-like outlines, and clear disclosure over a dashboard of cards. Keep account information and secondary actions quiet. Avoid unnecessary inspectors, technical logs, decorative metrics, or controls for future features.

Interactions should reinforce orientation: a short workspace transition, clear hover and keyboard focus, and smooth expansion of outline details. Progress should communicate real activity. Reduced motion, readable zoom, useful keyboard navigation, and clear error recovery are part of the experience.

## Authorized AI and project conventions

These are the explicit technical exceptions to the product-focused discussion:

- Use Sign in with ChatGPT with delegated ChatGPT-plan inference, based on OAuth 2.0 / OpenID Connect with PKCE.
- AI requests consume the person's eligible included Codex / ChatGPT Work usage. Identity and plan usage require separate authorization. Connected-app activity shares existing plan limits. [OpenAI's user guidance](https://learn.chatgpt.com/docs/sign-in-with-chatgpt).
- Use Pi as the backing harness to understand project content and produce the outline in `.edu`.
- Reuse Pi's existing dedicated ChatGPT subscription flow as the basis for login. Source review of published Pi 1.0.2 confirmed that flow; actual operation within this application remains to be validated. See the [PRD's evidence and integration constraints](../ref/prds/01-project-setup-and-outline.md#authorized-technical-constraints-and-pi-evidence).
- Each project has its own selected model, drawn from the connected account's available choices.
- All project metadata belongs under the root `.edu` folder. Credentials stay outside it.

Pi is part of how the application accomplishes its work. Product screens should explain the subject, activity, and outcome using learner-facing language.

## Product progression

The [first milestone](../ref/prds/01-project-setup-and-outline.md) establishes functional ChatGPT plan access, opening and reopening projects, selecting a project model, generating an outline from material or input, and saving it under `.edu`.

Subsequent product discussions can define outline editing and richer ordering, lesson authoring, Socratic sessions, research workflows, learner artifacts, and revisiting concepts. Their order and acceptance criteria require separate PRDs.

Questions still open include the primary audience, subject-specific learning expectations, lesson depth, evidence of understanding, research capabilities, and the exact authoring experience. They do not prevent defining the focused first milestone.
