# Progressive discovery and interactive learning modules

Date: 2026-10-04

Status: Future design proposal captured from the product discussion. File layouts, schemas, discovery tools, and module execution below are not implemented contracts.

This document describes how a learning project can hold evolving knowledge in ordinary files while the application delivers structured Socratic activities. A compact JSON index provides the starting point for progressive discovery. Pi follows references into relevant material and produces validated module definitions; the application renders those definitions in supported interactive containers.

The proposed division is: human-readable knowledge and learner artifacts in ordinary project folders, portable application state under `.edu`, and account credentials and device preferences in the application profile. The file structure can evolve without making module behavior depend on folder names.

Read this alongside the [product overview](overview.md) and [Socratic learning repertoire](socratic-learning.md). [PRD 01](../ref/prds/01-project-setup-and-outline.md) defines the current milestone, which delivers saved outlines rather than interactive tutoring.

## Current implementation

Today, `.edu/project.json` is one versioned document containing project identity, revision, timestamps, model preference, learning brief, and an optional complete outline. Lessons and module plans are nested in that outline. There are no separate module definitions or persistent learning sessions.

Educational generation uses Pi Agent Core and Pi AI in an Electron utility process. The worker builds a bounded snapshot of supported text and Markdown. Pi can list permitted material, read exact snapshot paths, and submit an outline or request clarification. The model receives source text only through successful read-tool calls, although the worker has already read supported files locally to construct the snapshot.

The existing material scan excludes `.edu`. Pi has no filesystem mutation, shell, extension loading, or automatic project instruction discovery tools. The proposed design therefore needs explicit discovery and update capabilities; changing the files alone will not enable it.

The outline edit flow is now implemented under [ADR-0017](../ref/ADRs/ADR-0017-outline-rewrites-with-saved-context.md). Every educational generation call receives the validated saved outline JSON as orientation (or null before initial creation), retained across Pi tool turns. A rewrite receives the learner's numbered/freeform changes separately, uses the selected project model, and lets Pi read additional supported material as needed before submitting a complete replacement for application validation and saving. Previously read source references can carry forward with an explicit inherited-evidence label. This uses the current nested outline format; the separate indexes, manifests, activities and sessions below remain future proposals.

Current decisions remain authoritative: [portable project storage](../ref/ADRs/ADR-0009-portable-project-workspace.md), [bounded Pi generation](../ref/ADRs/ADR-0010-bounded-pi-outline-generation.md), and [scoped material understanding](../ref/ADRs/ADR-0011-scoped-material-understanding.md).

## File ownership

| Location | Contents and purpose |
| --- | --- |
| Ordinary project folders | Original sources, explanations, examples, research notes, and learner-created work useful outside the application. |
| `.edu/project.json` | Portable project identity and preferences, learning direction, and compact entries referencing the learning structure. |
| Other files under `.edu` | Topic or lesson manifests, structured module definitions, session records, and evidence or progress state interpreted by the application. |
| Application profile | Protected account credentials, recent project locations, and device preferences. These do not travel with the learning project. |

An illustrative layout is:

```text
project/
├── .edu/
│   ├── project.json
│   ├── topics/
│   │   └── topic-001.json
│   ├── modules/
│   │   ├── module-001.json
│   │   └── module-002.json
│   └── sessions/
│       └── session-001.json
├── topic-one/
│   ├── index.md
│   ├── concepts.md
│   ├── sources/
│   │   └── introductory-reading.md
│   └── notes/
│       └── my-explanation.md
└── topic-two/
    ├── index.md
    └── notes/
```

Topic folders are a useful convention for new material, not a requirement to reorganize existing projects. A small project may use a few files at the root. A manifest can reference material wherever it lives within the project.

There is no requirement to mirror ordinary topic folders inside `.edu`. The knowledge hierarchy and activity hierarchy serve different purposes. Several lessons can share sources, and one lesson can draw on several folders. Stable IDs and explicit references connect them.

