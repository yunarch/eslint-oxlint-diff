<h1>@yunarch/eslint-oxlint-diff</h1>

[![NPM version](https://img.shields.io/npm/v/@yunarch/eslint-oxlint-diff?color=3eb910&label=)](https://www.npmjs.com/package/@yunarch/eslint-oxlint-diff)

CLI tool to compare ESLint and OxLint rules, showing coverage gaps and overlap.

## Usage

<!-- [docsgen]: start -->

```
Usage: @yunarch/eslint-oxlint-diff [options]

A CLI tool to compare ESLint and OxLint rules, showing coverage gaps and
overlap.

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

Example usage:
$ npx @yunarch/eslint-oxlint-diff --eslint-config path/to/eslint.config --oxlint-config path/to/.oxlintrc
```

<!-- [docsgen]: end -->
