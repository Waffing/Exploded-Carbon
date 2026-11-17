import type { AIParameters, Comparison, Evaluation, Metrics, Projection, Selections, Specimen, Water } from './types.ts';
import { sources } from '../data/sources.ts';

export const zeroMetrics = (): Metrics => ({ carbon: 0, plastic: 0, water: { green: 0, blue: 0, grey: 0 }, mass: 0 });
export const waterTotal = (water: Water) => water.green + water.blue + water.grey;
export const scaleMetrics = (m: Metrics, n: number): Metrics => ({ carbon: m.carbon * n, plastic: m.plastic * n, mass: m.mass * n, water: { green: m.water.green * n, blue: m.water.blue * n, grey: m.water.grey * n } });
export function addMetrics(a: Metrics, b: Metrics): Metrics {
  return { carbon: a.carbon + b.carbon, plastic: a.plastic + b.plastic, mass: a.mass + b.mass, water: { green: a.water.green + b.water.green, blue: a.water.blue + b.water.blue, grey: a.water.grey + b.water.grey } };
}
const sum = (items: Metrics[]) => items.reduce(addMetrics, zeroMetrics());
export const aiDefaults: AIParameters = { hours: 8, gpuCount: 4, gpuWatts: 300, utilization: .85, hostWatts: 150, pue: 1.4, wue: .8, gridCarbon: 500, gridWater: .6, workload: 1, embodiedCarbon: 4000000, hardwareHours: 20000 };

export function calculateAI(p: AIParameters) {
  if (Object.values(p).some(v => !Number.isFinite(v) || v < 0) || p.pue < 1 || p.utilization > 1 || p.workload > 1 || p.hardwareHours <= 0 || p.gpuCount < 1 || !Number.isInteger(p.gpuCount)) throw new Error('AI参数超出有效范围');
  const effectiveHours = p.hours * p.workload;
  const itKwh = effectiveHours * (p.gpuCount * p.gpuWatts * p.utilization + p.hostWatts) / 1000;
  const facilityKwh = itKwh * p.pue;
  return { effectiveHours, itKwh, facilityKwh, overheadKwh: facilityKwh - itKwh, operationalCarbon: facilityKwh * p.gridCarbon, water: itKwh * p.wue + facilityKwh * p.gridWater };
}

export function resolveScenario(specimen: Specimen, selections: Selections) {
  for (const key of Object.keys(selections)) if (!specimen.layers.some(l => l.id === key)) throw new Error(`未知图层：${key}`);
  return specimen.layers.map(layer => {
    const variant = layer.variants.find(v => v.id === (selections[layer.id] ?? layer.variants[0].id));
    if (!variant) throw new Error(`无效改装：${layer.id}`);
    return { layer, variant, metrics: structuredClone(variant.metrics), changed: variant.id !== layer.variants[0].id };
  });
}

