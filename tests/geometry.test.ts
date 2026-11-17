import test from 'node:test';
import assert from 'node:assert/strict';
import type { SpecimenId } from '../src/domain/types.ts';
import { layerTransform } from '../src/graphics/geometry.ts';
import type { LayerGeometry } from '../src/graphics/geometry.ts';
import { getLayerGeometry, getSpecimenSilhouette } from '../src/graphics/specimens.ts';

const ids: SpecimenId[] = ['coffee', 'meal', 'shirt', 'ai'];
const indices = [0, 1, 2, 3, 4, 5];
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

// Assets deliberately use absolute, paired-coordinate commands only. Checking each
// control point also bounds every Bezier curve by its convex hull, without a DOM.
function pathPoints(d: string): [number, number][] {
  assert.match(d, /^M\s*[-\d.]/);
  assert.doesNotMatch(d, /NaN|Infinity|undefined|url\(|[<>]/);
  assert.equal(d.replace(/[MLCQZ\s,\d.+-]/g, ''), '', 'portable absolute path commands');
  const segments = d.match(/[MLCQZ][^MLCQZ]*/g) ?? [];
  const points: [number, number][] = [];
  const arity: Record<string, number> = { M: 2, L: 2, C: 6, Q: 4, Z: 0 };
  for (const segment of segments) {
    const command = segment[0];
    const numbers = (segment.slice(1).match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)/g) ?? []).map(Number);
    assert.ok(numbers.every(Number.isFinite));
    if (command === 'Z') assert.equal(numbers.length, 0);
    else {
      assert.ok(numbers.length >= arity[command]);
      assert.equal(numbers.length % arity[command], 0, `invalid ${command} segment: ${segment}`);
    }
    for (let i = 0; i < numbers.length; i += 2) points.push([numbers[i], numbers[i + 1]]);
  }
  assert.ok(points.length >= 2, 'path must contain actual geometry');
  return points;
}

function assertInsideBounds(geometry: LayerGeometry) {
  const b = geometry.bounds;
  assert.ok(Object.values(b).every(Number.isFinite));
  assert.ok(b.width > 0 && b.height > 0);
  assert.ok(b.x < 0 && b.x + b.width > 0, 'local geometry straddles x=0');
  for (const shape of geometry.shapes) {
    const inset = (shape.strokeWidth ?? 0) / 2;
    for (const [x, y] of pathPoints(shape.d)) {
      assert.ok(x - inset >= b.x - 1e-6 && x + inset <= b.x + b.width + 1e-6, `x=${x} outside bounds`);
      assert.ok(y - inset >= b.y - 1e-6 && y + inset <= b.y + b.height + 1e-6, `y=${y} outside bounds`);
    }
  }
  const [x, y] = geometry.anchor;
  assert.ok(Number.isFinite(x) && Number.isFinite(y));
  assert.ok(x > 0, 'callout anchor sits on the visible right side');
  assert.ok(x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height);
}

test('transforms clamp explosion including non-finite input without moving outside the scene', () => {
  for (const id of ids) for (const index of indices) {
    assert.deepEqual(layerTransform(index, -20, id), layerTransform(index, 0, id));
    assert.deepEqual(layerTransform(index, -Infinity, id), layerTransform(index, 0, id));
    assert.deepEqual(layerTransform(index, NaN, id), layerTransform(index, 0, id));
    assert.deepEqual(layerTransform(index, 120, id), layerTransform(index, 100, id));
    assert.deepEqual(layerTransform(index, Infinity, id), layerTransform(index, 100, id));
  }
});

test('each specimen has six ordered layers, a compact assembly and 160–560 exploded centers', () => {
  for (const id of ids) {
    for (const explosion of [0, 45, 100]) {
      let previousY = -Infinity;
      for (const index of indices) {
        const t = layerTransform(index, explosion, id);
        assert.ok(Object.values(t).every(Number.isFinite));
        assert.ok(t.scale > 0 && t.scale <= 1.5);
        assert.ok(t.x >= 350 && t.x <= 410);
        assert.ok(t.y > previousY);
        previousY = t.y;
        if (explosion === 0) assert.ok(t.y >= 275 && t.y <= 460);
      }
    }
    close(layerTransform(0, 100, id).y, 160);
    close(layerTransform(5, 100, id).y, 560);
  }
});

