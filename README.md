<h1>@yunarch/eslint-oxlint-diff</h1>

[![NPM version](https://img.shields.io/npm/v/@yunarch/eslint-oxlint-diff?color=3eb910&label=)](https://www.npmjs.com/package/@yunarch/eslint-oxlint-diff)

CLI tool to compare ESLint and OxLint rules, showing coverage gaps and overlap.

## Why?

Thinking about adopting [Oxlint](https://oxc.rs/docs/guide/usage/linter.html)? This tool rapidly answers:

- **How much of my ESLint config does Oxlint already cover?** See a coverage percentage at a glance.
- **Which rules are missing?** Get a list of ESLint rules not covered by your Oxlint config, grouped by plugin.
- **Which new Oxlint rules will I get?** Spot extra rules Oxlint enables that your ESLint config doesn't have.

> [!NOTE]
> If you just want to migrate from ESLint to OxLint, you should check out [`Oxlint migration guide`](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html).

## Usage

<!-- [docsgen]: start -->

```
Usage: @yunarch/eslint-oxlint-diff [options]

A CLI tool to compare ESLint and OxLint rules, showing coverage gaps and
overlap.

Requires ESLint config in flat config format.

Options:
  --eslint-config <path>         Path to the ESLint configuration file. Defaults
                                 to eslint.config file in the current directory.
  --oxlint-config <path>         Path to the oxlint configuration file. If
                                 omitted, infers the config from the ESLint
                                 configuration.
  --with-infer-type-aware        Include type-aware rules when inferring the
                                 oxlint config. Only relevant without
                                 --oxlint-config. (default: true)
  --with-infer-js-plugins        Include ESLint JS plugins when inferring the
                                 oxlint config. Only relevant without
                                 --oxlint-config. (default: false)
  --with-infer-nursery           Include nursery rules when inferring the oxlint
                                 config. Only relevant without --oxlint-config.
                                 (default: false)
  --save-inferred-oxlint <path>  Save the inferred OxLint config to a file. Only
                                 relevant without --oxlint-config.
  -h, --help                     display help for command

Quick start:
$ npx @yunarch/eslint-oxlint-diff

With explicit config paths:
$ npx @yunarch/eslint-oxlint-diff --eslint-config path/to/eslint.config --oxlint-config path/to/.oxlintrc
```

<!-- [docsgen]: end -->

### Example output

```
──────────────────────────────────────────────────────────────────────
  ESLint rules NOT yet covered by OxLint
──────────────────────────────────────────────────────────────────────

  📦 @typescript-eslint (2 rules)
     ├─ @typescript-eslint/consistent-type-imports
     └─ @typescript-eslint/no-import-type-side-effects

  📦 eslint-core (1 rule)
     └─ no-console

──────────────────────────────────────────────────────────────────────
  ESLint ↔ OxLint Rule Comparison
──────────────────────────────────────────────────────────────────────

  Total active ESLint rules:            10
  Total active OxLint rules:             7
  Covered by OxLint:                     7
  ESLint-only (not in OxLint):           3
  OxLint-only (not in ESLint):           0

  OxLint coverage of ESLint rules: 70.00%
```

### Key concepts

- **Inference mode** (default): When `--oxlint-config` is not provided, the tool uses `@oxlint/migrate` to automatically generate an equivalent OxLint configuration from your ESLint flat config.
- **`--save-inferred-oxlint`**: Exports the inferred OxLint config to a JSON file, useful as a starting point for your own `.oxlintrc.json`.

## Programmatic API

The package also exports the core functions for use in other tools:

```ts
import { diff, printDiffResult } from '@yunarch/eslint-oxlint-diff';

const result = diff(eslintFlatConfigs, oxlintConfig);

// result.eslintOnly      — rules active in ESLint but not OxLint
// result.coveredByOxlint — rules active in both
// result.oxlintOnly      — rules active in OxLint but not ESLint

printDiffResult(result); // prints formatted output to console
```

## 📜 License

MIT License © 2026-Present [@yunarch](https://github.com/yunarch)
