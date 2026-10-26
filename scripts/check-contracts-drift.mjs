#!/usr/bin/env node
/**
 * Contract-drift gate — monetization program, item D-2.
 *
 * The NestJS controllers are the contract source of truth; the committed
 * `packages/api-contracts/openapi/eventflow.openapi.json` (+ generated types
 * and built dist) must always match what the running app would export.
 * Historically nothing enforced that, so the committed spec silently lagged
 * the runtime API (see docs/monetization/00-baseline.md, PC-5).
 *
 * This gate regenerates the spec + types + dist and fails if that produces
 * any diff against the committed files. Drift is a stop condition: fix it by
 * committing the regenerated output, never by skipping the gate.
 *
 *   node scripts/check-contracts-drift.mjs          # regenerate, then diff (local / release gate)
 *   node scripts/check-contracts-drift.mjs --no-gen # diff only (CI, where `npm run build` already regenerated)
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(here, '..');

const GATED_PATHS = [
  'packages/api-contracts/openapi',
  'packages/api-contracts/src/generated',
  'packages/api-contracts/dist',
];

const skipGenerate = process.argv.includes('--no-gen');

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: REPO_ROOT, stdio: 'pipe', encoding: 'utf8', ...opts });
}

// Refuse to run over pre-existing uncommitted edits to the gated paths — the
// diff below could not tell them apart from real drift.
const dirtyBefore = run(`git status --porcelain -- ${GATED_PATHS.join(' ')}`).trim();
if (!skipGenerate && dirtyBefore) {
  console.error('[contracts-drift] Gated paths already have uncommitted changes:');
  console.error(dirtyBefore);
  console.error('[contracts-drift] Commit or stash them first, then re-run.');
  process.exit(2);
}

if (skipGenerate) {
  console.log('[contracts-drift] --no-gen: diffing committed contracts against the already-regenerated working tree');
} else {
  console.log('[contracts-drift] Regenerating spec + types (openapi:export → openapi-typescript)…');
  run('npm run contracts:generate', { stdio: 'inherit' });
  console.log('[contracts-drift] Rebuilding api-contracts dist…');
  run('npm --workspace @eventflow/api-contracts run build', { stdio: 'inherit' });
}

const drift = run(`git status --porcelain -- ${GATED_PATHS.join(' ')}`).trim();
if (drift) {
  console.error('\n[contracts-drift] FAIL — committed contracts do not match the runtime API:');
  console.error(run(`git diff --stat -- ${GATED_PATHS.join(' ')}`));
  console.error('[contracts-drift] Fix: commit the regenerated files —');
  console.error('  npm run contracts:generate && npm --workspace @eventflow/api-contracts run build');
  console.error('  git add packages/api-contracts && git commit');
  console.error('[contracts-drift] Then hand-extend the affected packages/sdk-*/src/index.ts if the change added endpoints.');
  process.exit(1);
}

console.log('[contracts-drift] OK — committed contracts match the runtime API.');
