import type { SpecimenId } from '../domain/types';
import type { LayerGeometry, Shape } from './geometry';

const C = {
  titanium: '#F4F4F0', white: '#FFFFFF', graphite: '#18181B', ink: '#3F4144',
  edge: '#777E80', silver: '#C7CDCB', shadow: '#919B99', pale: '#E3E8E4',
  orange: '#FF5722', green: '#10B981', forest: '#047857', darkGreen: '#065F46',
  amber: '#A75D2A', coffee: '#593B26', cream: '#E1BA80', kraft: '#C3A77D',
};
type Point = [number, number];
const n = (value: number) => Number(value.toFixed(3));
const paint = (swapped: boolean) => swapped ? C.green : C.orange;
const path = (d: string, fill: string, role: Shape['role'] = 'body', stroke?: string, strokeWidth = 0.8, opacity?: number): Shape => ({
  d, fill, role, ...(stroke ? { stroke, strokeWidth } : {}), ...(opacity === undefined ? {} : { opacity }),
});
const poly = (points: Point[], fill: string, role: Shape['role'] = 'body', stroke?: string): Shape =>
  path(`M ${points.map(([x, y]) => `${n(x)} ${n(y)}`).join(' L ')} Z`, fill, role, stroke);
const line = (d: string, stroke = C.edge, width = 0.8, opacity = 1): Shape => path(d, 'none', 'detail', stroke, width, opacity);
const rect = (x: number, y: number, w: number, h: number, fill: string, role: Shape['role'] = 'detail', stroke?: string): Shape =>
  poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], fill, role, stroke);
function oval(x: number, y: number, rx: number, ry: number, fill: string, role: Shape['role'] = 'detail', stroke?: string): Shape {
  const a = rx * 0.55228475, b = ry * 0.55228475;
  return path(`M ${n(x - rx)} ${n(y)} C ${n(x - rx)} ${n(y - b)} ${n(x - a)} ${n(y - ry)} ${n(x)} ${n(y - ry)} C ${n(x + a)} ${n(y - ry)} ${n(x + rx)} ${n(y - b)} ${n(x + rx)} ${n(y)} C ${n(x + rx)} ${n(y + b)} ${n(x + a)} ${n(y + ry)} ${n(x)} ${n(y + ry)} C ${n(x - a)} ${n(y + ry)} ${n(x - rx)} ${n(y + b)} ${n(x - rx)} ${n(y)} Z`, fill, role, stroke);
}

/** Three solid faces, not an SVG transform: Canvas gets identical geometry. */
function slab(top: Point[], thickness: number, fill = C.titanium, side = C.shadow): Shape[] {
  const [a, , c, d] = top;
  return [
    poly([a, d, [d[0], d[1] + thickness], [a[0], a[1] + thickness]], side, 'body', C.edge),
    poly([d, c, [c[0], c[1] + thickness], [d[0], d[1] + thickness]], C.ink, 'detail', C.edge),
    poly(top, fill, 'body', C.edge),
    line(`M ${a[0]} ${a[1]} L ${d[0]} ${d[1]} L ${c[0]} ${c[1]}`, C.white, 0.8),
  ];
}

/** Process/driver layers use an identifiable machined specimen carrier. */
function tray(swapped: boolean): Shape[] {
  const shapes = slab([[-108, -2], [-27, -23], [108, 2], [27, 23]], 7);
  shapes.push(
    poly([[-98, -2], [-27, -20], [97, 2], [27, 20]], C.pale, 'detail', C.silver),
    poly([[-91, 5], [-70, 9], [-70, 13], [-91, 9]], paint(swapped), 'accent'),
    line('M 34 26 L 47 23 M 52 21 L 65 18 M 70 17 L 83 14', C.silver, 1.4),
  );
  for (const [x, y] of [[-91, -1], [-26, -17], [91, 2], [26, 17]]) {
    shapes.push(oval(x, y, 2.3, 1, C.ink), line(`M ${x - 1} ${y} L ${x + 1} ${y}`, C.white, 0.5));
  }
  return shapes;
}

/** Conservative Bezier control-hull bounds, including strokes and callout. */
function geometry(shapes: Shape[], anchor: Point): LayerGeometry {
  let minX = anchor[0], maxX = anchor[0], minY = anchor[1], maxY = anchor[1];
  for (const shape of shapes) {
    const values = (shape.d.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)/g) ?? []).map(Number);
    const pad = (shape.strokeWidth ?? 0) / 2 + 0.25;
    for (let i = 0; i < values.length; i += 2) {
      minX = Math.min(minX, values[i] - pad); maxX = Math.max(maxX, values[i] + pad);
      minY = Math.min(minY, values[i + 1] - pad); maxY = Math.max(maxY, values[i + 1] + pad);
    }
  }
  return { shapes, anchor, bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY } };
}

function coffeeLid(swapped: boolean): LayerGeometry {
  const s: Shape[] = [
    path('M -80 -2 C -80 19 80 19 80 -2 L 80 6 C 80 28 -80 28 -80 6 Z', swapped ? C.forest : C.silver, 'body', C.edge),
    oval(0, -2, 80, 20, swapped ? C.green : C.titanium, 'body', C.edge),
    oval(0, -3, 70, 15, swapped ? '#A7E5CC' : C.pale, 'body', C.silver),
    line('M -63 3 C -39 15 40 15 65 3', C.white, 1.5),
    oval(25, -6, 10, 3.5, C.ink),
    path('M 21 -7 L 32 -58 L 51 -64 L 53 -58 L 38 -53 L 28 -6 Z', swapped ? C.darkGreen : C.graphite, 'body', C.ink),
    line('M 25 -10 L 35 -55 L 49 -60', swapped ? C.green : C.shadow, 1.4),
    oval(51, -61, 3, 2, C.ink),
    path('M -18 -5 L -8 -7 L -5 -4 L -15 -2 Z', paint(swapped), 'accent'),
  ];
  for (let i = 0; i < 9; i++) {
    const x = -60 + i * 15;
    const y = 12 + 7 * (1 - (x / 75) ** 2);
    s.push(line(`M ${x} ${n(y)} L ${x} ${n(y + 3)}`, C.edge, 0.7));
  }
  return geometry(s, [75, 7]);
}

