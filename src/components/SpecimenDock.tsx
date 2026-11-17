import { ArrowUpRight, Coffee, Cpu, Shirt, Soup } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { specimens } from '../data/specimens.ts';
import type { SpecimenId } from '../domain/types.ts';
const icons = { coffee: Coffee, meal: Soup, shirt: Shirt, ai: Cpu };
export default function SpecimenDock({ active, onChange }: { active: SpecimenId; onChange: (id: SpecimenId) => void }) {
  return <Tabs value={active} onValueChange={value => onChange(value as SpecimenId)} className="sample-dock"><TabsList aria-label="选择实验样品" className="sample-list" variant="line">
    {specimens.map(s => { const Icon = icons[s.id]; return <TabsTrigger key={s.id} value={s.id} className="sample-tab" aria-label={s.name} data-testid={`sample-${s.id}`}><span className="sample-code">SPECIMEN {s.number}</span><div className="sample-name"><Icon size={23} strokeWidth={1.4} /><span>{s.name}</span><ArrowUpRight size={16} className="sample-arrow" /></div><span className="sample-sub">{s.subtitle}</span></TabsTrigger>; })}
  </TabsList></Tabs>;
}
