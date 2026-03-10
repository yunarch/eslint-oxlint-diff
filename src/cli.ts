#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { Command } from 'commander';
import { diff } from './utils/diff';
import { printDiffResult } from './utils/printer';

// Default candidates
const ESLINT_CONFIG_FILES = [
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.cjs',
  'eslint.config.ts',
  'eslint.config.mts',
  'eslint.config.cts',
];
const OXLINT_CONFIG_FILES = [
  '.oxlintrc.json',
  '.oxlintrc.jsonc',
  'oxlintrc.json',
  'oxlintrc.jsonc',
];

/**
 * Searches for the first existing file from a list of candidates resolved against the current working directory.
 *
 * @param candidates - An array of file paths to check for existence.
 * @returns A promise that resolves to the first existing file path, or undefined if none are found.
 */
async function findConfigFile(candidates: string[]) {
  const resolved = candidates.map((file) => path.resolve(file));
  const results = await Promise.all(
    resolved.map((filePath) =>
      fs.access(filePath).then(
        () => filePath,
        () => undefined
      )
    )
  );
  return results.find((r) => r !== undefined);
}

/**
 * Creates a new instance of the base program with custom help and output configurations.
 *
 * @returns the base program instance.
 */
function createBaseProgram() {
  const program = new Command();
  program
    .configureHelp({
      styleTitle: (str) => styleText('bold', str),
      styleCommandText: (str) => styleText('cyan', str),
      styleCommandDescription: (str) => styleText('magenta', str),
      styleDescriptionText: (str) => styleText('italic', str),
      styleOptionText: (str) => styleText('green', str),
      styleArgumentText: (str) => styleText('yellow', str),
      styleSubcommandText: (str) => styleText('blue', str),
    })
    .configureOutput({
      outputError: (str, write) => {
        write(styleText('red', str));
      },
    });
  return program;
}

// Main program execution
await createBaseProgram()
  .name('@yunarch/eslint-oxlint-diff')
  .description(
    'A CLI tool to compare ESLint and OxLint rules, showing coverage gaps and overlap.'
  )
  .option(
    '--eslint-config <path>',
    'Path to the ESLint configuration file. Defaults to eslint.config file in the current directory.'
  )
  .option(
    '--oxlint-config <path>',
    'Path to the oxlint configuration file. Defaults to .oxlintrc file in the current directory.'
  )
  .addHelpText(
    'after',
    `
Example usage:
${styleText('dim', '$')} \
${styleText('cyan', 'npx @yunarch/eslint-oxlint-diff')} \
${styleText('green', '--eslint-config')} ${styleText('yellow', 'path/to/eslint.config')} \
${styleText('green', '--oxlint-config')} ${styleText('yellow', 'path/to/.oxlintrc')}
`
  )
  .action(
    async ({
      eslintConfig,
      oxlintConfig,
    }: {
      eslintConfig?: string;
      oxlintConfig?: string;
    }) => {
      const eslintPath =
        eslintConfig ?? (await findConfigFile(ESLINT_CONFIG_FILES));
      const oxlintPath =
        oxlintConfig ?? (await findConfigFile(OXLINT_CONFIG_FILES));
      if (!eslintPath) {
        console.error(
          styleText(
            'red',
            'Error: No ESLint config file found. Provide one with --eslint-config.'
          )
        );
        process.exit(1);
      }
      if (!oxlintPath) {
        console.error(
          styleText(
            'red',
            'Error: No OxLint config file found. Provide one with --oxlint-config.'
          )
        );
        process.exit(1);
      }
      const result = await diff({ eslint: eslintPath, oxlint: oxlintPath });
      printDiffResult(result);
    }
  )
  .parseAsync(process.argv);
