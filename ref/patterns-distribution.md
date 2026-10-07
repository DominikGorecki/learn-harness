# Distribution patterns

Governed by [ADR-0004](ADRs/ADR-0004-quality-gates-and-native-packaging.md).

## Build surfaces

`out/` contains compiled application bundles. `dist/` contains packages/installers. `electron-builder.yml` includes bundles and package metadata in ASAR and configures Windows NSIS, macOS DMG, and Linux AppImage. Build for the host architecture by default; x64/arm64 release coverage is a later explicit matrix decision. All commands use `--publish never`.

The application identity (`com.example.edu-harness`) remains a placeholder for public distribution. The selected Sculpted aperture artwork is implemented under [ADR-0025](ADRs/ADR-0025-scoped-editorial-workspace-and-aperture-identity.md); this changes artwork only, preserving application/profile identity. [Branding assets and export/audit commands](../assets/branding/README.md) and the [main-workspace identity contract](patterns-main-workspace.md#selected-identity-and-native-resources) own master paths, clear space, minimum sizes and resource consumers. Windows ICO, macOS ICNS and Linux PNG are checked-in exports; `electron-builder.yml` copies fixed `icon.png` for BrowserWindow. No renderer-supplied path or additional privileged API is exposed. Windows export reproducibility, packaged executable icon frames and actual Explorer Details/Large icons have evidence in [bundle 04 validation](work/04-main-workspace-design/validation.md). Runtime/taskbar presentation is unrun; macOS/Linux native packaging/launcher/Dock presentation, cross-host byte identity, signing and installer qualification remain separate. Final public product identity and release approval are still required. Node is embedded by Electron; end users do not install a separate Node backend.

Linux's `desktopName` package metadata and `syncDesktopName: true` keep its desktop entry and runtime window association consistent. Keep these names aligned when changing product identity.

## Hardening and native runners

Packaged binaries disable RunAsNode, Node options, Node CLI inspection, and file-protocol extra privileges. ASAR-only loading and integrity validation are configured; integrity enforcement support varies by platform. Development Electron is left inspectable for tests. Do not disable packaged fuses to drive experimental test tooling. `test:packaged` runs the artifact’s worker from ASAR through a development host, while actual hardened startup is checked separately. This distinction keeps testability from weakening the shipped binary.

Use target OS runners for reliable native-module compatibility and platform packaging. macOS signing/notarization needs macOS. The CI matrix produces unsigned artifacts; a green run is not a signed public release. Before native modules are introduced, revisit `npmRebuild: false` and set up target Electron ABI rebuilds.

## Release work still required

Obtain/configure signing through CI secrets, notarize macOS builds, exercise installers/uninstallers on actual platforms, and test upgrade/data migration behavior after persistence exists. Choose an update provider/channel and verify signed update delivery before wiring `electron-updater`. No automatic updates, publishing, or external distribution have been enabled. Account credentials are managed separately by the application under ADR-0008; signing/notarization credentials are not configured.
