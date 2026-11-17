import type { Comparison } from '../domain/types.ts';
import { calculateEquivalents, format, projectImpact, waterTotal } from '../domain/engine.ts';
import { DATA_VERSION } from '../data/sources.ts';
import { getLayerGeometry } from '../graphics/specimens.ts';
import { layerTransform } from '../graphics/geometry.ts';

export type ReceiptSnapshot = { comparison: Comparison; frequency: number; createdAt: string };

const WIDTH = 1200;
const HEIGHT = 1600;
const PAPER = '#f6f3e9';
const INK = '#20231f';
const MUTED = '#62665e';
const RULE = '#c9cbbf';
const ACCENT = '#176344';
const SANS = '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif';
const MONO = '"Courier New", "Microsoft YaHei", monospace';
const CODE39: Record<string, string> = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw', '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn', '9': 'nnwwnnwnn', '*': 'nwnnwnwnn',
};

function scenarioId(snapshot: ReceiptSnapshot): string {
  const { comparison, frequency, createdAt } = snapshot;
  const identity = JSON.stringify({
    version: DATA_VERSION,
    specimen: comparison.current.specimen.id,
    choices: comparison.current.layers.map(({ layer, variant }) => [layer.id, variant.id]),
    baseline: comparison.baseline.totals,
    current: comparison.current.totals,
    frequency,
    createdAt,
  });
  let hash = 2166136261;
  for (let index = 0; index < identity.length; index++) {
    hash = Math.imul(hash ^ identity.charCodeAt(index), 16777619) >>> 0;
  }
  return comparison.current.specimen.number + new Date(createdAt).toISOString().replace(/\D/g, '').slice(0, 14) + String(hash).padStart(10, '0');
}

function drawBarcode(ctx: CanvasRenderingContext2D, id: string, y: number) {
  if (!/^\d+$/.test(id)) throw new Error('小票情景编号无效');
  const symbols = [...`*${id}*`];
  const modules = symbols.length * 15 + symbols.length - 1 + 20;
  const narrow = Math.floor(1052 / modules);
  if (narrow < 1) throw new Error('小票情景编号过长');
  let x = Math.floor((WIDTH - modules * narrow) / 2) + 10 * narrow;
  ctx.fillStyle = INK;
  for (const symbol of symbols) {
    [...CODE39[symbol]].forEach((element, index) => {
      const width = (element === 'w' ? 3 : 1) * narrow;
      if (index % 2 === 0) ctx.fillRect(x, y, width, 52);
      x += width;
    });
    x += narrow;
  }
}

function paper(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(18, 25);
  for (let x = 18; x < WIDTH - 18; x += 24) {
    ctx.lineTo(x + 12, 14);
    ctx.lineTo(Math.min(x + 24, WIDTH - 18), 25);
  }
  ctx.lineTo(WIDTH - 18, HEIGHT - 25);
  for (let x = WIDTH - 18; x > 18; x -= 24) {
    ctx.lineTo(x - 12, HEIGHT - 14);
    ctx.lineTo(Math.max(x - 24, 18), HEIGHT - 25);
  }
  ctx.closePath();
  ctx.fillStyle = PAPER;
  ctx.fill();
}

function wireframe(ctx: CanvasRenderingContext2D, comparison: Comparison) {
  ctx.save();
  ctx.translate(800, 96);
  ctx.scale(320 / 760, 320 / 760);
  for (let index = 5; index >= 0; index--) {
    const { changed } = comparison.current.layers[index];
    const { shapes } = getLayerGeometry(comparison.current.specimen.id, index, changed);
    const transform = layerTransform(index, 100, comparison.current.specimen.id);
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const shape of shapes) {
      const path = new Path2D(shape.d);
      ctx.globalAlpha = shape.opacity ?? 1;
      if (shape.fill !== 'none') {
        ctx.fillStyle = shape.role === 'accent' && changed ? ACCENT : PAPER;
        ctx.fill(path);
      }
      ctx.strokeStyle = changed ? ACCENT : INK;
      ctx.lineWidth = Math.max(shape.strokeWidth ?? 1.5, 1.5);
      ctx.stroke(path);
    }
    ctx.restore();
  }
  ctx.restore();
}

