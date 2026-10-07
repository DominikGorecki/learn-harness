# Ticket: illustrated-topic-content.T07 — Integrate chapter generation and rich offline topic reading
Status: Done — locally accepted; cumulative/live qualification remains T09-owned

## Source

- Spec: [Illustrated topic content](illustrated-topic-content.spec.md)
- Scope: explicit whole-spec implementation request; [product context](../../../docs/overview.md).
- Guidance: [AGENTS.md](../../../AGENTS.md), [README](../../../README.md), [pattern index](../../patterns.md), [ADR index](../../ADRs/INDEX.md).

## Goal

Integrate chapter generation and rich offline topic reading, delivering the scoped observable behaviors below.

## Scope

In scope: src/renderer topic-content/TopicView/App/workspace hooks and safe rich-text renderer; affected navigation mementos; focused tests/desktop topic-content/reading/history and flow catalog/references.

Out of scope: unrelated work, TTS, Socratic runtime, OpenRouter text inference, automatic web research, arbitrary models/endpoints and cloud/background jobs. Preserve existing source content and process security.

## Dependencies

- Depends on: [T02](illustrated-topic-content.t02.md), [T05](illustrated-topic-content.t05.md).
- Unblocks: T08, T09.
- External prerequisites: no live credentials needed for deterministic implementation; required live/native qualification remains separately recorded and never assumed.

## Implementation plan

- Add Generate Content, deliberate text-only path, estimate/model context and continued/replacement/save recovery commands to current topic destination.
- Use shared central reading recipe for TOC, rich inert prose, code/tables/notation, local images/alt/captions, sources and secondary Topic plan disclosure.
- Resolve current content with stable project/topic identity, staleness/missing media/read-only recovery and safe Back/Forward/scroll/focus restoration.

## Patterns to apply

Read the focused patterns relevant to owned files through the index and their accepted ADRs. ADR-0026 (once accepted in T01) extends chapter/media/accounting authority only. Core owns learning behavior and ports; shared owns validated DTOs; main owns privileged storage/network/lifecycle and authorized IPC; preload exposes named methods; renderer uses React and typed bridge. Portable .edu state excludes profile credentials/locations/ledger. All inference uses shared admission, sanctioned utility/Pi transport, independent domain acceptance and awaited cleanup.

UI work must read design-system, UX, renderer, main-workspace and ADR-0007/0013/0025, plus relevant existing flow explanations and selected screenshots. Use semantic Light/Dark tokens, quiet central reading/actions, keyboard/focus recovery and no-history dialogs. No computer use for frontend validation.

## Tests and verification

- Add focused meaningful unit tests for this ticket's acceptance and its malformed/hostile input, failure, cancellation or recovery boundaries.
- Add isolated Electron Playwright coverage for bridge/process/user-flow changes, using fixtures with actual saved-byte and request-count assertions and the configured flow reporter.
- Run `npm run check`; run affected `npm run test:desktop -- <owned/affected specs>` for process/bridge/user-flow changes. The coordinator additionally runs the full fresh desktop gate after integration. Package/ASAR checks apply when worker/build ownership changes.
- No-new-test exception: none for functional implementation; documentation-only maintenance uses link review and `git diff --check`.
- Coordinator records actual evidence in validation.md and acceptance.md. Workers return commands, exit outcomes, exact files and cleanup status without editing shared ticket/completion ledgers.

## Acceptance criteria

- [x] Generated chapter is readable offline with meaningful images and complete objective structure; no render path executes model HTML or fetches remote images.
- [x] Reading/navigation creates no inference; missing/deleted topics/assets and read-only state remain truthful.
- [x] Light/Dark, narrow/zoom, keyboard and history recovery have passing reviewed Playwright captures and backend byte assertions.

## Manual verification

Review the delivered behavior against acceptance using actual output and affected registered screenshots. UI review includes both themes, keyboard, reduced motion, minimum layout and 200% zoom. Fixtures prove local process/storage behavior; live account access, pedagogical quality and native OS/screen-reader qualification require separate actual evidence. Do not perform paid calls without explicit authorization.

## Completion evidence