test('all 24 layer ids have detailed, finite native paths in both variants', () => {
  const signatures = new Set<string>();
  for (const id of ids) for (const index of indices) {
    for (const swapped of [false, true]) {
      const geometry = getLayerGeometry(id, index, swapped);
      assert.ok(geometry.shapes.length >= 8, `${id}/${index} needs material detail`);
      assertInsideBounds(geometry);
      assert.ok(geometry.shapes.some(s => s.role === 'body'));
      assert.ok(geometry.shapes.some(s => s.role === 'detail'));
      for (const shape of geometry.shapes) {
        assert.match(shape.fill, /^(#[0-9a-f]{6}|none)$/i, 'only locally defined solid fills');
        if (shape.stroke) assert.match(shape.stroke, /^#[0-9a-f]{6}$/i);
        if (shape.strokeWidth !== undefined) assert.ok(shape.strokeWidth >= 0 && Number.isFinite(shape.strokeWidth));
        if (shape.opacity !== undefined) assert.ok(shape.opacity >= 0 && shape.opacity <= 1);
        assert.ok(['body', 'accent', 'detail'].includes(shape.role ?? ''));
      }
    }
    signatures.add(JSON.stringify(getLayerGeometry(id, index, false).shapes));
  }
  assert.equal(signatures.size, 24, 'no placeholder assets reused as entire layers');
});

test('every shape and anchor fits the 760 × 680 viewBox at 0, 45 and 100', () => {
  for (const id of ids) for (const index of indices) for (const swapped of [false, true]) {
    const g = getLayerGeometry(id, index, swapped);
    for (const explosion of [0, 45, 100]) {
      const t = layerTransform(index, explosion, id);
      const left = t.x + g.bounds.x * t.scale;
      const top = t.y + g.bounds.y * t.scale;
      const right = left + g.bounds.width * t.scale;
      const bottom = top + g.bounds.height * t.scale;
      assert.ok(left >= 16 && right <= 744 && top >= 16 && bottom <= 664, `${id}/${index} at ${explosion}: ${left},${top},${right},${bottom}`);
    }
  }
});

test('fully exploded silhouettes have clear vertical separation', () => {
  for (const id of ids) for (const swapped of [false, true]) {
    let bottom = -Infinity;
    for (const index of indices) {
      const g = getLayerGeometry(id, index, swapped);
      const t = layerTransform(index, 100, id);
      const top = t.y + g.bounds.y * t.scale;
      assert.ok(top - bottom >= 4, `${id}/${index} overlaps the previous layer`);
      bottom = t.y + (g.bounds.y + g.bounds.height) * t.scale;
    }
  }
});

test('swaps visibly change each asset and introduce a green material or accent', () => {
  for (const id of ids) for (const index of indices) {
    const baseline = getLayerGeometry(id, index, false);
    const swapped = getLayerGeometry(id, index, true);
    assert.notDeepEqual(swapped.shapes, baseline.shapes);
    assert.ok(swapped.shapes.some(s => /^#(?:10b981|047857|065f46)$/i.test(s.fill)), `${id}/${index} green swap cue`);
  }
});

test('coffee assembly aligns the lid with the cup rim and locates contents inside the cup', () => {
  const lid = layerTransform(0, 0, 'coffee');
  const liquid = layerTransform(1, 0, 'coffee');
  const ice = layerTransform(2, 0, 'coffee');
  const cup = layerTransform(3, 0, 'coffee');
  const lidGeometry = getLayerGeometry('coffee', 0, false);
  const cupGeometry = getLayerGeometry('coffee', 3, false);
  const body = cupGeometry.bounds;
  // The first oval in each asset starts at the leftmost point of its rim.
  // Compare actual rim centers, not the enclosing control-hull bounds.
  const lidRimY = pathPoints(lidGeometry.shapes[1].d)[0][1];
  const cupRimY = pathPoints(cupGeometry.shapes[1].d)[0][1];
  close(lid.y + lidRimY * lid.scale, cup.y + cupRimY * cup.scale);
  assert.ok(liquid.y > lid.y && liquid.y < cup.y);
  assert.ok(ice.y > lid.y && ice.y < cup.y);
  assert.ok(body.height > 100, 'cup is a tall vessel, not another disk');
});

test('tiny specimen silhouettes are distinct valid path-only icons', () => {
  const silhouettes = ids.map(getSpecimenSilhouette);
  assert.equal(new Set(silhouettes).size, 4);
  for (const d of silhouettes) pathPoints(d);
});

test('invalid ids and layer indices fail explicitly instead of returning a mismatched asset', () => {
  for (const index of [-1, 6, 1.5, NaN, Infinity]) {
    assert.throws(() => layerTransform(index, 45, 'coffee'), RangeError);
    assert.throws(() => getLayerGeometry('coffee', index, false), RangeError);
  }
  for (const id of ['unknown', '__proto__', 'constructor'] as unknown as SpecimenId[]) {
    assert.throws(() => layerTransform(0, 45, id), RangeError);
    assert.throws(() => getLayerGeometry(id, 0, false), RangeError);
    assert.throws(() => getSpecimenSilhouette(id), RangeError);
  }
});

test('returned geometry is deterministic and safe for renderer-local recoloring', () => {
  const first = getLayerGeometry('ai', 1, false);
  const pristine = getLayerGeometry('ai', 1, false);
  assert.deepEqual(first, pristine);
  first.shapes[0].fill = '#ffffff';
  first.anchor[0] = -999;
  first.bounds.width = 1;
  assert.deepEqual(getLayerGeometry('ai', 1, false), pristine);
});
