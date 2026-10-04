# ADR-0005: Progressive discovery through pattern and ADR indexes

- Status: Accepted
- Date: 2026-10-04

## Context

The user explicitly requested their established pattern/ADR conventions and agent entry-point links. Context Bank's canonical ADR skill confirms numbered records under `ref/ADRs`, a `ref/patterns.md` map, and focused pattern files that change alongside governing decisions.

## Decision

Use `AGENTS.md` as the contributor entry point, `ref/patterns.md` as the domain map, focused `ref/patterns-<area>.md` for current rules, and `ref/ADRs/INDEX.md` plus numbered records for decision selection/rationale. Every durable decision includes Status, Date, Context, Decision, and Consequences. Link constrained patterns and ADRs together. Store source-linked research and actual validation separately in `ref/research`.

## Consequences

Agents can select relevant domains before reading implementation. Patterns state current rules; ADRs preserve why they exist. New durable changes require coordinated reference updates; routine changes within existing rules do not need another record. Context Bank was consulted read-only and remains separate from local application documentation. This documentation convention does not dictate Electron source folders.

Current rules: [documentation](../patterns-documentation.md), [pattern index](../patterns.md).
