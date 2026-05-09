import { Game, Scene } from '../Game';
import { palette, inkText } from '../render/hand';
import { drawParchmentBackground, drawBanner, drawCompass, drawButton, drawFlourish, buttonHit } from '../render/parchment';
import { drawWorldIsland, drawDragon, drawShip, drawCloud, makeIslandShape, WorldIsland, IslandTheme, WorldFeature } from '../render/sprites';

interface IslandDef {
  id: number;
  name: string;
  theme: IslandTheme;
  size: number;
  // Position is relative to a normalized 1000x1000 layout, scaled to the actual canvas
  nx: number;
  ny: number;
  features: { kind: string; gx: number; gy: number; variant?: 'oak' | 'pine' | 'palm' }[];
  difficulty: number;
}

const ISLAND_DEFS: IslandDef[] = [
  {
    id: 0, name: 'Greenshore', theme: 'grass', size: 110, nx: 250, ny: 480, difficulty: 1,
    features: [
      { kind: 'tree', gx: -40, gy: -10, variant: 'oak' },
      { kind: 'tree', gx: -20, gy: 18, variant: 'oak' },
      { kind: 'rock', gx: 30, gy: 5 },
      { kind: 'banner', gx: 50, gy: -10 },
    ],
  },
  {
    id: 1, name: 'Mt. Aerwyn', theme: 'mountain', size: 130, nx: 500, ny: 380, difficulty: 2,
    features: [
      { kind: 'mountain', gx: 0, gy: -10 },
      { kind: 'tower', gx: -45, gy: 15 },
      { kind: 'tree', gx: 40, gy: 25, variant: 'pine' },
      { kind: 'tree', gx: 55, gy: 10, variant: 'pine' },
    ],
  },
  {
    id: 2, name: 'Emberhold', theme: 'volcanic', size: 120, nx: 350, ny: 620, difficulty: 3,
    features: [
      { kind: 'volcano', gx: -10, gy: -8 },
      { kind: 'rock', gx: 35, gy: 15 },
      { kind: 'rock', gx: -45, gy: 10 },
    ],
  },
  {
    id: 3, name: 'Crown Keep', theme: 'forest', size: 130, nx: 720, ny: 540, difficulty: 4,
    features: [
      { kind: 'castle', gx: -10, gy: 0 },
      { kind: 'tree', gx: 50, gy: 18, variant: 'pine' },
      { kind: 'tree', gx: -50, gy: 22, variant: 'pine' },
      { kind: 'banner', gx: 35, gy: -10 },
    ],
  },
  {
    id: 4, name: 'Palm Reach', theme: 'sand', size: 95, nx: 580, ny: 700, difficulty: 2,
    features: [
      { kind: 'tree', gx: -25, gy: 0, variant: 'palm' },
      { kind: 'tree', gx: 25, gy: 15, variant: 'palm' },
      { kind: 'rock', gx: 0, gy: 20 },
    ],
  },
];

export class MapScene implements Scene {
  private islands: WorldIsland[] = [];
  private hoverIsland: number | null = null;
  private hoverButton = false;
  private mapW = 0;
  private mapH = 0;
  private mapOX = 0;
  private mapOY = 0;
  private clouds: { x: number; y: number; s: number; v: number }[] = [];
  private ships: { x: number; y: number; v: number; sail: string }[] = [];

  constructor() {
    this.buildIslands(1, 1, 0, 0);
    for (let i = 0; i < 4; i++) {
      this.clouds.push({
        x: Math.random() * 1000,
        y: 100 + Math.random() * 700,
        s: 0.7 + Math.random() * 0.6,
        v: 4 + Math.random() * 6,
      });
    }
    this.ships = [
      { x: 850, y: 800, v: -8, sail: palette.red },
      { x: 100, y: 760, v: 6, sail: '#a8a060' },
    ];
  }

  private buildIslands(scaleX: number, scaleY: number, ox: number, oy: number) {
    this.islands = ISLAND_DEFS.map(d => {
      const cx = ox + d.nx * scaleX;
      const cy = oy + d.ny * scaleY;
      const features: WorldFeature[] = d.features.map(f => {
        if (f.kind === 'tree') return { kind: 'tree', gx: f.gx, gy: f.gy, variant: f.variant ?? 'oak' };
        return { kind: f.kind, gx: f.gx, gy: f.gy } as WorldFeature;
      });
      return {
        id: d.id,
        cx,
        cy,
        size: d.size,
        theme: d.theme,
        name: d.name,
        features,
        shape: makeIslandShape(d.id * 17 + 91, d.size),
        seed: d.id * 13 + 7,
      };
    });
  }

  private layout(game: Game) {
    const w = game.width;
    const h = game.height;
    const targetW = 1000;
    const targetH = 900;
    const scale = Math.min(w / targetW, h / targetH) * 0.95;
    const ox = (w - targetW * scale) / 2;
    const oy = (h - targetH * scale) / 2 + 30;
    if (scale !== this.mapW / 1000 || ox !== this.mapOX || oy !== this.mapOY) {
      this.buildIslands(scale, scale, ox, oy);
      this.mapW = 1000 * scale;
      this.mapH = 900 * scale;
      this.mapOX = ox;
      this.mapOY = oy;
    }
  }

