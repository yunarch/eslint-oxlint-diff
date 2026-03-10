import { describe, expect, it } from 'bun:test';
import { cliExecutor } from '../test-utils';

describe('CLI', () => {
  it('should display help information with --help flag', async () => {
    const { stdout } = await cliExecutor(['--help']);
    expect(stdout).toContain('Usage: @yunarch/eslint-oxlint-diff');
    expect(stdout).toContain('--eslint-config');
    expect(stdout).toContain('--oxlint-config');
    expect(stdout).toContain('--no-dedupe');
    expect(stdout).toContain('Example usage:');
  });
});
