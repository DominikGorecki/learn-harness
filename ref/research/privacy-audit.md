# Open-source privacy audit

Date: 2026-10-04. This review checks repository disclosure and the application's handling of private data. It is a snapshot audit, not a guarantee that every future contribution or dependency is free of secrets.

## Result

No live credentials, API keys, signing keys, or private-key material were identified in the scanned source, reachable commit diffs, local application bundles, published CI diagnostics, or downloaded CI logs. Personal information was identified in original reference screenshots, two documentation passages, and Git author/committer metadata. Local source cleanup does not remove the material already published in Git history.

| Finding | Evidence | Action and remaining exposure |
| --- | --- | --- |
| Personal reference screenshots | `docs/chatgpt-app-light.png` and `docs/chatgpt-app-dark.png` contain personal sidebar content and profile photos. The light image also shows private project/chat titles and a pet name. Introduced in `e35a7b2`. | Removed both originals from the current working tree and repaired documentation references. Kept the design observations and the eight isolated application captures. The original image blobs remain in both public branches' history. |
| Personal home-directory path | ADR-0014 and the project-setup validation record include a developer's Linux home path. Introduced in `b98a629`. | Generalized both passages to `~/.config/Learning Studio`. Older commits and the other public branch retain the original path. |
| Personal commit email | All 34 reachable commits use a personal author/committer email rather than GitHub's noreply address. The value is deliberately not reproduced here. | Reported for an explicit privacy decision. A future noreply setting does not change existing commits. Rewriting published metadata would change commit IDs and requires coordinating both branches and existing clones. |
| Accidental future inclusion | Existing ignore rules covered `.env`, ordinary logs, build/test output and Context Bank metadata, but not copied connection files, project metadata, signing keys or the entire temporary directory. | Extended `.gitignore` for those surfaces, `.npmrc`, and the temporary audit workspace. Ignore rules cannot prevent forced additions or remove files already tracked. |

The public repository identity and links to its own GitHub Actions runs are intentional attribution, not private credentials. The email in an npm package's deprecation notice belongs to that package's public metadata. Account-test identities use `example.test`, fixture tokens are synthetic, and test signing keys are generated at runtime.

## Scope and evidence

- Initial working snapshot: 188 tracked and non-ignored project files, including the in-progress logging changes. Reviewed source, documentation, local skills, lockfile, configuration and workflows. No ambient environment values or real learner credential files were collected.
- Git: 34 commits and 637 reachable historical blobs across local refs, including both public branch tips. Public GitHub metadata confirmed `master` at `ff7980ae8511895ab31def09bfdfd4f3de875798` and `codex/project-setup-and-outline` at `b98a629c2502229c8e527c6ee2619c37b5cda8cc` during this audit. Inspected commit metadata separately from secret scanning.
- Images: visually inspected all ten unique PNGs in reachable repository history and inspected their PNG chunk types. No text/EXIF metadata chunks were present. Eight images show isolated application/demo data; the two personal reference images are the findings above.
- Secret scanner: official [Gitleaks v8.30.1](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1), verified against its published SHA-256 checksum. Default rules, decoding and full output redaction were used, with no finding suppressions. History, current-source snapshot and local `out/` scans each returned zero findings. Git printed unrelated global configuration warnings during the history scan; the scanner still completed all 34 commits successfully.
- Public CI: downloaded all 23 nonexpired diagnostic artifacts listed by the repository API, spanning seven runs. Secret-scanned their extracted content with archive traversal, and separately inspected all 14 nested Playwright trace archives as text. The extracted artifacts contained 473 files, including 417 screenshot files/trace frames. Targeted checks found no developer username, personal commit-email domain, private-key marker, provider-token prefix or JWT literal in the text. Sample account, sign-in and material screenshots show synthetic fixture data; these samples do not constitute visual review of every CI frame.
- Public CI logs: downloaded logs from all seven runs associated with those diagnostic artifacts. Gitleaks and targeted personal-identifier checks returned no findings. No GitHub releases were listed. Existing installer artifacts were inventoried but were not downloaded or exhaustively inspected; packaging inputs and local application bundles were reviewed instead.

## Application boundaries reviewed

Account credentials are stored by main under the application profile, separately from project `.edu` data. OS encryption is used when available; the documented local-file fallback uses owner-only POSIX permissions. Public account snapshots contain display identity and model state, not tokens. IPC checks the owning main frame, and the renderer is sandboxed with a production CSP that denies network connections.

Generation credentials travel on the private utility-process port. The worker receives a small environment allowlist and uses the selected provider endpoint without redirects; it does not inherit ambient provider keys. Material reads are bounded, reject symlinks, and exclude hidden files and recognized sensitive filenames. Explicit outline submission intentionally sends learning intent, current outline context and material read by the assistant to the provider. Filename exclusion cannot identify every private passage inside an otherwise permitted document.

Model summaries and the in-progress development file logger project known fields and safe scalar values rather than serializing tokens, identity, paths, request bodies, source text or raw provider errors. Runtime logs remain local to the profile; CI journeys use isolated synthetic accounts/projects. Packaging includes compiled application files, package metadata and runtime dependencies, rather than the source screenshots or local learner profiles.

No application behavior or process boundary was changed by this cleanup. Concurrent logging work was preserved. Source, history, GitHub access and artifact inspection were read-only; no commit, push, artifact deletion or history rewrite was performed.

## Validation and limits

Local Markdown links, whitespace, privacy substitutions and the added ignore patterns passed after cleanup. `npm run check` passed: lint, 178 unit tests (three platform-specific tests skipped), both TypeScript scopes and production bundles. An initial attempt failed because the temporary source snapshot introduced a second ESLint configuration root; that snapshot was removed. A subsequent sandboxed attempt passed lint but could not create Vitest's temporary configuration under `node_modules`; the successful full check was rerun with dependency-cache access.

Desktop tests and installer packaging are not rerun for this documentation/ignore-only cleanup. The review does not certify third-party dependency internals, every CI screenshot pixel, GitHub caches/forks, deleted or unavailable remote refs/artifacts, or all historical CI runs outside the seven downloaded sets. Source changes during concurrent work require a fresh scan before publication.

To finish public-history cleanup, agree which personal attribution should remain, remove the two image paths from every published branch's history, replace the historical home-directory strings, and optionally replace author/committer email metadata. Review a rewritten mirror before coordinating any force-push. Existing forks, clones and cached views can retain old objects even after a rewrite. No credential rotation is indicated by the evidence collected in this audit.
