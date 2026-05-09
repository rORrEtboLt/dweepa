import { Input } from './Input';
import { TitleScene } from './scenes/TitleScene';
import { MapScene } from './scenes/MapScene';
import { BattleScene } from './scenes/BattleScene';

export type CursorStyle = 'default' | 'pointer' | 'crosshair' | 'not-allowed';

export interface Scene {
  update(dt: number, game: Game): void;
  render(ctx: CanvasRenderingContext2D, game: Game): void;
}

export type SceneId = 'title' | 'map' | 'battle';

const SAVE_KEY = 'isles-of-valdor-save';

export class Game {
  ctx: CanvasRenderingContext2D;
  input: Input;
  scene: Scene;
  width = 0;
  height = 0;
  time = 0;
  private lastTime = 0;
  unlockedIslands = new Set<number>([0]);
  victories = new Set<number>();

  get isNarrow(): boolean {
    return this.width < 600;
  }

  constructor(public canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.input = new Input(canvas);
    this.scene = new TitleScene();
    this.loadProgress();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  saveProgress() {
    try {
      const data = {
        unlocked: [...this.unlockedIslands],
        victories: [...this.victories],
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch { /* localStorage may be unavailable */ }
  }

  private loadProgress() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.unlocked)) this.unlockedIslands = new Set(data.unlocked);
      if (Array.isArray(data.victories)) this.victories = new Set(data.victories);
    } catch { /* ignore corrupt save data */ }
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  goto(scene: SceneId, opts?: { islandId?: number }) {
    if (scene === 'title') this.scene = new TitleScene();
    else if (scene === 'map') this.scene = new MapScene();
    else this.scene = new BattleScene(opts?.islandId ?? 0);
  }

  setCursor(style: CursorStyle) {
    if (this.canvas.style.cursor !== style) {
      this.canvas.style.cursor = style;
    }
  }

  start() {
    const loop = (t: number) => {
      if (!this.lastTime) this.lastTime = t;
      const dt = Math.min(0.05, (t - this.lastTime) / 1000);
      this.lastTime = t;
      this.time += dt;

      this.setCursor('default');
      this.scene.update(dt, this);
      this.scene.render(this.ctx, this);
      this.input.endFrame();

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
