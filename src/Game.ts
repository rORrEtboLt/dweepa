import { Input } from './Input';
import { TitleScene } from './scenes/TitleScene';
import { MapScene } from './scenes/MapScene';
import { BattleScene } from './scenes/BattleScene';

export interface Scene {
  update(dt: number, game: Game): void;
  render(ctx: CanvasRenderingContext2D, game: Game): void;
}

export type SceneId = 'title' | 'map' | 'battle';

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
    this.resize();
    window.addEventListener('resize', () => this.resize());
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

  start() {
    const loop = (t: number) => {
      if (!this.lastTime) this.lastTime = t;
      const dt = Math.min(0.05, (t - this.lastTime) / 1000);
      this.lastTime = t;
      this.time += dt;

      this.scene.update(dt, this);
      this.scene.render(this.ctx, this);
      this.input.endFrame();

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
