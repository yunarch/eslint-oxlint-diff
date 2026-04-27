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
    expect(stdout).toContain('--verbose');
    expect(stdout).toContain('--with-infer-type-aware');
    expect(stdout).toContain('--with-infer-js-plugins');
    expect(stdout).toContain('--with-infer-nursery');
    expect(stdout).toContain('--save-inferred-oxlint');
  });

  it('should diff with explicit eslint and oxlint configs', async () => {
    const { stdout } = await cliExecutor([
      '--eslint-config',
      FIXTURE_ESLINT_CONFIG,
      '--oxlint-config',
      FIXTURE_OXLINT_CONFIG,
    ]);
    // Table headers
    expect(stdout).toContain('ESLint plugin');
    expect(stdout).toContain('OxLint plugin');
    expect(stdout).toContain('Covered rules');
    expect(stdout).toContain('Coverage');
    // Summary section
    expect(stdout).toContain('Total active ESLint rules:');
    expect(stdout).toContain('Total active OxLint rules:');
    expect(stdout).toContain('Covered by OxLint:');
    expect(stdout).toContain('40.00%');
    // Detailed rule listings should NOT appear without --verbose
    expect(stdout).not.toContain('eqeqeq');
    expect(stdout).not.toContain('no-console');
  });

  it('should include detailed rule listings with --verbose', async () => {
    const { stdout } = await cliExecutor([
      '--eslint-config',
      FIXTURE_ESLINT_CONFIG,
      '--oxlint-config',
      FIXTURE_OXLINT_CONFIG,
      '--verbose',
    ]);
    // ESLint-only rules shown as sub-rows
    expect(stdout).toContain('eqeqeq');
    expect(stdout).toContain('no-console');
    expect(stdout).toContain('no-var');
    // OxLint-only rules shown as sub-rows
    expect(stdout).toContain('no-empty');
    // Summary still present
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

  describe('error paths', () => {
    it('should error when eslint config file does not exist', async () => {
      const promise = cliExecutor([
        '--eslint-config',
        'non-existent-eslint.config.js',
      ]);
      expect(promise).rejects.toThrow();
      try {
        await promise;
      } catch (error: unknown) {
        const err = error as { stderr: string };
        expect(err.stderr.toLowerCase()).toContain('error');
      }
    });

    it('should error when oxlint config file does not exist', async () => {
      const promise = cliExecutor([
        '--eslint-config',
        FIXTURE_ESLINT_CONFIG,
        '--oxlint-config',
        'non-existent-oxlintrc.json',
      ]);
      expect(promise).rejects.toThrow();
    });

    it('should error when eslint config exports invalid format', async () => {
      const invalidConfig = path.join(
        FIXTURES_DIR,
        '__invalid_eslint.config.js'
      );
      await fs.writeFile(invalidConfig, 'export default "not-a-config";');
      try {
        const promise = cliExecutor(['--eslint-config', invalidConfig]);
        expect(promise).rejects.toThrow();
        try {
          await promise;
        } catch (error: unknown) {
          const err = error as { stderr: string };
          expect(err.stderr).toContain('does not export a valid configuration');
        }
      } finally {
        await fs.rm(invalidConfig, { force: true });
      }
    });
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
