---
name: commit
description: Generate Conventional Commits messages and execute a safe commit (read-only staging review, lint/typecheck reminder, secret scan, push). Auto-invokes when the Droid is about to run git commit. Invoke manually with /commit.
user-invocable: true
disable-model-invocation: false
---

# Commit

Standard workflow to produce a **Conventional Commits** message and execute
`git add` + `git commit` safely. Use this whenever you are about to commit
changes (manually with `/commit` or implicitly while building a task).

## Important guardrails

- **Never** include `Co-authored-by`, `Signed-off-by`, or any multi-author
  attribution. Single author only.
- **Never** commit secrets (API keys, tokens, `.env`, credentials, large
  binaries). If anything looks secret, stop and warn the user.
- **Do not** `git push` unless the user explicitly asked for it. By default
  stay local and surface a push summary.
- **Stay on the user's branch**. Do not switch branches, rebase, reset, or
  rewrite history without confirmation.

## Process

1. Inspect the working tree and the index:
   - `git status --porcelain`
   - `git diff --stat`
   - `git diff --cached --stat`
   - `git log --oneline -5`
2. Decide what to stage:
   - If the user said "commit everything" → `git add -A` (still scan for
     secrets).
   - Otherwise → review each unstaged file and ask before staging.
3. Classify the change (one or more types, see Templates below).
4. Draft the message:
   - Subject: `<type>(<scope>): <description>` — imperative, present
     tense, **≤50 chars**, no trailing period.
   - Body (optional): explain **why**, not what. Wrap at 72 chars.
   - Footer (optional): `BREAKING CHANGE:` or `Refs: <issue>`.
5. Run the **Pre-commit checklist**.
6. Commit:
   ```bash
   git commit -m "<subject>" -m "<body>"
   ```
7. Surface `git log -1 --stat` and `git status` to the user. Suggest
   `git push origin HEAD` only if asked.

## Templates

```
<type>(<scope>): <description>

[optional body explaining the why]

[optional footer]
```

| Type       | When to use                                                |
|------------|------------------------------------------------------------|
| `feat`     | New user-facing feature                                     |
| `fix`      | Bug fix                                                     |
| `docs`     | Documentation only                                          |
| `style`    | Formatting, whitespace, no logic change                    |
| `refactor` | Code change that neither fixes a bug nor adds a feature    |
| `perf`     | Performance improvement                                     |
| `test`     | Add or fix tests only                                       |
| `build`    | Build system, deps, packaging                               |
| `ci`       | CI/CD configuration                                         |
| `chore`    | Tooling, maintenance, no production code change            |
| `revert`   | Reverts a previous commit (`revert: <hash> <subject>`)      |

`scope` is optional and short (e.g. `api`, `auth`, `ui`, `parser`).

## Pre-commit checklist

Before running `git commit`, verify:

- [ ] Status: only the files you intend to commit are staged.
- [ ] No secrets/API keys/credentials in the diff.
- [ ] `.env*`, `.pem`, `id_rsa`, `node_modules/`, build outputs are
      ignored (`.gitignore` or unstaged).
- [ ] Linter and formatter would pass on the diff (run them now if cheap:
      `pnpm lint`, `ruff check`, whatever the repo uses).
- [ ] Typechecker would pass on the diff (`tsc`, `mypy`, etc.).
- [ ] Tests for the touched area exist and are green locally; otherwise
      note "tests not run" in the commit body.
- [ ] CHANGELOG / docs updated if the change is user-visible.
- [ ] Single-author only (no co-authored-by trailers).
- [ ] Subject ≤ 50 chars and imperative.

## Verification

After committing, always run:

```bash
git log -1 --stat
git status
```

If there are leftover modified files from the same task, ask whether they
should be a follow-up commit. Never fold them silently into the previous
commit unless the user says so.

## Examples

```
feat(api): add /v2/skills endpoint
fix(auth): correct token expiry off-by-one
docs(readme): add quickstart for agents skill sync
chore(deps): bump tailwind to 4.1
refactor(core): extract skill loader into its own module
```
