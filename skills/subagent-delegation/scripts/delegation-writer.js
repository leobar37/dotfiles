#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

function usage() {
  console.log(`Usage:
  node skills/subagent-delegation/scripts/delegation-writer.js create <slug> "<Title>" [--force]

Examples:
  node skills/subagent-delegation/scripts/delegation-writer.js create refactor-auth-api "Refactor Auth API Delegation"
  node skills/subagent-delegation/scripts/delegation-writer.js create checkout-validation "Checkout Validation Agent Prompt" --force`)
}

function fail(message) {
  console.error(`Error: ${message}`)
  process.exit(1)
}

function validateSlug(slug) {
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    fail('slug must be kebab-case using lowercase letters, numbers, and hyphens')
  }
}

function template(title) {
  return `# ${title}

## Goal

## Context

- Repo root:
- Source material:
- Relevant completed outputs:
- Dependency notes:

## Objective

## Scope

-

## Non-Goals

-

## Ownership

- Authorized edit paths/areas, read-only areas, and shared-boundary owners:
- Ask the existing owner before editing shared boundaries. Do not clean up,
  refactor, revert, or stage others' changes; coordination cannot expand scope.

## Stop Criteria and Out-of-Scope Findings

- Work ONLY on the user-authorized objective, deliverables, and necessary files
  within ownership. STOP once deliverables and required verification are complete.
- Fix regressions caused by your changes within ownership and verify them.
- Leave unrelated/pre-existing bugs, failing tests, and improvements untouched;
  report minimal evidence and label uncertain cause. If nonblocking, continue
  scope without investigating or subdelegating the finding, even in parallel.
- If truly blocking, pause only the affected unit and report the dependency to
  main. Coordinate with its owner without taking over, or await explicit user
  authorization to expand scope. Neither main nor subagents may self-authorize;
  blockers, spare budget, and convenience do not grant permission.

## Final API Contract

- Public exports:
- Signatures:
- Input shapes:
- Output shapes:
- Error behavior:
- Compatibility expectations:
- Migration notes:
- Usage example:

## Implementation Constraints

-

## Likely Files

-

## Validation

Use the minimum relevant checks sufficient to prove the changes and affected
contracts. An unrelated global-suite failure does not authorize repository repair.

Run:

-

## Expected Final Report

- Files changed
- What was implemented or discovered
- How the result maps to the delegated objective
- Final API implemented, if applicable
- Behaviors preserved
- Validation results
- Remaining authorized work, blocked dependencies, minimal out-of-scope evidence
`
}

function createDelegation(slug, title, force) {
  validateSlug(slug)

  if (!title || !title.trim()) {
    fail('title is required')
  }

  const root = process.cwd()
  const dir = path.join(root, '.delegations')
  const file = path.join(dir, `${slug}.md`)

  if (fs.existsSync(file) && !force) {
    fail(`${path.relative(root, file)} already exists; pass --force to replace it`)
  }

  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(file, template(title.trim()), 'utf8')

  console.log(`Created ${path.relative(root, file)}`)
}

function main() {
  const [, , command, slug, ...rest] = process.argv
  const force = rest.includes('--force')
  const titleParts = rest.filter((part) => part !== '--force')
  const title = titleParts.join(' ')

  if (!command) {
    usage()
    process.exit(0)
  }

  if (command !== 'create') {
    usage()
    fail(`unknown command: ${command}`)
  }

  createDelegation(slug, title, force)
}

main()
