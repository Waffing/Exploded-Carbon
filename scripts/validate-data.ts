import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { specimens } from '../src/data/specimens.ts';
import { compareScenarios, evaluateSpecimen, projectImpact, validateDataset, waterTotal, buildSankeyFlows } from '../src/domain/engine.ts';
import type { Selections, Specimen } from '../src/domain/types.ts';
assert.deepEqual(validateDataset(specimens), []);
let checked = 0;
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
const counts: Record<string, number> = {};
function visit(s: Specimen, index: number, choices: Selections) {
  if (index < s.layers.length) {
    const l = s.layers[index];
    for (const v of l.variants) visit(s, index + 1, { ...choices, [l.id]: v.id });
    return;
  }
  const c = compareScenarios(s, choices);
  const e = c.current;
  assert.deepEqual(evaluateSpecimen(s, Object.fromEntries(Object.entries(choices).reverse())), e);
  for (const value of [e.totals.carbon, e.totals.plastic, e.totals.mass, ...Object.values(e.totals.water)]) assert.ok(Number.isFinite(value) && value >= 0);
  close(e.layers.reduce((n, l) => n + l.metrics.carbon, 0), e.totals.carbon);
  close(c.baseline.totals.carbon - e.totals.carbon, c.savings.carbon);
  close(buildSankeyFlows(e, 'carbon').reduce((n, f) => n + f.value, 0), e.totals.carbon);
  close(buildSankeyFlows(e, 'water').reduce((n, f) => n + f.value, 0), waterTotal(e.totals.water));
  const p = projectImpact(c, s.frequency, 4);
  close(p.savings.carbon, c.savings.carbon * p.annualCount * 4);
  checked++; counts[s.id] = (counts[s.id] ?? 0) + 1;
}
for (const s of specimens) visit(s, 0, {});
const samples = specimens.map(s => {
  const c = compareScenarios(s, s.preset);
  return { specimen: s.id, baseline: c.baseline.totals, preset: c.current.totals, saving: c.savings, savingPercent: c.percent, annualFrequency: projectImpact(c, s.frequency, 1).annualCount };
});
const report = { status: 'passed', specimens: specimens.length, layers: 24, checkedCombinations: checked, counts, samples, limitations: ['算术一致性不等于LCA数据经科学核证', '多数分层因子为明确教学假设'] };
writeFileSync(new URL('../artifacts/data-validation.json', import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
