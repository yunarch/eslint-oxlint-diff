#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { styleText } from 'node:util';
import { Command } from 'commander';
import { parse } from 'jsonc-parser';
import { diff, type EslintFlatConfig, type OxlintConfig } from './utils/diff';
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
    resolved.map((filePath) => {
      return fs.access(filePath).then(
        () => filePath,
        () => null
      );
    })
  );
  return results.find((r) => !!r);
}

/**
 * Loads an ESLint flat config by dynamically importing the given file path.
 *
 * @param p - The file path to the ESLint config to load.
 * @returns The resolved ESLint flat config objects.
 */
async function loadEslintConfig(p?: string): Promise<EslintFlatConfig[]> {
  const configPath = p ?? (await findConfigFile(ESLINT_CONFIG_FILES));
  if (!configPath) {
    throw new Error('Error: No ESLint config file found.');
  }
  const resolved = path.resolve(configPath);
  const mod = (await import(pathToFileURL(resolved).href)) as {
    default: unknown;
  };
  const config = await mod.default;
  if (Array.isArray(config)) return config as EslintFlatConfig[];
  if (config && typeof config === 'object') return [config as EslintFlatConfig];
  throw new Error(
    `ESLint config at "${configPath}" does not export a valid configuration.`
  );
}

/**
 * Loads an OxLint config from a JSON / JSONC file.
 *
 * @param p - The file path to the OxLint config to load.
 * @returns The resolved OxLint config object.
 */
async function loadOxlintConfig(p?: string): Promise<OxlintConfig> {
  const configPath = p ?? (await findConfigFile(OXLINT_CONFIG_FILES));
  if (!configPath) {
    throw new Error('Error: No OxLint config file found.');
  }
  const content = await fs.readFile(path.resolve(configPath), 'utf8');
  return parse(content) as OxlintConfig;
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
  .option(
    '--no-dedupe',
    'Skip turning off ESLint rules that OxLint already covers.'
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
      noDedupe,
    }: {
      eslintConfig?: string;
      oxlintConfig?: string;
      noDedupe?: boolean;
    }) => {
      const loadedEslintConfig = await loadEslintConfig(eslintConfig);
      const loadedOxlintConfig = await loadOxlintConfig(oxlintConfig);
      const result = diff(loadedEslintConfig, loadedOxlintConfig, {
        useEslintPluginOxlint: !noDedupe,
      });
      printDiffResult(result);
    }
  )
  .parseAsync(process.argv);
