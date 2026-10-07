# Spec: Illustrated topic content and OpenRouter image generation

Status: Ready for implementation

Date: 2026-10-07

Source: Topic-content, provider-settings, cost-history and image-regeneration discussion; explicit request to write a spec.

Goal: A learner can generate, read offline and improve a complete illustrated chapter for a saved topic, with visible OpenRouter costs and durable request history.

## Summary

Add **Generate Content** to the saved topic page. Pi plans and writes a substantial chapter through multiple calls, using the project's selected ChatGPT text model. An app-owned educational-image skill helps Pi write useful illustration prompts; a narrow OpenRouter image tool produces the assets using the user's selected image model. Save the chapter, its outline, images and provenance in the project.

Expand Settings into a sectioned surface with **OpenRouter** and **Appearance**. OpenRouter holds the protected key, image-model choice, pricing estimates, usage summaries and this application's request history. Every generated image has a quiet regenerate control and an editable-prompt dialog. A replacement becomes current only when the learner chooses it.

This is a new capability, not a claim that the current outline or activity plans are authored learning content. Socratic activity generation, speech and OpenRouter text inference remain follow-on work.

## Problem / Context

The current [topic reader](../../../src/renderer/src/features/projects/TopicView.tsx) renders saved lesson objectives, prerequisites, proposed activities and source references. It has no chapter or media assets. [Settings](../../../src/renderer/src/features/settings/SettingsPanel.tsx) is an appearance-only modal. The [product overview](../../../docs/overview.md) and [PRD 01](../../prds/01-project-setup-and-outline.md) place authored lessons and additional providers beyond the first milestone; this request explicitly adds those capabilities within the boundaries below.

Current topic writing is staged UTF-8 editing under an owned topic folder. Its [publication journal](../../../src/main/storage/project-file-transaction.ts) uses the outline digest as its commit marker. It cannot safely be reused unchanged for binary assets or chapter-only saves. Current [worker profiles](../../../src/main/generation/worker-protocol.ts) and [AI activity contracts](../../../src/shared/ai/activity.ts) also require explicit extension.

The installed `@earendil-works/pi-ai` and `pi-agent-core` are pinned at 1.0.2. Inspection of Pi's installed README, image interfaces and `dist/api/openrouter-images.js` establishes that Pi already supports one-shot image models through `Models.generateImages` and extensible provider implementations. Its built-in OpenRouter image adapter uses chat completions and does not implement the dedicated image endpoint. Reuse Pi's image interface with a small app-owned adapter; no Pi fork or dependency upgrade is required for the proposed integration. The pinned package has no equivalent speech-generation interface.

