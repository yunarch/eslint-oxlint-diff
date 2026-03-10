import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'jsonc-parser';

if (process.env.CI) process.exit(0);

// Remote URLs for configs
const OXFMT_CONFIG_REMOTE_URL =
  'https://raw.githubusercontent.com/yunarch/config-web/refs/heads/main/src/formatters/config.oxfmt.jsonc';
const OXLINT_CONFIG_REMOTE_URL =
  'https://raw.githubusercontent.com/yunarch/config-web/refs/heads/main/src/linters/config.oxlint.jsonc';

// Paths
const ROOT_DIR = resolve(import.meta.dirname, '..');
const OXFMT_OUTPUT_PATH = resolve(ROOT_DIR, '.oxfmtrc.json');
const OXLINT_OUTPUT_PATH = resolve(ROOT_DIR, '.oxlintrc.json');

/**
 * Fetches a JSONC config from a remote URL, parses it, and writes it to the specified output path as JSON.
 *
 * @param remoteUrl - The URL to fetch the JSONC config from.
 * @param outputPath - The local file path to write the parsed JSON config to.
 * @throws Will throw an error if the fetch operation fails or if the response is not OK.
 */
async function syncRemoteConfig(remoteUrl: string, outputPath: string) {
  const response = await fetch(remoteUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch remote config: ${response.status} ${response.statusText}`
    );
  }
  const jsonc = await response.text();
  const config = parse(jsonc) as Record<string, unknown>;
  writeFileSync(outputPath, JSON.stringify(config));
}

// Fetch and write both configs in parallel
await Promise.all([
  syncRemoteConfig(OXFMT_CONFIG_REMOTE_URL, OXFMT_OUTPUT_PATH),
  syncRemoteConfig(OXLINT_CONFIG_REMOTE_URL, OXLINT_OUTPUT_PATH),
]);