The product hierarchy remains project → lesson → module → session. This proposal uses “topic” for a discoverable subject branch. A topic may correspond to a lesson or group related lessons; whether a separate topic entity is needed remains open. It should not introduce a mandatory extra level for every project.

## Knowledge and learner understanding

Subject knowledge lives primarily in ordinary files. A topic's `index.md` provides a short orientation and links to deeper explanations and sources. Pi can read those files progressively when building a module or responding during an activity.

Distinguish original sources, AI-authored explanations, and learner conclusions. Pi may fill a gap using model knowledge, but an unsourced explanation should be identified as an AI contribution rather than presented as evidence from a file it did not read. Preserve source provenance and distinguish referenced material from actually inspected material.

The learner's understanding is a separate evolving record: claims, metaphors, predictions, revisions, and unresolved questions. Sessions preserve what the learner actually said and the feedback they received. Useful learner-approved summaries can become ordinary Markdown notes, with links back to their originating sessions. A summary must not silently replace the original responses.

The project does not need fully authored knowledge or activities before learning begins. An outline can establish direction while explanations and modules develop through explicit requests.

## Indexes and topic membership

The application lists topics and modules by reading explicit manifests. It does not need inference or directory-name matching to determine membership. Saved navigation should remain available without an AI connection.

The following JSON examples are abbreviated proposed records, not payloads accepted by the current parser. Final schema versions, required metadata, and migration rules need a separate implementation decision.

The project index references each topic definition:

```json
{
  "projectId": "project-001",
  "revision": 12,
  "brief": "Understand the mechanisms behind inflation",
  "topics": [
    {
      "id": "topic-001",
      "title": "Money creation and prices",
      "summary": "Money supply, demand, and their relationship to prices",
      "definitionRef": ".edu/topics/topic-001.json"
    }
  ]
}
```

The topic definition connects knowledge to ordered module entries:

```json
{
  "id": "topic-001",
  "contentRef": "topic-one/index.md",
  "modules": [
    {
      "id": "module-001",
      "title": "Explain the core idea",
      "method": "explain-from-scratch",
      "definitionRef": ".edu/modules/module-001.json"
    },
    {
      "id": "module-002",
      "title": "Predict a change in prices",
      "method": "prediction",
      "definitionRef": ".edu/modules/module-002.json"
    }
  ]
}
```

The renderer can show the topic title and its two module entries without loading their full activity content. Selecting a module loads its validated definition through the typed application bridge. Entry titles and methods should remain consistent with their definitions through application-managed updates.

Use stable IDs for identity and project-relative references for location. Renaming `topic-one/` changes its references, not topic identity, module ownership, or session history. The manifest's module array can express intended learning order; display sorting and a tutor's next-activity recommendation are separate concerns. Completion belongs to session or progress records rather than a fixed module definition.

Keep the initial index compact. Full explanations, module configuration, transcripts, and accumulated notes belong in referenced records. Summaries should provide enough information to decide which branch is relevant.

## Progressive discovery with Pi

For a requested activity, the proposed discovery sequence is:

1. The application supplies compact project orientation and the active learning objective.
2. Pi opens the relevant topic or lesson manifest and its knowledge summary.
3. Pi follows references into focused sources, explanations, and useful prior learner work.
4. Pi submits a structured module definition through a named educational tool.
5. The application validates, saves, and publishes the resulting state for the UI.

During a session, Pi also receives the active module and relevant session context. It can discover additional material to formulate a useful next question instead of receiving the entire project on every turn.

This needs explicit, bounded tools for reading application records and discovering permitted knowledge files. Ordinary material remains untrusted learning data. A project file does not redefine system instructions, tool permissions, supported UI components, or filesystem scope.

Maintain the existing process boundaries: core owns learning behavior and ports; shared owns serializable contracts and validation; main and its worker adapters own authorized file and inference access; preload exposes named capabilities; renderer uses the typed bridge. File loading should be bounded and verify project scope and identity. Preserve evidence of what Pi actually read, including limitations and missing references.

## Module definitions and UI containers

