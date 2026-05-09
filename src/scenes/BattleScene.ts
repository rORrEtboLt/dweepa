import { Game, Scene } from '../Game';
import { palette, inkText, setSeed, rand } from '../render/hand';
import { drawParchmentBackground, drawBanner, drawButton, drawScrollPanel, buttonHit, drawFlourish } from '../render/parchment';
import { TILE_W, TILE_H, isoToScreen } from '../render/iso';
import {
  drawBattleTile, drawUnit, drawHpBar, drawSeaPattern, drawShip, drawCloud,
  drawImpactSparks, drawArrowImpact,
  TileColors, UnitKind, AnimState,
} from '../render/sprites';

interface Tile {
  gx: number;
  gy: number;
  elev: number;
  kind: 'sea' | 'beach' | 'grass' | 'stone' | 'volcanic';
  walkable: boolean;
}

interface UnitDef {
  kind: UnitKind;
  hp: number;
  attack: number;
  range: number;
  cooldown: number;
  speed: number; // tiles/sec
  friendly: boolean;
  cost?: number;
  label?: string;
}

const UNIT_DEFS: Record<UnitKind, UnitDef> = {
  knight: { kind: 'knight', hp: 70, attack: 18, range: 1.1, cooldown: 0.9, speed: 1.4, friendly: true, cost: 1, label: 'Knight' },
  archer: { kind: 'archer', hp: 35, attack: 9, range: 3.4, cooldown: 0.8, speed: 1.2, friendly: true, cost: 1, label: 'Archer' },
  pike: { kind: 'pike', hp: 50, attack: 14, range: 1.5, cooldown: 1.1, speed: 1.2, friendly: true, cost: 1, label: 'Pikeman' },
  raider: { kind: 'raider', hp: 35, attack: 8, range: 1.0, cooldown: 1.0, speed: 1.5, friendly: false },
  brute: { kind: 'brute', hp: 55, attack: 12, range: 1.2, cooldown: 1.3, speed: 0.9, friendly: false },
  scout: { kind: 'scout', hp: 20, attack: 6, range: 1.0, cooldown: 0.6, speed: 2.2, friendly: false },
};

interface Combatant {
  id: number;
  def: UnitDef;
  hp: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  facing: 1 | -1;
  cooldown: number;
  hitFlash: number;
  dead: boolean;
  animState: AnimState;
  animTimer: number;
  animDuration: number;
  walking: boolean;
}

interface Particle {
  x: number;
  y: number;
  kind: 'spark' | 'arrow-hit';
  age: number;
  life: number;
}

interface Projectile {
  x: number;
  y: number;
  tx: number;
  ty: number;
  speed: number;
  damage: number;
  age: number;
  life: number;
  fromFriendly: boolean;
}

interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  age: number;
  life: number;
}

interface Wave {
  count: number;
  delay: number;
  spawnInterval: number;
  enemies?: UnitKind[];
}

const ISLAND_BLUEPRINTS: Record<number, {
  name: string;
  rows: string[]; // characters: . sea, b beach, g grass, s stone, v volcanic, # raised stone
  spawnEdges: ('N'|'S'|'E'|'W')[];
  squads: number;
  waves: Wave[];
}> = {
  0: {
    name: 'Greenshore',
    rows: [
      '..bbbb..',
      '.bggggb.',
      'bggggggb',
      'bgg##ggb',
      'bgg##ggb',
      'bggggggb',
      '.bggggb.',
      '..bbbb..',
    ],
    spawnEdges: ['N','S','E','W'],
    squads: 4,
    waves: [
      { count: 4, delay: 1.5, spawnInterval: 0.7 },
      { count: 6, delay: 4, spawnInterval: 0.6 },
    ],
  },
  1: {
    name: 'Mt. Aerwyn',
    rows: [
      '..ssss..',
      '.sg##gs.',
      'sg####gs',
      's#####ss',
      'ss#####s',
      'sg####gs',
      '.sg##gs.',
      '..ssss..',
    ],
    spawnEdges: ['N','S','E','W'],
    squads: 5,
    waves: [
      { count: 5, delay: 1.5, spawnInterval: 0.6 },
      { count: 7, delay: 4, spawnInterval: 0.55 },
      { count: 8, delay: 5, spawnInterval: 0.5 },
    ],
  },
  2: {
    name: 'Emberhold',
    rows: [
      '..bbbb..',
      '.bvvvvb.',
      'bvv##vvb',
      'bv####vb',
      'bv####vb',
      'bvv##vvb',
      '.bvvvvb.',
      '..bbbb..',
    ],
    spawnEdges: ['N','S','E','W'],
    squads: 5,
    waves: [
      { count: 6, delay: 1.5, spawnInterval: 0.55 },
      { count: 8, delay: 4, spawnInterval: 0.5, enemies: ['raider', 'raider', 'raider', 'scout'] },
      { count: 10, delay: 5, spawnInterval: 0.45, enemies: ['raider', 'raider', 'scout', 'brute'] },
    ],
  },
  3: {
    name: 'Crown Keep',
    rows: [
      '..ssss..',
      '.sgggss.',
      'sggggsgs',
      's#g##gss',
      'sg####gs',
      'sgggggss',
      '.ssgggs.',
      '..ssss..',
    ],
    spawnEdges: ['N','S','E','W'],
    squads: 6,
    waves: [
      { count: 7, delay: 1.5, spawnInterval: 0.5, enemies: ['raider', 'raider', 'scout'] },
      { count: 9, delay: 4, spawnInterval: 0.45, enemies: ['raider', 'brute', 'scout', 'raider'] },
      { count: 12, delay: 5, spawnInterval: 0.4, enemies: ['raider', 'brute', 'scout', 'brute', 'raider'] },
    ],
  },
  4: {
    name: 'Palm Reach',
    rows: [
      '..bbbb..',
      '.bbggbb.',
      'bggggggb',
      'bggggggb',
      'bggggggb',
      'bggggggb',
      '.bbggbb.',
      '..bbbb..',
    ],
    spawnEdges: ['N','S','E','W'],
    squads: 4,
    waves: [
      { count: 5, delay: 1.5, spawnInterval: 0.6 },
      { count: 8, delay: 4, spawnInterval: 0.5 },
    ],
  },
};