- Worker: frontend/reader, `gpt-6.1-sol`, medium reasoning, on original branch `master` against HEAD `b0324d3bc9401083538c49b7cc5d53231f1677c2`. Accepted prerequisites: T02 `1cfbd02669ca54be5036876e0bd3d6df1b6cf3dc`, T05 `2b8afb5920be070f6a3197eaf1c099e5000b1f67` plus cache-preflight follow-up `b0324d3bc9401083538c49b7cc5d53231f1677c2`. Primary inspected actual production/test diffs and owns maintained guidance, records and Git.
- Delivers Generate Content, deliberate text-only/whole-chapter replacement, recorded-plan estimates, explicit one-slot paid retry, account-free storage retry, chapter-aware workbench recovery and rich bounded offline reading. Paginated identity/epoch/readiness guards preserve delayed Back/Forward and cross-project reading; React text keeps model HTML and remote images inert. Complete prose validates every legal page window with future-asset metadata reserve before image dispatch.
- Actual command journey passes through signed-in fixture text generation, real storage marker failure and zero-inference Retry Save, account-free illustration completion, uncertain-slot acknowledgement and one exact retry, cancellation retaining old prose, and explicit whole-chapter replacement without rewriting project metadata/source bytes.
- Actual reader journey proves seven-section bounded loading, exact objectives, TOC keyboard focus, delayed page history restoration, cross-project/rapid-selection guards, provider-event scroll preservation, missing-media reload, typed read-only presentation, restart/relocation and zero text/image/metadata inference. Read-only projection is not native ACL qualification.
- T09 still owns the fresh cumulative gates and focused staleness/corrupt-metadata/removed-anchor verification, including the audited paused-checkpoint staleness recovery repair. Standalone replacement is T08. Synthetic diagrams and loopback protocol assertions establish local behavior; live provider/editorial and native accessibility/platform qualification remain separate.
- Final frozen `npm.cmd run check` (1492): exit 0; lint clean, 41 unit files / 474 passed / 3 skipped, flow consistency, both type scopes and production build passed. `npm.cmd run test:desktop -- tests/desktop/chapter-reader.spec.ts` (90322): exit 0, 2/2 passed. Final reader-only run (87396): exit 0, 1/1 passed in 10.9 seconds.
- Affected six-spec desktop command (49130) exited 1 with 9 passed / 1 failed because the existing Topic actions selector matched multiple valid action groups. The semantic exact group selector fixed it; focused topic-reading rerun (96087) exited 0, 1/1 passed. Passing Appearance/navigation/reading/recovery and all five topic-content scopes retain their actual evidence; fresh full integration is still required.
- Primary reviewed eight reader and four command checkpoints. Illustration captures retain the actual native frame verified by raster assertions through the configured reporter, with the existing local-path exclusion. Independent rereads verified opaque RGB and manifest digests: normal Light 21,735 purple / 37,800 teal pixels; normal Dark 21,768 / 37,831; narrow Light 10,192 / 17,671; narrow Dark 10,218 / 17,675. Each final illustration was viewed independently, showing diagram, caption and surrounding prose in both themes/200% zoom. Earlier paint/crop/detachment capture failures were repaired in test capture synchronization, without production changes or weakened security.
- Affected Appearance zoom review found a Light-labelled capture still showing the prior Dark native frame. Test-only selected-radio/HTML/computed-style and native background-pixel assertions now retain the exact verified Light/Dark frames and require distinct bytes. The focused Appearance run (64611) exited 0, 1/1 passed in 4.0 seconds; primary reviewed both actual PNGs. An initial return-type build error and an incorrect test assumption about changing the OS nativeTheme preference were fixed; renderer preference evidence remains separate from OS qualification.
- Passing fixture runs closed their Electron windows/servers and removed owned roots. Two positively identified failed setup roots were removed after exact ownership checks; older unowned temporary roots were preserved. No paid live calls/private credentials or active test sessions remain.

## Notes

- Requirements covered: R01, R04, R08, R12, R14, R15, R16, R17, R26, R32, R35.
- Assumptions: the source spec's bounded defaults apply; no additional product blocker.
