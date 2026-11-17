# Changelog

## 0.1.1 - 2026-11-17

- Test config: raise test and hook timeouts and cap workers so CLI spawn tests are stable under load.

## 0.1.0 - 2026-11-17

First release.

- CLI `hubcard-lint` for model, dataset and Space `README.md` metadata: 25 rules, three levels (error, warning, lint), file line and column, Hub wording, suggested values.
- Library API (`lintCard`, `lintFile`, `formatText`, `formatJson`), pre-commit hook, JSON output, `--strict`, `--exit-zero`, `--quiet`.
- English and Korean output (`--lang`, `HUBCARD_LINT_LANG`).
- Offline rules snapshot from `@huggingface/tasks` 0.22.16 and the Hub docs (2026-11-17), with `scripts/refresh-snapshot.mjs --check`.
