import { describe, expect, it } from 'bun:test';
import { normalizeEslintRuleToOxlintCanonical } from '../src/utils/diff';

describe('normalizeEslintRuleToOxlintCanonical', () => {
  it('should leave unprefixed core rules unchanged', () => {
    expect(normalizeEslintRuleToOxlintCanonical('no-console')).toBe(
      'no-console'
    );
    expect(normalizeEslintRuleToOxlintCanonical('eqeqeq')).toBe('eqeqeq');
  });

  it('should leave identity-mapped plugins unchanged', () => {
    expect(normalizeEslintRuleToOxlintCanonical('import/no-duplicates')).toBe(
      'import/no-duplicates'
    );
    expect(normalizeEslintRuleToOxlintCanonical('jest/no-disabled-tests')).toBe(
      'jest/no-disabled-tests'
    );
    expect(
      normalizeEslintRuleToOxlintCanonical('react/jsx-no-target-blank')
    ).toBe('react/jsx-no-target-blank');
    expect(normalizeEslintRuleToOxlintCanonical('unicorn/no-null')).toBe(
      'unicorn/no-null'
    );
    expect(normalizeEslintRuleToOxlintCanonical('vue/no-mutating-props')).toBe(
      'vue/no-mutating-props'
    );
  });

  it('should normalize @typescript-eslint → typescript', () => {
    expect(
      normalizeEslintRuleToOxlintCanonical('@typescript-eslint/no-unused-vars')
    ).toBe('typescript/no-unused-vars');
    expect(
      normalizeEslintRuleToOxlintCanonical(
        '@typescript-eslint/no-floating-promises'
      )
    ).toBe('typescript/no-floating-promises');
  });

  it('should normalize import-x → import', () => {
    expect(normalizeEslintRuleToOxlintCanonical('import-x/no-duplicates')).toBe(
      'import/no-duplicates'
    );
  });

  it('should normalize react-hooks → react', () => {
    expect(
      normalizeEslintRuleToOxlintCanonical('react-hooks/exhaustive-deps')
    ).toBe('react/exhaustive-deps');
  });

  it('should normalize react-refresh → react', () => {
    expect(
      normalizeEslintRuleToOxlintCanonical(
        'react-refresh/only-export-components'
      )
    ).toBe('react/only-export-components');
  });

  it('should normalize @next/next → nextjs', () => {
    expect(
      normalizeEslintRuleToOxlintCanonical('@next/next/inline-script-id')
    ).toBe('nextjs/inline-script-id');
    expect(
      normalizeEslintRuleToOxlintCanonical('@next/next/no-img-element')
    ).toBe('nextjs/no-img-element');
  });

  it('should normalize n → node', () => {
    expect(normalizeEslintRuleToOxlintCanonical('n/no-deprecated-api')).toBe(
      'node/no-deprecated-api'
    );
  });

  it('should leave node/ unchanged (identity mapping)', () => {
    expect(normalizeEslintRuleToOxlintCanonical('node/no-deprecated-api')).toBe(
      'node/no-deprecated-api'
    );
  });
});
