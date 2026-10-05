# UX patterns

Governed by [ADR-0007](ADRs/ADR-0007-codex-inspired-design-and-ux.md) and [ADR-0013](ADRs/ADR-0013-chatgpt-inspired-appearance.md). Pair with [design system](patterns-design-system.md) for appearance and [renderer](patterns-renderer.md) for implementation.

**Status:** adopted interaction rules. Current runtime capabilities remain those in [learning/data](patterns-learning-data.md). Project setup and outline creation are implemented; acceptance evidence is tracked for milestone behavior in [PRD 01](prds/01-project-setup-and-outline.md); richer Socratic activities remain product direction in [the overview](../docs/overview.md).

Before UI/interaction work, select the relevant [documented flow and screenshots](patterns-flow.md), especially [topic editing](flows/topic-edit/index.md), [outline generation](flows/outline/index.md), [projects](flows/projects/index.md) and [appearance](flows/appearance/index.md). Read the journey and assertion scope, then view selected checkpoints. Flow patterns own automatic refresh and AI narrative maintenance; exercise the running journey for behavior.

## Orientation and progressive disclosure

Under [ADR-0022](ADRs/ADR-0022-shared-pi-streaming-lifecycle.md), all inference must use the visible workbench panel with actual waiting/activity, measured elapsed time, supported Cancel and a provisional preview. Other AI submissions remain paused until owner cleanup/domain settlement, while saved reading and ordinary disclosures remain usable. Preserve submission drafts/focus/reading position and explicit Stay here / Cancel and switch navigation; closing an overlay never cancels inference. The coordinator/bridge foundation exists, but producer/panel migration remains pending. Read [AI operations](patterns-ai.md) before implementing that interaction.

At any point the learner can identify the current subject/project, the current activity or document, what is happening, and the next useful action. Keep project navigation stable while the main workspace changes between setup, learning, and review. The header identifies the selected work; it does not repeat every setting or folder detail.

Start with compact navigation and a spacious task area. Add a contextual detail pane for the selected lesson, source, or result only when it helps the current decision. Keep support information close to the part of the activity it explains. Broad tutorials and account configuration should not interrupt an already-understood learning action.

Group navigation by meaningful learner objects. The product hierarchy remains project → lesson → module → session. Show only the levels implemented and useful for the current task. Pinning, search, grouping, tabs, and recent-item navigation require working behavior before their controls appear.

## Input and next action

Give each state one clear primary action. Labels say what the learner will do: **Open project**, **Create outline**, **Check answer**, or **Retry save**. Opening a folder, changing a model, or expanding details does not itself start an inference request.

A topic phrase is enough to begin the proposed outline flow. Keep additional goals/context optional where the PRD allows them. Show a large, labelled input in an empty workspace; an existing outline or activity becomes the visual focus once available. Do not force a setup questionnaire before the first useful result.

Keep drafts until an action succeeds, and keep them with their owning workspace when changing views. Preserve oversized pasted text and explain submission limits without truncating the draft. Use normal multiline editing: Enter inserts a newline; an explicit submit button performs the action. When a submission shortcut is implemented, Cmd+Enter on macOS or Ctrl+Enter on Windows/Linux submits, except during input-method composition. Show its hint where it can be discovered.

Compact context controls contain only decisions that affect the action. The draft milestone's visible model choice matters to inference; provider endpoints, token fields, Pi configuration, and tool logs do not belong in the ordinary learning journey.

## Capability boundaries

| Surface | Implemented now | Guidance when the relevant milestone is implemented |
| --- | --- | --- |
| Home/navigation | Persistent project rows, native folder selection, dashboard | Project rows, clear empty state, and Open project; preserve the selected workspace. |
| Main input | Large project-specific learning-goal draft | Topic/intent input for project outlines; show which material informs the request. |
| Activity | No lesson-delivery activity in this milestone | Explain the activity, ask for useful learner work, and keep feedback connected to that work. |
| Results | Generated, validated and saved outline documents with coverage | A readable outline with ordered lessons, objectives, and module plans; selected-item details through disclosure. |
| Account/model | ChatGPT connection, permission/recovery states, account model discovery and project preference | Project model selection is implemented; browsing saved content remains usable without inference access. |
| Saved project state | Portable `.edu` metadata and profile recent-project registry | Distinguish generation from a confirmed `.edu` save and preserve the last saved outline during regeneration. |

A documented target does not justify placeholder connected states, dummy saved indicators, inactive future toolbars, or a simulated tutor presented as working AI.

## Appearance settings

Settings is available from the outer rail (bottom strip at narrow sizes) and Cmd/Ctrl+comma. Its Appearance group offers Light and Dark previews with native radio keyboard behavior. Apply the mode without closing the current project, resetting its draft, changing scroll position or touching an AI run. Escape, the close button and Done dismiss Settings and return focus to its trigger. Persist only the local presentation preference; if saving it fails, the current session still changes and the dialog explains the limit.

## Progress and recovery

Keep the learner's context visible during work. Progress text names a real operation or backend-reported phase. Use determinate progress only when the backend can measure it. A busy indicator, generated result, saved result, and learning completion are separate states.

| State | Presentation and recovery |
| --- | --- |
| Loading/opening | Identify the workspace being opened; keep the shell stable; offer retry on failure. |
| Empty | Explain what can be done here and show one starting action. Preserve useful navigation. |
| Ready | Show the current material/input and the action that will advance the task. |
| Running | Show honest progress near the task; preserve input and existing content; prevent duplicate submission. Offer Stay here or Cancel and switch before leaving an active generation run. |
| Needs input/connection | State the missing decision or permission and provide the relevant action without discarding work. |
| Cancelled | Stop the supported operation, retain useful drafts/prior results, and make restarting explicit. |
| Failed | Explain the failure in plain language near the affected surface; give a useful retry or recovery action. |
| Generated but unsaved | Keep the new result visible, identify its unsaved state, and offer save retry without repeating inference. |
| Saved/completed | Confirm the specific result. Persisted means backend-confirmed save; question completion is a local activity checkpoint. |

