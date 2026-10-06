# Application menus and navigation — ticket map

Source: [spec](menus-and-navigation.spec.md). All four tickets belong to this spec. T01 (`a123ed6`) and T02's native adapters are accepted; T03-T04 remain open. The ticket plan was committed at user request in `67165c0` before the separate implementation commits.

| Ticket | Depends on | Outcome | Difficulty/role | Worker assignment | Primary requirement coverage |
| --- | --- | --- | --- | --- | --- |
| [T01](menus-and-navigation.t01.md) | None | Pure history/transactions and title-strip decision | Difficult, renderer state/documentation | GPT-6.1 Sol, high | R05-R07/R10 foundation, R02 decision, R15 |
| [T02](menus-and-navigation.t02.md) | T01 | Authorized menu/chrome native bridge | Difficult, Electron backend/security | GPT-6.1 Sol, high | R03/R04/R14, R02/R12 prerequisites |
| [T03](menus-and-navigation.t03.md) | T01, T02 | Integrated strip and guarded history/restoration | Difficult, React/Electron interaction | GPT-6.1 Sol, high | R01/R02/R04-R14 runtime |
| [T04](menus-and-navigation.t04.md) | T03 | Real navigation flows, current contracts and host evidence | Difficult, desktop testing/documentation | GPT-6.1 Sol, high | R16, cumulative R01-R15 evidence |

Use stable topological order T01 -> T02 -> T03 -> T04, one mutating worker at a time. Models/effort are supported runtime selections; high reasoning addresses interacting history/async guards, privileged menu validation and native UI evidence. The primary accepts/commits prerequisites before releasing dependents and owns ticket statuses and validation/acceptance records. Other project-overview design work is unrelated and must be preserved.

Native macOS/Linux and OS manual/accessibility qualifications require actual matching-host evidence. They are not silently replaced with local fixtures. All locally executable implementation/checks proceed while those gates remain unresolved.
