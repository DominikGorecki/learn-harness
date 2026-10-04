# ADR-0002: Sandboxed renderer with authorized capability IPC

- Status: Accepted
- Date: 2026-10-04

## Context

A learning app may eventually display imported or model-generated material. Renderer compromise must not automatically grant filesystem, process, or credential access. Electron's primary security guidance and VS Code's sandbox migration support separating privileged backend operations from the workbench.

## Decision

Enable context isolation and sandboxing; disable renderer Node integration. Expose a small `window.learning` API with named operations and typed result envelopes through `contextBridge`. Main verifies the owning window, webContents, main frame, origin, and entry URL on every call, and parses mutation payloads at runtime before invoking core. Deny navigation, redirects, new windows, webviews, and browser permissions. Serve built assets through an allowlisted `learningapp://workspace` protocol with restrictive production CSP. Development accepts only the fixed loopback Vite origin and its necessary refresh policy.

## Consequences

New privileged behavior requires an explicit validated capability; generic IPC and arbitrary path APIs are prohibited. Type declarations remain separate from runtime authorization/validation. No external content, provider, or file capability is granted by this foundation. CSP differs deliberately between development and production. This establishes application policy; actual Chromium sandbox availability also depends on the host and must be tested honestly.

Current rules: [IPC/security](../patterns-ipc-security.md), [renderer](../patterns-renderer.md).
