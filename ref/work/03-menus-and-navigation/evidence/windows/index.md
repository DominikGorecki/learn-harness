# Native Windows menu and window evidence

Date: 2026-10-06. Source: master `59ad99469569ed1044a635f422dd9381a016ffe8`, Electron 44.5.1, native Windows graphical session at 125% display scaling. This is partial native qualification for [R02/R03/R04/R12/R13/R16](../../menus-and-navigation.spec.md), separate from Playwright renderer captures and the final whole-spec gates.

The coordinator launched the production build in a fresh, isolated application profile with no connected account or learner project. The fixture title distinguished it from the existing user application. Windows input and captures followed the installed computer-use skill through `@oai/sky` in Node REPL. Each input targeted the uniquely returned fixture window and was followed by a new observation. The skill source was `computer-use/26.930.31730/skills/computer-use/SKILL.md` in the installed plugin cache, external to this repository. No production capability or security setting changed.

## Confirmed observations

| Check | Actual action and result | Retained evidence |
| --- | --- | --- |
| Integrated Light strip | Full-window capture shows Back/Forward/toggle/File/Edit/View/Help above the shell with native controls at the right. Initial history directions are disabled. | [Light window](native-light.jpg) |
| Title double-click | Double-clicked empty title-strip space. A settled capture changed from 1282×842 to a maximized 2752×1104 window at screen origin. Double-clicking again restored the original-sized window. | [Maximized window](native-maximized.jpg) |
| Native File popup and Escape | F10 focused File; Down opened the native popup with Open project, Recent projects and Close window. Escape dismissed it and restored visible focus to File. | [File popup](native-file-popup.jpg) |
| Native View keyboard rows | Alt+V focused View; Down opened the native popup. Further Down presses moved selection through Back, Forward and Toggle sidebar; Enter activated Toggle sidebar, hiding the sidebar through the shared application command. Focus returned to View. | [View popup](native-view-popup.jpg); observed activation sequence |
| Appearance shortcut and overlay | Ctrl+comma opened Appearance. Selecting Dark changed the native overlay/control colors and renderer theme; Escape returned to the workspace with focus on Settings. | [Dark window](native-dark.jpg) |
| Native buttons | Clicking the maximize button produced a maximized window. A restore-button attempt reported an occlusion error; subsequent target activation observed the restored window, so that attempt is not clean restore-button proof. Clicking Minimize produced the runtime's explicit minimized-window result; activating the same returned window restored it. Clicking Close removed the fixture window; process inspection confirmed its Electron process had exited. | Actual input results and subsequent window/process observations |
| Full screen | F11 entered full screen, retaining the app strip/menu controls while native caption controls were hidden. A second F11 restored the ordinary window and native caption controls. | [Full-screen window](native-fullscreen.jpg) |

The popup captures are the native transient menu surfaces returned alongside the owning full-window state, not HTML menus or simulated callback activation. Only settled fixture-only images are retained; animation/occlusion frames showing unrelated applications were excluded. Image dimensions/digests and source revision are recorded in [manifest](manifest.json).

## Unverified required scope

- Drag attempts from empty strip space did not provide reliable position-change evidence. Their captures retained the original origin; dragging is **unverified**, not passed. Native resize/system-menu movement was not tested in this session.
- The restored state after the occluded restore-button attempt does not prove that button's clean input path. Double-click restore and restore from minimization were observed separately.
- Native focused Edit role row selection, all accelerators, Help/About and Close-menu activation were not exercised here. The existing Electron tests prove the owning Select All callback and keyboard edit/Undo, not the entire native role/keyboard matrix.
- Native control safe areas at 600×480 and 200% zoom remain unverified by this session. Existing both-theme renderer hit tests/captures remain their own evidence.
- No OS screen reader was exercised. An accessible DOM/tree or visible keyboard focus is not screen-reader qualification.
- No matching macOS/Linux native host was exercised. All those required window/menu/accessibility checks remain open.

An initial isolated Playwright launch from Node REPL timed out and reset that kernel. Inspection found no owned Electron process. A normal Node fixture using the desktop tests' environment then launched successfully. The first capture request timed out awaiting app approval; fresh target selection/retry succeeded. Capture immediately after native resize/animation could be transitional, so the coordinator re-observed settled states before choosing evidence. These runtime limits do not establish a product failure or a passed missing check.

All owned Electron/fixture helper processes and both exact temporary profile roots were cleaned after Close, with resolved Temp containment and reparse-point checks. The pre-existing user Electron process and its children were preserved. This session used no clipboard API or clipboard editing role and started no inference.
