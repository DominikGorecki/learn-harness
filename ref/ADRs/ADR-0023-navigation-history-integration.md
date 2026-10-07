# ADR-0023: Navigation changes account for shared history

- Status: Accepted — contributor integration discipline and initial session history implemented; native qualification and bundle acceptance remain open
- Date: 2026-10-06
- Original adoption scope: navigation feature planning, implementation review and evidence. That adoption made no menu/history/topic-screen runtime change or amendment of ADR-0013's native window chrome; subsequent implementation evidence is recorded below.

## Context

The user requested screenshot-inspired application menus and Back/Forward navigation, then required that future navigation inside a project also participate in history. Topics are currently disclosures rather than separate destinations. A dashboard/project-only implementation could become an accidental permanent boundary if future screens and navigation entry points introduce their own stacks or bypass existing cancellation guards.

Current React navigation uses explicit project intents and authoritative workspace snapshots. Core/main own project identity, mutations and AI settlement; the renderer owns presentation. Back/Forward must not become text undo, restore an obsolete outline or restart an AI request. Planning a navigation model is distinct from claiming it is implemented.

## Decision

Every feature that adds, removes or changes navigation must explicitly account for the shared app navigation/history approach. Its spec and implementation review identify:

- the destination and stable canonical identity, including owning project where applicable;
- every entry point and whether it pushes a visit, replaces/canonicalizes the current location, traverses history or leaves history unchanged;
- how authoritative resolution succeeds and what cancellation, rejection, missing/deleted content and stale events do to history;
- which drafts, reading position, disclosure and focus context are restored, with a safe fallback when content changes;
- ownership guards for active operations, pending saves and recoverable unsaved output;
- focused tests, documented flow coverage and any required pattern updates.

Future genuine in-project topic/activity destinations must join the same navigation pipeline and history when implemented. Ordinary disclosure, dialogs, preference changes and progress updates need an explicit no-history classification rather than accidental recording. Do not ship placeholder routes to demonstrate extensibility or create independent feature history stacks. An intentional deviation requires a separately reviewed decision.

Apply this discipline immediately to contributor work. The initial runtime target is defined by the [menus/navigation spec](../work/03-menus-and-navigation/menus-and-navigation.spec.md): session history for dashboard/project visits, a renderer-owned bounded model and current service/AI guards. At adoption, these implementation details were planned and required separate implementation gates. Future destination behavior is specified by its own feature rather than guessed now.

## Current implementation evidence

T01-T03 implemented the shared renderer controller, session history of at most 100 dashboard/project visits, guarded commands and current-content restoration. Project identity uses the profile handle, not a title, path or portable `.edu` project ID. Drafts and recoverable results remain feature/domain-owned; history stores destinations and bounded presentation mementos. The [navigation flow](../flows/navigation/index.md), [acceptance](../work/03-menus-and-navigation/acceptance.md) and [validation](../work/03-menus-and-navigation/validation.md) record local Windows source, code/desktop fixture and reviewed renderer evidence. Required native window/menu/accessibility qualifications on Windows/macOS/Linux and remaining bundle acceptance are separate and unresolved. At that initial implementation, only dashboard/project destinations shipped; later feature evidence is recorded below.

## Consequences

Navigation remains part of feature acceptance as the app grows, instead of a one-time toolbar addition. UX owns visit/restoration semantics; renderer guidance owns integration and state boundaries; development/testing owns evidence. Pattern updates accompany changes to the actual navigation contract, with planned and implemented status distinguished.

History does not authorize new learning features, persist project/account data in the renderer, bypass privileged capability validation or alter AI cancellation/publication. The original guidance-only adoption did not implement menus/history or approve custom window chrome. [ADR-0024](ADR-0024-integrated-title-strip-with-native-controls.md) subsequently amended only ADR-0013's title-bar/overlay scope during the authorized implementation.

Current guidance: [UX](../patterns-ux.md#navigation-history-integration), [renderer](../patterns-renderer.md#navigation-feature-integration), [development/testing](../patterns-development-testing.md#required-evidence), [documentation](../patterns-documentation.md#maintenance), [pattern index](../patterns.md).

## Subsequent saved-topic extension — 2026-10-07

[Bundle 04](../work/04-main-workspace-design/validation.md) and [topic-reading flow](../flows/topic-reading/index.md) extend the same controller/history with profile project handle plus stable saved lesson ID. Current saved data resolves every topic; missing topics canonicalize to current overview with explanation, and unavailable projects use recovery. Per-destination scroll/disclosure/safe focus survives traversal without cached content or inference. Same-project saved overview/topic reading bypasses backend reselection and preserves Receiving/Cancelling/Saving ownership; project/dashboard departure keeps established guards. Module/task disclosure, editing overlays and provisional output add no destination. These Windows fixtures do not close the initial native window/menu/accessibility qualifications or authorize lesson execution.
