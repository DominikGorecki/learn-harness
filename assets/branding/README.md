# Sculpted aperture assets

`sculpted-aperture.svg` is the sole editable geometry master. Its three named closed cubic paths are the two tall side pages and shallow broad bottom page surrounding an upright triangular opening. They adapt the locked [large reference](../../docs/design/component-designs/03-learning-studio-logo/learning-studio-logo-final.png), simplifying its shading into a flat glyph. Do not trace highlights as additional shapes or substitute the rounder miniature from the design sheet.

The glyph viewBox is `250 280 750 700`; it gives roughly 7% clear space beyond the page bounds. Preserve that clear space, orientation and three separation gaps. The minimum reviewed glyph size is 16px. The existing small/full renderer slots remain 22px/36px. At 16/22/24/32px, antialiased edges can connect at 50% alpha; the three high-opacity page cores remain separate and the triangular opening remains recognizable. This is a raster qualification, not a claim that every partially painted pixel is disconnected. Inspect small-size output when changing curves or runtime; do not infer it from the large vector alone.

`Mark.tsx` consumes generated `src/renderer/src/components/brand-geometry.ts`, rendering exactly the three master paths with `currentColor`. Existing Light/Dark accent and primary-text tokens provide the colors; monochrome changes color only. Marks beside Learning Studio text stay decorative (`aria-hidden`); existing text, 22px/36px dimensions, control names and actions remain unchanged. Functional icons do not use the brand artwork.

`app-icon.svg` is derived from the master with transform `translate(-81.75 -88) scale(.95)`. Its native tile is a 1024px canvas with an 864px charcoal rounded square inset by 80px, 182px corners, a 2px fine edge, and a subtle opaque gradient from `#343940` to `#202329`. The glyph uses flat `#CEAEF3`. Transparent padding remains outside the tile; at 16px the full outer edge is transparent. Glyph-only artwork belongs in the existing renderer brand slot; the tile belongs in native app-icon consumers.

## Reproduce and audit

Install the repository's locked dependencies, then run from the repository root:

```powershell
npm run branding:export
npm run branding:check
npm run package
npm run branding:package
npm run test:packaged
```

The export uses pinned Electron 44.5.1 / Chromium 152.0.7977.130, with a hidden isolated-profile helper, sandbox/context isolation enabled, no preload/Node renderer capability, denied permissions and denied network requests. Node writes bounded local outputs and creates ICO/ICNS containers without additional raster, native or runtime dependencies. Every temporary profile/input/output is removed when the exporter exits. Exporting requires a graphical Electron-capable host; restrictive execution sandboxes can require a normal-host launch while all Chromium security flags remain enabled.

`branding:check` actually rerenders into a temporary directory and compares SHA-256 digests to checked-in outputs, including generated renderer geometry. Reproducibility is qualified on the available Windows host with the pinned runtime; cross-host byte identity has not been established. Preview labels use the host sans-serif font and may differ on other hosts. `exports.json` records runtime versions, master/output hashes, byte lengths, dimensions and observed alpha bounds without timestamps or private paths. `audit-branding.ts` independently decodes PNG scanline filters through Node zlib, checks dimensions/alpha/safe padding, compares container payload hashes and verifies derived geometry. High-opacity glyph connectivity uses alpha ≥224/255 and eight neighbours; visual review complements this bounded check.

| Output | Contents / consumer |
| --- | --- |
| `icon-16/24/32/48/64/128/256/512/1024.png` | Native tile size set; Linux builder uses `icon-512.png` |
| `icon.ico` | Seven PNG frames, 16/24/32/48/64/128/256px; Windows builder icon |
| `icon.icns` | PNG chunks `icp4/icp5/icp6/ic07/ic08/ic09/ic10`, 16/32/64/128/256/512/1024px; macOS builder icon |
| `icon.png` | Exact 256px native tile copy for the fixed BrowserWindow resource |
| `glyph-16/22/24/32/36/48.png` | Transparent monochrome alpha evidence from the same master |
| `preview.svg` / `preview.png` | Actual-scale Light/Dark/monochrome glyph review plus small native tiles; not runtime assets |

Builder copies only `icon.png` to `resources/branding/icon.png`. Main resolves that fixed packaged path through `process.resourcesPath`; unpackaged main resolves `../../assets/branding/icon.png` relative to compiled `out/main`, independent of the application entry/profile/project path. No renderer-provided path, generic filesystem capability, profile migration or identity change is involved. Builds consume checked-in exports and do not invoke AI or regenerate artwork.

On Windows, `branding:package` additionally reads the actual executable through electron-builder's locked `pe-library` build-tool dependency and checks every RT_GROUP_ICON/RT_ICON frame's PNG hash against the master exports. This is package/resource evidence, separate from native Explorer/window/taskbar presentation. Packaging on macOS/Linux, Dock/launcher presentation, signing/notarization, installers and platform masks remain native-host qualifications until actually exercised. Existing application identity, ASAR hardening, fuses and signing policy remain intact.
