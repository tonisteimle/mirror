// Table-Komponenten als normale Mirror-Komponenten
// Diese Datei kann in Projekte importiert oder als Prelude verwendet werden

// Table Container
Table: gap 0, bg #1a1a1a, rad 8, clip

// Table Header Row
TableHeader: hor, gap 24, pad 12 16, bg #252525, bor 0 0 1 0, boc #333

// Table Data Row
TableRow: hor, gap 24, pad 12 16, bor 0 0 1 0, boc #222
  hover:
    bg #252525

// Table Footer Row
TableFooter: hor, gap 24, pad 12 16, bg #252525, bor 1 0 0 0, boc #333

// Table Data Cell
TableCell: grow, col white, fs 14

// Table Header Cell
TableHeaderCell: grow, col #888, fs 11, weight 500, uppercase
