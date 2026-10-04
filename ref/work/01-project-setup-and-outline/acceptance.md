# PRD 01 acceptance audit

Date: 2026-10-04
Status: Local implementation and Linux verification complete; live-provider and native Windows/macOS gates remain open.

This audit does not treat deterministic protocol fixtures as real ChatGPT inference or as evidence of curriculum quality. The [PRD](../../prds/01-project-setup-and-outline.md) remains the acceptance authority. The [validation log](validation.md) records check history and granular implementation checkpoints.

## Evidence map

- Account lifecycle and signed OAuth: [provider tests](../../../tests/unit/chatgpt-provider.test.ts), [account service](../../../tests/unit/account-service.test.ts), [credential storage](../../../tests/unit/credential-store.test.ts), [account desktop](../../../tests/desktop/account.spec.ts).
- Projects and persistence: [storage](../../../tests/unit/project-storage.test.ts), [workspace use cases](../../../tests/unit/workspace-service.test.ts), [project desktop](../../../tests/desktop/projects.spec.ts).
- Actual Pi transport, contracts and owned generation: [Pi engine tests](../../../tests/unit/pi-outline-engine.test.ts), [generation service](../../../tests/unit/generation-service.test.ts), [outline desktop](../../../tests/desktop/outline.spec.ts).
- Material policy and source evidence: [material snapshot tests](../../../tests/unit/material-snapshot.test.ts), [material desktop](../../../tests/desktop/materials.spec.ts).
- Recovery and interaction: [recovery desktop](../../../tests/desktop/recovery.spec.ts), [reading/zoom desktop](../../../tests/desktop/reading.spec.ts), plus IPC/security policy tests.
- Runtime and trust boundaries: [main composition](../../../src/main/index.ts), [Pi engine](../../../src/main/generation/pi-outline-engine.ts), [material snapshot](../../../src/main/generation/material-snapshot.ts), [portable workspace](../../../src/core/workspace/service.ts), [generation ownership](../../../src/core/generation/service.ts).

## Functional requirements

| Requirement | Local evidence | Remaining qualification |
| --- | --- | --- |
| AUTH-01 | Browser OAuth/PKCE, signed identity, own app registration; account desktop journey. | Real browser/account authorization pending. |
| AUTH-02 | Identity and plan permission are separate; account/provider tests cover declined permission and recovery. | Live permission behavior pending. |
| AUTH-03 | Explicit delegated token, public Responses endpoint, account model catalogue, no ambient API-key fallback; Pi transport tests. | Real plan allowance consumption pending. |
| AUTH-04 | Protected credential adapter, renewal, restart load and session-only fallback tests; draft preserved in desktop recovery. | Protected OS-store restart and live renewal require native/account verification. |
| AUTH-05 | Connecting, cancelled, restricted, reconnect, permission and usage states; provider/account tests and recovery desktop journey. | Live provider classifications remain to confirm. |
| AUTH-06 | Remote revoke attempt plus local clear, distinct revocation-failure message; account tests and desktop sign-out. | Live revocation pending. |
| AUTH-07 | Private credential port/profile storage, secret-free snapshots, strict portable metadata, source exclusions. | No known local gap. |
| AUTH-08 | Real Pi HTTP/SSE and utility process are exercised with a signed local fixture. | OPEN: actual successful ChatGPT-plan outline required. |
| PROJ-01 | Dashboard rows show name, location and outline state; project desktop journey. | No known local gap. |
| PROJ-02 | Native folder chooser in main; empty folder and cancellation desktop checks. | Windows/macOS native chooser behavior pending. |
| PROJ-03 | Opening reads metadata only; desktop checks no .edu creation and no inference. | No known local gap. |
| PROJ-04 | Canonical-path deduplication and profile registry; two-project restart desktop check. | Native path semantics remain part of AC-14. |
| PROJ-05 | Dashboard return, single-run guard, explicit stay/cancel navigation; core and desktop recovery checks. | No known local gap. |
| PROJ-06 | Missing/unreadable snapshots, lost/replaced metadata identity checks, retry and native relink; storage/core/project desktop tests. | No known local gap. |
| PROJ-07 | Offline long-outline reading and corrupt-state preservation; reading desktop journey. | No known local gap. |
| PROJ-08 | Atomic versioned .edu/project.json and separate profile registry; storage tests. | No known local gap. |
| MODEL-01 | Composer/header native select displays current or saved model; project/outline desktop journeys. | No known local gap. |
| MODEL-02 | Delegated-token account catalogue, visibility filtering and safe failure states; provider/account tests. | Real account model catalogue pending. |
| MODEL-03 | Per-project preference persisted independently; two-project restart desktop test. | No known local gap. |
| MODEL-04 | First server-ordered compatible choice shown until explicit preference/save; no product hard-coded model. | Live model compatibility pending. |
| MODEL-05 | Missing preference remains visible; explicit replacement required; recovery desktop test. | No known local gap. |
| MODEL-06 | Saved choice remains visible offline; generation opens account recovery and model changes do not infer. | No known local gap. |
| MODEL-07 | Run captures model/brief; settings guarded while active; selected model verified in real Pi fixture requests. | No known local gap. |
| INPUT-01 | Large multiline field, 32,000-character limit, oversized paste preserved and labelled; project desktop test. | No known local gap. |
| INPUT-02 | Empty/whitespace rejected without usable material; short topic accepted; workspace/generation tests. | Semantic topic recognition needs live review. |
| INPUT-03 | Bounded nested snapshot plus actual Pi list/read tools; material/engine/desktop tests. | Live source interpretation pending. |
| INPUT-04 | Blank brief with readable material reaches a complete saved outline in the material desktop journey. | Live content-only quality pending. |
| INPUT-05 | Explicit goal prioritized in prompt and transmitted with material; inferred direction separated in saved output. | OPEN: semantic override of conflicting material needs live review. |
| INPUT-06 | Unsupported-only local clarification and ambiguous-material tool clarification preserve editable input. | Live ambiguity judgment pending. |
| INPUT-07 | Coverage classifies excluded/unread/unsupported/unreadable/binary/oversize files and limits; tested and rendered. | No known local gap. |
| INPUT-08 | Scope/level/assumptions are mandatory; prompt explicitly avoids treating advanced material as learner proficiency. | Live default appropriateness pending. |
| INPUT-09 | Composer always explains description/material transmission and shared plan use; opening alone transmits no content. | No known local gap. |
| INPUT-10 | Read-only bounded tools; secrets/metadata/instructions/symlinks excluded; source preservation and escape tests. | No known local gap within supported file policy. |
| OUTLINE-01 | Structured completion tool, complete independent validation, real Pi and desktop save flow. | Live subject-specific coherence pending. |
| OUTLINE-02 | Prompt fills foundations/gaps; additions require topic and reason, rendered separately. | Live gap relevance pending. |
| OUTLINE-03 | Project/lesson/module contract, unique identifiers/titles, bounded nonempty fields and supported methods. | Live activity usefulness pending. |
| OUTLINE-04 | Written direction, inferred brief, scope/assumptions, additions and actual-read coverage have distinct disclosures. | No known local presentation gap; semantic quality pending. |
| OUTLINE-05 | Portable metadata includes preference, generation model/time, written or inferred brief, outline and coverage. | No known local gap. |
| OUTLINE-06 | Save-confirmed indicator, expandable document, full restart reading, explicit unsaved state. | No known local gap. |
| OUTLINE-07 | Actual examining/planning/validation/saving phases; cancel before save; no percentages or private reasoning. | No known local gap. |
| OUTLINE-08 | Cancelled, interrupted, failed and incomplete runs retain input/prior outline; unit and desktop failure checks. | No known local gap. |
| OUTLINE-09 | Explicit regeneration confirmation; prior result stays until complete replacement save. | No known local gap. |
| OUTLINE-10 | Actual filesystem failure retains result; retry and confirmed conflict recovery consume no additional inference. | No known local gap during current app session. |
| OUTLINE-11 | Opening, model changes and disclosures are non-generative; desktop request counts verify this. | No known local gap. |

