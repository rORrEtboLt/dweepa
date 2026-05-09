import { palette, setSeed, rand, jitter, pathWobbly, fillStrokeWobbly, shadeColor } from './hand';
import { TILE_W, TILE_H, isoToScreen } from './iso';

export type IslandTheme = 'grass' | 'sand' | 'volcanic' | 'mountain' | 'forest';

export interface WorldIsland {
  id: number;
  cx: number;
  cy: number;
  size: number;
  theme: IslandTheme;
  name: string;
  features: WorldFeature[];
  shape: [number, number][];
  seed: number;
}

export type WorldFeature =
  | { kind: 'tree'; gx: number; gy: number; variant: 'oak' | 'pine' | 'palm' }
  | { kind: 'mountain'; gx: number; gy: number }
  | { kind: 'volcano'; gx: number; gy: number }
  | { kind: 'tower'; gx: number; gy: number }
  | { kind: 'castle'; gx: number; gy: number }
  | { kind: 'rock'; gx: number; gy: number }
  | { kind: 'banner'; gx: number; gy: number };

const themeColors: Record<IslandTheme, { top: string; cliff: string; cliffDark: string; accent: string }> = {
  grass: { top: palette.grass, cliff: palette.cliff, cliffDark: palette.cliffDark, accent: palette.grassDark },
  sand: { top: palette.sand, cliff: '#a87850', cliffDark: '#6e4e30', accent: '#c8a060' },
  volcanic: { top: '#7a6258', cliff: '#5a4438', cliffDark: '#3a2a20', accent: '#a83020' },
  mountain: { top: palette.stone, cliff: palette.stoneDark, cliffDark: '#48433a', accent: '#e8e8ee' },
  forest: { top: '#7a9a4e', cliff: '#5a3818', cliffDark: '#3a2410', accent: palette.grassDarker },
};

export function makeIslandShape(seed: number, size: number): [number, number][] {
  setSeed(seed);
  const pts: [number, number][] = [];
  const verts = 8 + Math.floor(rand() * 4);
  for (let i = 0; i < verts; i++) {
    const a = (i / verts) * Math.PI * 2;
    const r = size * (0.78 + rand() * 0.42);
    pts.push([Math.cos(a) * r, Math.sin(a) * r * 0.62]);
  }
  return pts;
}

