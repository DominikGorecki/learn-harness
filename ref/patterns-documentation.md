# Documentation patterns

Governed by [ADR-0005](ADRs/ADR-0005-progressive-pattern-and-adr-discovery.md).

## Progressive discovery

`AGENTS.md` routes contributors to `README.md`, then `ref/patterns.md`, a relevant focused `ref/patterns-<area>.md`, and `ref/ADRs/INDEX.md` plus the applicable records. The indexes describe when to read each file; avoid dumping every detailed rule into the entry point. Use concrete paths rather than shell-style filename shorthand.

Patterns state current rules and name their governing ADRs. ADRs state rationale, alternatives, and consequences; use `ADR-000X-<short-slug>.md` with Status, Date, Context, Decision, and Consequences. Accepted means implemented in this skeleton; future possibilities belong in the research/open-decision notes until implemented.

## Maintenance

For a durable change, add the next ADR and update the ADR index, pattern index, and affected domain patterns together. Amend or supersede prior decisions explicitly. Routine features/refactors inside accepted boundaries do not require new ADRs. Keep links relative within the repository and verify they resolve.

Record research with dates and direct primary-source links. Record validation separately, naming what ran and what remains unverified. Context Bank supplied portable documentation conventions; it does not own this app's local patterns and no bank write is required for app changes.
