import { useEffect, useRef, useState } from 'react';
import { format } from '../domain/engine.ts';
export default function AnimatedNumber({ value, decimals = 1, className = '' }: { value: number; decimals?: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const previous = useRef(value);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); previous.current = value; return; }
    const from = previous.current;
    const start = performance.now();
    let id = 0;
    const animate = (time: number) => {
      const t = Math.min(1, (time - start) / 460);
      const next = from + (value - from) * (1 - (1 - t) ** 3);
      setShown(next); previous.current = next;
      if (t < 1) id = requestAnimationFrame(animate);
    };
    id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, [value]);
  return <span className={`number ${className}`} data-value={value} aria-label={format(value, decimals)}><span aria-hidden="true">{format(shown, decimals)}</span></span>;
}
