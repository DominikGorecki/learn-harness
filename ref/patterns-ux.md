# UX patterns

Governed by [ADR-0007](ADRs/ADR-0007-codex-inspired-design-and-ux.md), [ADR-0013](ADRs/ADR-0013-chatgpt-inspired-appearance.md) and the contributor integration discipline in [ADR-0023](ADRs/ADR-0023-navigation-history-integration.md). Pair with [design system](patterns-design-system.md) for appearance and [renderer](patterns-renderer.md) for implementation.

**Status:** adopted interaction rules. Current runtime capabilities remain those in [learning/data](patterns-learning-data.md). Project setup and outline creation are implemented; acceptance evidence is tracked for milestone behavior in [PRD 01](prds/01-project-setup-and-outline.md); richer Socratic activities remain product direction in [the overview](../docs/overview.md).

Before UI/interaction work, select the relevant [documented flow and screenshots](patterns-flow.md), especially [topic editing](flows/topic-edit/index.md), [outline generation](flows/outline/index.md), [projects](flows/projects/index.md) and [appearance](flows/appearance/index.md). Read the journey and assertion scope, then view selected checkpoints. Flow patterns own automatic refresh and AI narrative maintenance; exercise the running journey for behavior.

## Orientation and progressive disclosure

Under [ADR-0022](ADRs/ADR-0022-shared-pi-streaming-lifecycle.md), all inference must use the visible workbench panel with actual waiting/activity, measured elapsed time, supported Cancel and a provisional preview. Other AI submissions remain paused until owner cleanup/domain settlement, while saved reading and ordinary disclosures remain usable. Preserve submission drafts/focus/reading position and explicit Stay here / Cancel and switch navigation; closing an overlay never cancels inference. This lifecycle is implemented for all five starts. Account calls remain globally visible across dashboard/project views and carry no project owner; project navigation waits for its owned cancellation before switching. Appearance remains usable during inference. Dismiss hides only a terminal presentation; retained unsaved output and Retry save remain domain-owned. Read [AI operations](patterns-ai.md) before adding another inference interaction.

At any point the learner can identify the current subject/project, the current activity or document, what is happening, and the next useful action. Keep project navigation stable while the main workspace changes between setup, learning, and review. The header identifies the selected work; it does not repeat every setting or folder detail.

Start with compact navigation and a spacious task area. Add a contextual detail pane for the selected lesson, source, or result only when it helps the current decision. Keep support information close to the part of the activity it explains. Broad tutorials and account configuration should not interrupt an already-understood learning action.

Group navigation by meaningful learner objects. The product hierarchy remains project → lesson → module → session. Show only the levels implemented and useful for the current task. Pinning, search, grouping, tabs, and recent-item navigation require working behavior before their controls appear.

## Navigation history integration

The illustrated chapter uses the existing saved-topic destination. TOC focus, Topic plan/generation disclosure, provider setup, reload, confirmed generation and domain recovery add no visits. Delay Back/Forward scroll/focus restoration until all current bounded chapter pages render; a loading plan cannot acknowledge chapter presentation. Provider/progress observations preserve manual reading position. Missing media keeps prose/caption/alternate explanation; explicit local reload retries the same asset version. Read-only and stale context keep saved reading available while mutation/continuation follow their authoritative restrictions. See the [chapter reader](flows/chapter-reader/index.md) and [commands](flows/chapter-commands/index.md) for isolated evidence.

Saved images expose a muted, labelled Regenerate overlay reachable by keyboard and touch. The no-history image dialog offers an editable prompt, selected model and cached one-image estimate, then one original/candidate comparison with caption/alternative text edits and explicit Use this image/Keep original. Original and replacement model labels are separate; recorded candidate details do not inherit a later model's estimate. Normal and narrow/200% layouts retain independent body scrolling and reachable footer controls. Costs remain in provider history regardless of acceptance. Close during generation cancels and awaits owned cleanup; Saving prevents dismissal. Interrupted attempts require explicit Keep before a new generation. Retry save/cleanup is storage-only. Missing preview/read-only access preserves review and saved prose with an explanation. See [image regeneration](flows/image-regeneration/index.md), [recovery](flows/image-regeneration-recovery/index.md) and [barriers](flows/image-regeneration-barriers/index.md).

**Status:** required feature-planning/review discipline, adopted under ADR-0023. Back/Forward and application menus are implemented for session dashboard/project/topic visits. The [navigation flow](flows/navigation/index.md), [acceptance](work/03-menus-and-navigation/acceptance.md) and [validation](work/03-menus-and-navigation/validation.md) record local Windows evidence and remaining native window/menu/accessibility qualifications; [saved topic reading](flows/topic-reading/index.md) subsequently adds stable topic destinations, while module/task expansion remains no-history disclosure.