export function drawWorldIsland(ctx: CanvasRenderingContext2D, island: WorldIsland, hover: boolean) {
  const { cx, cy, theme, shape, seed } = island;
  const colors = themeColors[theme];
  const elevation = 24;

  ctx.save();
  ctx.translate(cx, cy);

  setSeed(seed);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Bottom (offset shape for cliff base)
  const bottomShape: [number, number][] = shape.map(([x, y]) => [x, y + elevation]);

  // Cliff sides — fill polygon between bottom of top shape and bottom shape (front-facing edges only)
  // Find front-facing edges (where next vertex is to the lower-right roughly)
  for (let i = 0; i < shape.length; i++) {
    const a = shape[i];
    const b = shape[(i + 1) % shape.length];
    // front-facing if going generally to the right or down
    if (b[1] > a[1] - 4) {
      const a2 = bottomShape[i];
      const b2 = bottomShape[(i + 1) % shape.length];
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(b2[0], b2[1]);
      ctx.lineTo(a2[0], a2[1]);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, a[1], 0, a2[1]);
      grad.addColorStop(0, colors.cliff);
      grad.addColorStop(1, colors.cliffDark);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Cliff striations
      ctx.strokeStyle = colors.cliffDark;
      ctx.lineWidth = 0.7;
      const dx = b[0] - a[0];
      for (let s = 1; s < 3; s++) {
        const t = s / 3;
        const lx = a[0] + dx * 0.1 + jitter(1);
        const ly = a[1] + elevation * t + jitter(0.6);
        const lx2 = b[0] - dx * 0.1 + jitter(1);
        const ly2 = b[1] + elevation * t + jitter(0.6);
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx2, ly2);
        ctx.stroke();
      }
    }
  }

  // Top surface (the green/sand top)
  fillStrokeWobbly(ctx, shape, colors.top, palette.ink, 0.6, 1.8);

  // Tonal blotches on top
  ctx.save();
  pathWobbly(ctx, shape, 0.4, true);
  ctx.clip();
  for (let i = 0; i < 8; i++) {
    const x = jitter(island.size * 0.7);
    const y = jitter(island.size * 0.4);
    const r = 6 + rand() * 14;
    ctx.fillStyle = `${shadeColor(colors.top, -0.1)}`;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // tiny accent dots (flowers/grass tufts)
  for (let i = 0; i < 14; i++) {
    const x = jitter(island.size * 0.8);
    const y = jitter(island.size * 0.4);
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(x, y, 1 + rand() * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Features
  const sortedFeatures = [...island.features].sort((a, b) => a.gy - b.gy);
  for (const f of sortedFeatures) {
    ctx.save();
    ctx.translate(f.gx, f.gy);
    drawFeature(ctx, f);
    ctx.restore();
  }

  // Hover highlight
  if (hover) {
    ctx.globalAlpha = 0.25;
    fillStrokeWobbly(ctx, shape, '#fff7c8', null, 0.4, 0);
    ctx.globalAlpha = 1;
    pathWobbly(ctx, shape, 0.4, true);
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  ctx.restore();
}

function drawFeature(ctx: CanvasRenderingContext2D, f: WorldFeature) {
  switch (f.kind) {
    case 'tree':
      if (f.variant === 'pine') drawPine(ctx);
      else if (f.variant === 'palm') drawPalm(ctx);
      else drawOak(ctx);
      break;
    case 'mountain': drawMountain(ctx); break;
    case 'volcano': drawVolcano(ctx); break;
    case 'tower': drawTower(ctx); break;
    case 'castle': drawCastle(ctx); break;
    case 'rock': drawRock(ctx); break;
    case 'banner': drawIslandBanner(ctx); break;
  }
}

function drawOak(ctx: CanvasRenderingContext2D) {
  // Trunk
  ctx.fillStyle = palette.wood;
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-3, 0);
  ctx.lineTo(3, 0);
  ctx.lineTo(2, -10);
  ctx.lineTo(-2, -10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Foliage
  ctx.fillStyle = palette.grassDark;
  ctx.beginPath();
  ctx.arc(0, -16, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = palette.grass;
  ctx.beginPath();
  ctx.arc(-3, -19, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawPine(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = palette.wood;
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1;
  ctx.fillRect(-1.5, -8, 3, 8);
  ctx.strokeRect(-1.5, -8, 3, 8);
  ctx.fillStyle = palette.grassDarker;
  for (let i = 0; i < 3; i++) {
    const y = -8 - i * 7;
    const w = 9 - i * 2;
    ctx.beginPath();
    ctx.moveTo(0, y - 8);
    ctx.lineTo(w, y);
    ctx.lineTo(-w, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function drawPalm(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = palette.wood;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(2, -8, 0, -16);
  ctx.stroke();
  // Fronds
  ctx.strokeStyle = palette.grassDarker;
  ctx.lineWidth = 1.8;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.quadraticCurveTo(Math.cos(a) * 6, -18 + Math.sin(a) * 3, Math.cos(a) * 12, -14 + Math.sin(a) * 6);
    ctx.stroke();
  }
  ctx.fillStyle = '#8a5a32';
  ctx.beginPath();
  ctx.arc(-3, -14, 1.5, 0, Math.PI * 2);
  ctx.arc(3, -14, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawMountain(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = palette.stone;
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-26, 8);
  ctx.lineTo(-8, -22);
  ctx.lineTo(2, -10);
  ctx.lineTo(10, -28);
  ctx.lineTo(28, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Snowy peak
  ctx.fillStyle = '#f0f0f4';
  ctx.beginPath();
  ctx.moveTo(10, -28);
  ctx.lineTo(14, -18);
  ctx.lineTo(7, -16);
  ctx.lineTo(2, -10);
  ctx.lineTo(-2, -16);
  ctx.lineTo(-8, -22);
  ctx.lineTo(-3, -16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Shadow side
  ctx.fillStyle = palette.stoneDark;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(10, -28);
  ctx.lineTo(28, 8);
  ctx.lineTo(15, 8);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawVolcano(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = palette.cliff;
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-22, 8);
  ctx.lineTo(-7, -22);
  ctx.lineTo(7, -22);
  ctx.lineTo(22, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Crater rim
  ctx.fillStyle = palette.cliffDark;
  ctx.beginPath();
  ctx.ellipse(0, -22, 7, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Lava
  ctx.fillStyle = '#e85020';
  ctx.beginPath();
  ctx.ellipse(0, -22, 5, 1.7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Lava drips
  ctx.strokeStyle = '#e85020';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-3, -21);
  ctx.quadraticCurveTo(-8, -10, -10, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(4, -21);
  ctx.quadraticCurveTo(10, -8, 9, 4);
  ctx.stroke();
  // Smoke
  ctx.fillStyle = 'rgba(120, 110, 100, 0.6)';
  ctx.beginPath();
  ctx.arc(-2, -28, 4, 0, Math.PI * 2);
  ctx.arc(3, -32, 5, 0, Math.PI * 2);
  ctx.arc(-1, -38, 4.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawTower(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = palette.stone;
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1.2;
  // Body
  ctx.beginPath();
  ctx.rect(-6, -32, 12, 32);
  ctx.fill();
  ctx.stroke();
  // Top crenellations
  ctx.fillStyle = palette.stoneDark;
  ctx.fillRect(-7, -36, 14, 5);
  ctx.strokeRect(-7, -36, 14, 5);
  // Spire
  ctx.fillStyle = palette.blue;
  ctx.beginPath();
  ctx.moveTo(0, -52);
  ctx.lineTo(6, -36);
  ctx.lineTo(-6, -36);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Window slit
  ctx.fillStyle = palette.ink;
  ctx.fillRect(-1, -22, 2, 6);
  // Flag
  ctx.fillStyle = palette.red;
  ctx.beginPath();
  ctx.moveTo(0, -54);
  ctx.lineTo(7, -50);
  ctx.lineTo(0, -46);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawCastle(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1.2;
  // Main keep
  ctx.fillStyle = palette.stone;
  ctx.fillRect(-14, -22, 28, 22);
  ctx.strokeRect(-14, -22, 28, 22);
  // Crenellations
  for (let i = 0; i < 5; i++) {
    const x = -14 + i * 7;
    ctx.fillRect(x, -25, 4, 3);
    ctx.strokeRect(x, -25, 4, 3);
  }
  // Side towers
  ctx.fillRect(-18, -28, 8, 28);
  ctx.strokeRect(-18, -28, 8, 28);
  ctx.fillRect(10, -28, 8, 28);
  ctx.strokeRect(10, -28, 8, 28);
  // Tower roofs
  ctx.fillStyle = palette.red;
  ctx.beginPath();
  ctx.moveTo(-18, -28);
  ctx.lineTo(-14, -36);
  ctx.lineTo(-10, -28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(10, -28);
  ctx.lineTo(14, -36);
  ctx.lineTo(18, -28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Door
  ctx.fillStyle = palette.woodDark;
  ctx.beginPath();
  ctx.moveTo(-3, 0);
  ctx.lineTo(-3, -8);
  ctx.quadraticCurveTo(0, -11, 3, -8);
  ctx.lineTo(3, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawRock(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = palette.stone;
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-7, 2);
  ctx.lineTo(-5, -5);
  ctx.lineTo(2, -7);
  ctx.lineTo(7, -3);
  ctx.lineTo(6, 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawIslandBanner(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1.2;
  // Pole
  ctx.fillStyle = palette.wood;
  ctx.fillRect(-1, -22, 2, 22);
  ctx.strokeRect(-1, -22, 2, 22);
  // Flag
  ctx.fillStyle = palette.banner;
  ctx.beginPath();
  ctx.moveTo(1, -22);
  ctx.quadraticCurveTo(15, -20, 18, -16);
  ctx.lineTo(1, -14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// Dragon decoration for the world map (draws at given size)
export function drawDragon(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale = 1, t = 0) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  const flap = Math.sin(t * 4) * 6;
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1.5 / scale;
  ctx.lineJoin = 'round';

  // Wings
  ctx.fillStyle = '#e26a26';
  ctx.beginPath();
  ctx.moveTo(-6, -2);
  ctx.quadraticCurveTo(-26, -22 - flap, -38, -8 - flap);
  ctx.quadraticCurveTo(-30, -2, -22, 2);
  ctx.quadraticCurveTo(-26, -10, -6, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f8a040';
  ctx.beginPath();
  ctx.moveTo(6, -2);
  ctx.quadraticCurveTo(26, -22 - flap, 38, -8 - flap);
  ctx.quadraticCurveTo(30, -2, 22, 2);
  ctx.quadraticCurveTo(26, -10, 6, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Body
  ctx.fillStyle = palette.red;
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Tail
  ctx.beginPath();
  ctx.moveTo(-12, 2);
  ctx.quadraticCurveTo(-20, 6, -28, 14);
  ctx.lineTo(-30, 12);
  ctx.lineTo(-24, 4);
  ctx.lineTo(-12, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Head
  ctx.beginPath();
  ctx.moveTo(12, -2);
  ctx.quadraticCurveTo(22, -6, 24, 0);
  ctx.quadraticCurveTo(22, 4, 12, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Eye
  ctx.fillStyle = palette.ink;
  ctx.beginPath();
  ctx.arc(18, -1, 1, 0, Math.PI * 2);
  ctx.fill();
  // Horn
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1.3 / scale;
  ctx.beginPath();
  ctx.moveTo(15, -3);
  ctx.lineTo(13, -8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(20, -3);
  ctx.lineTo(20, -8);
  ctx.stroke();

  ctx.restore();
}

// Ship for ocean
export function drawShip(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale = 1, sailColor = palette.red) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1.4 / scale;
  ctx.lineJoin = 'round';

  // Hull
  ctx.fillStyle = palette.wood;
  ctx.beginPath();
  ctx.moveTo(-22, -2);
  ctx.lineTo(22, -2);
  ctx.lineTo(16, 8);
  ctx.lineTo(-16, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = palette.woodDark;
  ctx.fillRect(-22, -4, 44, 2);
  ctx.strokeRect(-22, -4, 44, 2);

  // Mast
  ctx.strokeStyle = palette.woodDark;
  ctx.lineWidth = 2 / scale;
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.lineTo(0, -28);
  ctx.stroke();

  // Sail
  ctx.fillStyle = sailColor;
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1.2 / scale;
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.lineTo(14, -22);
  ctx.lineTo(14, -8);
  ctx.lineTo(0, -6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(-12, -18);
  ctx.lineTo(-10, -8);
  ctx.lineTo(0, -8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Sail stripes
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 0.6 / scale;
  ctx.beginPath();
  ctx.moveTo(2, -18); ctx.lineTo(13, -16);
  ctx.moveTo(2, -12); ctx.lineTo(13, -10);
  ctx.stroke();

  ctx.restore();
}

// Battle units --------------------------------------------------------------

export type UnitKind = 'knight' | 'archer' | 'pike' | 'raider';

export function drawUnit(ctx: CanvasRenderingContext2D, cx: number, cy: number, kind: UnitKind, facing = 1, t = 0) {
  ctx.save();
  ctx.translate(cx, cy);
  const bob = Math.sin(t * 4) * 0.8;
  ctx.translate(0, bob);
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';

  // Shadow
  ctx.fillStyle = 'rgba(40, 25, 10, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 1 - bob, 7, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();

  if (kind === 'knight') drawKnight(ctx, facing);
  else if (kind === 'archer') drawArcher(ctx, facing);
  else if (kind === 'pike') drawPike(ctx, facing);
  else drawRaider(ctx, facing);

  ctx.restore();
}

function drawKnight(ctx: CanvasRenderingContext2D, facing: number) {
  ctx.scale(facing, 1);
  // Legs
  ctx.fillStyle = palette.steelDark;
  ctx.fillRect(-3, -6, 2.5, 6);
  ctx.fillRect(0.5, -6, 2.5, 6);
  ctx.strokeRect(-3, -6, 2.5, 6);
  ctx.strokeRect(0.5, -6, 2.5, 6);
  // Body
  ctx.fillStyle = palette.steel;
  ctx.beginPath();
  ctx.moveTo(-5, -6);
  ctx.lineTo(5, -6);
  ctx.lineTo(4, -16);
  ctx.lineTo(-4, -16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Tabard
  ctx.fillStyle = palette.blue;
  ctx.beginPath();
  ctx.moveTo(-3, -6);
  ctx.lineTo(3, -6);
  ctx.lineTo(2, -14);
  ctx.lineTo(-2, -14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Head / helm
  ctx.fillStyle = palette.steel;
  ctx.beginPath();
  ctx.arc(0, -19, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Helm slit
  ctx.fillStyle = palette.ink;
  ctx.fillRect(-3, -19, 6, 1.2);
  // Plume
  ctx.fillStyle = palette.red;
  ctx.beginPath();
  ctx.moveTo(0, -23);
  ctx.lineTo(3, -19);
  ctx.lineTo(0, -25);
  ctx.lineTo(-3, -19);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Sword
  ctx.fillStyle = palette.steel;
  ctx.fillRect(5, -16, 2, -10);
  ctx.strokeRect(5, -16, 2, -10);
  ctx.fillStyle = palette.gold;
  ctx.fillRect(4, -16, 4, 1.5);
  ctx.strokeRect(4, -16, 4, 1.5);
  // Shield
  ctx.fillStyle = palette.red;
  ctx.beginPath();
  ctx.moveTo(-7, -14);
  ctx.lineTo(-3, -14);
  ctx.lineTo(-3, -7);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-7, -7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawArcher(ctx: CanvasRenderingContext2D, facing: number) {
  ctx.scale(facing, 1);
  // Legs
  ctx.fillStyle = palette.woodDark;
  ctx.fillRect(-3, -6, 2.5, 6);
  ctx.fillRect(0.5, -6, 2.5, 6);
  ctx.strokeRect(-3, -6, 2.5, 6);
  ctx.strokeRect(0.5, -6, 2.5, 6);
  // Body / tunic
  ctx.fillStyle = palette.hood;
  ctx.beginPath();
  ctx.moveTo(-5, -6);
  ctx.lineTo(5, -6);
  ctx.lineTo(4, -15);
  ctx.lineTo(-4, -15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Hood / head
  ctx.fillStyle = palette.hood;
  ctx.beginPath();
  ctx.moveTo(-4, -15);
  ctx.lineTo(4, -15);
  ctx.lineTo(5, -22);
  ctx.lineTo(-5, -22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Face
  ctx.fillStyle = palette.flesh;
  ctx.beginPath();
  ctx.arc(0, -19, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // Bow
  ctx.strokeStyle = palette.wood;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(7, -12, 8, -Math.PI * 0.55, Math.PI * 0.55);
  ctx.stroke();
  // String
  ctx.strokeStyle = palette.parchmentLight;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(7, -19.5);
  ctx.lineTo(7, -4.5);
  ctx.stroke();
  // Arrow
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(2, -12);
  ctx.lineTo(11, -12);
  ctx.stroke();
}

function drawPike(ctx: CanvasRenderingContext2D, facing: number) {
  ctx.scale(facing, 1);
  // Legs
  ctx.fillStyle = palette.woodDark;
  ctx.fillRect(-3, -6, 2.5, 6);
  ctx.fillRect(0.5, -6, 2.5, 6);
  ctx.strokeRect(-3, -6, 2.5, 6);
  ctx.strokeRect(0.5, -6, 2.5, 6);
  // Body
  ctx.fillStyle = palette.steelDark;
  ctx.beginPath();
  ctx.moveTo(-5, -6);
  ctx.lineTo(5, -6);
  ctx.lineTo(4, -16);
  ctx.lineTo(-4, -16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Head
  ctx.fillStyle = palette.flesh;
  ctx.beginPath();
  ctx.arc(0, -19, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Helm
  ctx.fillStyle = palette.steel;
  ctx.beginPath();
  ctx.moveTo(-4, -19);
  ctx.lineTo(4, -19);
  ctx.lineTo(3, -23);
  ctx.lineTo(-3, -23);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Pike
  ctx.strokeStyle = palette.wood;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(6, -2);
  ctx.lineTo(6, -28);
  ctx.stroke();
  // Pike head
  ctx.fillStyle = palette.steel;
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(6, -32);
  ctx.lineTo(9, -27);
  ctx.lineTo(6, -25);
  ctx.lineTo(3, -27);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawRaider(ctx: CanvasRenderingContext2D, facing: number) {
  ctx.scale(facing, 1);
  // Legs
  ctx.fillStyle = palette.cliffDark;
  ctx.fillRect(-3, -6, 2.5, 6);
  ctx.fillRect(0.5, -6, 2.5, 6);
  ctx.strokeRect(-3, -6, 2.5, 6);
  ctx.strokeRect(0.5, -6, 2.5, 6);
  // Body
  ctx.fillStyle = palette.redDark;
  ctx.beginPath();
  ctx.moveTo(-5, -6);
  ctx.lineTo(5, -6);
  ctx.lineTo(4, -15);
  ctx.lineTo(-4, -15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Head
  ctx.fillStyle = '#bc8a60';
  ctx.beginPath();
  ctx.arc(0, -19, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Horned helm
  ctx.fillStyle = palette.cliffDark;
  ctx.beginPath();
  ctx.arc(0, -20, 4, Math.PI, 0);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-4, -20);
  ctx.lineTo(-7, -23);
  ctx.lineTo(-3, -22);
  ctx.closePath();
  ctx.moveTo(4, -20);
  ctx.lineTo(7, -23);
  ctx.lineTo(3, -22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Eye glow
  ctx.fillStyle = palette.accent;
  ctx.fillRect(-2, -19, 4, 0.8);
  // Axe
  ctx.strokeStyle = palette.wood;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(6, -2);
  ctx.lineTo(8, -22);
  ctx.stroke();
  ctx.fillStyle = palette.steelDark;
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(8, -22);
  ctx.quadraticCurveTo(15, -22, 13, -14);
  ctx.lineTo(8, -16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// Battle island tile + grid drawing -----------------------------------------

export interface TileColors {
  top: string;
  cliff: string;
  cliffDark: string;
}

export function drawBattleTile(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  elev: number,
  colors: TileColors,
  highlight: 'none' | 'hover' | 'select' | 'red' = 'none'
) {
  const w = TILE_W;
  const h = TILE_H;
  const baseY = cy - elev * 14;

  // Cliff sides
  if (elev > 0) {
    const sideH = elev * 14;
    // Right face
    ctx.beginPath();
    ctx.moveTo(cx + w / 2, baseY);
    ctx.lineTo(cx, baseY + h / 2);
    ctx.lineTo(cx, baseY + h / 2 + sideH);
    ctx.lineTo(cx + w / 2, baseY + sideH);
    ctx.closePath();
    ctx.fillStyle = colors.cliffDark;
    ctx.fill();
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 1;
    ctx.stroke();
    // Left face
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, baseY);
    ctx.lineTo(cx, baseY + h / 2);
    ctx.lineTo(cx, baseY + h / 2 + sideH);
    ctx.lineTo(cx - w / 2, baseY + sideH);
    ctx.closePath();
    ctx.fillStyle = colors.cliff;
    ctx.fill();
    ctx.stroke();
  }

  // Top diamond
  ctx.beginPath();
  ctx.moveTo(cx, baseY - h / 2);
  ctx.lineTo(cx + w / 2, baseY);
  ctx.lineTo(cx, baseY + h / 2);
  ctx.lineTo(cx - w / 2, baseY);
  ctx.closePath();
  ctx.fillStyle = colors.top;
  ctx.fill();
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1;
  ctx.stroke();

  if (highlight !== 'none') {
    ctx.beginPath();
    ctx.moveTo(cx, baseY - h / 2);
    ctx.lineTo(cx + w / 2, baseY);
    ctx.lineTo(cx, baseY + h / 2);
    ctx.lineTo(cx - w / 2, baseY);
    ctx.closePath();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle =
      highlight === 'hover' ? '#fff5c8' :
      highlight === 'select' ? '#a8e0a0' :
      '#ff6040';
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// Health bar
export function drawHpBar(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, frac: number, friendly: boolean) {
  const h = 3;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(cx - w / 2 - 0.5, cy - 0.5, w + 1, h + 1);
  ctx.fillStyle = '#3a2410';
  ctx.fillRect(cx - w / 2, cy, w, h);
  ctx.fillStyle = friendly ? '#5fc450' : '#d04030';
  ctx.fillRect(cx - w / 2, cy, w * Math.max(0, Math.min(1, frac)), h);
}

// Wave / cloud / water decorations ------------------------------------------

export function drawSeaPattern(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  setSeed(99);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 80; i++) {
    const sx = x + rand() * w;
    const sy = y + rand() * h;
    const off = Math.sin(t * 1.5 + i) * 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy + off);
    ctx.quadraticCurveTo(sx + 4, sy - 1 + off, sx + 8, sy + off);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawCloud(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale = 1) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#f4ecd6';
  ctx.strokeStyle = palette.inkLight;
  ctx.lineWidth = 1.2 / scale;
  ctx.beginPath();
  ctx.arc(-10, 2, 7, 0, Math.PI * 2);
  ctx.arc(-2, -3, 8, 0, Math.PI * 2);
  ctx.arc(8, 0, 7, 0, Math.PI * 2);
  ctx.arc(15, 4, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