export function evaluateSpecimen(specimen: Specimen, selections: Selections): Evaluation {
  const layers = resolveScenario(specimen, selections);
  const evaluation: Evaluation = { specimen, layers, totals: zeroMetrics() };
  if (specimen.id === 'shirt') {
    const use = layers[5].variant;
    const wears = use.wears!;
    const physicalUse = { ...zeroMetrics(), carbon: wears * use.washCarbon! + use.endpointCarbon!, water: { green: 0, grey: 0, blue: wears * use.washWater! } };
    evaluation.fullGarment = sum([...layers.slice(0, 5).map(l => l.metrics), physicalUse]);
    evaluation.wears = wears;
    for (let i = 0; i < 5; i++) layers[i].metrics = scaleMetrics(layers[i].metrics, 5 / wears);
    layers[5].metrics = { ...zeroMetrics(), carbon: 5 * use.washCarbon! + use.endpointCarbon! * 5 / wears, water: { green: 0, grey: 0, blue: 5 * use.washWater! } };
  }
  if (specimen.id === 'ai') {
    const parameters = Object.assign({}, aiDefaults, ...layers.map(l => l.variant.ai ?? {}));
    const a = calculateAI(parameters);
    layers[1].metrics = { ...zeroMetrics(), carbon: a.itKwh * parameters.gridCarbon, water: { green: 0, grey: 0, blue: a.itKwh * parameters.gridWater } };
    layers[2].metrics = { ...zeroMetrics(), carbon: a.overheadKwh * parameters.gridCarbon, water: { green: 0, grey: 0, blue: a.overheadKwh * parameters.gridWater + a.itKwh * parameters.wue } };
    layers[5].metrics = { ...zeroMetrics(), carbon: parameters.embodiedCarbon * a.effectiveHours / parameters.hardwareHours };
    evaluation.ai = { ...parameters, itKwh: a.itKwh, facilityKwh: a.facilityKwh, effectiveHours: a.effectiveHours };
  }
  evaluation.totals = sum(layers.map(l => l.metrics));
  return evaluation;
}
export function compareScenarios(specimen: Specimen, selections: Selections): Comparison {
  const baseline = evaluateSpecimen(specimen, {});
  const current = evaluateSpecimen(specimen, selections);
  const savings = addMetrics(baseline.totals, scaleMetrics(current.totals, -1));
  return { baseline, current, savings, percent: baseline.totals.carbon ? savings.carbon / baseline.totals.carbon * 100 : null };
}
export function projectImpact(comparison: Comparison, frequency: number, years: number): Projection {
  if (!Number.isFinite(frequency) || frequency < 0 || frequency > 366 || !Number.isFinite(years) || years < 0 || years > 100) throw new Error('频次或年数超出范围');
  const specimen = comparison.current.specimen;
  const annualCount = frequency * (specimen.frequencyUnit === 'week' ? 52 : 1);
  const count = annualCount * years;
  return { annualCount, years, baseline: scaleMetrics(comparison.baseline.totals, count), current: scaleMetrics(comparison.current.totals, count), savings: scaleMetrics(comparison.savings, count), ...(specimen.id === 'shirt' ? { wearDemand: count * 5, garmentEquivalent: count * 5 / comparison.current.wears! } : {}) };
}
export function calculateEquivalents(savings: Metrics) {
  return { gasoline: savings.carbon / (8887 / 3.785411784), bags: savings.plastic / 5, treeYears: savings.carbon / 1000 / 22 };
}
export function buildSankeyFlows(evaluation: Evaluation, metric: 'carbon' | 'water') {
  return evaluation.layers.filter(l => l.layer.kind !== 'driver').map(l => ({ id: l.layer.id, label: l.layer.short, value: metric === 'carbon' ? l.metrics.carbon : waterTotal(l.metrics.water), changed: l.changed }));
}
export function validateDataset(items: Specimen[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const s of items) {
    if (s.layers.length !== 6) errors.push(`${s.id}: 需要6层`);
    for (const l of s.layers) {
      if (ids.has(l.id)) errors.push(`重复图层${l.id}`);
      ids.add(l.id);
      if (l.variants.length < 2 || new Set(l.variants.map(v => v.id)).size !== l.variants.length) errors.push(`${l.id}: 变体无效`);
      for (const v of l.variants) {
        if ([v.metrics.carbon, v.metrics.plastic, v.metrics.mass, ...Object.values(v.metrics.water)].some(n => !Number.isFinite(n) || n < 0)) errors.push(`${l.id}/${v.id}: 数值无效`);
        if (!v.calculation || !v.evidence || v.sourceIds.length === 0 || v.sourceIds.some(id => !sources.some(s => s.id === id))) errors.push(`${l.id}/${v.id}: 来源缺失`);
        if (l.kind === 'driver' && (v.metrics.carbon || waterTotal(v.metrics.water) || v.metrics.plastic)) errors.push(`${l.id}: 驱动重复计入`);
      }
    }
    try { resolveScenario(s, s.preset); } catch { errors.push(`${s.id}: 组合方案无效`); }
  }
  return errors;
}
export const format = (n: number, decimals = 1) => new Intl.NumberFormat('zh-CN', { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(n);