  update(dt: number, game: Game) {
    this.layout(game);
    const mx = game.input.mouseX, my = game.input.mouseY;

    this.hoverIsland = null;
    // Iterate back-to-front so foreground islands win
    const ordered = [...this.islands].sort((a, b) => b.cy - a.cy);
    for (const isl of ordered) {
      if (this.pointInIsland(mx, my, isl)) {
        this.hoverIsland = isl.id;
        break;
      }
    }

    // Back button
    const bw = 140, bh = 44;
    this.hoverButton = buttonHit(mx, my, 24, 24, bw, bh);

    if (game.input.clicked) {
      if (this.hoverButton) {
        game.goto('title');
      } else if (this.hoverIsland !== null && game.unlockedIslands.has(this.hoverIsland)) {
        game.goto('battle', { islandId: this.hoverIsland });
      }
    }

    // Animate clouds
    for (const c of this.clouds) {
      c.x += c.v * dt;
      if (c.x > 1100) c.x = -100;
      if (c.x < -100) c.x = 1100;
    }
    for (const s of this.ships) {
      s.x += s.v * dt;
      if (s.x > 1050) s.x = -50;
      if (s.x < -50) s.x = 1050;
    }
  }

  private pointInIsland(mx: number, my: number, isl: WorldIsland): boolean {
    const dx = mx - isl.cx;
    const dy = (my - isl.cy) / 0.62;
    return dx * dx + dy * dy < isl.size * isl.size * 1.05;
  }

  render(ctx: CanvasRenderingContext2D, game: Game) {
    const w = game.width, h = game.height;
    drawParchmentBackground(ctx, w, h);

    const cx = w / 2;

    // Top compass + banner
    drawCompass(ctx, cx, 86, 38, true);
    drawBanner(ctx, cx, 170, Math.min(420, w - 80), 50, 'Map of Valdor', 28);

    // Decorative ships and clouds (in normalized coords, then translated)
    const sx = (n: number) => this.mapOX + n * (this.mapW / 1000);
    const sy = (n: number) => this.mapOY + n * (this.mapH / 900);

    for (const c of this.clouds) {
      drawCloud(ctx, sx(c.x), sy(c.y), c.s);
    }

    // Decorative dragon (top-left of map area)
    drawDragon(ctx, sx(120), sy(200), 1.0, game.time);

    // Ships
    for (const s of this.ships) {
      ctx.save();
      ctx.scale(s.v < 0 ? -1 : 1, 1);
      drawShip(ctx, (s.v < 0 ? -sx(s.x) : sx(s.x)), sy(s.y), 1.0, s.sail);
      ctx.restore();
    }

    // Draw islands (sorted by Y for depth)
    const ordered = [...this.islands].sort((a, b) => a.cy - b.cy);
    for (const isl of ordered) {
      drawWorldIsland(ctx, isl, this.hoverIsland === isl.id);
    }

    // Hover label
    if (this.hoverIsland !== null) {
      const isl = this.islands.find(i => i.id === this.hoverIsland)!;
      const def = ISLAND_DEFS.find(d => d.id === this.hoverIsland)!;
      const locked = !game.unlockedIslands.has(isl.id);
      const labelY = isl.cy - isl.size * 0.7 - 14;
      const txt = locked ? `${isl.name}  (locked)` : isl.name;
      ctx.font = '20px "IM Fell English SC", serif';
      const m = ctx.measureText(txt);
      const padX = 14, padY = 6;
      const lx = isl.cx - m.width / 2 - padX;
      const ly = labelY - 12;
      ctx.fillStyle = palette.banner;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.4;
      ctx.fillRect(lx, ly, m.width + padX * 2, 28);
      ctx.strokeRect(lx, ly, m.width + padX * 2, 28);
      inkText(ctx, txt, isl.cx, labelY + 2, 18, true, locked ? palette.inkSoft : palette.ink);

      // Difficulty stars
      const starsY = labelY + 30;
      for (let i = 0; i < def.difficulty; i++) {
        drawStar(ctx, isl.cx - (def.difficulty - 1) * 7 + i * 14, starsY, 4, palette.accent);
      }
      // Victory check
      if (game.victories.has(isl.id)) {
        inkText(ctx, '✓ Defended', isl.cx, starsY + 14, 13, false, palette.grassDarker);
      }
    }

    // Footer text
    const footerHint = game.isNarrow ? 'Tap an island to defend it' : 'Click an island to defend it from sea raiders';
    inkText(ctx, footerHint, cx, h - 30, 16, false, palette.inkSoft);
    drawFlourish(ctx, cx, h - 14, Math.min(240, w - 60));

    // Back button
    drawButton(ctx, 24, 24, 140, 44, '← Title', this.hoverButton);
  }
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.5;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