export async function renderReceipt(snapshot: ReceiptSnapshot): Promise<Blob> {
  const frozen: ReceiptSnapshot = structuredClone(snapshot);
  const { comparison, frequency, createdAt } = frozen;
  const { current, baseline, savings, percent } = comparison;
  const specimen = current.specimen;
  const date = new Date(createdAt);
  if (!Number.isFinite(date.getTime())) throw new Error('小票生成时间无效');
  if (current.layers.length !== 6 || baseline.layers.length !== 6 || baseline.specimen.id !== specimen.id || current.layers.some((entry, index) => entry.layer.id !== baseline.layers[index].layer.id)) {
    throw new Error('小票需要同一样品的完整六层对比');
  }
  const annual = projectImpact(comparison, frequency, 1);
  const fourYear = projectImpact(comparison, frequency, 4);
  const equivalents = calculateEquivalents(fourYear.savings);
  if (typeof document === 'undefined' || typeof Path2D === 'undefined') throw new Error('当前环境不支持本地 Canvas 小票');
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建小票画布，请使用支持 Canvas 的浏览器');

  const text = (value: string, x: number, y: number, size = 22, options: { color?: string; width?: number; align?: CanvasTextAlign; bold?: boolean; mono?: boolean } = {}) => {
    const font = (px: number) => `${options.bold ? 700 : 400} ${px}px ${options.mono ? MONO : SANS}`;
    ctx.font = font(size);
    if (options.width) {
      while (ctx.measureText(value).width > options.width && size > 16) {
        size -= 0.5;
        ctx.font = font(size);
      }
      if (ctx.measureText(value).width > options.width) throw new Error('小票文字超出可打印范围');
    }
    ctx.fillStyle = options.color ?? INK;
    ctx.textAlign = options.align ?? 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(value, x, y);
  };
  const rule = (y: number, dashed = false) => {
    ctx.save();
    ctx.strokeStyle = RULE;
    ctx.lineWidth = 1;
    ctx.setLineDash(dashed ? [7, 7] : []);
    ctx.beginPath();
    ctx.moveTo(74, y);
    ctx.lineTo(1126, y);
    ctx.stroke();
    ctx.restore();
  };
  const paragraph = (value: string, x: number, y: number, width: number, height: number) => {
    for (let size = 19; size >= 17; size--) {
      ctx.font = `400 ${size}px ${SANS}`;
      const lines: string[] = [];
      for (const section of value.split('\n')) {
        let line = '';
        for (const character of section) {
          if (ctx.measureText(line + character).width > width && line) {
            lines.push(line);
            line = '';
          }
          line += character;
        }
        lines.push(line);
      }
      const leading = size + 7;
      if (lines.length * leading <= height) {
        lines.forEach((line, index) => text(line, x, y + index * leading, size, { color: MUTED }));
        return;
      }
    }
    throw new Error('小票科学边界文字超出可打印范围');
  };

  paper(ctx);
  text('EXPLODED CARBON / 地球小票', 74, 55, 19, { mono: true, bold: true });
  text(`${date.toISOString().slice(0, 19).replace('T', ' ')} UTC`, 1126, 55, 18, { mono: true, align: 'right' });
  rule(88);
  text('每个选择，都有回响。', 74, 110, 49, { bold: true, width: 716 });
  text(`${specimen.number} / ${specimen.name}`, 74, 178, 30, { bold: true, width: 714 });
  text(`比较单位 · ${specimen.unit}`, 74, 224, 22, { width: 710, color: MUTED });
  text('基线 / g CO₂e', 74, 270, 18, { color: MUTED });
  text('当前 / g CO₂e', 432, 270, 18, { color: MUTED });
  text(format(baseline.totals.carbon, 2), 74, 299, 41, { mono: true, bold: true, width: 330 });
  text(format(current.totals.carbon, 2), 432, 299, 41, { mono: true, bold: true, width: 350 });
  wireframe(ctx, comparison);
  text('六层构成 / 绿色为已改装', 960, 356, 17, { align: 'center', color: MUTED });

  ctx.fillStyle = ACCENT;
  ctx.fillRect(74, 391, 1052, 83);
  text(savings.carbon < 0 ? '本次多排' : savings.carbon > 0 ? '本次少排' : '本次碳差额', 98, 421, 24, { color: PAPER, bold: true });
  text(`${format(Math.abs(savings.carbon), 2)} g CO₂e`, 278, 408, 39, { mono: true, bold: true, color: PAPER, width: 602 });
  text(percent === null ? '比例不适用' : `${percent < 0 ? '增加' : '减少'} ${format(Math.abs(percent), 1)}%`, 1100, 425, 21, { align: 'right', color: PAPER, width: 210 });

  text('六层明细 · 当前选择', 74, 495, 21, { bold: true });
  text('基线 / g CO₂e', 872, 498, 18, { align: 'right', color: MUTED });
  text('当前 / g CO₂e', 1126, 498, 18, { align: 'right', color: MUTED });
  rule(530);
  current.layers.forEach(({ layer, variant, metrics, changed }, index) => {
    const y = 544 + index * 53;
    text(String(index + 1).padStart(2, '0'), 74, y + 2, 18, { mono: true, color: changed ? ACCENT : MUTED });
    text(layer.label, 116, y, 21, { width: 548, bold: true });
    text(`当前 · ${variant.label}`, 116, y + 27, 18, { width: 550, color: changed ? ACCENT : MUTED });
    if (layer.kind === 'driver') {
      text('参数 · 不重复计入', 1126, y + 10, 21, { align: 'right', color: MUTED, width: 424 });
    } else {
      text(format(baseline.layers[index].metrics.carbon, 2), 872, y + 10, 24, { align: 'right', mono: true, width: 190 });
      text(format(metrics.carbon, 2), 1126, y + 10, 24, { align: 'right', mono: true, width: 224, color: changed ? ACCENT : INK });
    }
  });
  rule(866, true);
  text(`水足迹  ${format(waterTotal(baseline.totals.water), 2)} → ${format(waterTotal(current.totals.water), 2)} L`, 74, 884, 21, { width: 630 });
  text(`塑料  ${format(baseline.totals.plastic, 2)} → ${format(current.totals.plastic, 2)} g`, 1126, 884, 21, { align: 'right', width: 400 });
  text(`本次差额：水 ${format(waterTotal(savings.water), 2)} L · 塑料 ${format(savings.plastic, 2)} g；差额 = 基线 − 当前，负值表示增加。`, 74, 916, 18, { color: MUTED, width: 1052 });

  rule(951);
  const demand = specimen.id === 'shirt'
    ? `${format(annual.annualCount, 1)} 组/年 × 5次穿着 = ${format(annual.wearDemand!, 1)} 次/年，同等服务`
    : `${format(frequency, 1)} 次/${specimen.frequencyUnit === 'week' ? '周' : '年'} · 每年 ${format(annual.annualCount, 1)} 次`;
  text('把选择延续下去', 74, 968, 24, { bold: true });
  text(demand, 1126, 974, 18, { align: 'right', width: 754, color: MUTED });
  text('等量服务 / kg CO₂e', 74, 1009, 18, { color: MUTED });
  text('基线', 655, 1009, 18, { align: 'right', color: MUTED });
  text('当前', 885, 1009, 18, { align: 'right', color: MUTED });
  text('差额', 1126, 1009, 18, { align: 'right', color: MUTED });
  [annual, fourYear].forEach((projection, index) => {
    const y = 1041 + index * 33;
    text(index === 0 ? '一年' : '四年', 74, y, 22, { bold: true });
    text(format(projection.baseline.carbon / 1000, 2), 655, y, 23, { mono: true, align: 'right', width: 220 });
    text(format(projection.current.carbon / 1000, 2), 885, y, 23, { mono: true, align: 'right', width: 210 });
    text(format(projection.savings.carbon / 1000, 2), 1126, y, 23, { mono: true, align: 'right', width: 221, color: ACCENT });
  });
  text(`四年差额等价 · 汽油 ${format(equivalents.gasoline, 2)} L / 塑料袋 ${format(equivalents.bags, 1)} 个 / 固碳 ${format(equivalents.treeYears, 2)} 树·年`, 74, 1117, 21, { width: 1052 });
  rule(1155, true);

  let scope = `边界｜${specimen.boundary}\n水口径｜${specimen.waterScope}。`;
  if (specimen.id === 'shirt' && current.fullGarment && baseline.fullGarment) {
    scope += `\n整件生命周期（仅参考）：基线 ${format(baseline.fullGarment.carbon / 1000, 2)} / 当前 ${format(current.fullGarment.carbon / 1000, 2)} kg CO₂e；不代替5次穿着服务比较。`;
  }
  paragraph(scope, 74, 1172, 510, 208);
  paragraph([
    '换算｜汽油仅燃烧：8887g CO₂/美制加仑（3.785411784L），不含开采炼化。',
    '塑料袋按5g/个；树按22kg CO₂/树·年，仅教学假设，不代表真实植树或碳抵消。',
    '水不等于饮用水；绿水为雨水、蓝水为地表/地下水，灰水为污染稀释表征。',
    '模型｜公开LCA背景 + 教学情景，非实测、非认证；不用于跨产品排名。年化与四年按频次不变线性外推。',
  ].join('\n'), 624, 1172, 502, 208);
  text('少一点理所当然，多一点重新选择。', 600, 1393, 29, { bold: true, align: 'center', width: 1052 });
  const id = scenarioId(frozen);
  drawBarcode(ctx, id, 1448);
  text(`${id} / CODE39 · 本地情景编号，非认证标识`, 600, 1515, 18, { align: 'center', mono: true, width: 1052 });
  text(`${DATA_VERSION}  ·  1200 × 1600  ·  本地生成 / 无上传`, 600, 1551, 16, { align: 'center', mono: true });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob && blob.size > 0 && blob.type === 'image/png') resolve(blob);
      else reject(new Error('PNG 编码失败，请重新生成小票'));
    }, 'image/png');
  });
}
