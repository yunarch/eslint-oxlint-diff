import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'jsonc-parser';

if (process.env.CI) process.exit(0);

const REMOTE_URL =
  'https://raw.githubusercontent.com/yunarch/config-web/refs/heads/main/src/linters/config.oxlint.jsonc';
const ROOT_DIR = resolve(import.meta.dirname, '..');
const OUTPUT_PATH = resolve(ROOT_DIR, '.oxlintrc.json');

const response = await fetch(REMOTE_URL);
if (!response.ok) {
  console.error(
    `Failed to fetch remote config: ${response.status} ${response.statusText}`
  );
  process.exit(1);
}
const jsonc = await response.text();
const config = parse(jsonc) as Record<string, unknown>;
writeFileSync(OUTPUT_PATH, JSON.stringify(config));
