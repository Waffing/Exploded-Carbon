import { ArrowDownRight, Box, SlidersHorizontal } from 'lucide-react';
import type { Comparison } from '../domain/types.ts';
import { format, waterTotal } from '../domain/engine.ts';
import AnimatedNumber from './AnimatedNumber';
export default function LayerInspector({ comparison, selected, onSelect, onSources }: { comparison: Comparison; selected: number; onSelect: (index: number) => void; onSources: () => void }) {
  const l = comparison.current.layers[selected];
  return <aside className="layer-inspector"><div className="section-label"><span>01 / 物料档案</span><Box size={14} /></div><h2>每一层，都有代价。</h2><p className="aside-intro">点击图层，查看藏在物品里的资源账。</p>
    <div className="bom-list">{comparison.current.layers.map((v, i) => <button key={v.layer.id} className={`bom-item ${i === selected ? 'selected' : ''} ${v.changed ? 'modified' : ''}`} onClick={() => onSelect(i)} aria-pressed={i === selected} data-testid={`layer-${i}`}><span className="bom-no">{String(i + 1).padStart(2, '0')}</span><span>{v.layer.short}<small>{v.layer.kind === 'driver' ? '参数驱动 · 不重复累计' : v.layer.material}</small></span><span className="bom-dot" /></button>)}</div>
    <div className="layer-detail"><div className="detail-kicker">LAYER {String(selected + 1).padStart(2, '0')}<span>{l.changed ? '已改装' : '基线部件'}</span></div><h3>{l.layer.label}</h3><div className="layer-carbon">{l.layer.kind === 'driver' ? <span className="driver-readout"><SlidersHorizontal size={22} />计算参数</span> : <><AnimatedNumber value={l.metrics.carbon} /><span>g CO₂e</span></>}</div><div className="detail-grid"><span>材料分摊<em>{format(l.metrics.mass)} g</em></span><span>水足迹<em>{format(waterTotal(l.metrics.water))} L</em></span></div><p>{l.variant.description}</p><details className="calculation-detail"><summary>计算方式与边界</summary><p>{l.variant.calculation}</p><p>{l.variant.evidence}</p><p>{l.variant.persistence.label} · {l.variant.persistence.note}</p><button onClick={onSources}>查看来源与全部假设 <ArrowDownRight size={13} /></button></details></div>
    <div className="drawing-id"><span>EC—2026 / TEACHING MODEL</span><span>NON-CERTIFIED · REV 01</span></div>
  </aside>;
}
