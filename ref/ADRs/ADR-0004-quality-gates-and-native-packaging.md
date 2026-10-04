# ADR-0004: Focused quality gates and native-platform packaging

- Status: Accepted
- Date: 2026-10-04

## Context

A renderer build alone cannot prove preload/IPC wiring or desktop behavior. Cross-platform Electron distribution also has platform-specific packaging, signing, and native-module constraints. The skeleton needs repeatable local checks and a concrete packaging path.

## Decision

Use ESLint with dependency restrictions, separate strict type checks, Vitest for core/trust-boundary behavior, and a focused real Electron journey through Playwright's experimental Electron API. Use electron-builder with NSIS, DMG, and AppImage targets and package-time fuses. Add native Windows/macOS/Linux CI jobs for checks, desktop smoke, and unsigned packaging. Commands explicitly disable publishing. Keep build artifacts out of source control.

## Consequences

The lockfile and configured gates make the scaffold reviewable. Graphical smoke tests require a desktop or Xvfb and a host capable of running Electron. Experimental automation is confined to tests. Configured CI is not evidence that remote jobs have run. Signed installers, notarization, final product identity/icons, updates, architecture coverage, and installer acceptance remain release work. Native-module rebuild policy must be revisited if such modules are added.

Current rules: [development/testing](../patterns-development-testing.md), [distribution](../patterns-distribution.md).
