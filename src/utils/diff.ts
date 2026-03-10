// Types
export type EslintFlatConfig = {
  rules?: Record<string, unknown>;
  [key: string]: unknown;
};
export type OxlintConfig = {
  rules?: Record<string, unknown>;
  overrides?: { rules?: Record<string, unknown> }[];
};
export type DiffResult = {
  /** All active ESLint rules mapped to their severity. */
  eslintRules: Map<string, string>;
  /** All active OxLint rule names. */
  oxlintRules: Set<string>;
  /** Rules active in ESLint but NOT in OxLint. */
  eslintOnly: string[];
  /** Rules active in both ESLint and OxLint. */
  coveredByOxlint: string[];
  /** Rules active in OxLint but NOT in ESLint. */
  oxlintOnly: string[];
};

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
 * Extracts the set of active ESLint rules from a flat config array.
 * Later configs override earlier ones; rules set to "off" / 0 are removed.
 *
 * @param configs - An array of ESLint flat config objects to extract rules from.
 * @returns A map of active ESLint rule names to their severity ("error" or "warn").
 */
function getActiveEslintRules(
  configs: EslintFlatConfig[]
): Map<string, string> {
  const rules = new Map<string, string>();
  for (const cfg of configs) {
    if (!cfg.rules) continue;
    for (const [name, value] of Object.entries(cfg.rules)) {
      if (isRuleActive(value)) {
        const severity = Array.isArray(value)
          ? String(value[0])
          : String(value);
        rules.set(name, severity);
      } else {
        rules.delete(name);
      }
    }
  }
  return rules;
}

/**
 * Extracts the set of active OxLint rules from a config object,
 * including any overrides.
 *
 * @param config - The OxLint config object to extract rules from.
 * @returns A set of active OxLint rule names.
 */
function getActiveOxlintRules(config: OxlintConfig): Set<string> {
  const rules = new Set<string>();
  if (config.rules) {
    for (const [name, value] of Object.entries(config.rules)) {
      if (isRuleActive(value)) {
        rules.add(name);
      }
    }
  }
  if (config.overrides) {
    for (const override of config.overrides) {
      if (!override.rules) continue;
      for (const [name, value] of Object.entries(override.rules)) {
        if (isRuleActive(value)) {
          rules.add(name);
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
  const eslintOnly: string[] = [];
  const coveredByOxlint: string[] = [];
  const oxlintOnly: string[] = [];
  const eslintRules = getActiveEslintRules(eslintConfig);
  const oxlintRules = getActiveOxlintRules(oxlintConfig);
  for (const rule of eslintRules.keys()) {
    if (oxlintRules.has(rule)) coveredByOxlint.push(rule);
    else eslintOnly.push(rule);
  }
  for (const rule of oxlintRules) {
    if (!eslintRules.has(rule)) oxlintOnly.push(rule);
  }
  eslintOnly.sort();
  coveredByOxlint.sort();
  oxlintOnly.sort();
  return { eslintRules, oxlintRules, eslintOnly, coveredByOxlint, oxlintOnly };
}