function coffeeLiquid(swapped: boolean): LayerGeometry {
  const s: Shape[] = [
    path('M -69 -2 C -69 15 69 15 69 -2 L 67 10 C 45 28 -45 28 -67 10 Z', C.coffee, 'body', '#6D4A30'),
    oval(0, -2, 69, 17, C.amber, 'body', C.coffee),
    oval(-3, -4, 61, 12, '#BA7336', 'body'),
    path('M -52 -3 C -37 -13 12 -13 34 -7 C 10 -10 -17 -7 -29 -1 C -39 3 -49 3 -52 -3 Z', C.cream, 'detail', undefined, 0, 0.7),
    line('M -44 3 C -20 10 25 8 46 1', '#E5C496', 1),
    path('M 21 -11 C 17 -23 40 -25 47 -16 C 56 -7 34 1 21 -11 Z', C.coffee, 'body', '#3F2A1E'),
    path('M 34 -21 C 26 -13 43 -12 36 -5', 'none', 'detail', C.cream, 1.1),
    poly([[-62, 4], [-52, 7], [-52, 11], [-62, 8]], paint(swapped), 'accent'),
  ];
  for (const [x, y, r] of [[-38, -6, 2], [-31, -8, 1.2], [-23, -8, 1.5], [12, 7, 1.1], [48, -1, 1.6]]) s.push(oval(x, y, r, r * 0.5, C.cream));
  return geometry(s, [64, 9]);
}

function iceCube(x: number, y: number, swapped: boolean): Shape[] {
  return [
    poly([[x - 20, y - 4], [x + 2, y - 12], [x + 22, y - 3], [x, y + 5]], swapped ? '#D1FAE5' : '#EFF5F2', 'body', '#A6BCB5'),
    poly([[x - 20, y - 4], [x, y + 5], [x, y + 22], [x - 18, y + 13]], '#C2D7D0', 'body', '#A6BCB5'),
    poly([[x, y + 5], [x + 22, y - 3], [x + 19, y + 14], [x, y + 22]], swapped ? '#8BCDB3' : '#A3BEB4', 'body', '#8EA99F'),
    line(`M ${x - 14} ${y - 3} L ${x + 1} ${y - 8} L ${x + 14} ${y - 3}`, C.white, 1.5),
    line(`M ${x - 15} ${y + 2} L ${x - 13} ${y + 10} L ${x - 6} ${y + 13}`, C.white, 1.2),
    line(`M ${x + 6} ${y + 6} L ${x + 15} ${y + 3} L ${x + 13} ${y + 11}`, '#E8F3EE', 0.8),
  ];
}
function coffeeIce(swapped: boolean): LayerGeometry {
  const s = [
    ...iceCube(-28, -13, swapped), ...iceCube(19, -14, swapped), ...iceCube(-3, 2, swapped),
    oval(-54, 15, 7, 2, '#B4CBC2'), oval(53, 10, 5, 1.6, '#B4CBC2'),
    poly([[37, 15], [44, 12], [48, 16], [41, 20]], paint(swapped), 'accent'),
  ];
  return geometry(s, [40, 11]);
}

function coffeeCup(swapped: boolean): LayerGeometry {
  const s: Shape[] = [
    // Transparent walls remain separate from the opaque paper sleeve. In the
    // assembled SVG, previously painted liquid/ice are visible through this face.
    path('M -74 -64 C -70 -86 70 -86 74 -64 L 54 50 C 43 69 -43 69 -54 50 Z', swapped ? '#B9E5D3' : '#D6E2DC', 'body', C.edge, 1, 0.24),
    oval(0, -64, 74, 17, 'none', 'detail', C.edge),
    line('M -69 -62 L -50 49 C -35 63 36 63 50 49 L 69 -62', '#AABEB4', 1),
    line('M -61 -48 L -49 25 M -58 -48 L -54 -24', C.white, 3, 0.9),
    line('M 61 -46 L 55 -12 M 49 39 L 46 49', C.white, 1.5),
    path('M -65 -7 C -32 5 32 5 65 -7 L 59 28 C 31 44 -31 44 -59 28 Z', swapped ? C.forest : C.kraft, 'body', swapped ? C.darkGreen : '#A58B64'),
    path('M -65 -7 C -33 7 33 7 65 -7 L 64 -1 C 30 12 -30 12 -64 -1 Z', swapped ? C.green : '#DAC39D', 'detail'),
    path('M 38 1 L 34 35 C 44 33 51 30 59 28 L 65 -7 Z', swapped ? '#036747' : '#AA8A5C', 'detail'),
    oval(0, 19, 15, 13, swapped ? C.green : C.titanium, 'accent'),
    path('M -4 12 C 6 8 12 18 3 24 C -7 29 -12 18 -4 12 Z', swapped ? C.darkGreen : C.coffee, 'detail'),
    line('M 1 12 C -5 20 6 19 0 26', C.cream, 1.2),
    line('M -50 45 C -28 56 29 56 50 45', C.silver, 0.8),
  ];
  for (let i = 0; i < 9; i++) {
    const x = -47 + i * 9;
    s.push(line(`M ${x} 9 L ${x + 2} 30`, swapped ? '#319F7D' : '#B69B73', 0.6, 0.8));
  }
  return geometry(s, [61, 13]);
}

