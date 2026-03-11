#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { styleText } from 'node:util';
import migrate from '@oxlint/migrate';
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
    console.error('Error: No ESLint config file found.');
    process.exit(1);
  }
  const resolved = path.resolve(configPath);
  const mod = (await import(pathToFileURL(resolved).href)) as {
    default: unknown;
  };
  const config = await mod.default;
  if (Array.isArray(config)) return config as EslintFlatConfig[];
  if (config && typeof config === 'object') return [config as EslintFlatConfig];
  console.error(
    `Error: ESLint config at "${configPath}" does not export a valid configuration.`
  );
  process.exit(1);
}

/**
 * Loads an OxLint config from a JSON / JSONC file.
 *
 * @param configPath - The file path to the OxLint config to load.
 * @returns The resolved OxLint config object.
 */
async function loadOxlintConfig(configPath: string): Promise<OxlintConfig> {
  const content = await fs.readFile(path.resolve(configPath), 'utf8');
  return parse(content) as OxlintConfig;
}

/**
 * Infers an OxLint config from the loaded ESLint flat config using @oxlint/migrate.
 *
 * @param eslintConfig - The loaded ESLint flat config objects.
 * @param options - Options to pass to the migration tool.
 * @returns The inferred OxLint config object.
 */
async function inferOxlintConfig(
  eslintConfig: EslintFlatConfig[],
  options: { typeAware: boolean; jsPlugins: boolean; withNursery: boolean }
): Promise<OxlintConfig> {
  const result = await migrate(eslintConfig, undefined, {
    typeAware: options.typeAware,
    jsPlugins: options.jsPlugins,
    withNursery: options.withNursery,
  });
  return result as OxlintConfig;
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
    'A CLI tool to compare ESLint and OxLint rules, showing coverage gaps and overlap.\n\nRequires ESLint config in flat config format.'
  )
  .option(
    '--eslint-config <path>',
    'Path to the ESLint configuration file. Defaults to eslint.config file in the current directory.'
  )
  .option(
    '--oxlint-config <path>',
    'Path to the oxlint configuration file. If omitted, infers the config from the ESLint configuration.'
  )
  .option(
    '--with-infer-type-aware',
    'Include type-aware rules when inferring the oxlint config. Only relevant without --oxlint-config.',
    true
  )
  .option(
    '--with-infer-js-plugins',
    'Include ESLint JS plugins when inferring the oxlint config. Only relevant without --oxlint-config.',
    false
  )
  .option(
    '--with-infer-nursery',
    'Include nursery rules when inferring the oxlint config. Only relevant without --oxlint-config.',
    false
  )
  .option(
    '--save-inferred-oxlint <path>',
    'Save the inferred OxLint config to a file. Only relevant without --oxlint-config.'
  )
  .addHelpText(
    'after',
    `
Quick start:
${styleText('dim', '$')} \
${styleText('cyan', 'npx @yunarch/eslint-oxlint-diff')}

With explicit config paths:
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
      withInferTypeAware,
      withInferJsPlugins,
      withInferNursery,
      saveInferredOxlint,
    }: {
      eslintConfig?: string;
      oxlintConfig?: string;
      withInferTypeAware: boolean;
      withInferJsPlugins: boolean;
      withInferNursery: boolean;
      saveInferredOxlint?: string;
    }) => {
      const loadedEslintConfig = await loadEslintConfig(eslintConfig);
      const loadedOxlintConfig = oxlintConfig
        ? await loadOxlintConfig(oxlintConfig)
        : await inferOxlintConfig(loadedEslintConfig, {
            typeAware: withInferTypeAware,
            jsPlugins: withInferJsPlugins,
            withNursery: withInferNursery,
          });
      const result = diff(loadedEslintConfig, loadedOxlintConfig);
      printDiffResult(result);
      if (saveInferredOxlint && !oxlintConfig) {
        const resolved = path.resolve(saveInferredOxlint);
        await fs.mkdir(path.dirname(resolved), { recursive: true });
        await fs.writeFile(
          resolved,
          JSON.stringify(loadedOxlintConfig),
          'utf8'
        );
      }
    }
  )
  .parseAsync(process.argv);