Show **Cancel** only for an operation that can actually be cancelled. Closing a panel dismisses that panel; cancelling work affects its operation. Preserve the last successful outline and relevant drafts on cancellation/failure. A failed save should not consume another inference request just to retry storage. Under [ADR-0012](ADRs/ADR-0012-generation-recovery-and-navigation.md), detected external-edit conflicts require explicit replacement confirmation and a fresh project-identity check. Keep the unsaved result readable even if the project folder becomes unavailable.

Replacing or deleting durable learner work requires a clear statement of the affected content and the meaningful choice or recovery path defined for that feature. Routine navigation and disclosure stay immediate. Important failures remain visible until resolved; short confirmations may be transient. Do not expose stacks, provider internals, or credentials in learner messages.

## Review and learning interaction

Under [ADR-0019](ADRs/ADR-0019-topic-edits-and-project-file-access.md), each lesson/topic row has a separate, always keyboard-reachable edit icon beside its disclosure. Reuse the outline dialog with a named topic, current-topic details and a freeform change input. Explain that only this topic and its own folder can change, while Pi may read the project for context. Use explicit **Rewrite topic**, the existing submission shortcut and recovery states. Keep drafts by project/topic content, separate from the whole-path draft. Saving one topic preserves drafts for unchanged topics. Opening/dismissing starts no inference and restores trigger focus. Saving updates only the selected topic, its owned folder plan and staged content files. During topic conflict recovery, describe replacement of only this topic into the latest outline, with unrelated sections/goals preserved and source-file conflicts still protected.

Under [ADR-0017](ADRs/ADR-0017-outline-rewrites-with-saved-context.md), a quiet, keyboard-accessible edit icon beside “Your path through the subject” opens a native dialog for numbered or freeform changes. Show current numbered topics through disclosure, identify the selected model and allowance use, and state that a successful save replaces the outline. Opening/dismissing starts no inference; Escape restores trigger focus. Preserve full project/outline-keyed drafts on dismissal, cancellation or failure, including oversized input. Use explicit Rewrite outline or IME-safe Cmd/Ctrl+Enter. Disable edits during competing operations, for read-only state or while a result is unsaved. Keep the current outline readable during the rewrite and reuse generation/save recovery. Inherited source evidence is visibly distinguished from sources read during this revision.

Keep outputs readable as working documents. Use lesson rows and expandable module plans for outlines, with sources/assumptions available where needed. Preserve place when expanding a lesson or viewing supporting material. An AI-proposed outline is a revisable proposal; show its assumptions and material-informed coverage as required by the PRD.

In future Socratic sessions, orient the learner to the activity and ask one useful question at a time. Keep their explanation, prediction, or revised model easy to find beside the feedback that addresses it. Show a clear stopping point and a useful way to return. The module repertoire remains in [Socratic learning](../docs/socratic-learning.md); this UI update does not select an assessment algorithm or infer mastery from a badge.

The optional account model tests under [ADR-0015](ADRs/ADR-0015-explicit-model-access-verification.md) and [ADR-0016](ADRs/ADR-0016-requested-extra-model-choices.md) explain allowance use before the action and show testing, verified, failed or cancelled feedback. Show independent Sol/Luna verification buttons; provide Cancel model test during the request. Dismissing settings does not cancel it. Disable competing inference and connection changes. Count model choices rather than asserting access, and identify Sol/Luna as extras. These choices survive refresh/restart independently of verification badges; other missing saved choices retain their existing recovery behavior.

## Keyboard, focus, and scrolling

Every supported action is reachable by keyboard. Tab follows the visible reading/action order; focus is clearly visible. Native text selection, editing, copy, and undo remain available in inputs. Icon buttons have accessible names and tooltips; active navigation uses an appropriate selected/current state.

Target shortcut conventions, when their commands are implemented:

| Action | macOS | Windows/Linux |
| --- | --- | --- |
| Open folder/project | Cmd+O | Ctrl+O |
| New session/work item | Cmd+N | Ctrl+N |
| Command menu | Cmd+Shift+P | Ctrl+Shift+P |
| Settings | Cmd+, | Ctrl+, |
| Toggle sidebar | Cmd+B | Ctrl+B |
| Submit multiline input | Cmd+Enter | Ctrl+Enter |

List supported shortcuts in menus or command help. Escape closes the topmost menu/dialog and restores focus to its trigger. It should not silently discard a draft or cancel a remote operation. Do not override text-editor shortcuts globally; scope shortcuts to the focused surface and avoid input-method composition conflicts.

After navigation, focus the new workspace heading or the relevant input without unexpectedly submitting. After a validation error, focus the first invalid field and associate its message. After an asynchronous result, announce completion without stealing focus from a learner who is writing elsewhere. Preserve reading/scroll position within an activity; autoscroll a future transcript only while the learner remains at its end.

Use semantic headings, labelled fields/groups, status announcements, and accessible disclosure/menu/dialog behavior. Text zoom, contrast, reduced motion, and native desktop controls are part of the journey. Visual state always has a text/semantic counterpart.

## Acceptance evidence

Review the complete supported journey through empty, ready, pending, recovery, and success states. Check switching workspaces with an unfinished draft, long material, keyboard-only use, and narrow/zoomed windows. Claims about persistence, cancellation, account access, or learning outcomes require their own backend evidence; the appearance of a control does not establish those capabilities.
