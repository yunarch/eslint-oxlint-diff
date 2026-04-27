import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { styleText } from 'node:util';
import { CliTable } from '../src/utils/cli-table';

// oxlint-disable-next-line no-control-regex
const stripAnsi = (str: string): string => str.replace(/\x1B\[[0-9;]*m/g, '');

describe('CliTable', () => {
  let logs: string[];

  beforeEach(async () => {
    logs = [];
    await mock.module('node:console', () => ({
      log: (...args: unknown[]) => logs.push(args.join(' ')),
    }));
    console.log = (...args: unknown[]) => logs.push(args.join(' '));
  });

  describe('basic rendering', () => {
    it('should render a table with headers and rows', () => {
      const table = new CliTable({
        columns: [{ header: 'Name' }, { header: 'Value' }],
      });
      const id0 = table.addRow(['foo', '42']);
      const id1 = table.addRow(['bar', '7']);
      table.print();
      const output = logs.map(stripAnsi).join('\n');
      // Border characters
      expect(output).toContain('┌');
      expect(output).toContain('┐');
      expect(output).toContain('└');
      expect(output).toContain('┘');
      // Headers
      expect(output).toContain('Name');
      expect(output).toContain('Value');
      // Data
      expect(output).toContain('foo');
      expect(output).toContain('42');
      expect(output).toContain('bar');
      expect(output).toContain('7');
      // Sequential indices from addRow
      expect(id0).toBe(0);
      expect(id1).toBe(1);
    });

    it('should render an empty table with only headers', () => {
      const table = new CliTable({
        columns: [{ header: 'Col1' }, { header: 'Col2' }],
      });
      table.print();
      const output = logs.map(stripAnsi).join('\n');
      expect(output).toContain('Col1');
      expect(output).toContain('Col2');
      // Top and bottom borders, header separator, no data rows
      expect(output).toContain('┌');
      expect(output).toContain('└');
    });

    it('should render mid-separators between data rows', () => {
      const table = new CliTable({
        columns: [{ header: 'A' }],
      });
      table.addRow(['row1']);
      table.addRow(['row2']);
      table.addRow(['row3']);
      table.print();
      const output = logs.map(stripAnsi).join('\n');
      // Count mid separators (├...┤): one after header + two between data rows = 3
      const midSeparators = output
        .split('\n')
        .filter((line) => line.includes('├'));
      expect(midSeparators.length).toBe(3);
    });
  });

  describe('custom options', () => {
    it('should respect custom indent', () => {
      const table = new CliTable({
        columns: [{ header: 'X' }],
        indent: '    ',
      });
      table.addRow(['val']);
      table.print();
      const output = logs.map(stripAnsi);
      // Every line should start with 4-space indent
      for (const line of output) {
        expect(line.startsWith('    ')).toBe(true);
      }
    });

    it('should respect custom cell padding', () => {
      const table = new CliTable({
        columns: [{ header: 'A' }],
        cellPadding: 3,
      });
      table.addRow(['x']);
      table.print();
      // With cellPadding=3, each cell has 3 spaces on each side
      // Data row should contain '   x   ' (3 spaces, content, padded to width, 3 spaces)
      const dataLine = logs
        .map(stripAnsi)
        .find((l) => l.includes('x') && !l.includes('─'));
      expect(dataLine).toBeDefined();
      // Should contain at least 3 spaces before the content
      expect(dataLine).toMatch(/│\s{3,}/);
    });
  });

  describe('alignment', () => {
    it('should right-align columns when specified', () => {
      const table = new CliTable({
        columns: [{ header: 'Label' }, { header: 'Count', align: 'right' }],
      });
      table.addRow(['items', '5']);
      table.addRow(['things', '123']);
      table.print();
      const output = logs.map(stripAnsi).join('\n');
      // Right-aligned: '5' should be padded on the left
      const dataLines = output.split('\n').filter((l) => l.includes('5'));
      expect(dataLines.length).toBeGreaterThan(0);
      // Find the line with 'items' and check that '5' comes after padding
      const itemsLine = output
        .split('\n')
        .find((l) => l.includes('items') && l.includes('5'));
      expect(itemsLine).toBeDefined();
      // In a right-aligned cell, the value should be preceded by spaces
      expect(itemsLine).toMatch(/\s+5\s/);
    });
  });

  describe('sub-rows', () => {
    it('should render sub-rows attached to a parent row', () => {
      const table = new CliTable({
        columns: [{ header: 'Plugin' }, { header: 'Status' }],
      });
      const idx = table.addRow(['eslint', '2 / 5']);
      table.addSubRows(idx, [
        ['├─ eqeqeq', ''],
        ['├─ no-var', ''],
      ]);
      table.addRow(['typescript', '1 / 1']);
      table.print();
      const output = logs.map(stripAnsi).join('\n');
      expect(output).toContain('eslint');
      expect(output).toContain('├─ eqeqeq');
      expect(output).toContain('├─ no-var');
      expect(output).toContain('typescript');
    });

    it('should not render mid-separator between parent and sub-rows', () => {
      const table = new CliTable({
        columns: [{ header: 'A' }, { header: 'B' }],
      });
      const idx = table.addRow(['parent', 'val']);
      table.addSubRows(idx, [
        ['child1', ''],
        ['child2', ''],
      ]);
      table.addRow(['next', 'val2']);
      table.print();
      const lines = logs.map(stripAnsi);
      // Find the parent row index
      const parentIdx = lines.findIndex((l) => l.includes('parent'));
      const child1Idx = lines.findIndex((l) => l.includes('child1'));
      const child2Idx = lines.findIndex((l) => l.includes('child2'));
      // Sub-rows should appear immediately after parent, no separator between them
      expect(child1Idx).toBe(parentIdx + 1);
      expect(child2Idx).toBe(parentIdx + 2);
    });
  });

  describe('ANSI-aware width calculation', () => {
    it('should correctly size columns with ANSI-styled content', () => {
      const table = new CliTable({
        columns: [{ header: 'Name' }, { header: 'Info' }],
      });
      table.addRow([styleText('red', 'hello'), 'world']); // 'hello' is 5 visible chars regardless of ANSI wrapping
      table.addRow(['plain', 'text']);
      table.print();
      const output = logs.map(stripAnsi).join('\n');
      expect(output).toContain('hello');
      expect(output).toContain('plain');
      // Both rows should have same column widths — 'hello' and 'plain' are both 5 chars
      const helloLine = logs.map(stripAnsi).find((l) => l.includes('hello'));
      const plainLine = logs.map(stripAnsi).find((l) => l.includes('plain'));
      expect(helloLine?.length).toBe(plainLine?.length);
    });
  });
});
