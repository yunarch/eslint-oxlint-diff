import { afterEach, describe, expect, it } from 'bun:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  cliExecutor,
  FIXTURE_ESLINT_CONFIG,
  FIXTURE_OXLINT_CONFIG,
  FIXTURES_DIR,
} from '../test-utils';

describe('CLI', () => {
  it('should display help information with --help flag', async () => {
    const { stdout } = await cliExecutor(['--help']);
    expect(stdout).toContain('Usage: @yunarch/eslint-oxlint-diff');
    expect(stdout).toContain('--eslint-config');
    expect(stdout).toContain('--oxlint-config');
    expect(stdout).toContain('--with-infer-type-aware');
    expect(stdout).toContain('--with-infer-js-plugins');
    expect(stdout).toContain('--with-infer-nursery');
    expect(stdout).toContain('--save-inferred-oxlint');
    expect(stdout).toContain('Example usage:');
  });

  it('should diff with explicit eslint and oxlint configs', async () => {
    const { stdout } = await cliExecutor([
      '--eslint-config',
      FIXTURE_ESLINT_CONFIG,
      '--oxlint-config',
      FIXTURE_OXLINT_CONFIG,
    ]);
    // ESLint-only rules
    expect(stdout).toContain('eqeqeq');
    expect(stdout).toContain('no-console');
    expect(stdout).toContain('no-var');
    // OxLint-only rules
    expect(stdout).toContain('no-empty');
    // Summary section
    expect(stdout).toContain('Total active ESLint rules:');
    expect(stdout).toContain('Total active OxLint rules:');
    expect(stdout).toContain('Covered by OxLint:');
    expect(stdout).toContain('40.00%');
  });

  it('should infer oxlint config when --oxlint-config is omitted', async () => {
    const { stdout } = await cliExecutor([
      '--eslint-config',
      FIXTURE_ESLINT_CONFIG,
    ]);
    expect(stdout).toContain('ESLint');
    expect(stdout).toContain('OxLint');
    expect(stdout).toContain('Covered by OxLint');
    expect(stdout).toContain('100.00%');
  });

  describe('--save-inferred-oxlint', () => {
    const SAVE_DIR = path.join(FIXTURES_DIR, '__save_test__');

    afterEach(async () => {
      await fs.rm(SAVE_DIR, { recursive: true, force: true });
    });

    it('should save inferred config to a file', async () => {
      const savePath = path.join(SAVE_DIR, '.oxlintrc.json');
      await cliExecutor([
        '--eslint-config',
        FIXTURE_ESLINT_CONFIG,
        '--save-inferred-oxlint',
        savePath,
      ]);
      const content = await fs.readFile(savePath, 'utf8');
      const config = JSON.parse(content) as { rules: Record<string, string> };
      expect(config).toBeDefined();
      expect(config.rules).toBeDefined();
    });

    it('should create parent directories when saving', async () => {
      const savePath = path.join(SAVE_DIR, 'nested', 'dir', '.oxlintrc.json');
      await cliExecutor([
        '--eslint-config',
        FIXTURE_ESLINT_CONFIG,
        '--save-inferred-oxlint',
        savePath,
      ]);
      const stat = await fs.stat(savePath);
      expect(stat.isFile()).toBe(true);
    });

    it('should not save when --oxlint-config is also provided', async () => {
      const savePath = path.join(SAVE_DIR, '.oxlintrc.json');
      await cliExecutor([
        '--eslint-config',
        FIXTURE_ESLINT_CONFIG,
        '--oxlint-config',
        FIXTURE_OXLINT_CONFIG,
        '--save-inferred-oxlint',
        savePath,
      ]);
      expect(fs.access(savePath)).rejects.toThrow();
    });
  });
});
