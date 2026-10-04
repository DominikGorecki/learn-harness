# Spec: Project setup and learning outlines

Status: Ready for implementation
Date: 2026-10-04
Source: [PRD 01](../../prds/01-project-setup-and-outline.md)
Goal: Implement the complete PRD with frequent, coherent local commits.

## Outcome and scope

Replace the primary demo journey with a real desktop project workspace. Learners, including students, connect their eligible ChatGPT plan, open a folder, select its model, and build a complete learning outline from a topic, project material, or both. Opening and reading projects remains useful without an AI connection. Outlines and project preferences persist under the selected folder's `.edu` directory.

The [product overview](../../../docs/overview.md) supplies the longer-term direction. This milestone ends at readable, durable outlines with meaningful Socratic module plans. Live tutoring, full lesson authoring, manual outline editing, additional billing providers, cloud sync, and automatic web research are outside scope.

## Evidence and governing guidance

- [AGENTS.md](../../../AGENTS.md), [pattern index](../../patterns.md), and accepted [ADRs](../../ADRs/INDEX.md) govern source boundaries and verification.
- Follow [design system](../../patterns-design-system.md), [UX](../../patterns-ux.md), and [renderer](../../patterns-renderer.md) guidance. ADR-0007 supersedes the old warm/terracotta/serif presentation.
- Baseline `npm run check`: lint, 55 tests, both TypeScript scopes, and production bundles pass.
- Baseline `xvfb-run -a npm run test:desktop`: the existing real Electron journey passes on Linux.
- Product/design baseline is checkpointed in commit `0922282`.
- Published Pi 1.0.2 packages were inspected without executing package code. Pi Agent Core provides tool execution, bounded lifecycle hooks, progress events, and cancellation. Pi AI supplies the OpenAI Responses transport and subscription credential interfaces.
- Pi's dedicated ChatGPT login requests delegated plan usage, but the published implementation uses a fixed Pi display name, creates a fresh registration on each login, and does not validate the ID token because it does not use profile identity. Learning Studio must adapt that foundation for its own identity and returning-account requirements.

