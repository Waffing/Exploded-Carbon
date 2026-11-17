import { useState } from 'react';
import { ArrowDownRight, Fuel, ShoppingBag, TreePine } from 'lucide-react';
import type { Comparison } from '../domain/types.ts';
import { calculateEquivalents, format, projectImpact } from '../domain/engine.ts';
import AnimatedNumber from './AnimatedNumber';
export default function ImpactBill({ comparison: c, frequency, onFrequency }: { comparison: Comparison; frequency: number; onFrequency: (value: number) => void }) {
  const [years, setYears] = useState(4);
  const p = projectImpact(c, frequency, years);
  const eq = calculateEquivalents(p.savings);
  const s = c.current.specimen;
  return <section className="impact-panel"><div className="panel-heading"><div><div className="section-label">05 / 把改变放大</div><h2>小选择，长远的回响。</h2></div><div className="small-segment"><button aria-pressed={years === 1} onClick={() => setYears(1)}>一年</button><button aria-pressed={years === 4} onClick={() => setYears(4)}>大学四年</button></div></div>
    <div className="frequency-control"><label htmlFor="frequency">每{s.frequencyUnit === 'week' ? '周' : '年'}</label><input id="frequency" type="number" min="0" max="366" step="1" value={frequency} onChange={e => onFrequency(Number(e.target.value))} /><span>{s.id === 'shirt' ? '件基线T恤的穿着需求' : '次'}，坚持 {years} 年</span><span className="frequency-total">{format(p.annualCount * years, 0)} {s.id === 'shirt' ? '件基线当量' : '次选择'}</span></div>
    <div className="annual-saving"><div><span>预计减少的碳当量</span><strong><AnimatedNumber value={p.savings.carbon / 1000} /><small>kg CO₂e</small></strong></div><ArrowDownRight size={40} strokeWidth={1.2} /></div>
    <div className="equivalents"><div><Fuel size={19} /><strong><AnimatedNumber value={eq.gasoline} /><small>L</small></strong><span>汽油燃烧排放等价</span></div><div><ShoppingBag size={19} /><strong><AnimatedNumber value={eq.bags} decimals={0} /><small>个</small></strong><span>5g塑料袋质量等价</span></div><div><TreePine size={19} /><strong><AnimatedNumber value={eq.treeYears} /><small>树年</small></strong><span>冷杉固碳教学等价</span></div></div>
    {s.id === 'shirt' && <p className="service-note">相同 {format(p.wearDemand!, 0)} 次穿着：当前分摊 {format(p.garmentEquivalent!)} 件当量。整件当前生命周期为 {format(c.current.fullGarment!.carbon)} g CO₂e，不因分摊而消失。</p>}
    <details className="projection-details"><summary>换算依据与折叠账单</summary><dl><div><dt>改装前</dt><dd>{format(p.baseline.carbon / 1000)} kg CO₂e</dd></div><div><dt>改装后</dt><dd>{format(p.current.carbon / 1000)} kg CO₂e</dd></div><div><dt>塑料质量差值</dt><dd>{format(p.savings.plastic)} g</dd></div></dl><p>每年按52周。汽油8887g CO₂/美制加仑，仅燃烧口径；袋5g/个；冷杉22kg CO₂/树·年为未核证教学假设。数值只是近似等价，不代表实际购买减少、种树或抵消；四年保持相同条件，不是预测。</p></details>
  </section>;
}
