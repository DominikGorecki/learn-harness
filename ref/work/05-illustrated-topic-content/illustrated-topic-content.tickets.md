# Illustrated topic content ticket map

Status: T01–T09 locally implemented and verified — mandatory live/provider/editorial qualification pending; bundle remains open

Source: [spec](illustrated-topic-content.spec.md)

Nine tickets are warranted because portable multi-file/media recovery, durable provider accounting, sanctioned transport, domain orchestration and three observable UI outcomes have independent trust/acceptance boundaries. One mutating worker at a time; dependencies are accepted and committed before release. All assignments use the advertised gpt-6.1-sol model with the reasoning below; no stronger model is necessary initially.

| Ticket | Prerequisites | Role / reasoning | Requirements |
| --- | --- | --- | --- |
| [T01](illustrated-topic-content.t01.md) | none | domain/contracts / high | R02, R05, R07, R10, R11, R12, R23, R31, R32, R34 |
| [T02](illustrated-topic-content.t02.md) | 1 | storage/security / high | R02, R06, R14, R15, R16, R17, R20, R32, R35 |
| [T03](illustrated-topic-content.t03.md) | 1 | provider/accounting / high | R09, R10, R23, R24, R25, R26, R27, R28, R29, R30, R31, R33, R34 |
| [T04](illustrated-topic-content.t04.md) | 1, 3 | utility/transport / high | R09, R10, R11, R12, R13, R27, R28, R30, R31, R32, R34 |
| [T05](illustrated-topic-content.t05.md) | 2, 3, 4 | domain/Electron integration / high | R01, R02, R03, R04, R05, R06, R07, R08, R09, R11, R12, R13, R14, R16, R27, R28, R31, R34, R35 |
| [T06](illustrated-topic-content.t06.md) | 3, 5 | frontend/settings / medium | R10, R21, R22, R23, R24, R25, R26, R29, R31, R33 |
| [T07](illustrated-topic-content.t07.md) | 2, 5 | frontend/reader / medium | R01, R04, R08, R12, R14, R15, R16, R17, R26, R32, R35 |
| [T08](illustrated-topic-content.t08.md) | 2, 4, 5, 7 | full-stack/image replacement / high | R11, R13, R18, R19, R20, R26, R27, R28, R31, R34 |
| [T09](illustrated-topic-content.t09.md) | 6, 7, 8 | integration/review / high | R01–R35 |

High reasoning is assigned where identity, recovery, accounting and multiprocess ownership interact; medium reasoning is assigned to the bounded settings/reader UI with established contracts. T09 includes coordinator-owned fresh verification, not a substitute for ticket-level regression evidence. R01–R35 are covered; duplicated IDs represent cross-layer integration evidence, not duplicated feature scope.
