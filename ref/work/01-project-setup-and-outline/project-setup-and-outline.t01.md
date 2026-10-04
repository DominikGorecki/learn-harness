# Ticket: project-setup-and-outline.T01 — Connect ChatGPT plan access through the Pi foundation

Status: Open

## Source

- [Implementation spec](project-setup-and-outline.spec.md)
- [PRD](../../prds/01-project-setup-and-outline.md)
- [Project guidance](../../../AGENTS.md) and [patterns](../../patterns.md)
- Applicable ADRs: 0001–0007; add durable decisions as implemented.

## Goal and scope

Pinned Pi Agent Core/Pi AI dependencies; application-specific PKCE login based on Pi's flow; verified identity and returned client registration; encrypted or explicitly session-only credentials; permission-aware connection state; renewal/sign-out; account-specific model catalogue; authorized bridge; usable account panel.

## Dependencies

- Depends on: None.
- Unblocks: T02, T03.

## Implementation plan

1. Inspect published provider APIs and official sign-in requirements; keep upstream attribution for adapted code.
2. Implement testable account/credential/provider adapters with injected browser, storage, HTTP, identity validation, and clock boundaries.
3. Implement strict shared account requests and sanitized account snapshots; expose named IPC methods and unsubscribe-capable events.
4. Connect the desktop account surface to actual browser sign-in, cancellation/reopen, model refresh, and sign-out.
5. Record the durable account/Pi decisions and actual verification; preserve existing runnable desktop flow during this increment.

## Tests and verification

- Loopback state/nonce/PKCE and exact callback handling; invalid issuer/audience/signature; returned-client reuse; declined plan permission; cancellation and timeout.
- Credential encryption/session-only behavior, serialized refresh, invalid-grant recovery, secret-free public snapshots, and sign-out clearing.
- Current-account model filtering and transport failure mapping; no ambient API-key fallback.
- IPC sender/payload rejection and real Electron account UI with a clearly isolated local protocol fixture.
- Run `npm run check`; run the real desktop gate for process, bridge, or user-flow changes. Record exact results in [validation](validation.md).

## Acceptance criteria

- [ ] The ordinary sign-in action opens an allowlisted application-owned authorization request in the system browser.
- [ ] Only verified identity is accepted; inference eligibility reflects granted permission, independently of sign-in.
- [ ] Connection restoration and model refresh use the saved registration/credential lifecycle and expose safe recovery states.
- [ ] Account controls function in Electron without token copying or terminal setup; existing desktop gates pass.
- [ ] Source/fixture verification is recorded separately from the real-account acceptance reserved for T06.

## Traceability

AUTH-01 through AUTH-08; MODEL-02; account portions of AC-01, AC-02, AC-04, AC-12.

## Completion evidence

Pending implementation. Keep this section current with commits, validation, and any external verification still required.

