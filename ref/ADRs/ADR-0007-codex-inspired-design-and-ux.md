# ADR-0007: Codex-inspired learning workspace and focused design/UX patterns

- Status: Accepted; palette, screenshot reference and theme scope amended by [ADR-0013](ADR-0013-chatgpt-inspired-appearance.md)
- Date: 2026-10-04
- Scope: adoption of documentation standards and design direction; renderer migration and new product capabilities are not implemented by this change.

## Subsequent scoped amendment — 2026-10-07

[ADR-0025](ADR-0025-scoped-editorial-workspace-and-aperture-identity.md) amends only generic central composition/heading/primary-action conventions and existing brand artwork. The [main-workspace standard](../patterns-main-workspace.md) governs current/future central pages. The original adoption history below is preserved; shell/panel boundaries, capability scope and ADR-0013 appearance/security rules remain otherwise unchanged.

## Context

The user asked to rewrite UI/UX guidance using the latest Codex desktop application as inspiration. Existing renderer guidance mixed React implementation with the initial warm/terracotta/serif presentation. The product overview and draft first milestone already call for project navigation, a spacious workspace, and progressive disclosure. Current official desktop documentation and illustrations were reviewed in [the research brief](../research/codex-desktop-ui.md).

## Decision

Adopt a neutral, system-sans desktop workspace with compact navigation, a spacious primary task area, restrained blue accents, and useful contextual detail. Translate the Codex reference into learning projects, activities, and readable outputs. Keep learner language and the Learning Studio identity.

Create `ref/patterns-design-system.md` for visual/component standards and `ref/patterns-ux.md` for interaction rules. Keep `ref/patterns-renderer.md` focused on React/renderer implementation, with routes from `AGENTS.md` and the pattern index. Mark target standards and migration gaps explicitly. The new visual direction replaces the earlier normative warm/terracotta/serif guidance for future UI work; the current demo remains that earlier implementation until a separate UI change.

## Consequences

Contributors can discover visual rules, UX contracts, and technical constraints separately. Tokens and dimensions are project choices supported by the reference, not a copied vendor design-system contract. Product capability scope stays with its task/PRD; themes, search, projects, persistence, generation, and Socratic tutoring cannot be inferred as implemented from these standards. Design adoption is accepted now, while screen compliance requires implementation and visual/interaction evidence. Existing security and backend boundaries continue to govern that implementation.

Current rules: [design system](../patterns-design-system.md), [UX](../patterns-ux.md), [renderer](../patterns-renderer.md), and [documentation](../patterns-documentation.md).
