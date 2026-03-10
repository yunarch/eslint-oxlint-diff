import { execFile } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

if (process.env.CI) process.exit(0);

const ROOT_DIR = resolve(import.meta.dirname, '..');
const README_PATH = resolve(ROOT_DIR, 'README.md');

const START_MARKER = '<!-- [docsgen]: start -->';
const END_MARKER = '<!-- [docsgen]: end -->';

// Run the CLI help command and capture output
const promisifiedExecFile = promisify(execFile);
const { stdout } = await promisifiedExecFile('bun', ['src/cli.ts', '--help'], {
  cwd: ROOT_DIR,
  env: { ...process.env, NO_COLOR: '1' },
});

const helpText = stdout.trim();
const newUsageBlock = `${START_MARKER}\n\n\`\`\`\n${helpText}\n\`\`\`\n\n${END_MARKER}`;

// Read the current README and replace between markers
const readme = readFileSync(README_PATH, 'utf8');
const escapeRegExp = (str: string) => {
  return str.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
};
const pattern = new RegExp(
  `${escapeRegExp(START_MARKER)}[\\s\\S]*?${escapeRegExp(END_MARKER)}`
);
if (!pattern.test(readme)) {
  console.error(
    `Could not find usage markers in README.md. Make sure ${START_MARKER} and ${END_MARKER} exist.`
  );
  process.exit(1);
}
const updatedReadme = readme.replace(pattern, newUsageBlock);
writeFileSync(README_PATH, updatedReadme);