const TILE_COLORS: Record<Tile['kind'], TileColors> = {
  sea: { top: palette.water, cliff: palette.waterDark, cliffDark: palette.waterDark },
  beach: { top: palette.sand, cliff: '#a87850', cliffDark: '#6e4e30' },
  grass: { top: palette.grass, cliff: palette.cliff, cliffDark: palette.cliffDark },
  stone: { top: palette.stone, cliff: palette.stoneDark, cliffDark: '#48433a' },
  volcanic: { top: '#7a6258', cliff: '#5a4438', cliffDark: '#3a2a20' },
};

let _id = 1;

export class BattleScene implements Scene {
  private blueprint: typeof ISLAND_BLUEPRINTS[0];
  private tiles: Tile[][] = [];
  private gridW: number;
  private gridH: number;
  private camX = 0;
  private camY = 0;
  private battleScale = 1;
  private pivotX = 0;
  private pivotY = 0;

  private friendly: Combatant[] = [];
  private enemies: Combatant[] = [];
  private projectiles: Projectile[] = [];
  private floats: FloatText[] = [];
  private particles: Particle[] = [];
  private screenShake = 0;
  private dying: Combatant[] = [];

  private phase: 'place' | 'wave-intro' | 'battle' | 'victory' | 'defeat' = 'place';
  private squadsLeft: number;
  private selectedSquad: UnitKind | null = 'knight';
  private currentWave = 0;
  private waveSpawnTimer = 0;
  private waveSpawnedCount = 0;
  private waveIntroTimer = 0;
  private waveIntroText = '';

  private hoverTile: Tile | null = null;
  private hoverButton: 'begin' | 'retreat' | 'next' | null = null;
  private hoverSquad: UnitKind | null = null;

  private decorClouds: { nx: number; ny: number; s: number; v: number }[] = [];
  private decorBoats: { side: 'left' | 'right'; x: number; y: number; v: number; sail: string }[] = [];

  constructor(private islandId: number) {
    this.blueprint = ISLAND_BLUEPRINTS[islandId] ?? ISLAND_BLUEPRINTS[0];
    const rows = this.blueprint.rows;
    this.gridW = rows[0].length;
    this.gridH = rows.length;
    this.tiles = [];
    for (let gy = 0; gy < this.gridH; gy++) {
      const row: Tile[] = [];
      for (let gx = 0; gx < this.gridW; gx++) {
        const ch = rows[gy][gx];
        const t: Tile = this.tileFromChar(gx, gy, ch);
        row.push(t);
      }
      this.tiles.push(row);
    }
    this.squadsLeft = this.blueprint.squads;

    for (let i = 0; i < 3; i++) {
      this.decorClouds.push({
        nx: Math.random(),
        ny: Math.random() * 0.4,
        s: 0.8 + Math.random() * 0.6,
        v: 0.01 + Math.random() * 0.02,
      });
    }
  }

  private tileFromChar(gx: number, gy: number, ch: string): Tile {
    switch (ch) {
      case '.': return { gx, gy, elev: 0, kind: 'sea', walkable: false };
      case 'b': return { gx, gy, elev: 0, kind: 'beach', walkable: true };
      case 'g': return { gx, gy, elev: 0, kind: 'grass', walkable: true };
      case 's': return { gx, gy, elev: 0, kind: 'stone', walkable: true };
      case 'v': return { gx, gy, elev: 0, kind: 'volcanic', walkable: true };
      case '#': return { gx, gy, elev: 1, kind: 'stone', walkable: true };
      default: return { gx, gy, elev: 0, kind: 'grass', walkable: true };
    }
  }

