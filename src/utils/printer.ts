import { styleText } from 'node:util';
import { CliTable } from './cli-table';
import {
  getPluginFromRule,
  normalizeEslintRuleToOxlintCanonical,
  RuleInfo,
  type DiffResult,
} from './diff';

const BANNER_PAD = 3;
const BAR_WIDTH = 20;

type SummaryRow = {
  eslintPlugin: string;
  oxlintPlugin: string;
  covered: number;
  total: number;
  isOxlintOnly: boolean;
};

/**
 * Prints a per-plugin grouped listing of rules.
 *
 * @param rules - The rules to print.
 */
function groupRulesByPlugin(
  rules: Map<string, RuleInfo>
): Map<string, RuleInfo[]> {
  const grouped = new Map<string, RuleInfo[]>();
  for (const info of rules.values()) {
    const plugin = info.plugin;
    if (!grouped.has(plugin)) grouped.set(plugin, []);
    grouped.get(plugin)?.push(info);
  }
  return grouped;
}

/**
 * Builds per-plugin summary rows comparing ESLint and OxLint rule coverage.
 *
 * Creates a row for each ESLint plugin showing how many of its rules are covered
 * by OxLint, plus any OxLint-only extras. Appends additional rows for OxLint
 * plugins that have no corresponding ESLint plugin.
 *
 * @param result - The diff result containing all rule sets and their comparisons.
 * @returns An array of summary rows ordered alphabetically by plugin name.
 */
function buildSummaryRows(result: DiffResult): SummaryRow[] {
  const rows: SummaryRow[] = [];
  const eslintPluginsSorted = [
    ...groupRulesByPlugin(result.eslintRules),
  ].toSorted(([a], [b]) => a.localeCompare(b));
  const coveredRulesByPlugin = groupRulesByPlugin(result.coveredByOxlint);
  const pluginsWithExtrasAccounted = new Set<string>();
  // First, create rows for all ESLint plugins
  for (const [eslintPlugin, eslintRules] of eslintPluginsSorted) {
    const oxlintPlugin = getPluginFromRule(
      normalizeEslintRuleToOxlintCanonical(eslintRules[0].canonical)
    );
    const coveredCount = coveredRulesByPlugin.get(eslintPlugin)?.length ?? 0;
    const totalCount = eslintRules.length;
    if (!pluginsWithExtrasAccounted.has(oxlintPlugin)) {
      pluginsWithExtrasAccounted.add(oxlintPlugin);
    }
    rows.push({
      eslintPlugin,
      oxlintPlugin,
      covered: coveredCount,
      total: totalCount,
      isOxlintOnly: false,
    });
  }
  // Second, add rows for OxLint plugins that have no corresponding ESLint plugin
  const oxlintPluginsSorted = [
    ...groupRulesByPlugin(result.oxlintRules),
  ].toSorted(([a], [b]) => a.localeCompare(b));
  for (const [oxlintPlugin, oxlintRules] of oxlintPluginsSorted) {
    if (!pluginsWithExtrasAccounted.has(oxlintPlugin)) {
      rows.push({
        eslintPlugin: '-',
        oxlintPlugin,
        covered: oxlintRules.length,
        total: oxlintRules.length,
        isOxlintOnly: true,
      });
    }
  }
  return rows;
}

/**
 * Prints a structured, color-coded diff result to the console.
 *
 * @param result - The diff result containing ESLint and OxLint rules and their comparison.
 * @param options - Options for printing the diff result.
 */