function carryBag(swapped: boolean, wide: boolean): LayerGeometry {
  const w = wide ? 88 : 72;
  const s: Shape[] = [
    path(`M ${-w} -10 L -12 -24 L ${w} -9 L 65 18 L -1 29 L ${-w + 7} 12 Z`, swapped ? '#BFD5C7' : '#D8C7AA', 'body', '#9B9D8D'),
    poly([[-w, -10], [-8, 4], [-1, 29], [-w + 7, 12]], swapped ? '#83AF98' : '#BEA780', 'body', '#8F9786'),
    poly([[-8, 4], [w, -9], [65, 18], [-1, 29]], swapped ? C.forest : '#CDB591', 'body', '#8F9786'),
    poly([[-w, -10], [-12, -24], [w, -9], [-8, 4]], swapped ? '#DCEAE1' : '#ECDFCB', 'body', '#A6AE9F'),
    path('M -27 -14 C -30 -34 9 -35 13 -19 L 8 -18 C 4 -29 -22 -28 -22 -13 Z', swapped ? C.darkGreen : '#967B54', 'detail'),
    path('M 3 -10 C 0 -30 39 -30 43 -14 L 38 -13 C 34 -24 8 -24 8 -9 Z', swapped ? C.green : '#B19972', 'accent'),
    line(`M ${-w + 6} -7 L -17 6 L -9 24 M -12 6 L -6 21 M 69 -4 L 56 15 L 7 23`, swapped ? '#CAE2D3' : '#A48F6E', 0.8),
    poly([[20, 4], [45, 0], [41, 13], [17, 17]], swapped ? C.green : C.titanium, 'accent'),
    line('M 24 8 L 38 6 M 23 11 L 33 9', swapped ? C.darkGreen : C.edge, 0.7),
  ];
  return geometry(s, [65, 12]);
}

/** Bake a miniature's placement into the path, including its stroke scale. */
function placed(shapes: Shape[], x: number, y: number, scale: number): Shape[] {
  return shapes.map(shape => {
    let coordinate = 0;
    const d = shape.d.replace(/[-+]?(?:\d*\.\d+|\d+\.?\d*)/g, value =>
      String(n(Number(value) * scale + (coordinate++ % 2 === 0 ? x : y))));
    return { ...shape, d, ...(shape.strokeWidth === undefined ? {} : { strokeWidth: shape.strokeWidth * scale }) };
  });
}

function deliveryIcon(swapped: boolean): Shape[] {
  const a = paint(swapped), x = 0;
  return [
    poly([[x - 45, -24], [x - 15, -29], [x + 5, -24], [x - 25, -18]], C.titanium, 'body', C.edge),
    poly([[x - 45, -24], [x - 25, -18], [x - 25, -1], [x - 45, -7]], C.silver, 'body', C.edge),
    poly([[x - 25, -18], [x + 5, -24], [x + 5, -7], [x - 25, -1]], a, 'accent', C.edge),
    path(`M ${x + 7} -6 L ${x + 26} -10 L ${x + 33} -24 L ${x + 40} -24 M ${x + 31} -19 L ${x + 39} -19`, 'none', 'detail', C.ink, 2.3),
    path(`M ${x - 18} -1 L ${x + 24} -1 L ${x + 33} -9 L ${x + 25} -13 L ${x + 11} -9`, 'none', 'detail', C.ink, 2.5),
    oval(x - 20, 0, 7, 6, C.graphite), oval(x + 29, 0, 7, 6, C.graphite),
    oval(x - 20, 0, 3, 2.5, C.silver), oval(x + 29, 0, 3, 2.5, C.silver),
    line(`M ${x - 33} -21 L ${x - 4} -26 M ${x - 12} -17 L ${x - 12} -12`, C.white, 1),
  ];
}
function coffeeDelivery(swapped: boolean): LayerGeometry {
  const s = tray(swapped);
  s.push(...deliveryIcon(swapped), line('M -80 -7 L -57 -3 M -73 -13 L -54 -9', C.shadow, 1.2),
    poly([[57, -7], [72, -4], [58, 1], [58, -2], [47, -4], [49, -7], [59, -5]], paint(swapped), 'accent'));
  return geometry(s, [101, 7]);
}

function mealUtensils(swapped: boolean): LayerGeometry {
  const s = slab([[-83, -9], [-28, -25], [79, -4], [25, 17]], 3, C.titanium, C.silver);
  s.push(
    poly([[-83, -9], [-6, 6], [25, 17], [-40, 4]], '#E6E6DF', 'detail'),
    line('M -69 -10 L -4 3 L 20 12 M -59 -14 L 52 7', '#C1C4BA', 0.8),
    path('M -54 -23 L -42 -19 L -43 -14 L -36 -13 L -35 -18 L -30 -17 L -31 -12 L -24 -11 L -23 -16 L -17 -15 L -20 -4 L -28 -2 L 42 12 C 48 14 45 20 39 18 L -31 1 L -40 1 L -54 -5 Z', swapped ? C.kraft : C.silver, 'body', C.edge),
    path('M -11 -27 C 13 -26 32 -19 41 -13 L 24 -9 L 74 3 C 82 5 79 11 73 10 L -8 -9 Z', swapped ? '#C8B38D' : '#D7DCDA', 'body', C.edge),
    line('M -7 -23 C 11 -22 27 -17 33 -14 M 28 -5 L 73 6', C.white, 1.3),
    poly([[2, -7], [18, -4], [14, 5], [-2, 1]], paint(swapped), 'accent'),
    line('M -38 -13 L -36 -5 L 40 14', swapped ? '#8E7750' : C.white, 1),
  );
  return geometry(s, [77, 6]);
}

function mealTrays(swapped: boolean): LayerGeometry {
  const s: Shape[] = [];
  for (const y of [8, 0, -8]) {
    const top: Point[] = [[-98, y - 1], [-28, y - 22], [99, y + 1], [28, y + 22]];
    s.push(...slab(top, 5, swapped ? '#D0E6DA' : '#E5E6E0', swapped ? C.forest : '#979D98'));
    s.push(poly([[-85, y - 1], [-27, y - 17], [84, y + 1], [27, y + 17]], swapped ? '#90BAA2' : '#B6BCB5', 'body', C.edge));
    s.push(poly([[-69, y], [-22, y - 12], [65, y + 1], [23, y + 12]], swapped ? '#DDEDE3' : C.titanium, 'body'));
    s.push(line(`M -59 ${y + 1} L -20 ${y - 9} L 55 ${y + 2}`, C.white, 1.3));
  }
  s.push(poly([[46, 16], [63, 11], [63, 15], [46, 20]], paint(swapped), 'accent'));
  for (let i = 0; i < 5; i++) s.push(line(`M ${-57 + i * 13} ${12 + i * 2.4} L ${-55 + i * 13} ${15 + i * 2.4}`, C.edge, 0.7));
  return geometry(s, [94, 7]);
}