  private gridCenter() {
    return { x: (this.gridW - 1) / 2, y: (this.gridH - 1) / 2 };
  }

  private hudBarH(game: Game): number {
    return game.isNarrow && this.phase === 'place' ? 160 : 110;
  }

  private layout(game: Game) {
    const c = this.gridCenter();
    const center = isoToScreen(c.x, c.y);

    const topArea = 80;
    const bottomArea = game.isNarrow ? 160 : 110;
    const availW = game.width - 20;
    const availH = game.height - topArea - bottomArea;
    this.battleScale = Math.min(1, availW / 480, availH / 260);

    this.pivotX = game.width / 2;
    this.pivotY = topArea + availH / 2;
    this.camX = this.pivotX - center.x;
    this.camY = this.pivotY - center.y;
  }

  private screenForTile(gx: number, gy: number, elev: number) {
    const p = isoToScreen(gx, gy, 0);
    return { x: p.x + this.camX, y: p.y + this.camY - elev * 14 };
  }

  private tileAtScreen(sx: number, sy: number): Tile | null {
    for (let gy = this.gridH - 1; gy >= 0; gy--) {
      for (let gx = this.gridW - 1; gx >= 0; gx--) {
        const t = this.tiles[gy][gx];
        const p = this.screenForTile(gx, gy, t.elev);
        const dx = sx - p.x;
        const dy = sy - p.y;
        // diamond test
        if (Math.abs(dx) / (TILE_W / 2) + Math.abs(dy) / (TILE_H / 2) <= 1) {
          return t;
        }
      }
    }
    return null;
  }

  update(dt: number, game: Game) {
    this.layout(game);
    const mx = game.input.mouseX, my = game.input.mouseY;
    this.hoverButton = null;
    this.hoverSquad = null;

    // HUD button hit detection (positions match render below)
    const narrow = game.isNarrow;
    const barH = this.hudBarH(game);
    const bottomBar = game.height - barH;
    if (this.phase === 'place') {
      const squads: UnitKind[] = ['knight', 'archer', 'pike'];
      const cardW = narrow ? 86 : 100;
      const cardH = narrow ? 58 : 70;
      const cardGap = narrow ? 6 : 10;
      const totalCardsW = squads.length * cardW + (squads.length - 1) * cardGap;
      const cardsX = narrow ? (game.width - totalCardsW) / 2 : 24;
      const cardsY = bottomBar + (narrow ? 10 : 16);
      for (let i = 0; i < squads.length; i++) {
        if (buttonHit(mx, my, cardsX + i * (cardW + cardGap), cardsY, cardW, cardH)) {
          this.hoverSquad = squads[i];
        }
      }
      const btnW = narrow ? Math.min(200, game.width - 48) : 180;
      const btnH = narrow ? 44 : 50;
      const btnX = narrow ? (game.width - btnW) / 2 : game.width - 220;
      const btnY = narrow ? cardsY + cardH + 32 : bottomBar + 24;
      if (buttonHit(mx, my, btnX, btnY, btnW, btnH)) this.hoverButton = 'begin';
    }
    if (buttonHit(mx, my, 24, 24, 130, 44)) this.hoverButton = 'retreat';
    if (this.phase === 'victory' || this.phase === 'defeat') {
      const bx = game.width / 2 - 110;
      const by = game.height / 2 + 50;
      if (buttonHit(mx, my, bx, by, 220, 56)) this.hoverButton = 'next';
    }

    // Hover tile (inverse-transform mouse through battle scale)
    const imx = this.pivotX + (mx - this.pivotX) / this.battleScale;
    const imy = this.pivotY + (my - this.pivotY) / this.battleScale;
    this.hoverTile = this.tileAtScreen(imx, imy);

    if (game.input.clicked) {
      if (this.hoverButton === 'retreat') {
        game.goto('map');
        return;
      }
      if (this.hoverButton === 'next') {
        if (this.phase === 'victory') {
          game.victories.add(this.islandId);
          for (let i = this.islandId + 1; i <= this.islandId + 1; i++) {
            if (ISLAND_BLUEPRINTS[i]) game.unlockedIslands.add(i);
          }
        }
        game.goto('map');
        return;
      }

      if (this.phase === 'place') {
        if (this.hoverButton === 'begin' && this.friendly.length > 0) {
          this.startNextWave();
          return;
        }
        if (this.hoverSquad) {
          this.selectedSquad = this.hoverSquad;
          return;
        }
        // Place selected squad on tile
        if (this.hoverTile && this.selectedSquad && this.squadsLeft > 0 && this.canPlaceOn(this.hoverTile)) {
          const def = UNIT_DEFS[this.selectedSquad];
          this.friendly.push({
            id: _id++,
            def,
            hp: def.hp,
            x: this.hoverTile.gx,
            y: this.hoverTile.gy,
            tx: this.hoverTile.gx,
            ty: this.hoverTile.gy,
            facing: 1,
            cooldown: 0,
            hitFlash: 0,
            dead: false,
            animState: 'idle',
            animTimer: 0,
            animDuration: 0,
            walking: false,
          });
          this.squadsLeft--;
        }
      }
    }

    // Right-click to remove placed unit during placement
    if (game.input.rightClicked && this.phase === 'place' && this.hoverTile) {
      const idx = this.friendly.findIndex(u => u.tx === this.hoverTile!.gx && u.ty === this.hoverTile!.gy);
      if (idx >= 0) {
        this.friendly.splice(idx, 1);
        this.squadsLeft++;
      }
    }

    // Wave intro tick
    if (this.phase === 'wave-intro') {
      this.waveIntroTimer -= dt;
      if (this.waveIntroTimer <= 0) {
        this.phase = 'battle';
        this.waveSpawnTimer = 0;
        this.waveSpawnedCount = 0;
      }
    }

    if (this.phase === 'battle') {
      this.tickBattle(dt);
    }

    // Update floats
    for (const f of this.floats) {
      f.age += dt;
    }
    this.floats = this.floats.filter(f => f.age < f.life);

    // Animate decor
    for (const c of this.decorClouds) {
      c.nx += c.v * dt;
      if (c.nx > 1.1) c.nx = -0.1;
    }
  }

