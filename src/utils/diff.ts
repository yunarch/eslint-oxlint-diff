// Types
export type EslintFlatConfig = { rules?: Record<string, unknown> };
export type OxlintConfig = {
  rules?: Record<string, unknown>;
  overrides?: { rules?: Record<string, unknown> }[];
};
export type RuleInfo = {
  /** Original rule name as written in the source config. */
  rule: string;
  /** Plugin the rule belongs to (e.g. "@typescript-eslint", "react", "eslint"). */
  plugin: string;
  /** Resolved severity. */
  severity: string;
  /**
   * Canonical identifier used to match the same logical rule across ESLint
   * and OxLint. For OxLint rules this is the rule name itself; for ESLint
   * rules it is the rule name normalized to OxLint's plugin naming.
   */
  canonical: string;
};
export type DiffResult = {
  /** All active ESLint rules, keyed by their canonical OxLint rule name. */
  eslintRules: Map<string, RuleInfo>;
  /** All active OxLint rules, keyed by their canonical OxLint rule name. */
  oxlintRules: Map<string, RuleInfo>;
  /** ESLint rule names active in both ESLint and OxLint, keyed by their canonical OxLint rule name. */
  coveredByOxlint: Map<string, RuleInfo>;
  /** ESLint rule names active in ESLint but NOT covered by OxLint, keyed by their canonical OxLint rule name. */
  eslintOnly: Map<string, RuleInfo>;
  /** OxLint rule names active in OxLint but NOT in ESLint, keyed by their canonical OxLint rule name. */
  oxlintOnly: Map<string, RuleInfo>;
};

/**
 * Extracts the plugin name from a rule name.
 * For example, "@typescript-eslint/no-unused-vars" -> "@typescript-eslint".
 *
 * @param rule - The rule name.
 * @returns The plugin name, or "eslint" for unprefixed core rules.
 */
export function getPluginFromRule(rule: string): string {
  const idx = rule.lastIndexOf('/');
  return idx > 0 ? rule.slice(0, idx) : 'eslint';
}

/**
 * Normalizes an ESLint-style rule name to its canonical OxLint form.
 * e.g. "@typescript-eslint/no-floating-promises" → "typescript/no-floating-promises"
 *      "react-hooks/exhaustive-deps" → "react/exhaustive-deps"
 *      "@next/next/inline-script-id" → "nextjs/inline-script-id"
 *      "no-unused-vars" → "no-unused-vars" (unchanged for unprefixed rules)
 *
 * @param ruleName - The ESLint rule name to normalize.
 * @returns The normalized OxLint rule name.
 *
 * @see https://github.com/oxc-project/oxlint-migrate/blob/main/src/constants.ts#L30
 */
export function normalizeEslintRuleToOxlintCanonical(ruleName: string): string {
  const rulesPrefixesForPlugins: Record<string, string> = {
    import: 'import',
    'import-x': 'import',
    jest: 'jest',
    jsdoc: 'jsdoc',
    'jsx-a11y': 'jsx-a11y',
    '@next/next': 'nextjs',
    node: 'node',
    n: 'node',
    promise: 'promise',
    react: 'react',
    'react-perf': 'react-perf',
    'react-hooks': 'react',
    'react-refresh': 'react',
    '@typescript-eslint': 'typescript',
    unicorn: 'unicorn',
    vitest: 'vitest',
    vue: 'vue',
  };
  for (const [prefix, plugin] of Object.entries(rulesPrefixesForPlugins)) {
    if (prefix !== plugin && ruleName.startsWith(`${prefix}/`)) {
      return `${plugin}/${ruleName.slice(prefix.length + 1)}`;
    }
  }
  return ruleName;
}

/**
 * Checks if a rule value means the rule is active (error or warn).
 *
 * @param value - The rule value to check.
 * @returns `true` if the rule is active, `false` otherwise.
 */
function isRuleActive(value: unknown): boolean {
  if (typeof value === 'string') {
    return value === 'error' || value === 'warn';
  }
  if (Array.isArray(value) && value.length > 0) {
    return (
      value[0] === 'error' ||
      value[0] === 'warn' ||
      value[0] === 2 ||
      value[0] === 1
    );
  }
  if (typeof value === 'number') {
    return value === 1 || value === 2;
  }
  return false;
}

