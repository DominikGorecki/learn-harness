# ADR-0011: Scoped material snapshots and verified source coverage

Status: Accepted — 2026-10-04

## Context

A learning project may begin with existing notes and no written goal. The assistant needs useful subject evidence without inheriting a coding agent’s permissions or presenting an inventory as proof that it read every file.

## Decision

After explicit Create outline, the utility process builds a read-only snapshot of supported UTF-8 text and Markdown. It bounds traversal to 1,000 entries and six nested levels, up to 200 readable files, 256 KiB per file, and 2 MiB of inspected source bytes. Exclude hidden metadata, known sensitive filenames, build/dependency folders, agent instructions, symlinks, and nonregular files. Validate scope and file identity around reads. Record unsupported, omitted, unreadable, binary, oversized, and excluded material.

Pi can list permitted sources and read exact snapshot keys. It receives no arbitrary filesystem tool. Only successful read-tool calls mark sources as read; independently validate every lesson source reference against that evidence before accepting and saving the outline. Source content is untrusted data. Explicit learner direction takes priority over inferred subject matter.

If no readable material or written topic is available, return a local request for learning details without inference. Ambiguous readable material may produce one structured clarification. Preserve the draft and require a direction after clarification. Store an inferred brief separately from a learner-written brief and label it accordingly. The optional inferred-brief field is readable from older version-one documents where absent.

## Consequences

Reading a folder or model selection still consumes no inference. Creating a folder-based outline may send permitted material to ChatGPT; the composer explains this before submission. Coverage distinguishes available but unread files from those supplied to the model. Limits are visible when they omit material; source files remain unchanged.

PDF, office, binary, and other formats are currently reported as unsupported. There is no web browsing or automatic download. Snapshot scoping is a bounded file-access policy, not a general hostile-code sandbox. The worker never executes source instructions or modifies source files.

Tests establish scope, data flow, source evidence, clarification and recovery. Curriculum quality and the model’s actual interpretation still require live-provider evaluation.
