import { useEffect, useRef, useState } from 'react';
import { Droplets, Flame, Hourglass, Layers3, Mouse, Plus, RotateCcw } from 'lucide-react';
import type { Comparison, Mode } from '../domain/types.ts';
import { format, waterTotal } from '../domain/engine.ts';
import { getLayerGeometry } from '../graphics/specimens.ts';
import { layerTransform } from '../graphics/geometry.ts';

export default function ExplodedStage({ comparison: c, selected, explosion, mode, onLayer, onExplosion, onMode }: { comparison: Comparison; selected: number; explosion: number; mode: Mode; onLayer: (index: number) => void; onExplosion: (value: number) => void; onMode: (mode: Mode) => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const [wheelActive, setWheelActive] = useState(false);
  const specimen = c.current.specimen;
  useEffect(() => {
    const element = stage.current;
    if (!element || !wheelActive) return;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 300 : 1);
      const next = Math.max(0, Math.min(100, explosion + delta * .07));
      if (next === explosion) return;
      event.preventDefault();
      onExplosion(next);
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [wheelActive, explosion, onExplosion]);
  const values = [...c.baseline.layers, ...c.current.layers].map(l => mode === 'carbon' ? l.metrics.carbon : mode === 'water' ? waterTotal(l.metrics.water) : l.variant.persistence.years ?? 0);
  const max = Math.max(...values, 1);
  const colorFor = (index: number) => {
    const l = c.current.layers[index];
    if (l.layer.kind === 'driver' || (mode === 'decay' && l.variant.persistence.years === null)) return '#bfc5bf';
    const value = mode === 'carbon' ? l.metrics.carbon : mode === 'water' ? waterTotal(l.metrics.water) : l.variant.persistence.years ?? 0;
    const amount = Math.sqrt(value / max);
    return mode === 'water' ? `hsl(184 ${30 + amount * 28}% ${84 - amount * 44}%)` : mode === 'decay' ? `hsl(33 ${18 + amount * 50}% ${88 - amount * 40}%)` : `hsl(${32 - amount * 18} ${40 + amount * 55}% ${89 - amount * 35}%)`;
  };
  const labelFor = (index: number) => {
    const l = c.current.layers[index];
    if (l.layer.kind === 'driver') return '参数驱动 / 不累计';
    if (mode === 'decay') return l.variant.persistence.label;
    return `${format(mode === 'carbon' ? l.metrics.carbon : waterTotal(l.metrics.water))} ${mode === 'carbon' ? 'g CO₂e' : 'L'}`;
  };
  return <section className="stage-panel"><div className="stage-topline"><span>02 / 拆解观察舱</span><span><i /> LIVE SIMULATION</span></div><div className="stage-heading"><div><span className="instrument-label">EC—{specimen.number} / EXPLODED VIEW</span><h1>{specimen.english}</h1><p>{specimen.name} <span>· 六层生命周期</span></p></div><span className="stage-stamp">LCA<br /><b>LAB</b></span></div>
    <div className="perspective-tabs" role="group" aria-label="多维透视模式">{([{ id: 'carbon', label: '碳排热力', icon: Flame }, { id: 'water', label: '水足迹', icon: Droplets }, { id: 'decay', label: '降解周期', icon: Hourglass }] as const).map(item => <button key={item.id} onClick={() => onMode(item.id)} aria-pressed={mode === item.id} data-testid={`mode-${item.id}`}><item.icon size={14} />{item.label}</button>)}</div>
    <div className={`drawing-stage ${wheelActive ? 'wheel-active' : ''}`} ref={stage} tabIndex={0} aria-label="拆解画布，点击后可用滚轮调节拆解" onFocus={() => setWheelActive(true)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setWheelActive(false); }} onPointerLeave={() => setWheelActive(false)} onPointerDown={() => { stage.current?.focus(); setWheelActive(true); }}>
      <div className="drawing-grid" /><div className="corner-mark top-left" /><div className="corner-mark top-right" /><div className="corner-mark bottom-left" /><div className="corner-mark bottom-right" />
      <svg viewBox="0 0 760 680" className="specimen-svg" aria-label={`${specimen.name}，拆解${Math.round(explosion)}%`} data-testid="exploded-svg" data-mode={mode} data-explosion={explosion}>
        <defs><pattern id="crosshatch" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 6L6 0" stroke="#8b918b" strokeWidth=".7" /></pattern></defs>
        <g className="drawing-guides" fill="none" stroke="#bfc2b8" strokeWidth="1"><path d="M380 73V610" strokeDasharray="3 7" /><ellipse cx="380" cy="582" rx="145" ry="42" strokeDasharray="4 6" /><path d="M210 582H550 M380 532V632" /><path d="M56 140V552 M50 140H62 M50 552H62" />{Array.from({ length: 18 }, (_, i) => <path key={i} d={`M${i % 3 === 0 ? 49 : 53} ${150 + i * 23}H59`} />)}</g><text x="42" y="123" className="drawing-micro">Z</text><text x="578" y="594" className="drawing-micro">ISOMETRIC / NTS</text>
        {[...c.current.layers].reverse().map(l => {
          const index = c.current.layers.indexOf(l);
          const t = layerTransform(index, explosion, specimen.id);
          const geo = getLayerGeometry(specimen.id, index, l.changed);
          return <g key={`${specimen.id}-${l.layer.id}`} transform={`translate(${t.x} ${t.y}) scale(${t.scale})`} className={`specimen-layer ${index === selected ? 'is-selected' : ''} ${l.changed ? 'is-swapped' : ''}`} data-testid={`svg-layer-${index}`} data-layer-id={l.layer.id} data-transform-y={t.y} data-swapped={l.changed} role="button" tabIndex={-1} aria-label={`选择${l.layer.label}`} onClick={e => { e.stopPropagation(); onLayer(index); }}>
            {geo.shapes.map((shape, n) => <path key={n} d={shape.d} fill={shape.role === 'body' && shape.fill !== 'none' ? `color-mix(in srgb, ${shape.fill} 58%, ${colorFor(index)} 42%)` : shape.fill} stroke={shape.stroke ?? '#343934'} strokeWidth={shape.strokeWidth ?? 1} opacity={shape.opacity ?? 1} strokeLinejoin="round" />)}
            {index === selected && <ellipse cx="0" cy={geo.bounds.y + geo.bounds.height + 5} rx={Math.min(115, geo.bounds.width * .55)} ry="7" className="selection-ring" fill="none" stroke={l.changed ? '#10B981' : '#FF5722'} strokeWidth="1.4" strokeDasharray="3 4" />}
          </g>;
        })}
        {c.current.layers.map((l, index) => {
          const t = layerTransform(index, explosion, specimen.id);
          const geo = getLayerGeometry(specimen.id, index, l.changed);
          const right = index % 2 === 1;
          const ax = t.x + (right ? Math.abs(geo.anchor[0]) : -Math.abs(geo.anchor[0])) * t.scale;
          const ay = t.y + geo.anchor[1] * t.scale;
          const labelY = 136 + Math.floor(index / 2) * 167 + (right ? 32 : 0);
          const lineEnd = right ? 677 : 82;
          const textX = right ? 555 : 84;
          const visible = explosion > 18 || selected === index;
          return <g key={l.layer.id} className={`callout ${visible ? 'visible' : ''} ${index === selected ? 'active' : ''}`} aria-hidden="true"><path d={`M${ax} ${ay} L${right ? 533 : 225} ${labelY + 29} H${lineEnd}`} fill="none" stroke={l.changed ? '#10B981' : index === selected ? '#FF5722' : '#92978e'} strokeWidth="1" /><circle cx={ax} cy={ay} r="3" fill={l.changed ? '#10B981' : '#FF5722'} /><text x={textX} y={labelY} className="callout-title">{String(index + 1).padStart(2, '0')} / {l.layer.short}</text><text x={textX} y={labelY + 20} className="callout-value" fill={l.changed ? '#07835d' : '#18181B'}>{labelFor(index)}</text></g>;
        })}
      </svg>
      <div className="stage-bottom-meta"><span><Plus size={10} />{mode === 'carbon' ? 'CARBON INTENSITY' : mode === 'water' ? 'WATER FOOTPRINT' : 'MATERIAL PERSISTENCE'}</span><span>{String(selected + 1).padStart(2, '0')} / 06 SELECTED</span></div>
    </div>
    <div className="explosion-controls"><div className="slider-heading"><span><Layers3 size={16} />拆解间距</span><b data-testid="explosion-value">{Math.round(explosion)}<small>%</small></b></div><input type="range" min="0" max="100" step="1" value={explosion} aria-label="拆解间距" onChange={e => onExplosion(Number(e.target.value))} /><div className="slider-labels"><button onClick={() => onExplosion(0)}><RotateCcw size={12} />组装态</button><span><Mouse size={12} />聚焦画布后滚轮调节</span><button onClick={() => onExplosion(100)}>完全拆解 <Plus size={12} /></button></div></div>
    <div className="heat-legend"><span>{mode === 'decay' ? '较短' : '较低'}</span><div className={`heat-scale ${mode}`} /><span>{mode === 'decay' ? '较长' : '较高'}</span><span className="legend-note">{mode === 'decay' ? '年限不可相加 · 纹理/灰色为不适用' : '同样品固定色标 · 精确到显示位的估算'}</span></div>
  </section>;
}