## Acceptance scenarios

| Scenario | Local evidence | Remaining qualification |
| --- | --- | --- |
| AC-01 | Local signed OAuth + actual Pi utility HTTP/SSE journey passes. | OPEN: real eligible account and plan-backed inference. |
| AC-02 | Account/provider tests plus desktop cancellation, sign-out, draft preservation and usage recovery. | Live account confirmation pending. |
| AC-03 | Native chooser, cancellation, deduplication, no inference and no initialization-on-open pass. | Other native OS runs pending. |
| AC-04 | Two independent preferences survive restart; fixture requests use selected model; missing choice recovery passes. | Live account and other OS runs pending. |
| AC-05 | Short/detailed input plumbing and preserved oversized draft pass; whitespace prevented. | Real short and applied-topic output review pending. |
| AC-06 | Nested notes-only Pi read/submit/save journey and coverage pass. | Real missing-foundations quality review pending. |
| AC-07 | Direction transmitted; ambiguous and unsupported recovery, partial coverage and source limits tested. | Real conflicting-material interpretation pending. |
| AC-08 | Complete validated content contract and readable module disclosures pass. | Real pedagogical usefulness review pending. |
| AC-09 | Portable atomic storage, restart/offline reading, unchanged original files and secret-free account snapshots pass. | Other native OS runs pending. |
| AC-10 | Interrupted streams, usage failure, cancellation, worker crash, preserved previous output, save retry and conflict recovery pass. | Live provider failure observation pending. |
| AC-11 | Read-only Linux inspection, missing/moved/corrupt/future-schema preservation and project/run ownership pass. | Native Windows/macOS filesystem behavior pending. |
| AC-12 | Keyboard submission/disclosure/dialog focus, IME guard, narrow navigation, long documents, 200% zoom and reduced motion pass. | Native OS keyboard/window checks pending. |
| AC-13 | Main states visually inspected in real Electron captures; README has labelled fixture screenshots. | No known local visual gap; native appearance still pending. |
| AC-14 | Linux desktop journeys and hardened packaged startup exercised. Existing CI defines native Windows/macOS/Linux jobs. | OPEN: current implementation must run on Windows and macOS. |

## Remaining verification

1. Complete user-controlled ChatGPT browser authorization and generate a saved outline with the selected available model and included plan allowance. Never supply or copy tokens into project files or this audit.
2. Review representative real outputs: a broad phrase, a detailed applied goal, incomplete notes requiring foundations, and conflicting notes plus explicit direction. Inspect coherence, ordering, scope, additions, source grounding and concrete module tasks.
3. Run the current implementation’s desktop journeys and packaging on native Windows and macOS. The existing workflow is configured; configuration alone is not execution evidence.
4. Verify protected OS credential restoration on an actual supported keychain environment. Headless Linux currently uses the disclosed session-only fallback; injected encryption tests establish adapter behavior only.

The goal is incomplete until these requirements have evidence. The user has explicitly approved native CI branch publication; publication/results are being verified. Live account verification awaits user participation. Signed release installers, app-store distribution, final branding and additional document formats remain outside this milestone.
