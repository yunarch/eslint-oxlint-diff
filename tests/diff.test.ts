import { describe, expect, it } from 'bun:test';
import { diff } from '../src/utils/diff';

describe('diff', () => {
  // Testing isRuleActive logic
  describe('rule activity detection', () => {
    it('should detect string "error" as active', () => {
      const result = diff([{ rules: { 'no-console': 'error' } }], {
        rules: {},
      });
      expect(result.eslintRules.has('no-console')).toBe(true);
    });

    it('should detect string "warn" as active', () => {
      const result = diff([{ rules: { 'no-console': 'warn' } }], { rules: {} });
      expect(result.eslintRules.has('no-console')).toBe(true);
    });

    it('should detect numeric 1 as active', () => {
      const result = diff([{ rules: { 'no-console': 1 } }], { rules: {} });
      expect(result.eslintRules.has('no-console')).toBe(true);
    });

    it('should detect numeric 2 as active', () => {
      const result = diff([{ rules: { 'no-console': 2 } }], { rules: {} });
      expect(result.eslintRules.has('no-console')).toBe(true);
    });

    it('should detect array ["error", ...] as active', () => {
      const result = diff(
        [{ rules: { 'no-console': ['error', { allow: ['warn'] }] } }],
        { rules: {} }
      );
      expect(result.eslintRules.has('no-console')).toBe(true);
    });

    it('should detect array [2, ...] as active', () => {
      const result = diff([{ rules: { 'no-console': [2] } }], { rules: {} });
      expect(result.eslintRules.has('no-console')).toBe(true);
    });

    it('should treat "off" as inactive', () => {
      const result = diff([{ rules: { 'no-console': 'off' } }], { rules: {} });
      expect(result.eslintRules.has('no-console')).toBe(false);
    });

    it('should treat 0 as inactive', () => {
      const result = diff([{ rules: { 'no-console': 0 } }], { rules: {} });
      expect(result.eslintRules.has('no-console')).toBe(false);
    });

    it('should treat ["off"] as inactive', () => {
      const result = diff([{ rules: { 'no-console': ['off'] } }], {
        rules: {},
      });
      expect(result.eslintRules.has('no-console')).toBe(false);
    });
  });

  // Testing eslint rule extraction logic
  describe('eslint rule extraction', () => {
    it('should extract rules from a single config', () => {
      const result = diff(
        [{ rules: { 'no-unused-vars': 'error', semi: 'warn' } }],
        { rules: {} }
      );
      expect(result.eslintRules.size).toBe(2);
      expect(result.eslintRules.get('no-unused-vars')).toBe('error');
      expect(result.eslintRules.get('semi')).toBe('warn');
    });

    it('should handle configs without rules', () => {
      const result = diff([{ rules: { 'no-console': 'error' } }], {
        rules: {},
      });
      expect(result.eslintRules.size).toBe(1);
    });

    it('should allow later configs to override earlier ones', () => {
      const result = diff(
        [
          { rules: { 'no-console': 'error', semi: 'warn' } },
          { rules: { 'no-console': 'off' } },
        ],
        { rules: {} }
      );
      expect(result.eslintRules.has('no-console')).toBe(false);
      expect(result.eslintRules.has('semi')).toBe(true);
    });

    it('should handle empty config array', () => {
      const result = diff([], { rules: {} });
      expect(result.eslintRules.size).toBe(0);
    });
  });

  // Testing oxlint rule extraction logic
  describe('oxlint rule extraction', () => {
    it('should extract rules from top-level rules', () => {
      const result = diff([], {
        rules: { 'no-console': 'error', 'no-debugger': 'warn' },
      });
      expect(result.oxlintRules.size).toBe(2);
      expect(result.oxlintRules.has('no-console')).toBe(true);
      expect(result.oxlintRules.has('no-debugger')).toBe(true);
    });

    it('should extract rules from overrides', () => {
      const result = diff([], {
        rules: {},
        overrides: [
          { rules: { 'no-console': 'error' } },
          { rules: { 'no-debugger': 'warn' } },
        ],
      });
      expect(result.oxlintRules.size).toBe(2);
    });

    it('should merge top-level rules and override rules', () => {
      const result = diff([], {
        rules: { 'no-console': 'error' },
        overrides: [{ rules: { 'no-debugger': 'error' } }],
      });
      expect(result.oxlintRules.size).toBe(2);
    });

    it('should handle config without rules or overrides', () => {
      const result = diff([], {});
      expect(result.oxlintRules.size).toBe(0);
    });

    it('should skip overrides without rules', () => {
      const result = diff([], {
        rules: { 'no-console': 'error' },
        overrides: [{} as { rules?: Record<string, unknown> }],
      });
      expect(result.oxlintRules.size).toBe(1);
    });
  });

  // Testing diff comparasion logic
  describe('comparison logic', () => {
    it('should categorize eslint-only rules', () => {
      const result = diff(
        [{ rules: { 'no-console': 'error', semi: 'warn' } }],
        { rules: {} }
      );
      expect(result.eslintOnly).toEqual(['no-console', 'semi']);
      expect(result.coveredByOxlint).toEqual([]);
      expect(result.oxlintOnly).toEqual([]);
    });

    it('should categorize oxlint-only rules', () => {
      const result = diff([], { rules: { 'no-console': 'error' } });
      expect(result.oxlintOnly).toEqual(['no-console']);
      expect(result.eslintOnly).toEqual([]);
      expect(result.coveredByOxlint).toEqual([]);
    });

    it('should categorize covered rules', () => {
      const result = diff([{ rules: { 'no-console': 'error' } }], {
        rules: { 'no-console': 'warn' },
      });
      expect(result.coveredByOxlint).toEqual(['no-console']);
      expect(result.eslintOnly).toEqual([]);
      expect(result.oxlintOnly).toEqual([]);
    });

    it('should handle a mix of all categories', () => {
      const result = diff(
        [{ rules: { 'no-console': 'error', semi: 'warn', 'no-var': 'error' } }],
        {
          rules: { 'no-console': 'error', 'no-debugger': 'warn' },
        }
      );
      expect(result.coveredByOxlint).toEqual(['no-console']);
      expect(result.eslintOnly).toEqual(['no-var', 'semi']);
      expect(result.oxlintOnly).toEqual(['no-debugger']);
    });

    it('should sort results alphabetically', () => {
      const result = diff(
        [{ rules: { 'z-rule': 'error', 'a-rule': 'warn', 'm-rule': 'error' } }],
        {
          rules: {
            'z-rule': 'error',
            'b-ox-rule': 'error',
            'a-ox-rule': 'error',
          },
        }
      );
      expect(result.eslintOnly).toEqual(['a-rule', 'm-rule']);
      expect(result.coveredByOxlint).toEqual(['z-rule']);
      expect(result.oxlintOnly).toEqual(['a-ox-rule', 'b-ox-rule']);
    });

    it('should return empty arrays when both configs are empty', () => {
      const result = diff([], {});
      expect(result.eslintOnly).toEqual([]);
      expect(result.coveredByOxlint).toEqual([]);
      expect(result.oxlintOnly).toEqual([]);
      expect(result.eslintRules.size).toBe(0);
      expect(result.oxlintRules.size).toBe(0);
    });

    it('should handle plugin-prefixed rules', () => {
      const result = diff(
        [{ rules: { '@typescript-eslint/no-unused-vars': 'error' } }],
        {
          rules: { '@typescript-eslint/no-unused-vars': 'error' },
        }
      );
      expect(result.coveredByOxlint).toEqual([
        '@typescript-eslint/no-unused-vars',
      ]);
      expect(result.eslintOnly).toEqual([]);
      expect(result.oxlintOnly).toEqual([]);
    });
  });
});