The shared history retains at most 100 visits for the app session. A project destination uses its profile handle (`ProjectSnapshot.id`), distinct from portable `.edu` identity. A saved-topic destination adds its stable lesson ID and resolves against the current saved outline; a deleted topic canonicalizes to the owning current overview with an explanation. Reading uses no account or inference. **Open first topic** follows the saved recommendation, and Open/Edit commands remain independent under the [main-workspace recipe](patterns-main-workspace.md). Accepted different destinations push and clear Forward; selecting the current location preserves it, Back/Forward traverse without adding visits, and current-location refresh/relink reconciles without a visit. Cancelled/rejected transitions retain the cursor and branch. Restore retained drafts and current-content reading/disclosure/focus context after authoritative content renders; drop obsolete anchors and clamp scroll with a safe heading fallback. History and mementos do not persist across restart or contain old outline versions.

Whenever a feature adds, removes or changes navigation, explicitly track its effect on the shared navigation/history approach. Identify the destination, its stable identity and owning project, all entry points, and whether each action adds a visit, replaces/canonicalizes a location, traverses history or leaves history unchanged. Future real topic/activity destinations inside a project join the same history when implemented; no independent feature stack or placeholder route is justified by this guidance.

Specify restoration of drafts, reading position, disclosure and focus, including safe fallbacks when content is renamed, rewritten, moved or deleted. Titles, filesystem paths and content revisions are not stable destination identity. Resolve destinations against current authoritative state; traversal does not undo writes, restore older content or restart inference. Define failed/cancelled transitions and missing-target recovery before calling the feature complete.

Account for operation ownership at every entry point: preserve current Stay here / Cancel and switch behavior, awaited project cleanup, Saving restrictions and recoverable unsaved output. Same-project saved overview/topic reading uses the current snapshot without backend reselection, stays available during Receiving/Cancelling/Saving and preserves the AI owner. Dashboard/other-project departure retains its guard. Saving rejects departure rather than queuing it; use a fresh permitted navigation command after settlement. Account diagnostics can continue across views. Ordinary disclosures, sidebar toggles, dialogs, model preferences, saves and progress updates have an explicit no-history effect. Update constrained patterns and documented flow coverage when the navigation contract changes, and verify direct visits and Back/Forward through the same supported behavior. [Renderer integration](patterns-renderer.md#navigation-feature-integration) and [required evidence](patterns-development-testing.md#required-evidence) own the implementation and verification obligations.

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

## Provider and Appearance settings

Settings is available from the outer rail (bottom strip at narrow sizes) and Cmd/Ctrl+comma. Its Appearance group offers Light and Dark previews with native radio keyboard behavior. Apply the mode without closing the current project, resetting its draft, changing scroll position or touching an AI run. Escape, the close button and Done dismiss Settings and return focus to its trigger. Persist only the local presentation preference; if saving it fails, the current session still changes and the dialog explains the limit.

Under [ADR-0026](ADRs/ADR-0026-illustrated-topic-content-and-openrouter-media.md), Settings is a wide native no-history dialog with OpenRouter and Appearance categories, independently scrolling content and stacked navigation at narrow widths/zoom. OpenRouter is the initial category; ordinary reopening remembers the category within the app session. Connection, Image generation, Usage and Call history groups use safe named bridge capabilities. The editable password draft survives category changes while open, clears on close or acknowledged save, and cannot be retrieved from the saved connection. Late replies or old native close events must not clear a new session's draft.

Show the three fixed image choices, including a selected unavailable choice and its reason. Label cached one-image estimates with basis, check time and staleness; they are not guaranteed charges. App-reported UTC day/month/all-time spend and unresolved costs are separate from provider-reported key-wide usage/allowance. History offers bounded pages, filters and safe details; a failed page/filter clears stale rows and offers Retry history. Explicit metadata refresh makes no image request and keeps timestamped last-known values on failure. Settings, categories, filters and theme changes leave navigation history and inference activity unchanged. Provider mutations honor authoritative BUSY while an image operation owns the connection; Appearance remains available. See [Settings](flows/openrouter-settings/index.md) and [active-provider admission](flows/openrouter-settings-admission/index.md) for isolated Electron evidence and qualification limits.

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

The optional account model tests under [ADR-0015](ADRs/ADR-0015-explicit-model-access-verification.md) and [ADR-0016](ADRs/ADR-0016-requested-extra-model-choices.md) explain allowance use before the action and show testing, verified, failed or cancelled feedback. Show independent Sol/Luna verification buttons; provide Cancel in the global workbench panel during the request. Dismissing settings does not cancel it. Disable competing inference and connection changes. Count model choices rather than asserting access, and identify Sol/Luna as extras. These choices survive refresh/restart independently of verification badges; other missing saved choices retain their existing recovery behavior.

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
