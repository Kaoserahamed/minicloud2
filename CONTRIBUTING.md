# Contributing to MiniCloud

Thank you for your interest in contributing to MiniCloud!

## Development workflow

1. Create `feature/<ticket>-<description>` from `development`.
2. Implement source code only.
3. Add unit + integration + e2e tests; run lint/test; all must pass.
4. Update documentation (API reference, user guide, ADR, inline doc comments).
5. Commit with a conventional commit message; squash to logical atomic commits.
6. Push branch to origin; open a Pull Request targeting `development`.
7. Code review; merge; delete branch.

## Commit message convention

Use conventional commits: `type(scope): description`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`.

Example: `feat(compute): add instance lifecycle state machine`

## Getting started

```bash
npm install
npm run start:controlplane
```
