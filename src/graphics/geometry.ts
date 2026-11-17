import type { SpecimenId } from '../domain/types';

/** The same solid-color paths are consumed by SVG and Canvas Path2D. */
export type Shape = {
  d: string;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  role?: 'body' | 'accent' | 'detail';
};

export type LayerGeometry = {
  shapes: Shape[];
  anchor: [number, number];
  bounds: { x: number; y: number; width: number; height: number };
};

const assembledY: Record<SpecimenId, readonly number[]> = {
  coffee: [296, 309, 327, 358, 433, 455],
  meal: [282, 312, 340, 368, 418, 452],
  shirt: [280, 310, 346, 390, 420, 452],
  ai: [280, 312, 344, 376, 408, 444],
};

/**
 * Coordinates target viewBox="0 0 760 680"; transform order is translate, scale.
 * The tall cup retains its height when assembled, then shrinks to specimen scale
 * as its neighbors separate. All other layers retain a shared 1:1 drawing scale.
 */
export function layerTransform(
  index: number,
  explosion: number,
  specimenId: SpecimenId,
): { x: number; y: number; scale: number } {
  if (!Object.hasOwn(assembledY, specimenId)) throw new RangeError(`Unknown specimen: ${specimenId}`);
  if (!Number.isInteger(index) || index < 0 || index > 5) throw new RangeError(`Invalid layer index: ${index}`);
  const t = Number.isNaN(explosion) ? 0 : Math.min(100, Math.max(0, explosion)) / 100;
  const compactY = assembledY[specimenId][index];
  return {
    x: 380 + (index - 2.5) * 2.4 * t,
    y: compactY + (160 + index * 80 - compactY) * t,
    scale: specimenId === 'coffee' && index === 3 ? 1 - 0.45 * t : 1,
  };
}
