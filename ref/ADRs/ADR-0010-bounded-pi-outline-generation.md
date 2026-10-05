# ADR-0010: Bounded educational generation in a Pi utility process

Status: Accepted — 2026-10-04

Project-file tool and publication scope extended by [ADR-0019](ADR-0019-topic-edits-and-project-file-access.md). [ADR-0022](ADR-0022-shared-pi-streaming-lifecycle.md) supersedes fixed elapsed inference/watchdog deadlines with received-byte inactivity and global ownership; the shared transport and all educational producers are implemented, with evidence in the streaming bundle. Other process, size/turn, acceptance, endpoint and cancellation/publication guarantees remain applicable.

## Context

PRD 01 requires complete curriculum outlines using the learner’s ChatGPT plan. Generation must keep the desktop responsive, preserve prior work, and distinguish completed inference from durable storage.

## Decision

Use pinned Pi Agent Core/Pi AI in a dedicated Electron utility process. Main obtains delegated authorization for the selected model; a private process port carries the token. The worker receives a small explicit environment without ambient provider keys, Node options, or project configuration. It exposes only educational completion/clarification tools; material tools are the next slice. No shell, extensions, agent instruction discovery, arbitrary network tools, or filesystem mutation tools are present.

The app applies a Responses payload whitelist, developer instructions, and the learning tool namespace. It uses the public plan endpoint, streaming, and disabled provider storage. Under ADR-0022, received-byte inactivity and independent worker health are bounded; receiving inference has no cumulative elapsed deadline. Turns, request/response size and output shape remain bounded. Automatic provider retries are disabled. Tools cannot accept results from incomplete, failed, or interrupted streams. Errors are classified without forwarding raw provider messages.

Platform-independent `GenerationService` owns one active run, project/run identifiers, progress, cancellation, and the generated-but-unsaved result. It uses a worker port and `WorkspaceService` persistence. Navigation remains available; conflicting metadata changes are guarded. A successful run saves a separately validated result against its originating project digest. A failed save retains the generated result for retry without inference. Existing outlines remain intact on cancellation/provider failure, and replacement requires an explicit UI choice.

## Consequences

Cancellation terminates the owned worker; no remote partial stream can become a saved outline. Saved projects remain readable without credentials. Utility isolation improves responsiveness and lifecycle ownership but is not an OS sandbox for arbitrary code; arbitrary learner code is never executed.

The educational prompt derives its task repertoire from `docs/socratic-learning.md`; fixture outlines are confined to tests. Local signed HTTP/SSE journeys verify Pi, the utility process, IPC, UI and files. Actual ChatGPT plan inference and native Windows/macOS behavior remain separate acceptance evidence.

Protocol references, checked 2026-10-04: [models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference), [preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations).
