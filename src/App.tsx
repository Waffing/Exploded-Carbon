import { useCallback, useMemo, useReducer, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, CircleHelp, Fingerprint, FlaskConical, Globe2, ReceiptText, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { specimens } from './data/specimens.ts';
import { boundaryText } from './data/sources.ts';
import { compareScenarios } from './domain/engine.ts';
import { initialState, labReducer } from './state/labReducer.ts';
import { playSound, setSoundEnabled, getAudioState } from './audio/labAudio.ts';
import type { ReceiptSnapshot } from './export/receipt.ts';
import SpecimenDock from './components/SpecimenDock';
import LayerInspector from './components/LayerInspector';
import ExplodedStage from './components/ExplodedStage';
import EcoConfigurator from './components/EcoConfigurator';
import SankeyFlow from './components/SankeyFlow';
import ImpactBill from './components/ImpactBill';
import MethodologyDialog from './components/MethodologyDialog';
import ReceiptDialog from './components/ReceiptDialog';

export default function App() {
  const [state, dispatch] = useReducer(labReducer, initialState);
  const [methodsOpen, setMethodsOpen] = useState(false);
  const [sound, setSound] = useState(false);
  const [soundError, setSoundError] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptSnapshot | null>(null);
  const specimen = specimens.find(s => s.id === state.specimenId)!;
  const choices = state.selections[state.specimenId];
  const comparison = useMemo(() => compareScenarios(specimen, choices), [specimen, choices]);
  const frequency = state.frequencies[state.specimenId];
  const onExplosion = useCallback((value: number) => { dispatch({ type: 'explosion', value }); playSound('detent'); }, []);
  const selectLayer = (index: number) => { dispatch({ type: 'layer', index }); playSound('select'); };
  const toggleAudio = async () => {
    const enabled = !sound;
    const ok = await setSoundEnabled(enabled);
    setSound(ok && enabled); setSoundError(enabled && !ok);
    if (ok && enabled) playSound('select');
  };
  return <div className="lab-shell" data-testid="lab" data-specimen={specimen.id} data-carbon={comparison.current.totals.carbon}>
    <header className="site-header"><a href="#lab" className="brand" aria-label="Exploded Carbon实验室"><span className="brand-mark"><LayersMark /></span><span>EXPLODED<span className="brand-light">CARBON</span><small>一顿外卖的地球账单</small></span></a><div className="header-center"><span className="status-led" />AN EVERYDAY IMPACT LAB<span className="header-divider">/</span>2026</div><div className="header-actions"><button onClick={toggleAudio} aria-label={sound ? '关闭声音' : '开启声音'} aria-pressed={sound} data-audio-state={getAudioState().state}>{sound ? <Volume2 size={17} /> : <VolumeX size={17} />}<span>{soundError ? '声音不可用' : sound ? '声音已开' : '静音'}</span></button><button onClick={() => setMethodsOpen(true)} aria-label="方法与数据"><CircleHelp size={17} /><span>方法与数据</span></button><span className="hack-badge">HACK4GOOD <ArrowUpRight size={12} /></span></div></header>
    <main id="lab"><div className="lab-intro"><div><span className="eyebrow">THE HIDDEN COST OF EVERYDAY THINGS</span><p>拆开日常，<span>看见地球的账单。</span></p></div><div className="intro-note"><FlaskConical size={15} /><span>交互式生命周期实验室<br /><b>4个样品 · 24层拆解 · 每个选择都算数</b></span></div></div>
      <SpecimenDock active={state.specimenId} onChange={id => { dispatch({ type: 'specimen', id }); playSound('select'); }} />
      <div className="workspace"><LayerInspector comparison={comparison} selected={state.layerIndex} onSelect={selectLayer} onSources={() => setMethodsOpen(true)} /><ExplodedStage comparison={comparison} selected={state.layerIndex} explosion={state.explosion} mode={state.mode} onLayer={selectLayer} onExplosion={onExplosion} onMode={mode => { dispatch({ type: 'mode', mode }); playSound('select'); }} /><EcoConfigurator comparison={comparison} selected={state.layerIndex} onVariant={(layerId, variantId) => { dispatch({ type: 'variant', layerId, variantId }); playSound('swap'); }} onPreset={() => { dispatch({ type: 'preset' }); playSound('swap'); }} onReset={() => { dispatch({ type: 'reset' }); playSound('select'); }} /></div>
      <div className="insight-strip"><span><Fingerprint size={16} />不是让生活少一点，而是让影响轻一点。</span><button onClick={() => setMethodsOpen(true)}>数字如何计算 <ArrowUpRight size={13} /></button></div>
      <div className="results-grid"><SankeyFlow comparison={comparison} /><ImpactBill comparison={comparison} frequency={frequency} onFrequency={value => dispatch({ type: 'frequency', value })} /></div>
      <section className="receipt-banner"><div className="receipt-icon"><ReceiptText size={38} strokeWidth={1.2} /></div><div><span className="eyebrow">A RECEIPT WORTH KEEPING</span><h2>今天的改变，值得留一张小票。</h2><p>把拆解、改装与地球账单，装进一张1200 × 1600的热敏小票。</p></div><Button className="export-button" onClick={() => { setReceipt({ comparison: structuredClone(comparison), frequency, createdAt: new Date().toISOString() }); playSound('select'); }}><ReceiptText size={17} />生成我的地球小票<ArrowDownRight size={18} /></Button></section>
      <section className="boundary-strip"><Globe2 size={19} /><p>{boundaryText} <button onClick={() => setMethodsOpen(true)}>阅读计算边界与假设</button></p></section>
    </main><footer><span>EXPLODED CARBON<span className="footer-slash">/</span>地球没有外卖袋。</span><span>BUILT FOR A LIGHTER TOMORROW <span className="footer-dot" /> 2026</span></footer>
    <MethodologyDialog open={methodsOpen} onClose={() => setMethodsOpen(false)} comparison={comparison} /><ReceiptDialog snapshot={receipt} onClose={() => setReceipt(null)} />
  </div>;
}
function LayersMark() { return <svg viewBox="0 0 32 34" fill="none" aria-hidden="true"><path d="M3 10L16 3L29 10L16 17Z" stroke="currentColor" strokeWidth="1.8" /><path d="M3 17L16 24L29 17M3 24L16 31L29 24" stroke="currentColor" strokeWidth="1.8" /><path d="M16 9V17" stroke="#FF5722" strokeWidth="2" /></svg>; }
