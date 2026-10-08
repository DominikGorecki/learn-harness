# Saved topic reading and history

[Test implementation](../../../tests/desktop/topic-reading.spec.ts) · [Flow patterns](../../patterns-flow.md)

## Starting conditions

Two isolated saved offline projects. The recommended starting topic is the second row, with complete objectives, prerequisites, module plans and source references. No connected account or provider is needed.

## Journey and assertions

Open the overview, inspect its scope/outcomes and independently open/dismiss the outline editor. Read a topic through its title button, then open the recommended second topic by keyboard, read its saved content and expand its learning task. Back/Forward restores topic scroll, disclosure and safe focus. Cross-project traversal reloads current content after an external rename. A real authorized selection reply is held after its actual workspace subscription: the second project’s same-ID lesson cannot render as the first project’s topic, main’s rendered destination follows actual ownership, and transient focus cannot overwrite the prior topic memento. A typed main-sent read-only presentation fixture verifies readable topic/history, visible project issue, disabled edits and unchanged actual project bytes; it is distinct from native ACL behavior. Topic editing preserves the Forward branch and returns to its actual trigger. Dark/reduced-motion reading and both independent actions remain usable at 600 pixels and 200% Electron zoom. Removing the retained topic replaces its traversal slot with the owning current overview and an explanation, preserving Forward. A new topic visit branches. Exact saved bytes stay unchanged during initial reading and after the deliberate external deletion. Reading creates no AI operation or panel. If a topic disappears while its editor is open, the editor closes and focus returns to the current outline heading; it never becomes a whole-outline editor.

## Run and refresh

```powershell
npm run test:desktop -- tests/desktop/topic-reading.spec.ts
```

## Evidence limits

These are isolated renderer/bridge/storage fixtures. Pure resolver/admission tests also cover writable:false; actual Windows ACL read-only behavior and native accessibility remain separate qualifications. They establish saved-plan reading, not authored lesson execution, learning mastery, live inference, native screen-reader qualification or other-platform window behavior.

<!-- flow-captures:start -->

### windows

Last successful run: 2026-10-08T00:50:31.435Z. Source revision: 5a6e93481738b6bd61482c62903e1759a74ff573; source changes present: true.

[Capture metadata](screenshots/windows/manifest.json) records the test digest, image dimensions, viewport, theme, zoom and capture method.

| Screenshot | Observed checkpoint | Pixels |
| --- | --- | --- |
| [saved-overview-light](screenshots/windows/saved-overview-light.png) | Saved overview with full context and independent quiet commands in Light. | 1603 × 1053 |
| [saved-topic-light](screenshots/windows/saved-topic-light.png) | Complete saved topic with its retained learning-task disclosure in Light. | 1603 × 1053 |
| [saved-topic-readonly](screenshots/windows/saved-topic-readonly.png) | Typed main-sent read-only presentation fixture retains saved reading and its issue while edits are disabled. | 1603 × 1053 |
| [saved-topic-readonly-dark](screenshots/windows/saved-topic-readonly-dark.png) | The same typed read-only saved-topic presentation in Dark. | 1603 × 1053 |
| [saved-topic-dark](screenshots/windows/saved-topic-dark.png) | Current renamed saved topic in Dark without inference. | 1603 × 1053 |
| [saved-overview-dark](screenshots/windows/saved-overview-dark.png) | Saved overview with independent quiet commands in Dark. | 1603 × 1053 |
| [saved-topic-zoom](screenshots/windows/saved-topic-zoom.png) | Independent topic actions at 600 pixels and 200% Electron zoom. | 752 × 802 |
| [missing-topic-overview](screenshots/windows/missing-topic-overview.png) | A removed saved topic resolves to its current owning outline with an explanation. | 1600 × 1053 |
| [missing-topic-overview-light](screenshots/windows/missing-topic-overview-light.png) | The same removed-topic fallback and reason in Light. | 1600 × 1053 |

<!-- flow-captures:end -->
