# Choosing boundaries for difficult tasks

Read this for intertwined rules, a broad research vision, or candidate slices with unclear observable value.

## Useful cuts

For this Electron learning workspace, slice by complete learner or developer outcomes. A project-opening slice needs native selection, validated contracts, backend ownership, and a usable renderer state; main/preload/renderer files alone are not separate learner outcomes. An outline-recovery slice must keep operation identity, cancellation, saved state, and UI recovery consistent. Broader teaching or mastery claims require their own accepted scope and evidence.

| Situation | Possible cut | Check before accepting it |
| --- | --- | --- |
| Long user journey | One useful workflow step with its necessary behavior | The consumer can inspect or use the result without an unrelated future subsystem |
| Many supported cases | One category, actor type, or scenario variant | Unsupported variants are explicit; the supported case retains essential correctness |
| Complex rules | A simpler complete rule set, then additional rules | The initial result has a coherent meaning under declared assumptions |
| Several channels or integrations | One useful channel through an existing boundary | The shared contract supports the outcome without pretending other channels exist |
| New architecture | A thin executable path through necessary components | It demonstrates a capability rather than delivering each layer as a separate spec |
| Uncertain mechanism | A bounded evaluation capability with a comparator | Inputs, evidence, limitations, and the next decision are explicit |

Prefer a smaller number of coherent specs over one spec per entity or field. Necessary infrastructure belongs with a consuming capability or an explicit enabling contract.

## Coupling and prerequisites

Ask which rules must hold together for each candidate outcome to be valid. If they cannot be demonstrated separately, include them together or place their complete shared contract in a prerequisite.

A dependency should explain a concrete need: an input schema, available action, state transition, information boundary, or validated result. Similar subject matter alone is not a dependency. Cross-cutting requirements belong in every affected spec with consistent contracts; a final cleanup slice cannot retroactively make earlier accepted results correct.

Evidence-dependent work needs a different boundary from ordinary implementation. An experiment may change the product direction or contract. Describe a dependent future candidate and its blocker rather than writing a definitive implementation spec that assumes a favorable result. An experimental default with a clear fixture, verification, and conditional claim can proceed without evidence for a stronger claim.

## Readiness questions

- Can the beneficiary demonstrate the outcome with existing capabilities and this slice?
- Are supported inputs, outputs, state changes, and failure behavior bounded?
- Are required decisions settled or explicitly permissible design assumptions?
- Are essential rules included or supplied by a defined prerequisite?
- Do ordinary, boundary, and failure examples make acceptance observable?
- Does validation support the claimed result while leaving empirical questions explicit?
- Does a prerequisite define the needed contract, or does its unknown result still determine this slice?

Use these questions to revise boundaries and expose blockers. Do not impose a universal slice count, duration, UI requirement, or experiment phase.

## Example: importing records

The beneficiary is the operator or consuming system that needs usable records. Parser, storage adapter, and UI modules are implementation components rather than separate user outcomes.

One possible initial slice imports a bounded file format into an existing destination and reports usable records and rejected rows. Its coherent contract includes schema validation, duplicate handling, write atomicity or partial-success semantics, authorization when relevant, and observable failure reporting. A preview-only slice can be useful first if the operator can inspect validated results without pretending records have been committed.

Additional formats, scheduling, and richer remediation can be later slices. A parser-only enabler needs an identified consumer and a validated output contract; do not label it a completed import workflow. Existing parsing tests establish only the behavior they exercise, not successful destination writes.

## Example: a proposed ranking mechanism

A research recommendation to improve ranking does not settle the objective, acceptable trade-offs, data rights, comparison baseline, or evidence required for deployment.

An evaluation slice can compare a candidate with the existing baseline on a declared dataset, report agreed metrics, and state limitations. A rollout slice whose contract depends on whether the candidate performs acceptably remains blocked until that result and the acceptance decision exist. Passing deterministic scoring tests supports software correctness; it does not establish real-world usefulness or fairness.
