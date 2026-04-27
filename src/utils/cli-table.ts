import { styleText } from 'node:util';

// Types
type ColumnDef = {
  /** Column header text. */
  header: string;
  /** Alignment for both header and data cells. Defaults to `'left'`. */
  align?: 'left' | 'right';
};
type TableOptions = {
  /**
   * Column definitions in order.
   */
  columns: ColumnDef[];
  /**
   * Left-side indent for every line.
   * @default to `'  '`.
   */
  indent?: string;
  /** Cell padding (spaces inside each cell on both sides).
   * @default to 1
   */
  cellPadding?: number;
};

// oxlint-disable-next-line no-control-regex -- We need to match ANSI escape codes for stripping them when calculating visible widths.
const ANSI_ESCAPE_REGEX = /\x1B\[[0-9;]*m/g;

/**
 * Returns the visible (printable) width of a string, ignoring ANSI escape codes.
 *
 * @param str - The string to measure.
 * @returns The visible character count.
 */
function visibleWidth(str: string): number {
  return str.replace(ANSI_ESCAPE_REGEX, '').length;
}

/**
 * Pads a string to a target visible width, respecting ANSI codes.
 *
 * @param str - The string to pad.
 * @param width - The target visible width.
 * @param align - Alignment direction.
 * @returns The padded string.
 */
function pad(str: string, width: number, align: 'left' | 'right'): string {
  const diff = width - visibleWidth(str);
  if (diff <= 0) return str;
  const padding = ' '.repeat(diff);
  return align === 'right' ? padding + str : str + padding;
}

/**
 * CLI table renderer.
 *
 * Columns are auto-sized to the widest visible content (header or cell).
 * ANSI escape codes in cell values are correctly ignored when computing widths.
 *
 * @example
 * ```ts
 * const table = new CliTable({
 *   columns: [
 *     { header: 'Name' },
 *     { header: 'Count', align: 'right' },
 *   ],
 * });
 * table.addRow(['foo', '42']);
 * table.addRow(['bar', '7']);
 * table.print();
 * ```
 *
 * @example Sub-rows (continuation rows without separators)
 * ```ts
 * const table = new CliTable({
 *   columns: [
 *     { header: 'Plugin' },
 *     { header: 'Status' },
 *   ],
 * });
 * const idx = table.addRow(['eslint', '2 / 5']);
 * table.addSubRows(idx, [
 *   ['├─ eqeqeq', ''],
 *   ['├─ no-var', ''],
 * ]);
 * table.addRow(['typescript', '1 / 1']);
 * table.print();
 * // ┌──────────────┬────────┐
 * // │ Plugin       │ Status │
 * // ├──────────────┼────────┤
 * // │ eslint       │  2 / 5 │
 * // │ ├─ eqeqeq    │        │
 * // │ ├─ no-var    │        │
 * // ├──────────────┼────────┤
 * // │ typescript   │  1 / 1 │
 * // └──────────────┴────────┘
 * ```
 */
export class CliTable {
  private readonly columns: Required<ColumnDef>[];
  private readonly indent: string;
  private readonly cellPad: number;
  private readonly rows: string[][] = [];
  private readonly subRows: Map<number, string[][]> = new Map();
  private readonly TOP_BORDERS: [string, string, string] = ['┌', '┬', '┐'];
  private readonly MID_BORDERS: [string, string, string] = ['├', '┼', '┤'];
  private readonly BOTTOM_BORDERS: [string, string, string] = ['└', '┴', '┘'];

  /**
   * Creates a new CLI table instance.
   *
   * @param options - Table configuration including columns, indent, and cell padding.
   */
  constructor(options: TableOptions) {
    this.columns = options.columns.map((c) => ({
      header: c.header,
      align: c.align ?? 'left',
    }));
    this.indent = options.indent ?? '  ';
    this.cellPad = options.cellPadding ?? 1;
  }

  /**
   * Appends a data row and returns its index.
   * Values must match the column count.
   *
   * @param cells - An array of cell values (may contain ANSI codes).
   * @returns The zero-based index of the added row.
   */
  addRow(cells: string[]): number {
    this.rows.push(cells);
    return this.rows.length - 1;
  }

  /**
   * Attaches continuation sub-rows to a specific row (no separator before them).
   *
   * @param rowIndex - The zero-based index of the parent row (returned by {@link addRow}).
   * @param rows - An array of cell arrays to append as sub-rows.
   */
  addSubRows(rowIndex: number, rows: string[][]) {
    this.subRows.set(rowIndex, rows);
  }

  /**
   * Computes column widths and prints a bordered table to stdout.
   */
  print() {
    const widths = this.columns.map((c) => visibleWidth(c.header));
    for (const row of this.rows) {
      for (let i = 0; i < widths.length; i++) {
        widths[i] = Math.max(widths[i] ?? 0, visibleWidth(row[i] ?? ''));
      }
    }
    for (const subs of this.subRows.values()) {
      for (const sub of subs) {
        for (let i = 0; i < widths.length; i++) {
          widths[i] = Math.max(widths[i] ?? 0, visibleWidth(sub[i] ?? ''));
        }
      }
    }
    // Top border.
    console.log(styleText('dim', this.hLineRow(widths, 'top')));
    // Header row.
    const headerCells = this.columns.map((c, i) =>
      pad(styleText('cyan', c.header), widths[i] ?? 0, c.align)
    );
    console.log(this.dataRow(widths, headerCells));
    // Header / body separator.
    console.log(styleText('dim', this.hLineRow(widths, 'mid')));
    // Data rows with separator between each.
    for (let r = 0; r < this.rows.length; r++) {
      console.log(this.dataRow(widths, this.rows[r] ?? []));
      const subs = this.subRows.get(r);
      if (subs) {
        for (const sub of subs) {
          console.log(this.dataRow(widths, sub));
        }
      }
      if (r < this.rows.length - 1) {
        console.log(styleText('dim', this.hLineRow(widths, 'mid')));
      }
    }
    // Bottom border.
    console.log(styleText('dim', this.hLineRow(widths, 'bottom')));
  }

  /**
   * Builds a horizontal border line (e.g. top, separator, or bottom).
   *
   * @param widths - Computed visible widths per column.
   * @param left - Left corner character.
   * @param mid - Column junction character.
   * @param right - Right corner character.
   * @returns The formatted border string.
   */
  private hLineRow(widths: number[], position: 'top' | 'mid' | 'bottom') {
    const segments = widths.map((_: number, i: number) =>
      '─'.repeat((widths[i] ?? 0) + this.cellPad * 2)
    );
    const [left, mid, right] =
      position === 'top'
        ? this.TOP_BORDERS
        : position === 'mid'
          ? this.MID_BORDERS
          : this.BOTTOM_BORDERS;
    return `${this.indent}${left}${segments.join(mid)}${right}`;
  }

  /**
   * Renders a data row with padded cells and vertical borders.
   *
   * @param widths - Computed visible widths per column.
   * @param cells - The cell values for the row.
   * @returns The formatted row string.
   */
  private dataRow(widths: number[], cells: string[]) {
    const p = ' '.repeat(this.cellPad);
    const padded = this.columns.map(
      (c, i) => `${p}${pad(cells[i] ?? '', widths[i] ?? 0, c.align)}${p}`
    );
    return `${this.indent}${styleText('dim', '│')}${padded.join(styleText('dim', '│'))}${styleText('dim', '│')}`;
  }
}