function mealMeat(swapped: boolean): LayerGeometry {
  const s = slab([[-93, -2], [-29, -23], [94, 0], [28, 24]], 4, '#D5B28C', '#9C7B58');
  s.push(poly([[-84, -2], [-27, -18], [82, 1], [26, 19]], swapped ? '#998551' : '#A8512C', 'body'));
  if (swapped) {
    for (const [x, y] of [[-43, -9], [-9, -5], [24, 2]]) {
      s.push(...slab([[x - 15, y], [x, y - 8], [x + 27, y - 2], [x + 12, y + 7]], 5, '#F0E4BB', '#BDAE7A'));
      s.push(line(`M ${x - 7} ${y} L ${x + 11} ${y + 4} M ${x + 2} ${y - 4} L ${x + 21} ${y}`, '#CFC190', 0.7));
    }
  } else {
    s.push(
      path('M -61 -9 C -44 -23 -23 -16 -8 -12 C 6 -7 16 -9 24 -1 C 28 10 5 15 -10 11 C -31 6 -50 10 -63 1 C -69 -3 -69 -7 -61 -9 Z', '#7B3530', 'body', '#65332B'),
      path('M -60 -12 C -45 -24 -23 -19 -7 -15 C 6 -10 16 -12 24 -4 C 28 6 5 10 -10 7 C -31 2 -50 6 -63 -3 C -68 -7 -66 -10 -60 -12 Z', '#B85E50', 'body', '#D4987F'),
      path('M -52 -13 C -37 -19 -26 -11 -16 -12 C -10 -9 -6 -4 5 -5 M -48 -5 C -34 -10 -31 0 -20 0 M -24 -15 L -28 -6 L -17 3 M 1 -9 L 0 -2 L 13 2', 'none', 'detail', '#F0C8AB', 1.3),
      path('M 31 -5 C 43 -11 69 -4 71 3 C 69 13 45 15 33 8 C 27 4 25 -2 31 -5 Z', '#9D4940', 'body', '#D4987F'),
      line('M 34 0 C 43 -4 58 1 64 4 M 43 -4 L 44 6 L 53 9', '#E3B299', 1.2),
    );
  }
  s.push(path('M 57 -11 C 69 -22 80 -15 79 -11 C 68 -8 65 -4 57 -11 Z', paint(swapped), 'accent'),
    line('M 61 -11 L 75 -15', '#E8D6AB', 0.8), oval(-65, 8, 4, 1.5, '#E8C899'), oval(52, 16, 4, 1.2, '#E8C899'));
  return geometry(s, [87, 6]);
}

function mealVegetables(swapped: boolean): LayerGeometry {
  const s: Shape[] = [
    path('M -76 -1 C -79 -14 -61 -25 -45 -17 C -30 -31 -6 -20 -11 -6 C 5 -13 14 0 6 10 C -19 23 -55 18 -76 -1 Z', swapped ? C.forest : '#517A4C', 'body', '#3E6340'),
    path('M -64 -2 C -62 -20 -43 -10 -40 -4 C -36 -19 -17 -15 -19 -2 C -6 -11 8 1 -4 8 C -26 15 -51 9 -64 -2 Z', swapped ? '#48A878' : '#86A46B', 'body'),
    line('M -63 -6 L -15 10 M -48 -12 L -44 0 L -51 3 M -25 -8 L -30 4', '#C0CE8E', 1),
    path('M 15 -7 L 21 -4 L 17 14 C 10 20 0 17 6 11 Z', '#E6D9BD', 'body', '#A99B80'),
    path('M -1 -6 C -1 -27 39 -27 40 -8 C 25 0 11 2 -1 -6 Z', '#90745A', 'body', '#665640'),
    path('M 0 -7 C 10 -12 31 -13 40 -8 C 29 4 10 4 0 -7 Z', '#C7B899', 'detail', '#9A896E'),
    line('M 7 -5 L 18 -4 M 14 -8 L 20 -5 M 29 -8 L 23 -5 M 33 -5 L 25 -3', '#8F7C62', 0.7),
    path('M 50 2 L 57 3 L 59 17 L 48 20 Z', '#DCD2B8', 'body', '#A99B80'),
    path('M 33 1 C 35 -17 76 -13 77 4 C 65 13 45 10 33 1 Z', '#B99A74', 'body', '#8B7154'),
    line('M 41 0 C 50 -6 66 -4 70 1', '#E7D9B9', 1.2),
    poly([[-14, 16], [9, 9], [20, 13], [-2, 22]], paint(swapped), 'accent'),
    poly([[27, 18], [45, 13], [53, 18], [36, 24]], swapped ? C.green : '#E9A749', 'accent'),
    line('M -9 17 L 9 12 M 33 18 L 45 15', '#F5D699', 0.8),
  ];
  return geometry(s, [72, 4]);
}

function mealCooking(swapped: boolean): LayerGeometry {
  const s = tray(swapped);
  s.push(...slab([[-66, -10], [-36, -19], [19, -8], [-12, 3]], 6, C.graphite, C.ink),
    oval(-22, -8, 28, 8, '#5D6461'), oval(-22, -8, 21, 6, paint(swapped), 'accent'),
    path('M -48 -17 C -46 -6 2 -4 5 -15 L 2 -7 C -7 2 -39 -2 -46 -8 Z', C.silver, 'body', C.edge),
    oval(-22, -17, 27, 8, C.titanium, 'body', C.edge), oval(-22, -17, 21, 5, '#AFB7B2'),
    path('M 2 -17 L 31 -22 L 34 -18 L 5 -12 Z', C.graphite, 'body'),
    line('M -34 -24 C -40 -29 -28 -29 -32 -34 M -17 -25 C -23 -30 -12 -30 -16 -35', C.shadow, 1),
    ...placed(deliveryIcon(swapped), 48, 7, 0.55),
  );
  return geometry(s, [101, 7]);
}

