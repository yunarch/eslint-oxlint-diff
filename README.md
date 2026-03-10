<h1>@yunarch/eslint-oxlint-diff</h1>

CLI tool to compare ESLint and OxLint rules, showing coverage gaps and overlap.

## Usage

<!-- [docsgen]: start -->

```
Usage: @yunarch/eslint-oxlint-diff [options]

A CLI tool to compare ESLint and OxLint rules, showing coverage gaps and
overlap.

Options:
  --eslint-config <path>  Path to the ESLint configuration file. Defaults to
                          eslint.config file in the current directory.
  --oxlint-config <path>  Path to the oxlint configuration file. Defaults to
                          .oxlintrc file in the current directory.
  --no-dedupe             Skip turning off ESLint rules that OxLint already
                          covers.
  -h, --help              display help for command

Example usage:
$ npx @yunarch/eslint-oxlint-diff --eslint-config path/to/eslint.config --oxlint-config path/to/.oxlintrc
```

<!-- [docsgen]: end -->
