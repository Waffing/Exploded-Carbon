import { useState } from 'react';
import type { Comparison } from '../domain/types.ts';
import { buildSankeyFlows, format, waterTotal } from '../domain/engine.ts';
export default function SankeyFlow({ comparison: c }: { comparison: Comparison }) {
  const [metric, setMetric] = useState<'carbon' | 'water'>('carbon');
  const before = buildSankeyFlows(c.baseline, metric);
  const after = buildSankeyFlows(c.current, metric);
  const beforeTotal = metric === 'carbon' ? c.baseline.totals.carbon : waterTotal(c.baseline.totals.water);
  const afterTotal = metric === 'carbon' ? c.current.totals.carbon : waterTotal(c.current.totals.water);
  const unit = metric === 'carbon' ? 'g CO₂e' : 'L';
  const max = Math.max(beforeTotal, afterTotal, 1);
  const diagram = (flows: typeof before, total: number, x: number, isAfter: boolean) => {
    let offset = 0;
    return <g transform={`translate(${x} 0)`}><text x="0" y="25" className="sankey-heading">{isAfter ? 'AFTER / 改装后' : 'BEFORE / 改装前'}</text>{flows.map((f, i) => {
      const width = f.value / max * 148;
      const y = 62 + offset + i * 20;
      const target = 72 + offset;
      offset += width;
      const color = isAfter && f.changed ? '#10B981' : ['#FF5722', '#b18c67', '#c0c2b2', '#7b8c89', '#c7b8a9', '#95968f'][i % 6];
      return <g key={f.id}><text x="0" y={y - 8} className="sankey-label">{f.label}</text>{width > 0 && <><path d={`M92 ${y} C175 ${y},162 ${target},245 ${target} L245 ${target + width} C162 ${target + width},175 ${y + width},92 ${y + width} Z`} fill={color} opacity=".43" data-flow-value={f.value} /><rect x="88" y={y} width="5" height={width} fill={color} /></>}<text x="0" y={y + 7} className="sankey-value">{format(f.value, 1)}</text></g>;
    })}<rect x="245" y="72" width="7" height={total / max * 148} fill={isAfter ? '#10B981' : '#18181B'} /><text x="270" y="115" className="sankey-total">{format(total, 0)}</text><text x="270" y="135" className="sankey-label">{unit}</text></g>;
  };
  return <section className="flow-panel"><div className="panel-heading"><div><div className="section-label">04 / 资源流向</div><h2>影响，从哪里来？</h2></div><div className="small-segment"><button aria-pressed={metric === 'carbon'} onClick={() => setMetric('carbon')}>碳排放</button><button aria-pressed={metric === 'water'} onClick={() => setMetric('water')}>水足迹</button></div></div><svg viewBox="0 0 780 330" role="img" aria-label={`改装前后${metric === 'carbon' ? '碳' : '水'}流向对比`} data-testid="sankey" data-before={beforeTotal} data-after={afterTotal}>{diagram(before, beforeTotal, 15, false)}{diagram(after, afterTotal, 405, true)}</svg><p className="tiny-note">同一比例尺 · 流带宽度对应数量 · 参数驱动层不重复计入{metric === 'water' ? ` · ${c.current.specimen.waterScope}` : ''}</p><details className="flow-table"><summary>查看可核对明细</summary><table><thead><tr><th>部件/环节</th><th>改装前 {unit}</th><th>改装后 {unit}</th></tr></thead><tbody>{before.map((f, i) => <tr key={f.id}><td>{f.label}</td><td>{format(f.value)}</td><td>{format(after[i].value)}</td></tr>)}</tbody></table></details></section>;
}
