# Tables + Charts Backend Support Matrix

> Belegt durch `tests/differential/tables-charts.test.ts`.

## Tables

| Sub-feature            | DOM | React | Framework | Bemerkung                         |
| ---------------------- | --- | ----- | --------- | --------------------------------- |
| TC1 Table static       | ✅  | ✅    | ✅        | TableHeader, TableRow, Text-Cells |
| TC2 Table data-driven  | ✅  | ✅    | ✅        | `each row in $list` Loop          |
| TC3 Table where-Filter | ✅  | ✅    | ✅        | `each ... where row.field != "x"` |
| TC4 Table by-Sort      | ✅  | ✅    | ✅        | `each ... by field`               |

## Charts

| Sub-feature      | DOM | React | Framework | Chart.js Type | Bemerkung                |
| ---------------- | --- | ----- | --------- | ------------- | ------------------------ |
| TC5 Line chart   | ✅  | ✅    | ✅        | `line`        | `_runtime.createChart`   |
| TC6 Bar chart    | ✅  | ✅    | ✅        | `bar`         |                          |
| TC6 Pie chart    | ✅  | ✅    | ✅        | `pie`         |                          |
| TC6 Donut chart  | ✅  | ✅    | ✅        | `doughnut`    |                          |
| TC6 Area chart   | ✅  | ✅    | ✅        | `line`        | line-with-fill           |
| TC7 Chart sizing | ✅  | ✅    | ✅        | -             | `w N, h N` → Pixel-Style |
| TC8 Chart colors | ✅  | ✅    | ✅        | -             | `colors #hex` → dataset  |
