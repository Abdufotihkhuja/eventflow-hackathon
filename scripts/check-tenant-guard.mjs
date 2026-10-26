#!/usr/bin/env node
/**
 * Tenant-guard ratchet — Phase 0, item 0.4.
 *
 * Fails if a NEW raw `prisma.<tenantModel>.<list|mutation op>` appears outside
 * the repository layer (and outside the legitimately cross-tenant `public` and
 * `super-admin` modules). Pre-existing violations are grandfathered via
 * `tenant-guard-baseline.json`, so this blocks regressions only — zero risk to
 * existing code or prod.
 *
 * Tenant reads/writes should go through a repository using
 * requireTenantWhere()/requireEventTenantWhere() (apps/api/src/common/tenant).
 *
 *   node scripts/check-tenant-guard.mjs            # check (CI / release gate)
 *   node scripts/check-tenant-guard.mjs --update   # refresh the baseline
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(here, '..');
const SRC = join(REPO_ROOT, 'apps/api/src');
const BASELINE = join(here, 'tenant-guard-baseline.json');

const TENANT_MODELS = [
  'registration', 'certificate', 'ticketArtifact', 'attendance', 'questionAnswer',
  'eventRecipient', 'speaker', 'agendaItem', 'event', 'rentalPlace',
  'organizationMember', 'organizationRole', 'organizationInvite', 'eventTag',
  'board', 'blogPost', 'contactRequest', 'userFollowing', 'registrationFileUpload',
  // Монетизация (D-12)
  'order', 'planPurchase', 'eventCreditConsumption', 'planCreditAdjustment',
  'entitlementOverride', 'usageEvent', 'usageCounter', 'coinLedgerEntry',
  'paymentTransaction', 'payout', 'adOrder', 'organizationAccessOverride',
];
const OPS = [
  'findMany', 'findFirst', 'updateMany', 'deleteMany', 'update', 'delete',
  'count', 'aggregate', 'groupBy', 'upsert',
];
const RE = new RegExp(`\\.(${TENANT_MODELS.join('|')})\\.(${OPS.join('|')})\\b`, 'g');

// Repository layer + legitimately cross-tenant modules are exempt.
const EXCLUDE = [
  /\.repository\.ts$/, /\.spec\.ts$/,
  /\/common\/tenant\//, /\/modules\/public\//, /\/modules\/super-admin\//, /\/prisma\//,
];

function collect() {
  const sigs = new Set();
  const entries = readdirSync(SRC, { recursive: true });
  for (const entry of entries) {
    const abs = join(SRC, entry.toString());
    if (!abs.endsWith('.ts')) continue;
    const posix = abs.replace(/\\/g, '/');
    if (EXCLUDE.some((re) => re.test(posix))) continue;
    let content;
    try {
      content = readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    const rel = relative(REPO_ROOT, abs).replace(/\\/g, '/');
    for (const line of content.split('\n')) {
      RE.lastIndex = 0;
      let m;
      while ((m = RE.exec(line)) !== null) {
        sigs.add(`${rel}::${m[1]}.${m[2]}`);
      }
    }
  }
  return [...sigs].sort();
}

const current = collect();

if (process.argv.includes('--update')) {
  writeFileSync(BASELINE, JSON.stringify(current, null, 2) + '\n');
  console.log(`tenant-guard: baseline updated with ${current.length} entries.`);
  process.exit(0);
}

const baseline = existsSync(BASELINE)
  ? JSON.parse(readFileSync(BASELINE, 'utf8'))
  : [];
const baseSet = new Set(baseline);
const currentSet = new Set(current);
const added = current.filter((s) => !baseSet.has(s));
const removed = baseline.filter((s) => !currentSet.has(s));

if (added.length > 0) {
  console.error(
    `❌ tenant-guard: ${added.length} new raw tenant-model query(ies) outside the repository layer:`,
  );
  for (const s of added) console.error(`   + ${s}`);
  console.error(
    '\nRoute tenant reads/writes through a repository using ' +
      'requireTenantWhere()/requireEventTenantWhere() (apps/api/src/common/tenant).',
  );
  console.error(
    'If this is a legitimate cross-tenant query, move it into a repository or the ' +
      'public/super-admin modules. If intentional, refresh the baseline:\n' +
      '  node scripts/check-tenant-guard.mjs --update',
  );
  process.exit(1);
}

console.log(
  `✅ tenant-guard: no new violations ` +
    `(${current.length} grandfathered, ${removed.length} since removed).`,
);
if (removed.length > 0) {
  console.log('   tip: run `node scripts/check-tenant-guard.mjs --update` to shrink the baseline.');
}
process.exit(0);