export function printDiffResult(
  result: DiffResult,
  options: { verbose: boolean }
) {
  const { eslintRules, oxlintRules, coveredByOxlint, eslintOnly, oxlintOnly } =
    result;
  // ── Print Summary ─────────────────────────────────────────────────
  const rows = buildSummaryRows(result);
  const table = new CliTable({
    columns: [
      { header: 'ESLint plugin' },
      { header: 'OxLint plugin' },
      { header: 'Covered rules', align: 'right' },
      { header: 'Coverage' },
    ],
  });
  for (const row of rows) {
    const unicodeBarFilled = Math.round((row.covered / row.total) * BAR_WIDTH);
    const unicodeBar =
      row.total > 0
        ? `${styleText(row.isOxlintOnly ? 'blue' : 'green', '█'.repeat(unicodeBarFilled))}${'░'.repeat(BAR_WIDTH - unicodeBarFilled)}`
        : '░'.repeat(BAR_WIDTH);
    const rowIndex = table.addRow([
      row.eslintPlugin,
      row.oxlintPlugin,
      row.isOxlintOnly ? `${row.covered}` : `${row.covered} / ${row.total}`,
      `${`${unicodeBar} ${String(Math.round((row.covered / row.total) * 100)).padStart(3)}%`}`,
    ]);
    // Add verbose sub-rows
    if (options.verbose) {
      const eslintOnlyByPlugin = groupRulesByPlugin(eslintOnly);
      const oxlintOnlyByPlugin = groupRulesByPlugin(oxlintOnly);
      const eslintUncovered = eslintOnlyByPlugin.get(row.eslintPlugin) ?? [];
      const oxlintExtras = oxlintOnlyByPlugin.get(row.oxlintPlugin) ?? [];
      const maxLen = Math.max(eslintUncovered.length, oxlintExtras.length);
      if (maxLen > 0) {
        const subRows: string[][] = [];
        for (let i = 0; i < maxLen; i++) {
          const eslintCell =
            i < eslintUncovered.length
              ? styleText('red', `├─ ${eslintUncovered[i].rule}`)
              : '';
          const oxlintCell =
            i < oxlintExtras.length
              ? styleText('blue', `├─ ${oxlintExtras[i].rule}`)
              : '';
          subRows.push([eslintCell, oxlintCell, '', '']);
        }
        table.addSubRows(rowIndex, subRows);
      }
    }
  }
  table.print();
  // Print overall coverage stats
  console.log();
  console.log(
    `  Total active ESLint rules:    ${styleText('yellow', String(eslintRules.size))}`
  );
  console.log(
    `  Total active OxLint rules:    ${styleText('yellow', String(oxlintRules.size))}`
  );
  console.log(
    `  Covered by OxLint:            ${styleText('green', String(coveredByOxlint.size))}`
  );
  console.log(
    `  ESLint-only (not in OxLint):  ${styleText('red', String(eslintOnly.size))}`
  );
  console.log(
    `  OxLint-only (not in ESLint):  ${styleText('blue', String(oxlintOnly.size))}`
  );
  console.log();
  // Print overall coverage percentage
  const coverage =
    eslintRules.size > 0
      ? ((coveredByOxlint.size / eslintRules.size) * 100).toFixed(2)
      : '0';
  console.log(
    `  OxLint coverage of ESLint rules: ${styleText('bold', `${coverage}%`)}`
  );
  console.log();
}

/**
 * Prints a box banner with a title, version, and description.
 *
 * @param title - The project name.
 * @param version - The version string (without "v" prefix).
 * @param desc - A short description line.
 */
export function printBanner(
  title: string,
  version: string,
  desc: string
): void {
  const spacing = ' '.repeat(BANNER_PAD);
  const innerWidth = Math.max(
    title.length + version.length + BANNER_PAD * 2 + 5,
    desc.length + BANNER_PAD * 2
  );
  const titleStyled = styleText('magenta', title);
  const versionStyled = styleText('yellow', version);
  const descStyled = styleText('white', desc);
  const nameLine = `${spacing}${titleStyled}${' '.repeat(innerWidth - BANNER_PAD * 2 - title.length - version.length)}${versionStyled}${spacing}`;
  const descLine = `${spacing}${descStyled}${' '.repeat(innerWidth - BANNER_PAD * 2 - desc.length)}${spacing}`;
  console.log();
  console.log(`${styleText('blue', `╔${'═'.repeat(innerWidth)}╗`)}`);
  console.log(`${styleText('blue', '║')}${nameLine}${styleText('blue', '║')}`);
  console.log(`${styleText('blue', '║')}${descLine}${styleText('blue', '║')}`);
  console.log(`${styleText('blue', `╚${'═'.repeat(innerWidth)}╝`)}`);
  console.log();
}
