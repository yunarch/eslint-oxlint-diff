import { describe, expect, it } from 'bun:test';
import { getPluginFromRule } from '../src/utils/diff';

describe('getPluginFromRule', () => {
  it('should return "eslint" for unprefixed core rules', () => {
    expect(getPluginFromRule('no-console')).toBe('eslint');
    expect(getPluginFromRule('eqeqeq')).toBe('eslint');
  });

  it('should extract plugin from single-segment prefix', () => {
    expect(getPluginFromRule('react/jsx-no-target-blank')).toBe('react');
    expect(getPluginFromRule('unicorn/no-null')).toBe('unicorn');
    expect(getPluginFromRule('import/no-duplicates')).toBe('import');
  });

  it('should extract plugin from scoped prefix', () => {
    expect(getPluginFromRule('@typescript-eslint/no-unused-vars')).toBe(
      '@typescript-eslint'
    );
    expect(getPluginFromRule('@next/next/inline-script-id')).toBe('@next/next');
  });

  it('should handle hyphenated plugin names', () => {
    expect(getPluginFromRule('react-hooks/exhaustive-deps')).toBe(
      'react-hooks'
    );
    expect(getPluginFromRule('jsx-a11y/alt-text')).toBe('jsx-a11y');
    expect(getPluginFromRule('react-perf/no-new-object')).toBe('react-perf');
  });
});
