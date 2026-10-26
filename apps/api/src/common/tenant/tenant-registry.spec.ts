import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DIRECT_TENANT_MODELS,
  EVENT_TENANT_MODELS,
  ORDER_TENANT_MODELS,
} from './tenant-scope';

/**
 * D-12b: parity-тест триплицированных tenant-списков против единого реестра
 * scripts/tenant-model-registry.json. Ловит рассинхрон между eslint-regex,
 * ratchet-скриптом и helpers — до сих пор они синхронизировались руками.
 */
describe('Реестр tenant-моделей (D-12b)', () => {
  const repoRoot = join(__dirname, '../../../../..');
  const registry = JSON.parse(
    readFileSync(join(repoRoot, 'scripts/tenant-model-registry.json'), 'utf8'),
  ) as { direct: string[]; eventTransitive: string[]; orderTransitive: string[] };

  const allRegistry = [
    ...registry.direct,
    ...registry.eventTransitive,
    ...registry.orderTransitive,
  ].sort();

  it('tenant-scope.ts совпадает с реестром', () => {
    expect([...DIRECT_TENANT_MODELS].sort()).toEqual([...registry.direct].sort());
    expect([...EVENT_TENANT_MODELS].sort()).toEqual(
      [...registry.eventTransitive].sort(),
    );
    expect([...ORDER_TENANT_MODELS].sort()).toEqual(
      [...registry.orderTransitive].sort(),
    );
  });

  it('ratchet-скрипт покрывает все модели реестра', () => {
    const ratchet = readFileSync(
      join(repoRoot, 'scripts/check-tenant-guard.mjs'),
      'utf8',
    );
    for (const model of allRegistry) {
      expect(ratchet).toContain(`'${model}'`);
    }
  });

  it('eslint-regex покрывает все модели реестра', () => {
    const eslintConfig = readFileSync(
      join(repoRoot, 'apps/api/eslint.config.mjs'),
      'utf8',
    );
    for (const model of allRegistry) {
      expect(eslintConfig).toContain(model);
    }
  });
});