function shirtCotton(swapped: boolean): LayerGeometry {
  const s: Shape[] = [
    path('M -69 17 C -28 6 9 -9 60 -13 M -21 1 L -39 -19 M 13 -7 L 22 -24 M 37 -12 L 64 6', 'none', 'detail', '#8E8868', 3),
    path('M -59 12 C -68 -3 -50 -7 -41 4 Z M -12 -2 C -14 -22 2 -21 5 -10 Z M 38 -11 C 46 -28 62 -19 53 -14 Z', swapped ? C.forest : '#788169', 'body'),
  ];
  for (const [x, y] of [[-45, -9], [-12, -7], [22, -19], [58, -2]]) {
    s.push(
      path(`M ${x - 19} ${y + 1} C ${x - 28} ${y - 12} ${x - 13} ${y - 18} ${x - 6} ${y - 13} C ${x + 1} ${y - 24} ${x + 17} ${y - 17} ${x + 15} ${y - 8} C ${x + 31} ${y - 7} ${x + 25} ${y + 10} ${x + 13} ${y + 9} C ${x + 5} ${y + 20} ${x - 11} ${y + 14} ${x - 12} ${y + 9} C ${x - 21} ${y + 12} ${x - 26} ${y + 5} ${x - 19} ${y + 1} Z`, C.titanium, 'body', '#B8BDB1'),
      path(`M ${x - 11} ${y + 1} C ${x - 3} ${y - 1} ${x - 4} ${y - 9} ${x - 2} ${y - 12} M ${x + 3} ${y + 6} C ${x + 11} ${y + 1} ${x + 14} ${y - 2} ${x + 13} ${y - 6}`, 'none', 'detail', '#D3D8CD', 0.9),
      poly([[x - 8, y + 9], [x, y + 5], [x + 12, y + 9], [x + 1, y + 15]], swapped ? C.green : '#9A9E7E', 'accent'),
    );
  }
  return geometry(s, [77, 7]);
}

function shirtTextile(swapped: boolean): LayerGeometry {
  const s = tray(swapped);
  s.push(...slab([[-69, -13], [-26, -25], [30, -14], [-13, 0]], 3, '#E6E0CC', '#B7AE90'),
    ...slab([[-58, -4], [-18, -16], [41, -4], [0, 10]], 3, swapped ? '#A7D5B8' : '#899A9C', swapped ? C.forest : '#607A7E'),
    ...slab([[-44, 6], [-5, -7], [54, 4], [15, 17]], 3, swapped ? C.forest : '#344F55', swapped ? C.darkGreen : '#263C41'));
  for (let i = 0; i < 7; i++) {
    s.push(line(`M ${-36 + i * 8} ${5 + i * 1.5} L ${-4 + i * 7} ${-4 + i * 1.4}`, swapped ? '#6EAE8F' : '#678487', 0.65));
  }
  s.push(path('M 70 -28 C 61 -17 58 -15 58 -10 C 58 2 80 3 81 -8 C 82 -15 76 -20 70 -28 Z', paint(swapped), 'accent', swapped ? C.darkGreen : '#BA4827'),
    line('M 65 -14 C 62 -7 65 -3 70 -3', '#F4F4F0', 1.2));
  return geometry(s, [100, 7]);
}

function shirtGarment(swapped: boolean): LayerGeometry {
  const outline = 'M -30 -31 L -59 -26 L -98 -5 L -67 13 L -49 4 L -48 23 C -17 37 24 38 61 20 L 56 -2 L 76 7 L 101 -14 L 53 -29 L 27 -33 C 19 -19 -15 -17 -30 -31 Z';
  const s: Shape[] = [
    path('M -30 -27 L -59 -22 L -98 -1 L -67 17 L -49 8 L -48 27 C -17 38 24 39 61 24 L 56 2 L 76 11 L 101 -10 L 53 -25 L 27 -29 C 19 -15 -15 -13 -30 -27 Z', swapped ? '#6D9A81' : '#B0B5A9', 'body', '#929C8C'),
    path(outline, swapped ? '#D9EADC' : C.titanium, 'body', '#909C8E'),
    path('M -30 -31 C -15 -17 19 -19 27 -33 L 19 -34 C 9 -26 -9 -25 -22 -33 Z', swapped ? C.forest : '#C2CCBD', 'body', '#879881'),
    path('M -53 -24 L -49 4 L -48 23 L -32 29 C -43 14 -34 -2 -53 -24 Z', swapped ? '#B3CDB8' : '#E0E4DA', 'detail'),
    path('M 41 -25 C 42 -10 28 7 34 28 L 61 20 L 56 -2 L 76 7 L 83 1 Z', swapped ? '#B5D4BD' : '#E2E7DB', 'detail'),
    line('M -89 -4 L -68 8 M 80 2 L 95 -12 M -44 20 C -15 32 24 33 56 18', '#A8B59F', 0.9),
    line('M -47 -19 C -34 -8 -39 3 -32 10 M 44 -17 C 37 -4 39 1 32 9 M -9 15 C 6 20 15 22 25 18', '#CAD2C3', 0.8),
    poly([[20, -12], [37, -9], [36, 2], [27, 5], [19, 0]], swapped ? C.green : '#E4E9DD', 'accent', '#B6C3AA'),
    line('M 21 -10 L 35 -7', swapped ? C.darkGreen : '#A8B59F', 0.8),
    poly([[-7, -25], [3, -25], [3, -20], [-7, -20]], paint(swapped), 'accent'),
  ];
  return geometry(s, [86, -5]);
}

