# Distribution patterns

Governed by [ADR-0004](ADRs/ADR-0004-quality-gates-and-native-packaging.md).

## Build surfaces

`out/` contains compiled application bundles. `dist/` contains packages/installers. `electron-builder.yml` includes bundles and package metadata in ASAR and configures Windows NSIS, macOS DMG, and Linux AppImage. Build for the host architecture by default; x64/arm64 release coverage is a later explicit matrix decision. All commands use `--publish never`.

The current identity (`com.example.edu-harness`) and Electron default icon are placeholders. Final product identity/artwork must be chosen before public distribution. Node is embedded by Electron; end users do not install a separate Node backend.

Linux's `desktopName` package metadata and `syncDesktopName: true` keep its desktop entry and runtime window association consistent. Keep these names aligned when changing product identity.

## Hardening and native runners

Packaged binaries disable RunAsNode, Node options, Node CLI inspection, and file-protocol extra privileges. ASAR-only loading and integrity validation are configured; integrity enforcement support varies by platform. Development Electron is left inspectable for tests. Do not disable packaged fuses to drive experimental test tooling. `test:packaged` runs the artifact’s worker from ASAR through a development host, while actual hardened startup is checked separately. This distinction keeps testability from weakening the shipped binary.

Use target OS runners for reliable native-module compatibility and platform packaging. macOS signing/notarization needs macOS. The CI matrix produces unsigned artifacts; a green run is not a signed public release. Before native modules are introduced, revisit `npmRebuild: false` and set up target Electron ABI rebuilds.

## Release work still required

Obtain/configure signing through CI secrets, notarize macOS builds, exercise installers/uninstallers on actual platforms, and test upgrade/data migration behavior after persistence exists. Choose an update provider/channel and verify signed update delivery before wiring `electron-updater`. No automatic updates, publishing, or external distribution have been enabled. Account credentials are managed separately by the application under ADR-0008; signing/notarization credentials are not configured.