  private canPlaceOn(t: Tile): boolean {
    if (!t.walkable) return false;
    return !this.friendly.some(u => u.tx === t.gx && u.ty === t.gy);
  }

  private startNextWave() {
    if (this.currentWave >= this.blueprint.waves.length) return;
    const w = this.blueprint.waves[this.currentWave];
    this.phase = 'wave-intro';
    this.waveIntroTimer = w.delay;
    this.waveIntroText = `Wave ${this.currentWave + 1} of ${this.blueprint.waves.length}`;
  }

  private spawnEnemy(enemyKind?: UnitKind) {
    const edges: { gx: number; gy: number }[] = [];
    for (let gx = 0; gx < this.gridW; gx++) {
      edges.push({ gx, gy: -1.5 });
      edges.push({ gx, gy: this.gridH + 0.5 });
    }
    for (let gy = 0; gy < this.gridH; gy++) {
      edges.push({ gx: -1.5, gy });
      edges.push({ gx: this.gridW + 0.5, gy });
    }
    const e = edges[Math.floor(Math.random() * edges.length)];
    const kind = enemyKind ?? 'raider';
    const def = UNIT_DEFS[kind];
    this.enemies.push({
      id: _id++,
      def,
      hp: def.hp,
      x: e.gx,
      y: e.gy,
      tx: 0,
      ty: 0,
      facing: 1,
      cooldown: 0,
      hitFlash: 0,
      dead: false,
      animState: 'walk',
      animTimer: 0,
      animDuration: 0,
      walking: true,
    });
  }

  private tickBattle(dt: number) {
    const w = this.blueprint.waves[this.currentWave];
    if (this.waveSpawnedCount < w.count) {
      this.waveSpawnTimer -= dt;
      if (this.waveSpawnTimer <= 0) {
        const enemyPool = w.enemies;
        const kind = enemyPool
          ? enemyPool[this.waveSpawnedCount % enemyPool.length]
          : 'raider' as UnitKind;
        this.spawnEnemy(kind);
        this.waveSpawnedCount++;
        this.waveSpawnTimer = w.spawnInterval;
      }
    }

    // Screen shake decay
    this.screenShake = Math.max(0, this.screenShake - dt * 15);

    // Update animation timers for all units
    const allUnits = [...this.friendly, ...this.enemies];
    for (const u of allUnits) {
      if (u.animState !== 'idle' && u.animState !== 'walk') {
        u.animTimer += dt;
        if (u.animTimer >= u.animDuration) {
          u.animState = u.walking ? 'walk' : 'idle';
          u.animTimer = 0;
        }
      }
    }

    // Update dying units
    for (const d of this.dying) {
      d.animTimer += dt;
    }
    this.dying = this.dying.filter(d => d.animTimer < d.animDuration);

    // Update particles
    for (const p of this.particles) p.age += dt;
    this.particles = this.particles.filter(p => p.age < p.life);

    // Update friendly: pick target, attack
    for (const u of this.friendly) {
      if (u.dead) continue;
      u.cooldown = Math.max(0, u.cooldown - dt);
      u.hitFlash = Math.max(0, u.hitFlash - dt);
      const target = this.findNearest(u, this.enemies, u.def.range);
      if (target) {
        u.facing = target.x >= u.x ? 1 : -1;
        if (u.cooldown <= 0 && u.animState !== 'attack') {
          this.attackBetween(u, target, true);
          u.cooldown = u.def.cooldown;
        }
      }
    }

    // Update enemies: walk toward center; attack friendly in range
    const c = this.gridCenter();
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.cooldown = Math.max(0, e.cooldown - dt);
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      const target = this.findNearest(e, this.friendly, e.def.range);
      if (target) {
        e.facing = target.x >= e.x ? 1 : -1;
        e.walking = false;
        if (e.animState === 'walk') e.animState = 'idle';
        if (e.cooldown <= 0 && e.animState !== 'attack') {
          this.attackBetween(e, target, false);
          e.cooldown = e.def.cooldown;
        }
      } else {
        e.walking = true;
        if (e.animState === 'idle') e.animState = 'walk';
        const dx = c.x - e.x;
        const dy = c.y - e.y;
        const d = Math.hypot(dx, dy);
        if (d > 0.05) {
          const v = e.def.speed * dt;
          e.x += (dx / d) * v;
          e.y += (dy / d) * v;
          e.facing = dx >= 0 ? 1 : -1;
        }
      }
    }

