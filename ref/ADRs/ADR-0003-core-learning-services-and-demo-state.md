# ADR-0003: Core learning service and explicit in-memory demo state

- Status: Accepted
- Date: 2026-10-04

## Context

The user requested a very basic skeleton. It should demonstrate a genuine backend/UI flow without prematurely choosing a database, AI provider, or assessment system. Learning behavior needs to be testable independently of desktop transport.

## Decision

Place course/session/answer behavior in platform-independent core. Keep answer keys in core rather than public course DTOs. Inject a session repository, ID generator, and clock; compose an in-memory repository in main. Use static demo lessons and deterministic feedback. Progress lasts only for the main process lifetime, with that limit visible in UI and docs. React stores snapshots and drafts, while core/repository own authoritative session state.

## Consequences

The skeleton works offline without credentials and has meaningful domain tests. Renderer reloads do not erase main-owned sessions; quitting does. Fixture goals do not generate personalized curricula, and question completion does not prove mastery. Persistent storage and provider adapters can be introduced through ports, but asynchronous adapters will require service/handler changes. Database schema, migration, privacy, cloud/local inference, and retention assessment remain open decisions.

Current rules: [learning/data](../patterns-learning-data.md), [architecture](../patterns-architecture.md).
