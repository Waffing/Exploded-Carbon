import test from 'node:test';
import assert from 'node:assert/strict';
import { specimens } from '../src/data/specimens.ts';
import { evaluateSpecimen, compareScenarios, projectImpact, calculateEquivalents, calculateAI, validateDataset, waterTotal } from '../src/domain/engine.ts';
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test('inventory contains four complete specimens with twenty-four unique layers', () => {
  assert.equal(specimens.length, 4);
  assert.equal(specimens.flatMap(s => s.layers).length, 24);
  assert.deepEqual(validateDataset(specimens), []);
});
test('baseline totals are exactly the sum of accountable layers', () => {
  for (const s of specimens) {
    const result = evaluateSpecimen(s, {});
    close(result.totals.carbon, result.layers.reduce((n, l) => n + l.metrics.carbon, 0));
    close(waterTotal(result.totals.water), result.layers.reduce((n, l) => n + waterTotal(l.metrics.water), 0));
    assert.equal(compareScenarios(s, {}).savings.carbon, 0);
  }
});
test('AI operational accounting matches independent hand calculation', () => {
  const v = calculateAI({ hours: 8, gpuCount: 1, gpuWatts: 250, utilization: 1, hostWatts: 50, pue: 1.4, wue: .5, gridCarbon: 400, gridWater: .2, workload: 1, embodiedCarbon: 100000, hardwareHours: 20000 });
  close(v.itKwh, 2.4); close(v.facilityKwh, 3.36);
  close(v.operationalCarbon, 1344); close(v.water, 1.872);
});
test('AI drivers do not add emissions a second time', () => {
  const s = specimens.find(s => s.id === 'ai')!;
  for (const choices of [{}, s.preset]) {
    const result = evaluateSpecimen(s, choices);
    assert.equal(result.layers.filter(l => l.layer.kind === 'driver').reduce((n, l) => n + l.metrics.carbon, 0), 0);
    const params = result.ai!;
    close(result.layers[1].metrics.carbon + result.layers[2].metrics.carbon, params.facilityKwh * params.gridCarbon);
  }
});
test('each preset saves emissions and remains idempotent and reversible', () => {
  for (const s of specimens) {
    const a = compareScenarios(s, s.preset);
    assert.ok(a.savings.carbon > 0, s.id);
    assert.deepEqual(evaluateSpecimen(s, { ...s.preset, ...s.preset }), a.current);
    assert.deepEqual(evaluateSpecimen(s, Object.fromEntries(Object.entries(s.preset).reverse())), a.current);
    assert.equal(compareScenarios(s, {}).savings.carbon, 0);
  }
});
test('coffee annual and four-year counts are 208 and 832', () => {
  const c = compareScenarios(specimens[0], specimens[0].preset);
  close(projectImpact(c, 4, 1).savings.carbon, c.savings.carbon * 208);
  close(projectImpact(c, 4, 4).savings.carbon, c.savings.carbon * 832);
});
test('shirt longevity preserves equal wear service and full garment burden', () => {
  const s = specimens.find(s => s.id === 'shirt')!;
  const c = compareScenarios(s, { 'shirt-use': 'long-life' });
  assert.equal(c.current.wears, 50);
  const p = projectImpact(c, 12, 1);
  close(p.wearDemand!, 60); close(p.garmentEquivalent!, 1.2);
  close(c.current.layers[0].metrics.carbon, c.baseline.layers[0].metrics.carbon / 10);
  assert.ok(c.current.fullGarment!.carbon > c.current.totals.carbon);
});
test('equivalents use gasoline combustion and explicitly assumed bag/tree factors', () => {
  const e = calculateEquivalents({ carbon: 8887, plastic: 5, water: { blue: 0, green: 0, grey: 0 }, mass: 0 });
  close(e.gasoline, 3.785411784); close(e.bags, 1); close(e.treeYears, 8.887 / 22);
});
test('invalid user selections and frequency are rejected, not silently reset', () => {
  assert.throws(() => evaluateSpecimen(specimens[0], { 'coffee-cup': 'missing' }));
  assert.throws(() => evaluateSpecimen(specimens[0], { nonexistent: 'missing' }));
  assert.throws(() => projectImpact(compareScenarios(specimens[0], {}), -1, 4));
  assert.throws(() => calculateAI({ hours: 8, gpuCount: 1, gpuWatts: 250, utilization: 1, hostWatts: 50, pue: .5, wue: .5, gridCarbon: 400, gridWater: .2, workload: 1, embodiedCarbon: 100000, hardwareHours: 20000 }));
});