    // Update projectiles
    for (const p of this.projectiles) {
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      const v = p.speed * dt;
      if (d <= v) {
        p.age = p.life;
        this.particles.push({ x: p.tx, y: p.ty, kind: 'arrow-hit', age: 0, life: 0.4 });
      } else {
        p.x += (dx / d) * v;
        p.y += (dy / d) * v;
        p.age += dt;
      }
    }
    this.projectiles = this.projectiles.filter(p => p.age < p.life);

    // Move dead units to dying list for death animation
    for (const u of this.friendly) {
      if (u.dead) {
        u.animState = 'dying';
        u.animTimer = 0;
        u.animDuration = 0.6;
        this.dying.push(u);
      }
    }
    for (const u of this.enemies) {
      if (u.dead) {
        u.animState = 'dying';
        u.animTimer = 0;
        u.animDuration = 0.6;
        this.dying.push(u);
      }
    }
    this.friendly = this.friendly.filter(u => !u.dead);
    this.enemies = this.enemies.filter(u => !u.dead);

    // Win/lose checks
    if (this.friendly.length === 0 && this.dying.filter(d => d.def.friendly).length === 0) {
      this.phase = 'defeat';
      return;
    }
    const waveDone = this.waveSpawnedCount >= w.count && this.enemies.length === 0;
    if (waveDone) {
      if (this.currentWave + 1 < this.blueprint.waves.length) {
        this.currentWave++;
        this.startNextWave();
      } else {
        this.phase = 'victory';
      }
    }
  }

  private findNearest(self: Combatant, list: Combatant[], range: number): Combatant | null {
    let best: Combatant | null = null;
    let bestD = range + 0.001;
    for (const o of list) {
      if (o.dead) continue;
      const d = Math.hypot(o.x - self.x, o.y - self.y);
      if (d <= bestD) {
        best = o;
        bestD = d;
      }
    }
    return best;
  }

  private attackBetween(attacker: Combatant, target: Combatant, fromFriendly: boolean) {
    // Trigger attack animation
    attacker.animState = 'attack';
    attacker.animTimer = 0;
    attacker.animDuration = 0.3;

    if (attacker.def.range > 1.6) {
      this.projectiles.push({
        x: attacker.x,
        y: attacker.y,
        tx: target.x,
        ty: target.y,
        speed: 10,
        damage: attacker.def.attack,
        age: 0,
        life: Math.max(0.05, Math.hypot(target.x - attacker.x, target.y - attacker.y) / 10),
        fromFriendly,
      });
      this.applyDamage(target, attacker.def.attack);
    } else {
      this.applyDamage(target, attacker.def.attack);
      // Melee impact sparks
      const mx = (attacker.x + target.x) / 2;
      const my = (attacker.y + target.y) / 2;
      this.particles.push({ x: mx, y: my, kind: 'spark', age: 0, life: 0.3 });
      this.screenShake = Math.max(this.screenShake, 2);
    }
  }

  private applyDamage(t: Combatant, dmg: number) {
    t.hp -= dmg;
    t.hitFlash = 0.18;
    // Trigger hurt animation (unless dying)
    if (t.hp > 0 && t.animState !== 'attack') {
      t.animState = 'hurt';
      t.animTimer = 0;
      t.animDuration = 0.15;
    }
    this.floats.push({
      x: t.x,
      y: t.y,
      text: `-${dmg}`,
      color: palette.accent,
      age: 0,
      life: 0.8,
    });
    if (t.hp <= 0) {
      t.dead = true;
      this.screenShake = Math.max(this.screenShake, 4);
    }
  }

  // Rendering --------------------------------------------------------------

  render(ctx: CanvasRenderingContext2D, game: Game) {
    const w = game.width, h = game.height;

    // Sea background (parchment)
    drawParchmentBackground(ctx, w, h);

    // Screen shake
    if (this.screenShake > 0.1) {
      const sx = (Math.random() - 0.5) * this.screenShake;
      const sy = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(sx, sy);
    }

    // Scaled context for island rendering
    ctx.save();
    ctx.translate(this.pivotX, this.pivotY);
    ctx.scale(this.battleScale, this.battleScale);
    ctx.translate(-this.pivotX, -this.pivotY);

    // Sea around the island
    this.drawSea(ctx, game);

    // Tiles, units, projectiles in iso depth order
    this.drawIsland(ctx, game);

    ctx.restore();

    // Decorative clouds (screen space)
    for (const c of this.decorClouds) {
      drawCloud(ctx, c.nx * w, 80 + c.ny * 100, c.s);
    }

    // HUD
    this.drawHUD(ctx, game);

    // Phase overlays
    if (this.phase === 'wave-intro') {
      this.drawWaveIntro(ctx, game);
    }
    if (this.phase === 'victory' || this.phase === 'defeat') {
      this.drawEndScreen(ctx, game);
    }
  }

  private drawSea(ctx: CanvasRenderingContext2D, game: Game) {
    // Soft sea-blue tinted region behind the island
    const c = this.gridCenter();
    const center = isoToScreen(c.x, c.y);
    const cx = this.camX + center.x;
    const cy = this.camY + center.y;
    const rx = TILE_W * (this.gridW + 4) * 0.5;
    const ry = TILE_H * (this.gridH + 4) * 0.55;
    ctx.save();
    const grad = ctx.createRadialGradient(cx, cy, rx * 0.4, cx, cy, rx * 1.1);
    grad.addColorStop(0, 'rgba(126, 168, 184, 0.55)');
    grad.addColorStop(1, 'rgba(126, 168, 184, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Clip to ellipse and draw wavelets
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    drawSeaPattern(ctx, cx - rx, cy - ry, rx * 2, ry * 2, game.time);
    ctx.restore();
  }

  private drawIsland(ctx: CanvasRenderingContext2D, game: Game) {
    // Render tiles in iso depth order (gx + gy ascending)
    const order: { gx: number; gy: number }[] = [];
    for (let gy = 0; gy < this.gridH; gy++) {
      for (let gx = 0; gx < this.gridW; gx++) {
        order.push({ gx, gy });
      }
    }
    order.sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));

    // Pass 1: draw tiles
    for (const { gx, gy } of order) {
      const t = this.tiles[gy][gx];
      if (t.kind === 'sea') continue;
      const p = this.screenForTile(gx, gy, 0);
      const colors = TILE_COLORS[t.kind];
      let highlight: 'none' | 'hover' | 'select' | 'red' = 'none';
      if (this.phase === 'place' && this.hoverTile === t) {
        highlight = this.canPlaceOn(t) ? 'select' : 'red';
      }
      drawBattleTile(ctx, p.x, p.y, t.elev, colors, highlight, t.kind);
    }

    // Pass 2: draw entities sorted by their (gx + gy) for proper overlap
    type Renderable = { y: number; draw: () => void };
    const renderables: Renderable[] = [];

    const addUnitRenderable = (u: Combatant, friendly: boolean) => {
      const gy = Math.max(0, Math.min(this.gridH - 1, Math.round(u.y)));
      const gx = Math.max(0, Math.min(this.gridW - 1, Math.round(u.x)));
      const elev = this.tiles[gy]?.[gx]?.elev ?? 0;
      const p = this.screenForTile(u.x, u.y, elev);
      const sortKey = u.x + u.y + (friendly ? 0.01 : 0);
      const animProgress = u.animDuration > 0 ? u.animTimer / u.animDuration : 0;
      renderables.push({
        y: sortKey,
        draw: () => {
          if (u.hitFlash > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
          }
          drawUnit(ctx, p.x, p.y - 4, u.def.kind, u.facing, game.time + u.id, u.animState, animProgress);
          if (u.hitFlash > 0) ctx.restore();
          if (u.animState !== 'dying') {
            drawHpBar(ctx, p.x, p.y - 32, friendly ? 18 : 16, u.hp / u.def.hp, friendly);
          }
        },
      });
    };

    for (const u of this.friendly) addUnitRenderable(u, true);
    for (const e of this.enemies) addUnitRenderable(e, false);
    for (const d of this.dying) addUnitRenderable(d, d.def.friendly);

    renderables.sort((a, b) => a.y - b.y);
    for (const r of renderables) r.draw();

    // Particles (melee sparks, arrow impacts)
    for (const part of this.particles) {
      const pp = this.screenForTile(part.x, part.y, 0);
      const progress = part.age / part.life;
      if (part.kind === 'spark') {
        drawImpactSparks(ctx, pp.x, pp.y - 14, progress);
      } else {
        drawArrowImpact(ctx, pp.x, pp.y - 12, progress);
      }
    }

    // Projectiles (top layer) — parabolic arc
    for (const p of this.projectiles) {
      const sp = this.screenForTile(p.x, p.y, 0);
      const progress = p.life > 0 ? p.age / p.life : 0;
      const arcHeight = Math.sin(progress * Math.PI) * 20;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.5;
      const back = this.screenForTile(
        p.x - (p.tx - p.x) * 0.08,
        p.y - (p.ty - p.y) * 0.08,
        0
      );
      const backArc = Math.sin(Math.max(0, progress - 0.08) * Math.PI) * 20;
      ctx.beginPath();
      ctx.moveTo(back.x, back.y - 12 - backArc);
      ctx.lineTo(sp.x, sp.y - 12 - arcHeight);
      ctx.stroke();
      // Arrowhead
      ctx.fillStyle = palette.ink;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y - 12 - arcHeight, 1.8, 0, Math.PI * 2);
      ctx.fill();
      // Arrow fletching
      ctx.strokeStyle = palette.red;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(back.x, back.y - 12 - backArc - 1.5);
      ctx.lineTo(back.x, back.y - 12 - backArc + 1.5);
      ctx.stroke();
    }

    // Floating damage numbers (arc upward with slight curve)
    for (const f of this.floats) {
      const p = this.screenForTile(f.x, f.y, 0);
      const progress = f.age / f.life;
      const a = 1 - progress;
      const rise = progress * 25;
      const drift = Math.sin(progress * Math.PI) * 6;
      ctx.globalAlpha = a;
      const size = 14 + (1 - progress) * 4;
      inkText(ctx, f.text, p.x + drift, p.y - 30 - rise, size, true, f.color);
      ctx.globalAlpha = 1;
    }
  }

  private drawHUD(ctx: CanvasRenderingContext2D, game: Game) {
    const w = game.width, h = game.height;
    const narrow = game.isNarrow;

    // Top banner: island name + wave info
    drawBanner(ctx, w / 2, 50, Math.min(420, w - 80), 44, this.blueprint.name, 24);

    // Wave info (below banner on narrow, top-right on wide)
    const waveText = this.phase === 'place' ? 'Prepare your defenders' : `Wave ${Math.min(this.currentWave + 1, this.blueprint.waves.length)} / ${this.blueprint.waves.length}`;
    if (narrow) {
      inkText(ctx, waveText, w / 2, 84, 15, true, palette.ink);
    } else {
      inkText(ctx, waveText, w - 24, 30, 18, true, palette.ink, 'right');
      inkText(ctx, `Foes remaining: ${this.enemies.length + this.remainingToSpawn()}`, w - 24, 54, 14, false, palette.inkLight, 'right');
    }

    // Retreat / Back button
    drawButton(ctx, 24, 24, 130, 44, '← Retreat', this.hoverButton === 'retreat');

    // Bottom HUD bar (scroll panel)
    const barH = this.hudBarH(game);
    const bottomY = h - barH;
    drawScrollPanel(ctx, 0, bottomY, w, barH);

    if (this.phase === 'place') {
      const squads: UnitKind[] = ['knight', 'archer', 'pike'];
      const cardW = narrow ? 86 : 100;
      const cardH = narrow ? 58 : 70;
      const cardGap = narrow ? 6 : 10;
      const totalCardsW = squads.length * cardW + (squads.length - 1) * cardGap;
      const cardsX = narrow ? (w - totalCardsW) / 2 : 24;
      const cardsY = bottomY + (narrow ? 10 : 16);

      for (let i = 0; i < squads.length; i++) {
        const k = squads[i];
        const x = cardsX + i * (cardW + cardGap);
        const y = cardsY;
        const selected = this.selectedSquad === k;
        const hover = this.hoverSquad === k;
        ctx.save();
        ctx.fillStyle = selected ? palette.parchmentLight : palette.parchmentDark;
        ctx.strokeStyle = selected ? palette.accent : palette.ink;
        ctx.lineWidth = selected ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.rect(x, y, cardW, cardH);
        ctx.fill();
        ctx.stroke();
        if (hover && !selected) {
          ctx.globalAlpha = 0.18;
          ctx.fillStyle = '#fff5c8';
          ctx.fillRect(x, y, cardW, cardH);
          ctx.globalAlpha = 1;
        }
        ctx.restore();
        const unitScale = narrow ? 0.85 : 1;
        const unitX = x + (narrow ? 22 : 28);
        const unitY = y + (narrow ? 42 : 50);
        ctx.save();
        ctx.translate(unitX, unitY);
        ctx.scale(unitScale, unitScale);
        ctx.translate(-unitX, -unitY);
        drawUnit(ctx, unitX, unitY, k, 1, game.time);
        ctx.restore();
        const def = UNIT_DEFS[k];
        const labelX = x + (narrow ? 50 : 64);
        const labelSz = narrow ? 11 : 13;
        const statSz = narrow ? 10 : 11;
        inkText(ctx, def.label!, labelX, y + (narrow ? 18 : 22), labelSz, true, palette.ink, 'left');
        inkText(ctx, `HP ${def.hp}`, labelX, y + (narrow ? 30 : 38), statSz, false, palette.inkLight, 'left');
        inkText(ctx, `ATK ${def.attack}`, labelX, y + (narrow ? 42 : 52), statSz, false, palette.inkLight, 'left');
      }

      if (narrow) {
        // Two-row layout: cards on top, status + button below
        inkText(ctx, `Squads: ${this.squadsLeft}`, w / 2, cardsY + cardH + 14, 15, true, palette.ink);
        const btnW = Math.min(200, w - 48);
        const btnH = 44;
        const btnX = (w - btnW) / 2;
        const btnY = cardsY + cardH + 32;
        drawButton(ctx, btnX, btnY, btnW, btnH, 'Begin Battle ⚔', this.hoverButton === 'begin', this.friendly.length === 0);
      } else {
        inkText(ctx, `Squads left: ${this.squadsLeft}`, w / 2, bottomY + 30, 18, true, palette.ink);
        const deployText = this.selectedSquad ? `Click to deploy ${UNIT_DEFS[this.selectedSquad].label} · Right-click to remove` : 'Pick a squad';
        inkText(ctx, deployText, w / 2, bottomY + 56, 14, false, palette.inkLight);
        drawFlourish(ctx, w / 2, bottomY + 78, 220);
        drawButton(ctx, w - 220, bottomY + 24, 180, 50, 'Begin Battle ⚔', this.hoverButton === 'begin', this.friendly.length === 0);
      }
    } else {
      // Battle status
      if (narrow) {
        inkText(ctx, `Defenders: ${this.friendly.length}  ·  Raiders: ${this.enemies.length + this.remainingToSpawn()}`, w / 2, bottomY + 34, 16, true, palette.ink);
        inkText(ctx, 'Hold the line!', w / 2, bottomY + 58, 15, false, palette.inkSoft);
        drawFlourish(ctx, w / 2, bottomY + 78, Math.min(220, w - 60));
      } else {
        inkText(ctx, `Defenders: ${this.friendly.length}`, 40, bottomY + 30, 18, true, palette.ink, 'left');
        inkText(ctx, `Raiders: ${this.enemies.length + this.remainingToSpawn()}`, 40, bottomY + 56, 16, false, palette.inkLight, 'left');
        inkText(ctx, `Hold the line, defender.`, w / 2, bottomY + 40, 18, false, palette.inkSoft);
        drawFlourish(ctx, w / 2, bottomY + 64, 220);
      }
    }
  }

  private remainingToSpawn(): number {
    if (this.phase === 'place' || this.phase === 'wave-intro') {
      let total = 0;
      for (let i = this.currentWave; i < this.blueprint.waves.length; i++) {
        total += this.blueprint.waves[i].count;
      }
      return total;
    }
    if (this.phase === 'battle') {
      let total = 0;
      const cur = this.blueprint.waves[this.currentWave];
      total += Math.max(0, cur.count - this.waveSpawnedCount);
      for (let i = this.currentWave + 1; i < this.blueprint.waves.length; i++) {
        total += this.blueprint.waves[i].count;
      }
      return total;
    }
    return 0;
  }

  private drawWaveIntro(ctx: CanvasRenderingContext2D, game: Game) {
    ctx.save();
    ctx.fillStyle = 'rgba(20, 12, 4, 0.45)';
    ctx.fillRect(0, game.height / 2 - 60, game.width, 120);
    ctx.restore();
    drawBanner(ctx, game.width / 2, game.height / 2, Math.min(560, game.width - 80), 64, this.waveIntroText, 32);
  }

  private drawEndScreen(ctx: CanvasRenderingContext2D, game: Game) {
    ctx.save();
    ctx.fillStyle = 'rgba(20, 12, 4, 0.55)';
    ctx.fillRect(0, 0, game.width, game.height);
    ctx.restore();

    const cx = game.width / 2, cy = game.height / 2;
    const won = this.phase === 'victory';
    drawBanner(ctx, cx, cy - 60, Math.min(620, game.width - 80), 80, won ? 'Victory!' : 'The Shore is Lost', 38);
    inkText(ctx, won ? 'The raiders are repelled. Word reaches the next isle.' : 'Your defenders have fallen. Try again, brave knight.', cx, cy + 10, 18, false, palette.parchmentLight);
    drawButton(ctx, cx - 110, cy + 50, 220, 56, won ? 'Continue ▸' : 'Return to Map', this.hoverButton === 'next');
  }
}