Primary references: [Pi Agent Core](https://github.com/earendil-works/pi/tree/cd32f7725fdbddbaecdff5b1e68491563394e0ca/packages/agent), [Pi ChatGPT login source](https://github.com/earendil-works/pi/blob/cd32f7725fdbddbaecdff5b1e68491563394e0ca/packages/ai/src/auth/oauth/openai-chatgpt.ts), [OpenAI registration](https://developers.openai.com/siwc/token-sharing-open-source/sign-in), [account models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference), and [preview limits](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations). Revalidate upstream behavior when integration evidence contradicts this snapshot.

## Architecture and ownership

Retain one TypeScript package and the existing Electron process boundaries.

| Owner | Responsibility |
| --- | --- |
| `src/shared` | Serializable workspace/account/project/outline contracts; strict request and saved-document validation; safe error codes |
| `src/core` | Project/workspace use cases, generation lifecycle, outline invariants, learning prompt; injected storage, account, generator, clock, and identity ports |
| `src/main` | Native folder dialogs, account connection, encrypted credential persistence, scoped filesystem adapters, application registry, worker ownership, and IPC authorization |
| Pi utility process | One generation run, Pi agent loop, scoped educational tools, plan-compatible Responses transport, and sanitized progress/result messages |
| `src/preload` | Named methods and one sanitized workspace-event subscription with unsubscribe |
| `src/renderer` | Project navigation, account panel, model selection, description drafts, generation state, and outline presentation |

Use `@earendil-works/pi-agent-core` and `@earendil-works/pi-ai` as the backing Pi harness. The agent core is Pi's actual agent loop; the coding CLI's terminal UI, general shell tools, and automatic extension/config discovery are unnecessary for this education workflow. The application explicitly supplies its learning instructions and permitted tools. This is a deliberate use of Pi's composable runtime, not a separate agent-loop implementation.

Run generation in an Electron utility process so heavy dependency loading, context processing, and the remote run cannot stall the window lifecycle. Main controls the process and terminates it after settlement, cancellation, timeout, or application exit. Only one generation may run at a time.

## Account connection

Build an app-owned adapter based on Pi's dedicated ChatGPT public-client flow, retaining upstream attribution for adapted code. Use the official authorization-code/PKCE route, an installation-stable host identity, the application name, and the returned client registration. Use a loopback callback with exact attempt identity and a bounded lifetime. Open only an internally constructed, allowlisted authorization URL through the system browser.

Validate the returned ID token's signature, issuer, audience, expiry, and nonce before accepting account identity. Reuse an existing issued client ID for reconnection, and check that a returning identity matches. Use a maintained JOSE implementation rather than handwritten signature verification. A valid identity without the delegated permission remains visibly connected with plan usage disabled. Cancellation or failed replacement preserves an existing usable connection.

Store account state and refresh credentials in the application profile, encrypted with Electron's OS-backed `safeStorage`. Never put credentials in `.edu`, the renderer, logs, screenshots, or fixtures. If the OS cannot offer protected persistence, keep credentials in memory and clearly disclose that reconnection will be needed after quitting; do not silently persist plaintext credentials. Non-secret installation identity can persist independently.

Serialize renewal and sign-out against active work. Refresh before a run and when required for model discovery. Handle invalid/revoked refresh state as reconnect-required. Local sign-out always clears this application's credentials; attempt supported provider revocation and describe its outcome accurately. A reconnect action can reauthorize plan usage without creating routine consent loops.

Fetch the selected account's model catalogue using its delegated token. Show current visible model names in provider order and only models that the Pi Responses transport can use. Do not obtain credentials through ambient API keys or another tool's profile. A bundled Pi catalogue can contribute model metadata, but must not determine account eligibility. A stale model selection remains visible and requires an explicit replacement if unavailable.

## Project and storage contracts

Opening a folder through the native dialog creates a profile registry entry and loads existing state. It creates no `.edu` directory or inference request. Canonicalize the chosen root, deduplicate the registry by its resolved location, and use opaque project handles across IPC. The renderer cannot nominate arbitrary read/write paths.

Application state lives in a versioned profile registry. It holds known folder locations, their handles, last-opened information, and non-secret host identity. Portable educational state lives in a versioned `.edu/project.json` document containing:

- Stable educational project identity and revision.
- Selected model ID and its last known display name.
- Saved learning brief and timestamps.
- The last successfully saved outline, generation model, and material coverage record.

The outline and its metadata share one canonical file so a save cannot expose mismatched versions. The JSON is formatted for inspection; the desktop presents the outline as a document. Copying the project folder is the initial backup/export route. File schemas are versioned from day one; unknown future versions are preserved and reported instead of overwritten.

Use a same-directory temporary file, flush, and atomic replacement for saves. Compare the previously read revision/content before replacement to reject external edits rather than silently clobber them. Keep the last successful outline until a complete replacement is validated and saved. A failed save retains the generated result in memory for `Retry save`, without another AI request.

Refuse symlinked `.edu` state or writes whose resolved scope escapes the selected root. Use bounded reads and reject nonregular state files. Scope every read/write to a registered project and check ownership again before finalizing a run. Missing, read-only, corrupt, unsupported-version, and moved folders are distinct recoverable states. Relocating a known initialized project verifies its stored identity.

## Material inspection

Opening performs only local lightweight capability/metadata inspection; content transmission starts after **Create outline**. The composer explains that relevant material will be used with ChatGPT.

Support UTF-8 text and Markdown first, including nested files. Exclude `.edu`, version-control metadata, dependency/build directories, hidden credentials, executable instruction/config files, symlinks, and binary content. Do not execute project code or load project-provided skills/extensions. Treat file contents as source material, never as instructions controlling the harness.

Build a bounded material inventory with relative paths and coverage reasons. Initial budgets are 200 readable files, 256 KiB per file, 2 MiB of source text per run, and bounded directory traversal. Record excluded, unsupported, oversized, unreadable, and omitted material honestly. Limits are configurable internal policy, surfaced as coverage limitations when encountered.

The Pi run receives the inventory and can read only the permitted material snapshot through app-supplied tools. Track the actual files it reads. Validate all claimed source references against that evidence. If the material is insufficient or ambiguous and there is no usable direction, the agent returns a structured request for a short learning description. Explicit learner direction takes priority over inferred subject matter.

## Outline and agent contracts

The canonical outline includes title, overview, scope, depth, outcomes, assumptions, gap-filling additions with reasons, a recommended starting lesson, ordered lessons, and the source coverage record. Each lesson includes a central question, overview, objectives, prerequisites, material references, and meaningful module plans. Modules include a title, purpose, method, and learner task. Generate stable local IDs when normalizing the validated result.

Use structured tools for completing an outline or requesting clarification. Validate model-produced values independently of tool schemas: bounded nonempty text, useful arrays, unique lessons, valid method choices, and references to material actually read. A successful transport response alone is not a valid outline.

The Pi tool set is deliberately small: inspect the material list, read an allowed material item, submit a complete outline, or request learning details. The worker cannot write arbitrary files. Main validates the completed outline again and commits it to `.edu`.

Constrain the plan-usage request shape to the documented public Responses route: no separate API billing fallback, no stored remote conversation dependency, no unsupported generation controls, and supported namespaced tools. A request ends successfully only on complete provider output; incomplete streams remain failures. Bound run duration and turn count to prevent an unending agent loop. Do not expose hidden reasoning in progress events.

## Workspace state and IPC

Replace the demo capability surface with named workspace operations. Expected operations cover reading workspace/account state, native project selection, selecting or locating a registered project, saving its model preference, connecting/cancelling/reopening account sign-in, refreshing models, signing out, starting/cancelling generation, retrying a save, and subscribing to sanitized workspace changes.

Main authorizes every call against the live owning window, sender, main frame, origin, and app entry URL. Parse every mutation payload strictly. Keep all path selection and external URL construction in main. Event payloads contain serializable state, never Electron event objects or credentials.

The backend owns each operation's ID, project handle, selected model, input, and lifecycle. Events and snapshots identify their owning project and operation. A late response cannot update another project's view or files. Cancellation waits for the worker to settle or terminate before releasing the global run guard.

Generation states are `idle`, `examining`, `generating`, `saving`, `saved`, `needs-input`, `cancelled`, `failed`, and `unsaved`. Account states separately represent disconnected, signing in, connected, plan permission missing, reconnect required, access restricted, and allowance unavailable. UI progress is derived from actual transitions.

## UX and visual delivery

Visual thesis: a light, neutral desktop studio with compact navigation, generous breathing room, strong system typography, and a clear invitation to explore a subject the learner cares about.

Content plan:

1. Dashboard: a thoughtful empty state or readable project rows, one **Open project** action, quiet account control.
2. Project setup: project title, helpful material context, large topic/intent composer, compact model choice, and **Create outline**.
3. Generation: retain the subject/input and previous outline, show useful progress, provide **Cancel**.
4. Outline: document-like project introduction, outcomes, ordered lesson rows, expandable objectives/module plans, and quiet sources/assumptions disclosure.
5. Account: a focused accessible panel with connection, permission, persistence, and recovery states.

Interaction thesis: restrained workspace entry, tactile hover/focus feedback, and short disclosure transitions. Respect reduced motion. Use one primary document scroll region. Collapse navigation through a labelled toggle for narrow/zoomed windows. Keep native window controls.

Build visual quality into each ticket. No dummy future controls, fake connected states, fake progress percentages, or terminal-oriented learner setup. Enter edits multiline text; Cmd/Ctrl+Enter submits outside IME composition. Support Cmd/Ctrl+O for the implemented folder action and a discoverable navigation toggle. Restore focus after overlays and preserve drafts by project across navigation.

## Work breakdown

1. T01: Pi dependencies, adapted ChatGPT connection, protected credentials, current model discovery, account bridge and usable account surface.
2. T02: Persistent project registry and `.edu` state, native folder opening/relinking, model preference, and Codex-inspired dashboard/project shell.
3. T03: Validated outline contract, Pi utility-process run, description-to-outline journey, saved outline reader, and process cancellation.
4. T04: Scoped material inventory/read tools, source evidence, clarification, coverage limits, and gap filling.
5. T05: Complete interruption/regeneration/save recovery, project isolation, drafts, and integrated UX polish.
6. T06: Cumulative acceptance, actual desktop visual review, platform workflows, packaging, durable ADR/pattern documentation, and live-provider verification.

Each ticket carries its own tests and acceptance evidence. T06 adds cumulative verification and resolves gaps; it does not postpone tests from earlier tickets.

## Verification and acceptance

Trace all PRD requirements and AC-01 through AC-14 into the tickets and final acceptance record. Use meaningful core/adapter tests for saved-state invariants, authentication validation, permission/model handling, error mapping, source scoping, atomic replacement, cancellation, and stale-result rejection.

Exercise actual Electron IPC and UI with isolated temporary profiles. Stub the remote provider only in clearly labelled automated test infrastructure. Use a local OAuth/Responses fixture to exercise realistic protocol behavior without embedding secrets. Keep test injection inaccessible in packaged production operation. Verify the real Pi transport and worker, not only fake core ports.

Required code gates: `npm run check` and `xvfb-run -a npm run test:desktop` on this Linux host. Also run `npm run package` after runtime dependencies/worker packaging are integrated. Native CI should run equivalent gates and desktop journeys on Windows/macOS/Linux. Record which platforms actually ran.

Capture and inspect dashboard, empty/material-led setup, account, model selection, pending, failure, unsaved, and completed-outline states. Include long titles/briefs/outlines, a narrow window, 200% zoom, keyboard navigation, and reduced motion. Do not infer visual quality or accessibility compliance from a green test alone.

Functional account acceptance requires an eligible person's actual browser consent and a real saved outline from their plan allowance. Perform it when the application is ready and the user can authenticate. Automated fixtures do not satisfy live-provider evidence. Windows/macOS execution also requires actual available runners or user-provided results. Missing external evidence remains open in the goal and acceptance record.

## Rollout, documentation, and check-ins

Keep the old sample journey only while a ticket still needs it to preserve a runnable app; remove its production surface when the project workspace is ready. Retire obsolete demo tests/contracts coherently, retaining useful trust-boundary tests.

Document new durable decisions in numbered ADRs and update the governing pattern indexes as their implementations land. Suggested decision areas are Pi/ChatGPT access, portable project state, and generation lifecycle. Preserve the PRD's scope and acceptance requirements; update status statements as evidence changes.

Commit the spec first, tickets second, and each validated ticket or coherent intermediate increment separately. Keep validation evidence alongside the bundle in `validation.md`; record incomplete external gates honestly. Do not claim the whole goal complete until every requirement has supporting evidence.

## Risks and choices

- Pi is rapidly evolving. Pin the inspected version and validate the actual published contracts; adapt only the parts required by the official plan route and application lifecycle.
- Local credential storage varies by OS. Protected storage failures must not cause plaintext persistence or silent login loss.
- Source folders are untrusted and may be huge. Bound reads, preserve original content, and report coverage limits.
- Outline quality is semantic as well as structural. Review representative real outputs for coherence, prerequisites, relevance, and useful Socratic activities.
- The personal locally run application fits the official cookbook's stated personal-project route; commercial distribution remains a later eligibility decision. [Official cookbook](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt).
- The single `.edu/project.json` canonical document keeps initial persistence small and atomic. A future content format can migrate from its explicit version.

No unresolved product choice blocks this initial implementation. Live authentication and cross-platform execution require external participation when their verification stage is reached.