function shirtLogistics(swapped: boolean): LayerGeometry {
  const s = tray(swapped);
  s.push(
    poly([[-54, -27], [-14, -34], [25, -26], [-17, -17]], '#D3B991', 'body', '#9F8864'),
    poly([[-54, -27], [-17, -17], [-17, 9], [-54, -2]], '#A98D65', 'body', '#8F7959'),
    poly([[-17, -17], [25, -26], [25, 0], [-17, 9]], swapped ? '#81B59B' : '#C4A67C', 'body', '#8F7959'),
    poly([[-37, -30], [4, -22], [4, -9], [-5, -7], [-5, -20], [-45, -28]], paint(swapped), 'accent'),
    poly([[-10, -9], [15, -15], [15, -5], [-10, 1]], C.titanium, 'detail'),
    line('M -6 -5 L -6 -1 M -2 -6 L -2 -2 M 2 -7 L 2 -3 M 6 -8 L 6 -4 M 11 -9 L 11 -5', C.ink, 1),
    line('M -71 5 L -50 10 L -37 6 M 36 4 L 61 -2 L 73 0', C.edge, 1.2),
    poly([[70, -4], [80, 0], [68, 4]], paint(swapped), 'accent'),
    oval(46, -14, 12, 6, C.silver, 'detail', C.edge),
    line('M 35 -14 L 57 -14 M 46 -20 C 40 -17 40 -11 46 -8 C 52 -11 52 -17 46 -20', C.ink, 0.7),
  );
  return geometry(s, [102, 7]);
}

function shirtPackaging(swapped: boolean): LayerGeometry {
  const s = slab([[-92, -4], [-31, -24], [88, -2], [26, 23]], 3, swapped ? '#D0E2D2' : '#E1DDD0', '#B1B5A4');
  s.push(
    poly([[-92, -4], [-8, 10], [88, -2], [-31, -24]], swapped ? '#DFEEE1' : '#EEECE2', 'body', '#ABB5A1'),
    line('M -90 -4 L -8 14 L 86 -1 M -8 14 L 25 22', '#A2AD98', 1),
    path('M -20 -12 C -29 -23 7 -28 23 -15 C 31 -9 18 0 8 -4 C -1 -8 7 -16 15 -14', 'none', 'detail', '#8F967C', 1.2),
    poly([[12, -17], [32, -20], [74, -9], [59, 11], [12, 1], [4, -9]], swapped ? C.forest : C.kraft, 'body', '#8F967C'),
    oval(16, -10, 3, 2, C.titanium),
    poly([[32, -10], [60, -4], [55, 4], [27, -2]], swapped ? C.green : C.titanium, 'accent'),
    line('M 34 -7 L 34 -3 M 38 -6 L 38 -2 M 42 -5 L 42 -1 M 47 -4 L 47 0 M 51 -3 L 51 1', swapped ? C.darkGreen : C.ink, 1),
    line('M -58 -5 L -29 1 M -54 -9 L -41 -6', '#B5BEAB', 0.8),
  );
  return geometry(s, [83, 2]);
}

function shirtLaundry(swapped: boolean): LayerGeometry {
  const s = tray(swapped);
  s.push(
    poly([[-45, -30], [-3, -34], [17, -27], [-24, -23]], C.titanium, 'body', C.edge),
    poly([[-45, -30], [-24, -23], [-24, 16], [-45, 9]], C.silver, 'body', C.edge),
    poly([[-24, -23], [17, -27], [17, 10], [-24, 16]], '#E8ECE5', 'body', C.edge),
    poly([[-24, -23], [17, -27], [17, -17], [-24, -13]], C.ink, 'detail'),
    oval(-3, -1, 14, 13, C.ink, 'body', '#ABB7AE'), oval(-3, -1, 10, 9.5, swapped ? C.forest : '#79968C', 'body'),
    path('M -11 1 C -5 -4 1 7 7 1 C 7 10 -12 11 -11 1 Z', swapped ? C.green : '#A5C5B5', 'accent'),
    line('M -9 -6 C -6 -10 -1 -10 3 -8', C.white, 1),
    rect(4, -23, 7, 3, paint(swapped), 'accent'),
    path('M 39 -8 C 34 -10 37 -15 42 -15 C 48 -15 49 -11 44 -8 L 64 4 C 68 8 66 10 61 10 L 29 4 C 24 3 24 0 28 -2 Z', 'none', 'detail', C.edge, 1.5),
    line('M 40 2 L 56 5 M -69 -7 L -54 -4 M -72 -2 L -58 1', C.shadow, 0.8),
  );
  return geometry(s, [100, 7]);
}

function circuitBoard(swapped: boolean, dark = false): Shape[] {
  const s = slab([[-103, -2], [-30, -25], [103, 0], [30, 25]], 4, dark ? '#344B43' : '#C8D5C8', '#6F8876');
  s.push(poly([[-94, -2], [-30, -21], [94, 0], [30, 21]], dark ? '#223B32' : '#DCE4D7', 'body'));
  for (const [x, y] of [[-89, -1], [-29, -18], [88, 0], [29, 19]]) {
    s.push(oval(x, y, 3, 1.7, '#B8BFA4'), oval(x, y, 1.5, 0.8, C.ink));
  }
  s.push(poly([[-74, 7], [-43, 13], [-43, 17], [-74, 11]], paint(swapped), 'accent'));
  return s;
}

function aiNetwork(swapped: boolean): LayerGeometry {
  const s = circuitBoard(swapped);
  s.push(...slab([[-63, -12], [-31, -21], [5, -14], [-27, -4]], 3, C.titanium, C.shadow),
    path('M -53 -12 L -46 -9 L -53 -7 M -39 -7 L -27 -5', 'none', 'detail', C.ink, 1.5),
    line('M -2 -12 L 22 -8 L 42 -17 M 22 -8 L 49 0 M 22 -8 L 8 7 L 44 13 M 8 7 L -18 13 M 49 0 L 69 5', swapped ? C.forest : '#6D8175', 1.2),
    poly([[10, -11], [22, -15], [34, -11], [23, -5]], C.graphite, 'body', C.edge));
  for (const [x, y] of [[42, -17], [49, 0], [44, 13], [-18, 13], [69, 5]]) {
    s.push(oval(x, y, 5, 2.7, paint(swapped), 'accent'), oval(x, y - 0.5, 2, 1, C.titanium));
  }
  s.push(line('M -76 -3 L -62 0 L -48 -4 M -36 8 L -23 5 L -10 8', '#93A98F', 0.8));
  return geometry(s, [96, 4]);
}

