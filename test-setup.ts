import { mkdir, writeFile } from 'node:fs/promises';
import {
  asyncExecFile,
  FIXTURE_ESLINT_CONFIG,
  FIXTURE_OXLINT_CONFIG,
  FIXTURES_DIR,
} from './test-utils';

// Fixture contents
const ESLINT_FLAT_CONFIG = [
  {
    rules: {
      'no-unused-vars': 'error',
      'no-console': 'warn',
      'no-debugger': 'error',
      eqeqeq: 'error',
      'no-var': 'error',
    },
  },
];
const OXLINT_CONFIG = {
  rules: {
    'no-unused-vars': 'error',
    'no-debugger': 'error',
    'no-empty': 'warn',
  },
};

// Setup test fixtures
await mkdir(FIXTURES_DIR, { recursive: true });
await Promise.all([
  writeFile(
    FIXTURE_ESLINT_CONFIG,
    `export default ${JSON.stringify(ESLINT_FLAT_CONFIG)};`
  ),
  writeFile(FIXTURE_OXLINT_CONFIG, JSON.stringify(OXLINT_CONFIG)),
]);
await asyncExecFile('bun', ['run', 'format:all', 'tests/__fixture__']);
