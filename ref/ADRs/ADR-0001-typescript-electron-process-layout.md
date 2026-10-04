# ADR-0001: TypeScript Electron application with process-oriented source layout

- Status: Accepted
- Date: 2026-10-04

## Context

The app must run on Windows, macOS, and Linux with an Electron shell, React UI, and Node backend. It needs a small maintainable foundation rather than VS Code's editor/extension infrastructure. React and electron-vite both document TypeScript support; electron-vite provides process-specific entry conventions. See the [research brief](../research/electron-learning-app.md) for sources and alternatives.

## Decision

Use strict TypeScript, React, and electron-vite. Follow `src/main`, `src/preload`, and `src/renderer` conventions, adding `src/core` for learning behavior and `src/shared` for serializable contracts. Host the initial Node backend inside main. Use distinct Node/browser type scopes, ESM main/renderer output, and a fully bundled CommonJS preload compatible with sandboxing. Use npm and a committed lockfile with verified compatible versions.

## Consequences

Process boundaries are visible in the source layout and checked by lint/type gates. The renderer remains web-oriented. No local HTTP server or monorepo tooling is necessary yet. Large/expensive jobs must move out of main when introduced. Forge is a viable alternative, but its currently experimental Vite plugin adds uncertainty we do not need in this small Vite-oriented scaffold. React is our UI choice rather than a claim about VS Code internals.

Current rules: [architecture](../patterns-architecture.md), [renderer](../patterns-renderer.md), [development/testing](../patterns-development-testing.md).
