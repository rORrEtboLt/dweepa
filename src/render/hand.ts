export const palette = {
  ink: '#2b1d12',
  inkLight: '#5a3d24',
  inkSoft: '#7a5a3a',
  parchment: '#ecdcb4',
  parchmentLight: '#f4e8c8',
  parchmentDark: '#c8b487',
  parchmentDeep: '#a88a55',
  accent: '#a3431a',
  accentDark: '#7a2c10',
  gold: '#c0a060',
  goldDark: '#8a7040',
  water: '#7ea8b8',
  waterDark: '#5a8090',
  grass: '#8aa860',
  grassDark: '#5a7a3a',
  grassDarker: '#3e5a26',
  sand: '#d8c690',
  stone: '#a89e8a',
  stoneDark: '#6e6856',
  cliff: '#8a6a4a',
  cliffDark: '#5a4028',
  wood: '#8a5a32',
  woodDark: '#5a3818',
  banner: '#e8d4a0',
  red: '#a83020',
  redDark: '#702010',
  steel: '#9aa0a8',
  steelDark: '#5a6068',
  blue: '#3a5878',
  flesh: '#e0b890',
  hood: '#3a5a32',
};

let _seed = 1;
export function setSeed(s: number) {
  _seed = s | 0 || 1;
}
export function rand() {
  _seed = (_seed * 16807) % 2147483647;
  return _seed / 2147483647;
}
export function jitter(amt = 1) {
  return (rand() - 0.5) * 2 * amt;
}

export function strokeWobblyLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  jit = 0.6
) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const segs = Math.max(2, Math.floor(len / 7));
  ctx.beginPath();
  ctx.moveTo(x1 + jitter(jit), y1 + jitter(jit));
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    ctx.lineTo(x1 + dx * t + jitter(jit), y1 + dy * t + jitter(jit));
  }
  ctx.stroke();
}

export function pathWobbly(
  ctx: CanvasRenderingContext2D,
  pts: ReadonlyArray<readonly [number, number]>,
  jit = 0.6,
  close = false
) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0] + jitter(jit), pts[0][1] + jitter(jit));
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    const segs = Math.max(1, Math.floor(len / 10));
    for (let s = 1; s <= segs; s++) {
      const t = s / segs;
      ctx.lineTo(a[0] + dx * t + jitter(jit), a[1] + dy * t + jitter(jit));
    }
  }
  if (close) ctx.closePath();
}

export function fillStrokeWobbly(
  ctx: CanvasRenderingContext2D,
  pts: ReadonlyArray<readonly [number, number]>,
  fill: string | null,
  stroke: string | null,
  jit = 0.5,
  lineWidth = 1.5
) {
  pathWobbly(ctx, pts, jit, true);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

export function inkText(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number,
  size = 24,
  caps = false,
  color = palette.ink,
  align: CanvasTextAlign = 'center'
) {
  ctx.fillStyle = color;
  ctx.font = `${caps ? '' : ''}${size}px '${caps ? 'IM Fell English SC' : 'IM Fell English'}', 'Times New Roman', serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

export function shadeColor(hex: string, amt: number): string {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  let r = (n >> 16) & 0xff;
  let g = (n >> 8) & 0xff;
  let b = n & 0xff;
  if (amt < 0) {
    r = Math.max(0, Math.floor(r * (1 + amt)));
    g = Math.max(0, Math.floor(g * (1 + amt)));
    b = Math.max(0, Math.floor(b * (1 + amt)));
  } else {
    r = Math.min(255, Math.floor(r + (255 - r) * amt));
    g = Math.min(255, Math.floor(g + (255 - g) * amt));
    b = Math.min(255, Math.floor(b + (255 - b) * amt));
  }
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}
