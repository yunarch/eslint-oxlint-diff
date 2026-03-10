// oxlint-disable no-console -- This module is responsible for printing the diff results to the console, so we need to use console.log here.
import { styleText } from 'node:util';
import type { DiffResult } from './diff';

/**
 * Prints a structured, color-coded diff result to the console.
 *
 * @param result - The diff result containing ESLint and OxLint rules and their comparison.
 */
export function printDiffResult(result: DiffResult) {
  const { eslintRules, oxlintRules, eslintOnly, coveredByOxlint, oxlintOnly } =
    result;
  const DIVIDER = '─'.repeat(70);

  // ── ESLint-only rules ─────────────────────────────────────────────────
  console.log();
  console.log(styleText('bold', DIVIDER));
  console.log(styleText('bold', '  ESLint rules NOT yet covered by OxLint'));
  console.log(styleText('bold', DIVIDER));
  console.log();
  const eslintOnlyByCategory = new Map<string, string[]>();
  for (const rule of eslintOnly) {
    const category =
      rule.lastIndexOf('/') > 0
        ? rule.slice(0, rule.lastIndexOf('/'))
        : 'eslint-core';
    if (!eslintOnlyByCategory.has(category)) {
      eslintOnlyByCategory.set(category, []);
    }
    eslintOnlyByCategory.get(category)?.push(rule);
  }
  const sortedCategories = [...eslintOnlyByCategory.entries()].toSorted(
    ([a], [b]) => a.localeCompare(b)
  );
  for (const [category, rules] of sortedCategories) {
    console.log(styleText('cyan', `  📦 ${category} (${rules.length})`));
    for (const rule of rules) {
      console.log(styleText('dim', `     ├─ ${rule}`));
    }
    console.log();
  }

  // ── OxLint-only rules ─────────────────────────────────────────────────
  if (oxlintOnly.length > 0) {
    console.log(styleText('bold', DIVIDER));
    console.log(styleText('bold', '  OxLint rules NOT in ESLint config'));
    console.log(styleText('bold', DIVIDER));
    console.log();
    for (const rule of oxlintOnly) {
      console.log(styleText('dim', `     ├─ ${rule}`));
    }
    console.log();
  }

  // ── Summary ───────────────────────────────────────────────────────────
  console.log(styleText('bold', DIVIDER));
  console.log(styleText('bold', '  ESLint ↔ OxLint Rule Comparison'));
  console.log(styleText('bold', DIVIDER));
  console.log();
  console.log(
    `  Total active ESLint rules:    ${styleText('yellow', String(eslintRules.size))}`
  );
  console.log(
    `  Total active OxLint rules:    ${styleText('yellow', String(oxlintRules.size))}`
  );
  console.log(
    `  Covered by OxLint:            ${styleText('green', String(coveredByOxlint.length))}`
  );
  console.log(
    `  ESLint-only (not in OxLint):  ${styleText('red', String(eslintOnly.length))}`
  );
  console.log(
    `  OxLint-only (not in ESLint):  ${styleText('blue', String(oxlintOnly.length))}`
  );
  console.log();

  const coverage =
    eslintRules.size > 0
      ? ((coveredByOxlint.length / eslintRules.size) * 100).toFixed(2)
      : '0';
  console.log(
    `  OxLint coverage of ESLint rules: ${styleText('bold', `${coverage}%`)}`
  );
  console.log();
}