function aiGPU(swapped: boolean): LayerGeometry {
  const s = circuitBoard(swapped, true);
  s.push(
    line('M -82 -4 L -64 -9 L -46 -5 M -70 1 L -56 -3 L -36 1 M 42 10 L 62 6 L 77 8 M 42 3 L 66 -4 L 78 -2', '#7FA180', 0.8),
    ...slab([[-48, -9], [-10, -21], [57, -8], [18, 6]], 5, '#919E98', '#58665E'),
    ...slab([[-40, -13], [-7, -24], [49, -13], [16, -1]], 7, '#DFE3DC', '#A0ABA3'),
  );
  for (let i = 0; i < 11; i++) {
    const x = -36 + i * 5, y = -12 + i;
    s.push(poly([[x, y], [x + 27, y - 9], [x + 27, y - 17], [x, y - 8]], i % 2 ? '#ADB7B0' : '#D8DED6', 'body', '#8B9890'));
    s.push(line(`M ${x} ${y - 8} L ${x + 27} ${y - 17}`, C.white, 0.6));
  }
  for (const [x, y] of [[-70, -7], [-50, 5], [-28, 10], [68, -5], [56, 9]]) {
    s.push(poly([[x - 7, y], [x + 1, y - 3], [x + 11, y - 1], [x + 3, y + 3]], C.graphite, 'body', C.edge),
      line(`M ${x - 4} ${y + 2} L ${x - 4} ${y + 4} M ${x + 1} ${y + 3} L ${x + 1} ${y + 5}`, '#C8B580', 1));
  }
  for (let i = 0; i < 10; i++) s.push(poly([[36 + i * 4, 23 - i * 1.3], [38 + i * 4, 22.4 - i * 1.3], [38 + i * 4, 27 - i * 1.3], [36 + i * 4, 27.6 - i * 1.3]], '#C8AD6C', 'detail'));
  s.push(poly([[-99, -3], [-90, -5], [-90, 10], [-99, 8]], C.silver, 'body', C.edge));
  return geometry(s, [96, 2]);
}

function fan(x: number, y: number, swapped: boolean): Shape[] {
  const s = slab([[x - 31, y - 3], [x - 6, y - 14], [x + 34, y - 6], [x + 8, y + 9]], 7, C.ink, C.graphite);
  s.push(oval(x + 2, y - 3, 24, 11, '#101D18', 'body', '#82958A'));
  // Flattened rotor blades built in local coordinates: no SVG-only rotations.
  for (let i = 0; i < 7; i++) {
    const a = i * Math.PI * 2 / 7;
    const p = (r: number, angle: number): Point => [n(x + 2 + Math.cos(angle) * r), n(y - 3 + Math.sin(angle) * r * 0.45)];
    const [a0, b, c, d] = [p(4, a), p(21, a + 0.15), p(22, a + 0.64), p(6, a + 1.1)];
    s.push(path(`M ${a0.join(' ')} Q ${b.join(' ')} ${c.join(' ')} Q ${d.join(' ')} ${a0.join(' ')} Z`, swapped ? '#7EA897' : '#8F9C94', 'body'));
  }
  s.push(oval(x + 2, y - 3, 5.5, 2.5, paint(swapped), 'accent'));
  for (const [dx, dy] of [[-24, -2], [-5, -11], [26, -6], [8, 6]]) s.push(oval(x + dx, y + dy, 1.5, 0.8, C.silver));
  return s;
}
function aiCooling(swapped: boolean): LayerGeometry {
  const s = tray(swapped);
  s.push(
    path('M -77 -2 L -77 -15 C -75 -27 -32 -29 -18 -22 L 53 -9 C 70 -6 80 -13 75 -21', 'none', 'detail', '#83968C', 6),
    path('M -77 -3 L -77 -15 C -75 -27 -32 -29 -18 -22 L 53 -9 C 70 -6 80 -13 75 -21', 'none', 'detail', swapped ? C.green : '#CFDBD1', 2.3),
    ...fan(-37, -6, swapped), ...fan(36, 4, swapped),
    poly([[70, -26], [79, -24], [79, -17], [70, -19]], C.silver, 'detail', C.edge),
    line('M 72 -25 L 72 -19 M 75 -24 L 75 -18', C.ink, 0.7),
  );
  return geometry(s, [101, 7]);
}

function aiPower(swapped: boolean): LayerGeometry {
  const s = circuitBoard(swapped);
  s.push(...slab([[-59, -9], [-29, -19], [11, -11], [-18, 0]], 9, C.ink, C.graphite));
  for (let i = 0; i < 8; i++) {
    const x = -52 + i * 5;
    s.push(path(`M ${x} -11 L ${x + 23} -18 L ${x + 23} -8 L ${x} -1 Z`, i % 2 ? '#C79E62' : '#AB7944', 'body', '#806544'));
  }
  s.push(poly([[38, -20], [24, -5], [38, -5], [29, 12], [57, -7], [42, -8], [51, -18]], paint(swapped), 'accent', swapped ? C.darkGreen : '#C14D28'),
    line('M -78 -4 L -66 -8 M -69 6 L -45 10 L -24 5 M 12 10 L 23 13 L 45 8 M 60 -6 L 76 -2 L 85 -5', '#77956F', 1));
  for (const [x, y] of [[-65, 4], [-52, 7], [64, 5]]) {
    s.push(rect(x - 4, y - 7, 8, 9, '#718D7A', 'body', C.edge), oval(x, y - 7, 4, 2, '#C3D0BC'), line(`M ${x - 2} ${y - 7} L ${x + 2} ${y - 7}`, C.ink, 0.7));
  }
  return geometry(s, [96, 4]);
}