/**
 * Extracts active ESLint rules from a flat config array.
 * Later configs override earlier ones; rules set to "off" / 0 are removed.
 *
 * @param configs - An array of ESLint flat config objects.
 * @returns A map of active ESLint rules keyed by rule name.
 */
function getActiveEslintRules(
  configs: EslintFlatConfig[]
): DiffResult['eslintRules'] {
  const rules: DiffResult['eslintRules'] = new Map();
  for (const cfg of configs) {
    if (!cfg.rules) continue;
    for (const [name, value] of Object.entries(cfg.rules)) {
      const canonical = normalizeEslintRuleToOxlintCanonical(name);
      if (isRuleActive(value)) {
        const severity = Array.isArray(value)
          ? String(value[0])
          : String(value);
        rules.set(canonical, {
          plugin: getPluginFromRule(name),
          rule: name,
          severity,
          canonical,
        });
      } else {
        rules.delete(canonical);
      }
    }
  }
  return rules;
}

/**
 * Extracts active OxLint rules from a config object, including overrides.
 * OxLint rule names are already canonical, so the canonical id equals the rule name.
 *
 * @param config - The OxLint config object.
 * @returns A map of active OxLint rules keyed by rule name.
 */
function getActiveOxlintRules(config: OxlintConfig): DiffResult['oxlintRules'] {
  const rules: DiffResult['oxlintRules'] = new Map();
  if (config.rules) {
    for (const [name, value] of Object.entries(config.rules)) {
      const canonical = normalizeEslintRuleToOxlintCanonical(name);
      if (isRuleActive(value)) {
        const severity = Array.isArray(value)
          ? String(value[0])
          : String(value);
        rules.set(canonical, {
          plugin: getPluginFromRule(name),
          rule: name,
          severity,
          canonical,
        });
      } else {
        rules.delete(canonical);
      }
    }
  }
  if (config.overrides) {
    for (const override of config.overrides) {
      if (!override.rules) continue;
      for (const [name, value] of Object.entries(override.rules)) {
        const canonical = normalizeEslintRuleToOxlintCanonical(name);
        if (isRuleActive(value)) {
          const severity = Array.isArray(value)
            ? String(value[0])
            : String(value);
          rules.set(canonical, {
            plugin: getPluginFromRule(name),
            rule: name,
            severity,
            canonical,
          });
        } else {
          rules.delete(canonical);
        }
      }
    }
  }
  return rules;
}

/**
 * Compares ESLint and OxLint rules and returns a structured diff result.
 *
 * @param eslintConfig - An array of ESLint flat config objects to compare.
 * @param oxlintConfig - An OxLint config object to compare.
 * @returns A diff object containing the comparison results.
 *
 * @example
 * ```ts
 * const result = diff({
 *   eslintConfig: [{ rules: { 'no-unused-vars': 'error' } }],
 *   oxlintConfig: { rules: { 'no-unused-vars': 'error' } },
 * });
 * ```
 */
export function diff(
  eslintConfig: EslintFlatConfig[],
  oxlintConfig: OxlintConfig
): DiffResult {
  const eslintRules = getActiveEslintRules(eslintConfig);
  const oxlintRules = getActiveOxlintRules(oxlintConfig);
  const coveredByOxlint: DiffResult['coveredByOxlint'] = new Map();
  const eslintOnly: DiffResult['eslintOnly'] = new Map();
  const oxlintOnly: DiffResult['oxlintOnly'] = new Map();
  const sortedEslint = [...eslintRules.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  );
  const sortedOxlint = [...oxlintRules.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  );
  for (const [canonical, rule] of sortedEslint) {
    if (oxlintRules.has(canonical)) coveredByOxlint.set(canonical, rule);
    else eslintOnly.set(canonical, rule);
  }
  for (const [canonical, rule] of sortedOxlint) {
    if (!eslintRules.has(canonical)) oxlintOnly.set(canonical, rule);
  }
  return { eslintRules, oxlintRules, eslintOnly, coveredByOxlint, oxlintOnly };
}
