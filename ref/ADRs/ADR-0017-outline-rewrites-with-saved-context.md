# ADR-0017: Outline rewrites with saved project context

Status: Accepted — 2026-10-04

## Context

The learner requests a subtle edit action beside “Your path through the subject”, with numbered or freeform changes interpreted by Pi using the active project model. The progressive-learning workspace proposal describes discovery from project orientation; its separate manifests and tutoring sessions remain future work.

## Decision

Expose a named, sender-authorized `rewriteOutline` capability accepting only an opened project handle, selected model ID and nonblank changes bounded to 32,000 characters. Main/core obtain the current saved outline from identity- and digest-checked project storage, never from a renderer-supplied JSON document. Rewriting requires a writable saved outline and no outstanding unsaved result.

Pass the complete saved outline JSON (including its coverage) as learning data to every educational generation request, or explicit null on initial creation. Pi retains this orientation on subsequent tool turns. Rewrites also receive the learner's change request separately from the persistent learning brief. Numbered references are original one-based lesson positions; Pi preserves stable IDs and unaffected content where possible and submits a full outline. The existing selected-model authorization, educational tools, worker bounds, independent validation and atomic persistence remain authoritative. The original written/inferred learning direction is preserved on a rewrite.

Amend ADR-0011 for rewrites: Pi decides whether further material reads are useful. Existing source paths recorded as read in the validated saved outline may be retained without re-reading; mark their coverage as inherited and explicitly disclose that their current contents are unverified. New references require successful scoped read-tool evidence. Ordinary creation/regeneration still requires relevant reads when supported files are present. The harness has no new filesystem mutation or arbitrary discovery capabilities.

The dialog names the affected saved outline, selected model and allowance use. Submission is the explicit replacement choice. Opening/dismissing sends no inference request. Keep project/outline-keyed drafts on dismissal, failure and cancellation; a newly saved outline starts a fresh draft. Use the existing progress, cancellation, unsaved-result retry and external-edit confirmation flow. Preserve the previous outline during inference or failure; save retry consumes no further inference.

## Consequences

The outline can evolve through learner instructions without a schema migration or manual JSON editing. This implements saved outline orientation and selective reads, while the proposed topic/module/session layout remains unimplemented. Source provenance spans revisions and must distinguish inherited evidence from current reads. Local protocol fixtures verify plumbing and recovery; live-model compliance with freeform change requests requires separate provider evidence.
