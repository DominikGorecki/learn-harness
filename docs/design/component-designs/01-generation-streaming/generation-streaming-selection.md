# Generation Streaming Design Selection

Accepted by the user on October 5, 2026. This records design approval; application implementation is a separate task.

## Selected Direction

Use the single-window image from revision 03: a bottom split panel contained within the main workspace, with vertically connected activity icons. It combines sheet 02 option 4's layout with option 3's connected timeline. The user explicitly approved this exact standalone image. The final asset is an unchanged copy of that image, preserving the accepted appearance without regeneration.

## Final Reference

![Selected generation streaming design](generation-streaming-final.png)

## Visual Properties

- Place the generation panel beneath the saved outline, inside the main content region. Its left edge starts to the right of project navigation. Leave the rail, sidebar and Account footer unobstructed.
- Use a stable panel header: affected topic or operation and learner request on the left; measured elapsed time and Cancel on the right.
- Split the body into a narrower activity column and a wider streaming draft column, separated by a subtle vertical rule.
- Connect activity icons with thin vertical lines. Completed activity uses a green check, current activity a purple circle, upcoming activity a muted hollow circle. Icons are visual status indicators, not hyperlinks.
- Keep the saved outline readable above the panel. Emphasize the active topic while retaining its saved content until publication. Gray and disable competing AI controls.
- Use neutral system sans-serif typography, restrained purple accents, thin borders, approximately 18–20 px panel corners and generous spacing. The image's dimensions and proportions are reference values, not measured CSS requirements.
- Reuse existing dark tokens: `surface-canvas`, `surface-navigation`, `surface-raised`, `text-primary`, `text-secondary`, `border-subtle`, `accent` and `state-success`. Use semantic tokens for the corresponding Light appearance rather than hardcoded dark values.

Visible sample copy:

- Heading: “Updating Historical foundations”.
- Request: “I would like to learn further history on this topic.”
- Timer: “00:42 elapsed”.
- Activities: “Read topic notes”, “Drafting historical context”, “Check and save”.
- Draft label: “Draft preview · Not saved”.
- Action: “Cancel”.
- Scope: “Only this topic will change.”
- Restriction: “Other AI actions are paused.”

Topic names, request text, elapsed time and activity labels are dynamic. The draft prose in the image is illustrative; it is not approved curriculum content.

## Behavior and Adaptation

Agreed direction:

- Show the panel as soon as the learner starts generation, retaining visible context instead of leaving only a small status banner.
- Show actual activity and a progressively populated readable draft. No raw JSON, developer logs or private thinking in the ordinary learner UI.
- Allow one AI call at a time across the app. Other AI actions remain unavailable until the run finishes or is cancelled. Saved content remains readable.
- Keep provisional preview content separate from the saved outline and staged file changes. Topic edits preview only the selected topic. Completed inference, validation and durable saving remain distinct outcomes.
- Keep Cancel available while cancellation is supported; existing saving rules remove cancellation once publication starts.
- Preserve previous work and request drafts on failure or cancellation. Retain generated-but-unsaved results for storage-only retry using the existing conflict recovery rules.

Shown: a running topic rewrite with a completed material read, an active drafting stage, an upcoming validation/save stage and an unsaved preview. Only report operations that actually occur; these three sample steps are not a mandatory or percentage-based sequence.

Implementation still needs the waiting-before-first-output, validation, saving, saved, needs-details, cancellation, inference failure and unsaved/save-conflict presentations. Initial outlines and whole-outline rewrites should use the same panel family with accurate operation titles and scope text. Do not claim that only one topic changes during a whole-outline request.

Responsive and accessibility requirements to verify:

- Keep the panel within the main workspace at narrow widths and 200% zoom. Stack activity and preview when needed; preserve reachable Cancel and readable draft content.
- Maintain reading position as streamed content grows; do not force scroll when the learner is reading earlier content.
- Provide real button semantics for Cancel and disabled AI actions. Do not rely on dimming or color alone to explain state.
- Announce meaningful activity transitions politely, avoiding an announcement for every streamed character. Keep streamed content selectable and readable.
- Preserve keyboard/focus continuity when the edit dialog yields to progress. Navigation retains the existing Stay here / Cancel and switch choice.
- Respect reduced motion. Verify contrast, focus visibility and error recovery in both themes.

## Implementation Handoff

Verified current surfaces:

- `src/renderer/src/app/App.tsx` owns edit-dialog submission and workspace composition.
- `src/renderer/src/features/projects/GenerationStatus.tsx` currently renders the small progress row.
- `src/renderer/src/features/projects/useGeneration.ts` subscribes to typed generation snapshots.
- `src/main/generation/pi-outline-engine.ts` owns the Pi agent and provider stream.
- `src/main/generation/worker-protocol.ts` and `src/shared/generation.ts` define worker messages and public run state.

The eventual implementation should project bounded Pi activity/text/partial-tool updates through the worker and main-owned run state to the typed bridge. Correlate previews with the owning run/project/topic, batch UI updates, treat partial tool arguments as provisional, and retain current completed-stream acceptance and topic isolation. Do not log draft content or expose tokens/provider internals. Existing architecture, IPC, recovery and validation guidance continues to govern the implementation.

This reference establishes visual direction, not working streaming, tested interaction, accessibility certification or implementation authority. No application code was changed in this design task.

## Iteration History

- [Sheet 01](generation-streaming-sheet-01.png): six broad placements. User preferred right-panel and bottom-panel directions.
- [Sheet 02](generation-streaming-sheet-02.png): three right-panel and three bottom-panel refinements. Bottom panels were corrected to stay within the main workspace. User preferred option 4 and requested connected icons from option 3.
- [Revision 03](generation-streaming-revision-03.png): one enlarged standalone bottom split panel with connected activity icons. User approved this exact image as the final reference.
- [Exploration notes](generation-streaming-exploration.md): scope, tradeoffs and inspection limits.
- Method: built-in image generation using actual reference images. Prompts: [01](generation-streaming-prompt-01.txt), [02](generation-streaming-prompt-02.txt), [02 boundary repair](generation-streaming-prompt-02-repair.txt), [03](generation-streaming-prompt-03.txt).

## Subsequent implementation evidence — 2026-10-05

The locked design above remains the approved concept and records its original design-task inspection. Subsequent implementation is governed by [ADR-0022](../../../../ref/ADRs/ADR-0022-shared-pi-streaming-lifecycle.md) and [AI operations](../../../../ref/patterns-ai.md). Actual [long-stream](../../../../ref/flows/ai-streaming/index.md), [candidate repair](../../../../ref/flows/ai-streaming-repair/index.md), [outline adaptation](../../../../ref/flows/outline/index.md) and [model-access](../../../../ref/flows/model-access/index.md) journeys show the implemented panel. [Validation](../../../../ref/work/02-ai-streaming/validation.md) records exact checks and limitations; these links do not turn the design images into runtime or accessibility evidence.
