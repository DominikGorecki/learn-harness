# Project Overview Design Selection

Date: 2026-10-06
Status: Visual direction locked by the user; application implementation is a separate task.

## Selected Direction

**Sheet 04, option 5 — Quiet action groups.** The user explicitly selected and locked this option. Preserve the editorial subject header, barely visible lilac wash, subtle glass-like topic surfaces and coordinated groups of two independent actions. The inline Light/Dark selector remains removed.

## Final Reference

![Selected project overview](project-overview-final.png)

The standalone reference uses sheet 04 as its actual image reference. The saved copy was compared with the bottom-middle selected option: layout, grouped controls, copy and restrained surface treatment are preserved. The larger frame gives the long second-topic title room separate from its controls. No material missing-action or overlapping-copy defect was observed. This is a generated visual reference, not a working UI or pixel-exact reproduction.

## Visual Properties

- **Composition:** slim icon rail, compact project sidebar and inset main canvas; roomy subject heading above side-by-side learning focus/objectives; an action strip followed by two topic rows with large muted ordinals.
- **Surfaces:** neutral charcoal with faint translucent-looking highlight edges. Soft lilac illumination stays behind the header. Topic rows and controls use quiet hairlines and restrained rounding; avoid saturated button fills, bright borders or conspicuous glow.
- **Actions:** one hero group contains lavender “Open first topic →” and neutral pencil/“Edit outline”. Each topic row repeats a smaller group containing “Open topic →” and pencil/“Edit topic”. A fine vertical divider separates each pair. These are independent commands, not tabs or a mode selector.
- **Typography:** neutral system sans-serif, prominent subject title, clear topic titles and muted descriptions. Preserve the full sample copy in the [final prompt](project-overview-final-prompt.md); allow wrapping for real project content.
- **Palette:** reuse existing design-system tokens where suitable. Existing dark references include canvas `#181818`, raised surface `#232323`, shell `#1C2424`, navigation `#1B1E1E`, primary text `#F3F3F3`, secondary text `#B3B6B8` and accent `#B58AF8`. These are system references, not values measured from the generated image; glass opacity/blur is not specified.
- **Icons:** navigation uses arrows; editing uses pencils; Settings remains in the rail. Keep labels visible rather than relying on hover-only icons.

## Behavior and Adaptation

- **Open first topic / Open topic:** display or navigate to the saved topic plan, including its objectives and module outline. Reading saved content does not start inference. A dedicated topic destination is proposed; today's topic reading uses inline disclosure.
- **Edit outline:** use the existing whole-outline edit interaction. **Edit topic:** edit only the selected stable topic and its owned topic folder, preserving all other topics and outline sections.
- All AI submissions retain the shared coordinator, admission, cancellation, recoverable publication and [approved generation workbench](../01-generation-streaming/generation-streaming-selection.md). Apply the existing busy restrictions to AI commands while preserving permitted reading/navigation.
- Show distinct open/edit hit areas. A clickable topic title/reading region must exclude its Edit topic command; avoid nested interactive controls.
- The reference shows **Dark, saved and idle**, with no active generation panel. Appearance remains available through Settings.
- Light appearance, narrow layouts, 200% zoom, long/localized labels, empty/unsaved states, hover/focus and AI-disabled states are unshown. Adapt the groups by wrapping or stacking without hiding either command.
- Use named links/buttons as appropriate to the action, visible keyboard focus and usable target sizes. Confirm reading order, keyboard operation and contrast during implementation. The preferred glass appearance requires contrast validation and a suitable opaque fallback; the bitmap does not establish accessibility compliance.

## Implementation Handoff

Verified existing UI locations: [OutlineView.tsx](../../../../src/renderer/src/features/projects/OutlineView.tsx) and [App.tsx](../../../../src/renderer/src/app/App.tsx). Reuse existing project/sidebar, typography, appearance and AI lifecycle contracts. Keep renderer interactions on the typed bridge and preserve Electron ownership boundaries.

Follow the [design system](../../../../ref/patterns-design-system.md), [UX rules](../../../../ref/patterns-ux.md), [renderer rules](../../../../ref/patterns-renderer.md) and [AI integration rules](../../../../ref/patterns-ai.md). Retain any required saved-plan assumptions/source disclosures in the implemented layout. Resolve exact spacing, radius, translucent treatment, responsive composition, focus/disabled styling and topic destination behavior in the implementation task.

This selection does not change application code, implemented flow screenshots, palette rules or accepted ADRs. It does not add tutoring, lesson delivery, progress or mastery capabilities.

## Iteration History

- [Sheet 01](project-overview-sheet-01.png): six initial page directions; the user preferred 2, 3 and 4.
- [Sheet 02](project-overview-sheet-02.png): combined/refined those directions, reduced glow and removed the inline theme selector. The user preferred original 4 and new 5.
- [Sheet 03](project-overview-sheet-03.png): hero-family refinements. The user preferred 5's editorial header/action strip and subtle glass effect, then requested quieter CTA alternatives.
- [Sheet 04](project-overview-sheet-04.png): six CTA treatments on that layout; **option 5 is the final selection**.
- Built-in image generation produced each round and this standalone reference using actual predecessor images. Exact prompts: [01](project-overview-sheet-01-prompt.md), [02](project-overview-sheet-02-prompt.md), [03](project-overview-sheet-03-prompt.md), [04 and correction](project-overview-sheet-04-prompt.md), [final](project-overview-final-prompt.md). Earlier sheets and original generation cache files remain preserved.