function aiReuse(swapped: boolean): LayerGeometry {
  const s = circuitBoard(swapped, true);
  s.push(
    line('M -76 -4 L -54 -10 L -30 -6 M -70 4 L -51 -2 L -30 2 M 29 -11 L 50 -17 L 72 -12 M 29 -4 L 56 1 L 75 -5 M 12 10 L 25 14 L 48 7', '#83A684', 0.9),
    ...slab([[-31, -7], [-4, -16], [33, -9], [5, 1]], 4, '#596D5E', '#182E23'),
    poly([[-23, -8], [-4, -13], [25, -8], [5, -1]], C.graphite, 'body', '#A4B79A'),
    path('M -61 -10 C -45 -30 13 -33 48 -19 L 57 -22 L 54 -10 L 32 -13 L 40 -16 C 11 -26 -34 -24 -48 -9 Z', paint(swapped), 'accent'),
    path('M 63 2 C 48 22 -10 27 -43 13 L -53 17 L -50 5 L -28 8 L -37 11 C -7 20 37 17 49 1 Z', swapped ? '#89CFAD' : '#ABB9A3', 'body'),
    line('M -15 -8 L -6 -6 L 2 -10 M 3 -5 L 13 -7', C.silver, 1),
  );
  for (const [x, y] of [[-74, 0], [67, -8], [-16, 13]]) s.push(poly([[x - 4, y], [x + 3, y - 2], [x + 10, y], [x + 3, y + 2]], '#C1CFB6', 'detail'));
  return geometry(s, [96, 4]);
}

function aiChassis(swapped: boolean): LayerGeometry {
  const s = slab([[-106, -7], [-30, -30], [106, -5], [30, 23]], 12, '#CAD1CA', '#68766D');
  s.push(
    poly([[-92, -8], [-29, -26], [91, -5], [29, 17]], '#909E94', 'body', '#53685A'),
    poly([[-82, -7], [-27, -22], [80, -4], [28, 12]], '#B6C1B6', 'body'),
    line('M -80 -6 L 27 13 L 81 -3 M -27 -22 L -27 -17', C.white, 1),
    poly([[-95, 1], [-82, 4], [-82, 11], [-95, 8]], C.graphite, 'detail'),
    poly([[70, 11], [97, 1], [97, 9], [70, 19]], C.graphite, 'detail'),
    oval(59, 17, 3, 2, paint(swapped), 'accent'),
    line('M 58 14 L 58 17', C.white, 0.7),
  );
  for (let i = 0; i < 12; i++) {
    const x = -64 + i * 7, y = -9 + i * 1.3;
    s.push(poly([[x, y], [x + 23, y - 7], [x + 26, y - 6.5], [x + 3, y + 0.5]], '#607467', 'detail'));
  }
  for (let i = 0; i < 8; i++) {
    const x = -68 + i * 9, y = 6 + i * 1.6;
    s.push(line(`M ${x} ${y} L ${x + 4} ${y + 0.8}`, C.graphite, 2));
  }
  for (const [x, y] of [[-96, -7], [-29, -26], [96, -5], [29, 19]]) {
    s.push(oval(x, y, 2, 1.1, C.ink), line(`M ${x - 1} ${y} L ${x + 1} ${y}`, C.white, 0.6));
  }
  return geometry(s, [99, 6]);
}

const layers: Record<SpecimenId, readonly ((swapped: boolean) => LayerGeometry)[]> = {
  coffee: [coffeeLid, coffeeLiquid, coffeeIce, coffeeCup, s => carryBag(s, false), coffeeDelivery],
  meal: [mealUtensils, mealTrays, mealMeat, mealVegetables, s => carryBag(s, true), mealCooking],
  shirt: [shirtCotton, shirtTextile, shirtGarment, shirtLogistics, shirtPackaging, shirtLaundry],
  ai: [aiNetwork, aiGPU, aiCooling, aiPower, aiReuse, aiChassis],
};

/** Fresh objects allow heat-map consumers to recolor body faces without mutation leaks. */
export function getLayerGeometry(specimenId: SpecimenId, index: number, swapped: boolean): LayerGeometry {
  if (!Object.hasOwn(layers, specimenId)) throw new RangeError(`Unknown specimen: ${specimenId}`);
  if (!Number.isInteger(index) || index < 0 || index > 5) throw new RangeError(`Invalid layer index: ${index}`);
  return layers[specimenId][index](swapped);
}

/** Compact filled icons in local 0..32 coordinates; no labels or external assets. */
export function getSpecimenSilhouette(specimenId: SpecimenId): string {
  switch (specimenId) {
    case 'coffee': return 'M 5 9 L 21 9 L 24 2 L 27 3 L 24 10 L 27 10 L 26 14 L 24 29 L 9 29 L 6 14 L 4 14 Z M 9 17 L 23 17 L 22 24 L 10 24 Z';
    case 'meal': return 'M 3 10 L 21 6 L 30 11 L 29 23 L 12 28 L 3 23 Z M 4 4 L 6 3 L 18 9 L 16 10 Z M 10 2 L 12 1 L 24 7 L 22 8 Z';
    case 'shirt': return 'M 10 4 L 13 4 C 13 8 19 8 19 4 L 22 4 L 31 11 L 26 17 L 23 14 L 23 29 L 9 29 L 9 14 L 6 17 L 1 11 Z';
    case 'ai': return 'M 3 7 L 19 3 L 30 8 L 30 25 L 14 30 L 3 24 Z M 6 11 L 13 14 L 13 17 L 6 14 Z M 6 18 L 13 21 L 13 24 L 6 21 Z M 17 13 L 27 10 L 27 13 L 17 16 Z M 17 20 L 27 17 L 27 20 L 17 23 Z';
    default: throw new RangeError(`Unknown specimen: ${specimenId}`);
  }
}