The application owns a registry of supported activity components and their interaction rules. A module definition selects a supported interaction and configures its content. Pi supplies educational content and adaptive tutoring through validated outputs; it does not supply executable React, scripts, or arbitrary markup.

Keep the educational method distinct from the interaction implementation. Multiple methods may share a component, and a method may eventually support more than one interaction. An illustrative module record is:

```json
{
  "id": "module-002",
  "revision": 1,
  "method": "prediction",
  "interaction": "predict-compare-revise",
  "objective": "Examine your model of inflation",
  "initialPrompt": "What happens if the money supply doubles?",
  "contextRefs": ["topic-one/index.md"],
  "config": {
    "horizons": ["one week", "one year", "ten years"]
  }
}
```

Proposed interactions derived from the [Socratic repertoire](socratic-learning.md) include:

| Method | Interaction inside the module container |
| --- | --- |
| Why-chain | Initial claim, successive questions, and a visible causal chain. |
| Metaphor generation | Metaphor drafts, correspondence mapping, and challenges to where the analogy breaks. |
| Prediction | Scenario, committed prediction, comparison with evidence or a labelled theoretical explanation, and revision. |
| Explanation ladder | Audience-specific stages with earlier explanations available for comparison. |
| Counterexample search | Claim, counterexamples, and successive revised claims. |

A shared container provides the activity title, purpose, source context, save status, and pause/resume controls. Activity-specific components provide the interaction within it. Appearance and behavior follow the existing [design system](../ref/patterns-design-system.md), [UX](../ref/patterns-ux.md), and [renderer](../ref/patterns-renderer.md) guidance.

Application logic enforces valid transitions. For example, prediction should require committing a prediction before revealing the comparison material. Pi can adapt the question or feedback, but an unexpected model response cannot bypass that sequence. Tutor outputs should match the schema and allowed actions for the current activity stage.

## Sessions and evolving structure

A module defines an activity; a session records one attempt. A proposed session record includes its own ID, the owning module ID, the module revision or a definition snapshot, current stage, learner responses, tutor turns, and timestamps. New attempts preserve earlier attempts.

Pin the definition used by a session so later module edits do not change the meaning of its recorded work. Session completion indicates participation, not proven mastery. Any assessment or retention policy needs its own product definition and evidence.

When Pi proposes a new module, its submission identifies the owning topic or lesson. The application validates the definition and membership, saves the files, and updates the manifest as a coordinated operation. Module edits and knowledge changes should similarly pass through bounded update capabilities with revision checks. Explicit learner actions initiate generation or updates; opening the project or expanding navigation does not initiate inference or rewrites.

The storage design must handle partial failures across multiple files. A successful file write alone must not be presented as a completed module publication if its manifest update failed. The exact transaction or recovery mechanism remains to be designed; current single-file atomic replacement does not establish multi-file atomicity.

Keep prior work intact on cancellation or generation failure, retain generated-but-unsaved results for save retry, and detect external edits. Moves should update references while preserving stable identities. Broken references or unsupported definitions should produce useful recovery states rather than silently dropping modules or recreating content. Broad reorganizations and replacement of durable learner work require a concrete reviewable change and the recovery behavior defined for that feature.

## Implementation decisions still needed

This proposal records the direction without changing current storage or enabling future runtime capabilities. Before implementation, define:

- Whether a topic is a lesson, an optional grouping, or a separate entity.
- The index, module, interaction, and session schemas, including compatibility and unsupported-version handling.
- Migration from the existing embedded outline to referenced records while preserving original project state.
- The first supported activity container and its tutor output and transition contracts.
- Discovery budgets, provenance tracking, and handling of changed knowledge during an active session.
- Coordinated saving, external-edit conflicts, and recovery across several files.
- The review and authorization flow for knowledge edits and structural changes.

A useful first slice would be one supported method with module listing, focused knowledge discovery, a real interactive container, and durable session resume. Broader autonomous restructuring, research tools, and assessment are separate capabilities. Adopting a replacement storage contract requires a numbered ADR and updates to the relevant indexes and focused patterns; this reference proposal does not supersede accepted decisions.