OpenRouter documents a dedicated image endpoint, base64 outputs and optional cost metadata. Its image-model and endpoint records supply capabilities and pricing. These are provider contracts to recheck during implementation and qualify with live evidence, not guaranteed account access. See the [image guide](https://openrouter.ai/docs/guides/overview/multimodal/image-generation), [image model discovery](https://openrouter.ai/docs/api/api-reference/images/list-image-models) and [endpoint pricing](https://openrouter.ai/docs/api/api-reference/images/list-image-model-endpoints).

## Goals

- Produce a coherent, useful chapter aligned with the saved topic, project purpose and intended depth, rather than expanding its overview into generic prose.
- Make reading pleasant through clear structure, worked examples, meaningful illustrations and restrained editorial presentation.
- Preserve useful work across cancellation, process loss, storage failure and reopening.
- Make image expenditure understandable before requests and auditable afterward.
- Preserve existing ChatGPT inference, outline editing, offline reading, navigation and appearance behavior.

## Non-goals (Strict)

- Interactive Socratic methods, activity/session generation, assessments, grading or mastery claims.
- TTS generation, audio playback, voice selection or a speech-model settings section. Gemini 3.1 Flash TTS remains the first intended speech model for a later spec.
- OpenRouter main text inference, replacing ChatGPT sign-in, arbitrary provider/model entry or automatic cross-model fallback.
- Automatic web research, new PDF/document ingestion, concurrent/background chapter jobs, cloud sync or project monitoring.
- Whole-project content generation, a general chapter editor, a full version browser, reference-image editing or bulk image regeneration.
- OpenRouter management keys, account-wide history import, account credit administration or an exact prediction of future bills.
- Global shell, title-strip, AI-dock, branding or unrelated settings redesign.

## Scope

### In scope

One saved topic at a time: chapter generation and explicit continuation; portable content and media; source/context staleness; chapter reading in the existing topic destination; individual image replacement; sectioned settings; protected provider configuration; capability-aware prices and a persistent local ledger for every OpenRouter HTTP request made by this app.

### Scope defaults and assumptions

These are explicit implementation defaults, not answers inferred from silence in the preceding discussion:

1. Chapter research uses supported project text/Markdown and model knowledge. Do not invent citations or claim web verification. Automatic browsing is deferred.
2. Speech is deferred. Provider contracts can accommodate future media kinds without shipping speech controls or requests now.
3. Settings remains a no-history dialog, widened into a two-column category/content layout. This achieves the supplied screenshot's sectioned composition while preserving the existing open/close and focus contract.
4. GPT Image 2 is the initial image choice, following the user's list order. The choice is application-wide and snapshotted per run; unavailable models never silently switch.
5. A fully illustrated chapter targets at least one useful generated image. Text-only generation is an explicit available path when OpenRouter is absent or the learner chooses it; label that result accurately and offer image completion later.
6. Initial completed chapters save automatically after validation, matching outline generation. Whole-chapter replacement requires an explicit **Regenerate content** action; it retains the previous chapter until the replacement is publishable. Individual image replacement requires explicit acceptance.

## Requirements (Functional)

Verification abbreviations: **U** = focused unit/contract tests; **D** = isolated Electron Playwright with real bridge/storage assertions; **V** = reviewed flow captures; **L** = explicitly recorded live-provider qualification.

| ID | Testable requirement | Verification path |
| --- | --- | --- |
| R01 | A saved topic exposes Generate Content when no chapter exists; opening/reading a topic never starts inference. Missing topics and unwritable projects cannot generate. | U admission; D topic reading and read-only states |
| R02 | Requests resolve the current project and stable topic ID in main. Other topics, project goals and the saved outline remain byte-for-byte unchanged by chapter generation. | U locality/baselines; D independent file assertions |
| R03 | Planning uses the saved topic, full saved outline, project brief, selected text model and relevant supported sources. Source content is untrusted reference data, not executable instructions. | U engine inputs/tools; D captured fixture requests |
| R04 | A chapter has an introduction/central question, ordered section outline, explanations covering every objective, useful examples or worked applications, misconceptions where relevant, synthesis and source/assumption notes. Existing module plans are context, not activities to execute. | U structure/coverage validators; V reader; L editorial review |
| R05 | Each section has a stable ID and objective mapping. Pi may make multiple planning, authoring and repair calls within explicit bounds; no single-response assumption or unbounded loop is allowed. | U multi-turn/budget fixtures; D multi-stage run |
| R06 | Validated checkpoints survive restart. Explicit Continue resumes unfinished stages without repeating completed image requests; invalid/stale baselines require a fresh run rather than silent reuse. | U crash/checkpoint/source changes; D restart/continue |
| R07 | App-owned image guidance is injected into the chapter profile when planning illustrations. Pi supplies the purpose, placement, prompt, caption, alt text and factual constraints for each image. | U skill loading/plans; L illustration review |
| R08 | Illustrated completion includes at least one useful generated image; additional images serve distinct learning purposes. Missing/failed images have an honest status and explicit retry/text-only recovery. | U completeness; D missing-key/image failure; V/L quality |
| R09 | Image requests use the settings-selected OpenRouter model and explicit key. Chapter text continues through the project's current ChatGPT model and approved Pi text transport. | U routing/credentials; D observed endpoints; L separate accounts |
| R10 | Settings offers exactly GPT Image 2, Seedream 5 Pro and Nano Banana 2 with the IDs below. Live metadata controls capability/availability; a saved unavailable choice remains visible with a reason. | U catalog/absence; D selection/restart; L each model |
| R11 | All generation uses the shared AI coordinator and workbench panel. Chapter image calls are children of the chapter lease; standalone image regeneration owns a new lease. Existing producers receive BUSY consistently. | U coordinator/no nested claims; D competing producers |
| R12 | Progress distinguishes planning, writing sections, generating images, validating and saving. It never invents image streaming or numerical completion percentages. Previews are bounded and provisional. | U activity parsers/batching; D panel; V |
| R13 | Cancellation stops further requests and discards late results; the lease releases only after worker cleanup. Keep validated checkpoints and any previous published chapter. Restart performs no automatic paid request. | U cancellation/races; D cancel/worker loss/restart |
| R14 | Publish validated content/media recoverably with conflict detection. A failed save offers Retry save without inference; existing published content stays readable. | U fault injection/commit marker; D disk failure/retry |
| R15 | Chapter reading works offline after restart and project relocation without either account. TOC, section reading and source notes use the existing topic destination and restoration pipeline. | U relative assets/resolver; D relocation/history; V |
| R16 | Topic/source edits mark the chapter as based on older context without deleting it or automatically regenerating it. Removed topics cannot attach content to another lesson with a matching title. | U fingerprints/identity; D edit/removal |
| R17 | Generated images render locally with captions, meaningful alt text and stable reserved dimensions. Missing/corrupt media retains readable prose and exposes repair actions appropriately. | U media policy; D missing asset; V |
| R18 | Each generated image has a muted regenerate overlay, visible on hover and keyboard focus and reachable on touch; its accessible name identifies the image. | D keyboard/touch hit target; V Light/Dark/zoom |
| R19 | The regenerate dialog starts with the saved prompt, shows model and estimate, permits prompt edits and produces one candidate. The original remains current until Use this image succeeds. | U prompt/request bounds; D modal and byte assertions; V |
| R20 | Keep original, cancellation and failure preserve the original. Replacement saves prompt/model/provenance atomically, retains the previous asset and refuses a changed chapter/image baseline. Retry save makes no paid call. | U replacement transaction; D rejection/restart/conflict |
| R21 | Settings contains OpenRouter and Appearance categories with a selected-category heading and grouped neutral rows. Category changes, theme changes and dialogs create no navigation visits. | D history/focus; V screenshot composition |
| R22 | Appearance preserves immediate Light/Dark choice, existing persistence/session-only feedback, draft state and renderer tokens. No additional theme modes are introduced. | D existing appearance regression; V both modes |
| R23 | Saving/replacing/removing the OpenRouter key is a named main-owned capability. Renderer can supply a new secret but cannot retrieve it; saved status uses no key substring. | U credential/IPC boundaries; D bridge/restart |
| R24 | Connection validation is a non-inference request. Invalid keys, absent funds/allowance, access restrictions and offline state have distinct safe recovery messages; no paid test runs on save. | U errors; D save/validation; L ordinary key |
| R25 | Settings displays model pricing/estimate basis and timestamp, local app spend today/month/all time, unresolved-cost count and separately labelled provider-reported key usage when available. | U aggregation/prices; D settings/refresh; V |
| R26 | Before image requests, show the best available USD estimate for selected settings and planned count; regeneration shows one-image estimate. Estimates/ranges/unknowns are labelled, never represented as guaranteed final charges. | U pricing variants; D preflight; V |
| R27 | Every app OpenRouter HTTP request gets a durable ledger entry before dispatch, including discovery, key checks, reconciliation, paid generation and failed attempts. Log rows expose purpose, time, model when relevant, safe context, status, estimate and reported cost. | U gateway/preflight/failure; D all request classes |
| R28 | Ledger billing status is independent of generation/publication status. Completed images rejected by the learner or lost to a save failure still retain their reported cost; unknown is never zero. | U costs/discard/failure; D paid-result fixture |
| R29 | Ledger records survive restart/key removal, paginate/filter by date, purpose, model and outcome, and open safe request details. Totals do not double-count terminal updates or reconciliation. | U index/cursors/decimal sums; D history/restart |
| R30 | Use reported cost when present. Reconcile known provider generation IDs only when supported; missing cost/ID stays unresolved. Do not import a management-key activity feed or infer individual costs from aggregate differences. | U missing metadata/reconciliation; L supported responses |
| R31 | Credentials, raw prompts/responses, authorization headers, absolute paths and raw provider errors never enter activity snapshots, developer logs or the call ledger. Editable image prompts live only in the intended chapter metadata. | U redaction/DTO rejection; D diagnostics/profile checks |
| R32 | Malformed, oversized, unsupported and hostile media/Markdown are rejected or rendered as inert text. Renderer cannot request arbitrary filesystem paths or remote media URLs. | U parser/protocol/path attacks; D bridge/protocol |
| R33 | Opening Settings, browsing history and refreshing non-inference metadata never starts a workbench inference operation. Metadata refresh is bounded, cancellable on shutdown and single-flight. | U refresh policy; D no AI activity |
| R34 | Every paid request has explicit initiating user authorization through generation, continuation or regeneration. No automatic transport retry, model fallback, image quality escalation or paid request on app startup occurs. | U retry/budgets; D restart/admission |
| R35 | A chapter supports explicit whole-content regeneration while keeping its current revision visible until a validated replacement publishes. Unfinished runs offer Continue or Discard progress; actions never overwrite unknown external edits. | U run/revision conflicts; D replacement and recovery |

## Requirements (Non-functional)

- **Security/privacy:** Preserve context isolation, renderer sandbox, privileged import restrictions, authorized senders and strict payload schemas. Provider URLs/parameters are app-controlled. No renderer fetch to OpenRouter or arbitrary project-file bridge. Disclose that image prompts are sent to OpenRouter and its serving provider in the connection/first-use explanation.
- **Reliability:** Separate checkpoint, published chapter, request ledger and transient AI panel ownership. Saving or reading never requires inference. Unknown recovery state is preserved and explained rather than reset. Local ledger persistence is operational state, distinct from best-effort development diagnostics.
- **Performance:** Paginate history at 50 rows (maximum 100/request). Lazy-load local images and bound reader/preview payloads; do not put base64 in renderer activity or parse large image buffers on Electron main. Preserve existing 100 ms activity batching, frame/history bounds and worker-cleanup behavior.
- **Accessibility/design:** Use existing semantic typography, color, spacing, buttons and central-page primitives. Support keyboard-only operation, visible focus, reduced motion, meaningful status announcements, 600-pixel layouts and 200% zoom in both themes. Muted controls still meet contrast and target-size requirements.
- **Observability:** Safe request IDs correlate ledger, AI operation and worker events; pricing/cost provenance has a timestamp and source. Tests and recorded evidence distinguish fixtures, live inference and native/platform qualification.

### Initial bounded policy

Define and test named policy constants, not scattered magic numbers. Initial defaults: at most 24 chapter sections, 48 text turns per explicit activation, six planned image slots per chapter and one output per image request. Existing text-file/context/request limits continue to apply; stage only required chapter context per authoring turn alongside saved orientation. A run reaching its call budget pauses with a validated checkpoint and Continue; a plan exceeding chapter-size limits asks for a narrower topic instead of truncating objectives.

Use a 16,000-character image-prompt limit; raster PNG/JPEG/WebP only; at most 16 MiB decoded bytes and 16 megapixels per image; 64 MiB total current-chapter media; at most 32 MiB per image response including encoding/framing. Retained revisions remain disk-owned versions and are not copied into public DTOs. Provider metadata responses are at most 2 MiB, and ledger detail frames at most 64 KiB. Reject unsupported sizes before paid dispatch where knowable. Factual/structural text repairs consume the text budget; failed image requests require explicit retry.

Image transport needs modality-specific liveness: initial provider-response wait at most 300 seconds, then at most 60 seconds without response bytes; worker health remains separately monitored. Receiving a valid bounded response must not fail solely because total elapsed time crosses an old text deadline. Streaming image support is not required for this increment: use a buffered image response with truthful waiting/receiving state. Metadata reads use a 30-second request timeout and no automatic polling. A valid final result plus accepted EOF is required before success. These proposed media rules require the ADR extension below.

## Proposed Solution

### Process ownership

| Layer | Responsibility |
| --- | --- |
| `src/core` | Chapter/run/replacement behavior, coverage and completion rules, coordinator admission, explicit recovery, ports for generation, publication and provider status. No Electron/Node/React imports. |
| `src/shared` | Versioned content/media/provider/ledger DTOs, strict validators, bounded named request contracts and safe activity projections. No privileged imports. |
| `src/main` | Project identity/locality, protected settings, durable ledger and checkpoints, IPC authorization, publication conflicts, scoped media protocol and utility lifecycle. Metadata HTTP reads use the same audited provider gateway policy. |
| Sanctioned utility | Pi chapter orchestration, existing ChatGPT text transport, app-owned image skill/tool and Pi-compatible OpenRouter image adapter; bounded image decode/validation. No shell, generic network tool or direct publication. |
| `src/preload` | Named commands/subscriptions only; no generic IPC, credential readback, filesystem or execution API. |
| `src/renderer` | Topic reader, sectioned settings, history/details, regeneration dialog, accessible state and focus. Uses bridge DTOs and authorized local asset references only. |

### Chapter pipeline

Main claims the shared lease synchronously, installs cancellation, resolves current project/topic and snapshots text/image model choices and source/context baselines. The sanctioned chapter profile receives approved project-read tools, immutable saved orientation and chapter-only staging tools. It can read relevant supported project material but can create chapter output only in the selected topic's owned generated namespace. Existing learner sources are read-only for this profile.

Pi first submits a validated chapter plan with stable section IDs, objective coverage, examples and image slots. The plan becomes a durable checkpoint. It writes sections in sequence or another validated dependency order, submits each section, and performs bounded structural/coverage repairs. The harness controls budgets and validation; a tool result cannot authorize extra models, URLs, files or unbounded calls. Only validated sections count as checkpoint progress.

An app-owned, versioned image skill is packaged with the worker and injected when images are planned/requested. Adapt the supplied imagegen skill's prompt-authoring principles: instructional purpose, audience, composition, factual constraints, legible minimal labels, visual consistency, captions and alt text. Remove Codex-specific tool/path instructions. Prompt generated imagery as an explanation of a concept, process, comparison or example; decorative imagery alone cannot satisfy R08. A diagram's precise labels/formulae should also be available as accessible native text. Do not claim generated figures independently establish factual correctness.

The `generate_topic_image` tool references a validated image slot and uses its prompt. It cannot supply credentials, model IDs, endpoints or arbitrary references. Before each network dispatch, the worker asks main to persist the call intent and receives a correlated authorization acknowledgement. Main denies cancelled/stale/over-budget intents. The adapter then invokes the selected image implementation through Pi's image interface, with explicit key, abort signal, no retries and bounded transport hooks. Decode off main; transfer bounded bytes through a private worker channel or an app-assigned staging handle. Main independently checks ownership, format, dimensions, digest and limits before accepting them. Do not relax public AI-frame limits to transport images.

Main persists call outcome/cost metadata separately from chapter acceptance, then checkpoints the accepted asset. A lost acknowledgement/result never authorizes repeating a paid call automatically. An image slot with an unresolved dispatched intent stays blocked during ordinary Continue until reconciliation establishes its result or the learner explicitly retries that slot with an explanation of the unknown prior outcome. The final pass validates all sections, coverage, assets and baselines before publishing. Initial complete content saves automatically; panel settlement describes the actual publication outcome. A budget pause settles the operation after actual worker cleanup and releases its lease; the persisted run, rather than the AI coordinator, owns continuation state.

If no OpenRouter key is configured, show a setup link and an explicit **Generate text only** path. If image generation fails after text succeeds, save fully validated prose as `needs-images`, keep the illustration plan, and offer **Complete images**. Do not mark it fully illustrated or replace missing slots with decorative placeholders. Incomplete text remains resumable progress rather than a published complete chapter. A replacement's partial progress never displaces the previous published revision.

### Image regeneration

Regeneration uses the fixed-image utility profile and the shared lease, without an unnecessary ChatGPT call: the learner edits the existing prompt directly. Snapshot the currently selected settings model into the attempt; show the original model separately. The current image is never passed as an input reference in this scope. The candidate has a main-authorized temporary asset reference. Provider completion settles the AI lease; its preview/unsaved replacement remains domain-owned and can be accepted afterward.

Only **Use this image** publishes a new chapter revision and asset pointer after baseline validation. Keep original discards candidate state without deleting the original or its call record. Closing before any candidate returns cancels the attempt; closing with a candidate keeps the original and discards the candidate. Prompt changes after a candidate require a new explicit Generate replacement action. Save failures retain the candidate for Retry save during the session and, once checkpointed, after restart. If the topic disappears, close the dialog through the existing current-topic resolution path.

## Interfaces / APIs / Contracts

Proposed bridge names are a concrete contract seed; implementations may group them under named namespaces, but must preserve their narrow authority:

| Capability | Input / output boundary |
| --- | --- |
| `getTopicContent` | Authorized project/topic IDs; paginated/bounded chapter metadata and section content, publication and staleness state; opaque media identities. |
| `generateTopicContent` | Project/topic IDs, explicit mode `illustrated` or `text-only`, explicit replacement flag and expected published revision; main resolves text/image configuration. |
| `continueTopicContent` / `discardTopicContentProgress` | Project/topic/run IDs and checkpoint revision; main checks current ownership/baselines and no active conflicting mutation. |
| `retryTopicContentSave` | Validated pending-result ID/revision; no provider dispatch. |
| `generateTopicImageReplacement` | Project/topic/chapter/image IDs, expected revision, bounded edited prompt; returns admission and correlated candidate state. |
| `acceptTopicImageReplacement` / `discardTopicImageReplacement` | Authorized candidate ID and expected chapter/image revision; no arbitrary path or model output. |
| `getOpenRouterSettings` / `saveOpenRouterKey` / `removeOpenRouterKey` | Safe status/model choice and storage-protection state; one-way bounded key input on save only. |
| `setOpenRouterImageModel` / `refreshOpenRouterMetadata` | Fixed allowlisted model ID / no secret input; safe pricing/capability/key-usage snapshots. |
| `listOpenRouterCalls` / `getOpenRouterCall` | Validated filters and opaque cursor / call ID; safe bounded rows/detail, never raw provider payload. |

Add named content/provider subscriptions as needed; mutations and snapshots retain correlation/revision ordering. Extend AI kinds with chapter generation and image regeneration, and add bounded chapter/image preview metadata. Selected image model and step labels may appear safely; one operation containing text and images must not label every call as the text model. Preserve existing consumers' kind/phase/preview validation and outcomes, adding explicit paused/incomplete handling where current outcomes cannot describe checkpointed work truthfully.

Adapter endpoints are fixed to `https://openrouter.ai/api/v1`: `POST /images`, `GET /images/models`, selected-model endpoint records, `GET /key`, and optional `GET /generation?id=…` for a known generation ID. Ignore untrusted endpoint URLs in provider metadata; construct authorized paths from allowlisted model IDs. Reject redirects outside the approved host. Only supported, validated generation parameters are sent; request `n: 1`, use supported approximately 1K output by default, and choose aspect ratio for the planned illustration. The decoder validates actual bytes independently of declared media type. No implicit chat-endpoint fallback.

Use ordinary inference keys. Provider-reported key usage/remaining key allowance comes from [current-key metadata](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-api-key). It is separate from this app's ledger and may include other applications. The [activity API](https://openrouter.ai/docs/api/api-reference/analytics/get-user-activity-grouped-by-endpoint) is grouped history requiring a management key; it is not the source of this app's per-call log. Optional individual reconciliation uses [generation metadata](https://openrouter.ai/docs/api/api-reference/generations/get-request-&-usage-metadata-for-a-generation), only if an ID is returned and the route supports it.

### Model choices

| User-facing label | Fixed OpenRouter ID | Reference |
| --- | --- | --- |
| GPT Image 2 | `openai/gpt-image-2` | [Model](https://openrouter.ai/openai/gpt-image-2) |
| Seedream 5 Pro | `bytedance-seed/seedream-5-0-pro` | [Seedream 5.0 Pro](https://openrouter.ai/bytedance-seed/seedream-5-0-pro) |
| Nano Banana 2 | `google/gemini-3.1-flash-image` | [Model](https://openrouter.ai/google/gemini-3.1-flash-image) |

Discovery proves catalog presence/capabilities, not successful inference with a particular key. A rejected live call updates the safe availability explanation. Cache discovery/prices for 24 hours; refresh on explicit setup/refresh and once before a paid run when stale. Offline cached estimates retain their timestamp and stale label. Inference requires successful connection/capability validation or a still-valid cached snapshot; do not fabricate unsupported settings to dispatch anyway.

## Data Model / Storage

### Portable project content

Keep existing `.edu/project.json` and its saved outline contract unchanged. Introduce a separate versioned chapter manifest at root `.edu/chapters/<encoded-topic-id>.json`, using a validated deterministic filename encoding rather than trusting arbitrary IDs as paths. It binds project identity and stable topic ID to current chapter revision, topic-owned output directory, status, section IDs/order/objective coverage, source/context fingerprints, image metadata, generation provenance and retained previous revision pointers. Paths are project-relative and validated; no credentials, absolute profile paths or ledger records travel with the project.

Resolve the existing exclusive topic folder using ADR-0019 ownership rules. If absent, establish its existing stable topic-ID folder/mirror through main's sanctioned storage path. Reject ambiguous/shared ownership and symlinks; do not infer write permission from a source reference alone. Ordinary output lives under `<topic-folder>/content/<chapter-id>/<revision-id>/` with a readable `chapter.md`, section Markdown and an `images/` directory. `chapter.md` includes relative image references/captions so content remains useful outside the app. App rendering resolves assets through manifest identities. All metadata, checkpoints and recovery records live in `.edu`; do not scan those as learner source material.

Each image record includes stable image ID, section/placement, instructional purpose, caption, alt text, editable prompt, skill version, selected/returned model when known, supported generation settings, creation time, asset path, dimensions, MIME type, digest and previous-version reference. Prompts are intentionally portable authoring metadata. Source records contain only real inspected references/digests and honest model-knowledge/unsupported-source notes; never fictional bibliography.

Checkpoints at `.edu/content-runs/<run-id>.json` record validated plan/sections/assets, pending stages, expected publication baseline, context/source fingerprints and completion counters. Do not persist raw provider conversations, credentials or private worker diagnostics. Published chapter loading must succeed independently of malformed/stale checkpoints; surface the progress issue without silently deleting it. Generated chapter files are identified as generated context and cannot recursively become new primary citations during subsequent generation.

### Publication and recovery

Write an immutable candidate revision tree in the owned namespace, validate its files/digests, then atomically replace the chapter manifest as the commit marker. Use a separate versioned content-publication journal; do not fake an outline update to drive the existing outline transaction. Journal fields identify project/topic, expected manifest digest, next digest and owned candidate identities. Recheck project root, topic/context/source baselines and manifest immediately before publication. Serialize all app project mutations through the existing workspace mutation ownership.

On recovery, the expected old manifest means the previous chapter remains current and validated pending work can be offered for explicit save retry. The expected new manifest means publication committed; verify its assets and finish cleanup. Any unknown manifest/file version means conflict: preserve it and the journal, deny automatic replacement and explain recovery. Never roll back unknown external bytes. A pending candidate is not a published image; retain previous assets when replacing an image. Cleanup may remove only proven app-owned, unreferenced temporary candidates; broad version garbage collection is deferred.

Content staleness compares saved topic/project learning-context fingerprints and inspected-source digests. Unrelated topic edits need not invalidate an otherwise unchanged topic chapter. Relocation changes no portable identity. Missing current assets degrade reading without deleting content. A corrupt manifest preserves bytes and shows a recoverable reading issue rather than inferring chapter state from filenames.

### Profile-owned provider state and ledger

Store OpenRouter credentials separately from ChatGPT credentials using existing main-owned credential protection helpers and their explicit protection/fallback reporting. Never substitute environment credentials. Validate a proposed key through the non-inference key endpoint before replacing a working stored key; validation/storage failure preserves the previous credential and reports the safe reason. Store image preference, cached metadata and opaque connection epochs in the profile. Key removal prevents new requests but preserves history. Key/model mutation while inference uses that provider is blocked until the lease settles; removal from an idle state requires no extra app confirmation.

The main-owned append-only ledger records immutable call intent plus durable terminal/reconciliation transitions, with indexed/paginated safe projections. A call has local ID, UTC start/end, connection epoch, endpoint class, purpose, operation/run IDs, optional portable project/topic identities and display labels, selected/returned model, safe HTTP/application status, estimated USD amount/range and pricing snapshot, reported cost/provenance, known generation ID and publication disposition. Do not retain full URLs, key-derived labels, request bodies or error bodies. Key epochs separate historical connections without exposing secret fingerprints.

Intent persistence failure blocks network dispatch with a storage remedy. Terminal persistence failure leaves the durable intent unresolved and reports the ledger issue; it cannot authorize a duplicate call. Restart marks orphaned intents interrupted/unknown and permits supported metadata reconciliation only. Retain history without automatic deletion; index compaction may preserve all records but cannot silently drop unknown costs. Ledger corruption preserves files and blocks paid dispatch until recoverable storage works; offline chapter reading continues.

Use decimal-string USD amounts or exact fixed-scale arithmetic with documented precision, never binary floating-point aggregation. Display rounded values while retaining provider precision. Missing actual cost stays unknown. Metadata requests are identified as non-inference, with cost recorded only as known under their endpoint contract. Aggregates include each call's latest cost once and show unresolved counts; cancelled local status alone cannot prove that a completed provider request was uncharged. Do not subtract estimates from reported spend or reconcile individual requests by aggregate deltas.

Pricing estimates use the selected endpoint's billable lines, units, output settings and planned count. Fixed-output pricing can yield a direct estimate; output-dependent/token prices need an explicitly approximate range or unavailable state. If eligible providers vary, present a range over compatible endpoints, not the cheapest incompatible price. Prices are estimates rather than a spending cap. A single Generate Content action authorizes the displayed bounded image plan; do not introduce per-image approval interruptions. If the plan would exceed its declared image count or require a higher-cost setting, pause for an explicit continuation/change instead of dispatching it silently.

## Auth / Authorization

Chapter text requires the existing eligible ChatGPT connection. Images require a separately configured ordinary OpenRouter key. Offline reading requires neither. Removing/signing out of one connection does not delete the other's credentials or generated content. Existing [ChatGPT preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations) are a reason for separate media transport, not permission to send image requests through the plan-backed text route.

Validate every named IPC sender and payload. Main resolves project handles and checks locality, writable state, expected revisions and operation/candidate ownership. Workers receive only app-authorized configuration; renderer cannot change base URLs, tool catalogs or provider routing. Reuse safe error categories for authentication, restrictions, limits, network, busy, conflicts and storage. Provider text never becomes executable UI or raw logs.

Serve published/candidate media through a narrow authorized local protocol path keyed by project/chapter/image/version identity. Main resolves only manifest or owned candidate assets under the current project; deny arbitrary filesystem lookup, traversal, aliases and symlinks. Keep existing workspace asset policy separate, MIME-sniff raster content, and apply a restrictive CSP. Markdown rendering allows structured headings, paragraphs, lists, tables, blockquotes, inert code and vetted offline mathematical notation; no raw HTML, scripts, remote image fetches or automatic link navigation. External references use the existing validated external-link policy or inert text if unsupported.

## UX / Workflows

### Topic generation and reading

Use the ADR-0025 reading-page recipe: breadcrumb, contextual header, quiet action group, strong reading hierarchy and restrained sections. Before generation, show the saved topic plan and Generate Content. Beside the action, explain the text/image models and available image-cost estimate (maximum six planned images, actual plan may use fewer). A missing connection offers its setup action and the deliberate text-only path. No dialog is required merely to start an already configured initial run.

During generation, the shared workbench shows section/image steps and cancellation. Previously saved chapters remain readable; provisional content is distinguished from saved content. On publication, show the chapter with a compact TOC, readable prose, placed illustrations and captions, source/assumption notes, and muted saved/stale/incomplete status. Put the original objectives/prerequisites/module plans in a secondary **Topic plan** disclosure. Do not imply the planned modules have become working Socratic activities.

After generation, expose quiet **Regenerate content** and, where relevant, **Continue** or **Complete images** actions. Continue uses existing validated work; regeneration explicitly begins a new candidate chapter. Changed baselines explain why a fresh generation is needed. A read-only project keeps chapter reading but disables content/image mutation with an explanation.

TOC anchors/disclosures and image dialogs are no-history actions. The saved-topic route continues to use project identity plus stable topic ID. Back/Forward restores scroll/disclosure/focus against current authoritative content, tolerating replaced/missing section IDs. Opening Settings during a run does not cancel it; closing returns to its trigger. A missing topic follows the existing overview fallback and cannot restore a stale chapter into a different project.

### Settings

Use a wide modal with **Settings** heading, close control, category navigation and independently scrollable content. On narrow screens/zoom, category navigation becomes a compact stacked selector and the content remains usable without horizontal overflow. Remember the selected category only within the session; initial OpenRouter entry links select that category.

OpenRouter groups: **Connection** (password input, Save key, connected/protection status, Replace/Remove, Refresh); **Image generation** (three choices and compatible pricing); **Usage** (app totals, unresolved costs, separately labelled key usage/allowance); **Call history** (paged rows, filters, details). Do not copy unrelated categories or permission controls from the user's private screenshot. Do not commit that screenshot. Refresh updates timestamps and preserves last-known values with a stale/error label on failure. No paid diagnostics button is required.

Appearance retains current Light/Dark previews and persistence feedback. Preserve the original modal's Escape, focus trap and trigger restoration. Changing categories preserves edited-key input only while Settings remains open; closing clears unsaved secrets from component state. Saving clears the secret field after acknowledgement. Raw key values never become cached renderer settings.

### Image dialog

The overlay uses the existing regenerate/refresh glyph, a tooltip and an accessible image-specific name. It remains unobtrusive over the artwork with a readable neutral backing. The dialog shows original preview, editable prompt, current selected model and one-image estimate, then **Generate replacement**. On completion show original/candidate, **Use this image** and **Keep original**. Preserve readable alt/caption defaults and bind saved metadata to the new prompt/version; do not imply a radically edited prompt's inherited caption is verified. The acceptance step permits caption/alt correction when needed. Announce progress/errors, keep Cancel reachable, and restore focus to the source control or topic heading if it no longer exists.

## Work Breakdown (Ticket Seed)

These are dependency seeds, not authored tickets. Keep independently testable outcomes and coordinator-owned integration evidence.

1. **Contracts and decision extension:** new ADR, content/run/media/provider/ledger schemas, policy constants and narrow ports; preserve existing DTO compatibility and rejected inputs.
2. **Portable chapter storage:** ownership resolution, immutable revisions/checkpoints, independent commit marker, conflict/recovery tests and scoped media serving. Depends on 1.
3. **Provider configuration and accounting:** protected independent key, fixed model preferences, audited gateway, metadata/pricing cache, durable ledger and exact aggregation. Depends on 1; paid dispatch cannot precede ledger readiness.
4. **Sanctioned media profile:** Pi-compatible dedicated Image API adapter, request-intent acknowledgements, liveness/limits/cleanup and worker result validation. Depends on 1 and 3; asset acceptance integrates 2.
5. **Chapter orchestration:** skill packaging/injection, validated plans/sections, multi-call budgets, images, checkpoints, source baselines and final publication. Depends on 2–4; coordinator integration owns lifecycle regressions.
6. **Sectioned settings:** categories, key/model/pricing/usage/history UI and appearance/focus/history regressions. Depends on 3.
7. **Chapter reader and commands:** saved-topic integration, TOC/safe rich text/assets, progress/recovery/staleness and navigation restoration. Depends on 2 and 5.
8. **Individual image replacement:** prompt/caption/alt dialog, fixed-image profile, candidate acceptance/save recovery and retained originals. Depends on 2, 4 and 7.
9. **Integrated evidence and guidance:** full code/desktop/package-worker gates, reviewed registered flow references, live model/cost qualification and truthful acceptance/validation records. Depends on all prior capabilities.

## Testing Plan

### Focused tests

- Unit: objective/section completeness, prompt plans, explicit call budgets, skill loading, text/image routing, fixed model allowlist, errors and capability-aware pricing. Exercise multiple authoring turns and incomplete results rather than mirroring implementation.
- Core/lifecycle: shared admission with all existing producers; cancellation before/after intent; worker exit before release; stale correlation; immutable previews and bounded batching; budget checkpoint; no paid replay on restart; domain save retry after lease settlement.
- Storage/security: independent chapter transaction fault injection before/after marker, external source/manifest/asset edits, root replacement, folder ambiguity, symlink/traversal, corrupt checkpoints, preserved old revision and source files, project relocation and missing assets.
- Provider/ledger: fixed endpoint policy, no env fallback/raw payload retention, valid and invalid keys, discovery outages, exact decimal totals, duplicate transitions, no-cost/no-ID results, interrupted intents, preflight/terminal write failures and key epochs. Test adapter `stopReason: error` results, not only thrown exceptions.
- Media/rendering: forged MIME, malformed base64, excessive response bytes/pixels, SVG rejection, script/HTML Markdown, remote-image rejection, opaque protocol authorization and candidate expiry. Preserve current CSP and sender-rejection tests.

### Desktop and visual evidence

Use isolated Electron Playwright, real preload/main paths and the configured flow reporter; no computer use for frontend checks. Extend [topic reading](../../flows/topic-reading/index.md), [appearance](../../flows/appearance/index.md), [recovery](../../flows/recovery/index.md) and [navigation](../../flows/navigation/index.md) regressions. Register focused new topic-content, OpenRouter-settings and image-regeneration flows with complete checkpoint catalogs/explanations.

Use deterministic text/image HTTP fixtures to assert exact endpoint/model/call counts and actual saved bytes. Cover a multi-call chapter with at least two distinct illustrations, text-only completion, missing key, image failure, cancellation, worker loss, budget continuation, restart, read-only state, unknown cost and accepted/rejected replacement. Assert the ledger outlives discarded media and metadata reads do not create AI operations. Real buffered image waiting beyond an old elapsed deadline and bounded receiving must be tested separately from worker heartbeats.

Review captures for chapter composition, useful placement/captions, both settings categories, filtered history/details, regeneration prompt/comparison, incomplete/recovery states, Light/Dark, reduced motion, 600-pixel layout and 200% zoom. Exercise keyboard dialog controls and TOC/history restoration. Existing captures remain historical evidence until refreshed by passing journeys.

### Gates and evidence records

- Implementation code gate: `npm run check`.
- Process/bridge/user-flow gate: `npm run test:desktop` in a graphical session; headless Linux uses `xvfb-run -a npm run test:desktop` without weakening sandboxing.
- Package/runtime gate: `npm run package` then `npm run test:packaged`, extending sanctioned worker-profile evidence to chapter/media and packaged skill assets. This is separate from hardened native startup/installer qualification.
- Live gate: explicitly initiated requests with an ordinary key for all three named image models; verify compatible defaults, returned bytes, cost presence/absence and ledger totals against provider evidence. Also verify a real multi-call chapter through the existing ChatGPT connection and pedagogical quality of its images. Paid live qualification needs its own explicit execution authorization; this spec does not run it.
- Native accessibility/OS behavior on Windows/macOS/Linux remains separately recorded; renderer fixtures do not prove screen-reader, account eligibility or native installer behavior.
- Write actual commands, results, screenshots, limitations and live cost evidence in this bundle's `validation.md`; use `acceptance.md` for integrated requirement coverage. Do not manufacture evidence at spec time.

## Acceptance Criteria

- [ ] A learner generates an objective-complete, readable chapter through multiple calls, with useful images, and reopens it offline without changing another topic/source/outline (R01–R10, R14–R17; unit, desktop, visual and live editorial evidence).
- [ ] All new producers honor shared admission, truthful workbench progress, cancellation/cleanup and existing long-stream regressions (R11–R13, R34; unit and desktop evidence).
- [ ] Interrupted/budget-limited work resumes explicitly; source conflicts preserve content; storage retry performs no inference; whole-content regeneration retains the old chapter until publication (R06, R14, R16, R35; fault injection and restart evidence).
- [ ] OpenRouter and Appearance have usable sectioned Settings in both themes, with preserved preference/focus/history behavior and no raw-key readback (R21–R24, R31, R33; bridge tests and reviewed flows).
- [ ] Estimates show their basis/uncertainty; every app OpenRouter request has durable history; known costs and unknowns survive rejection, failures, key removal and restart without double counting (R25–R30, R34; gateway/ledger and live billing evidence).
- [ ] Every image can be regenerated from an adjusted prompt; accepting/rejecting/cancelling/save failure/conflict behaves correctly and retains the original as specified (R18–R20; desktop/file assertions and visual evidence).
- [ ] Safe chapter/media rendering, narrow serving and bounded contracts preserve Electron security, portability and offline reading (R02, R15, R17, R23, R31–R32; security and packaged-worker evidence).
- [ ] Required commands pass, flow references are refreshed/reviewed and external qualifications remain honestly listed. Speech, Socratic runtime and OpenRouter text inference are absent.

## Rollout / Migration Plan

Existing projects without chapter manifests continue to load and display the current saved plan. Opening them performs no migration write. First explicit generation introduces separate versioned chapter state and owned output; it does not bump/rewrite `.edu/project.json` solely for content. Unknown future chapter versions show an explanatory issue while the existing outline remains readable.

Introduce provider state independently of the existing ChatGPT store. New installs begin without an OpenRouter key; existing theme selection survives the sectioned Settings change. History begins with this app's first recorded OpenRouter request; do not imply it includes previous browser/other-app activity. Ship enabled once deterministic gates pass, with live/platform limits clearly recorded rather than claiming universal qualification.

## Risks and Alternatives

- Image quality can be beautiful but misleading. Require instructional intent, prompt constraints, accessible textual explanation, editorial live review and easy regeneration; deterministic validators establish structure, not truth.
- Provider models, endpoint capabilities and costs change. Use discovery/pricing timestamps and compatible endpoint ranges; retain the chosen model without silently substituting another. Do not hardcode example dollar prices from documentation.
- A crash after dispatch can leave unknown cost/result. Durable intent and explicit continuation prevent accidental duplicate paid images; metadata reconciliation is best effort, not guaranteed.
- Multiple immutable revisions increase disk use. Current chapter size is bounded; prior accepted versions are preserved. A user-facing storage/version manager is a later capability, not hidden automatic deletion.
- Reusing Pi's built-in chat-based image adapter is smaller but loses the dedicated endpoint contract and makes capability/cost evidence harder to control. Prefer the thin app-owned Pi image adapter; revisit only with documented protocol/live evidence.
- OpenRouter's server-side image tool would require the main text request to run through OpenRouter. A local Pi tool keeps the explicitly retained ChatGPT text route and application publication/accounting ownership.
- A single enormous chapter response is simpler but fragile and difficult to resume. Validated per-section stages make completeness and recovery inspectable within finite budgets.
- A new full-page settings route could more literally match the screenshot but adds history/navigation scope. The sectioned no-history modal is the closest current-compatible solution and still supplies the requested categories.

## Patterns and Standards Alignment

Apply [architecture](../../patterns-architecture.md), [AI operations](../../patterns-ai.md), [IPC/security](../../patterns-ipc-security.md), [learning/data](../../patterns-learning-data.md), [design system](../../patterns-design-system.md), [main workspace](../../patterns-main-workspace.md), [UX](../../patterns-ux.md), [renderer](../../patterns-renderer.md), [flows](../../patterns-flow.md) and [development/testing](../../patterns-development-testing.md).

Preserve accepted ADR-0007/0013 visual decisions, ADR-0018 safe development diagnostics, ADR-0020 flow evidence, ADR-0021 scoped local commits, ADR-0023 stable navigation and ADR-0025 central composition. This spec proposes extending ADR-0019's text-only project authoring and outline commit marker, and ADR-0022's sanctioned producer/profile/transport rules to structured chapters and image media. An app ledger is durable product state, not an expansion of diagnostic payload logging.

At implementation, write **ADR-0026: Illustrated topic content and OpenRouter media** (next number as of authoring; recheck before allocation). Specify independent chapter/checkpoint publication, binary-media authorization, Pi-compatible media adapter/liveness, provider secrets and call-accounting ownership. Update the [ADR index](../../ADRs/INDEX.md), [pattern index](../../patterns.md) and only affected focused patterns. Update product overview/README scope and relevant flow explanations once implemented; keep PRD 01's historical milestone boundary truthful. This planning artifact does not amend accepted rules or advertise working capabilities.

## Open Questions / Readiness

No unresolved product blocker prevents tickets. The bounded defaults above make the request implementable: project-source/model-knowledge research; speech deferred; sectioned modal; initial GPT Image 2 choice; explicit text-only fallback; automatic validated chapter save and explicit image acceptance. They remain revisable if the learner changes scope.

Live availability, endpoint cost metadata and image quality are acceptance gates, not established facts about this user's account. Resolve unsupported provider combinations with explicit unavailability, not an undisclosed change in transport/model. The spec is ready for `spec-tickets`; no tickets, implementation, accepted ADR change or live paid request is included in authoring it.
