import { Game, Scene } from '../Game';
import { palette, inkText } from '../render/hand';
import { drawParchmentBackground, drawBanner, drawButton, drawCompass, drawFlourish, buttonHit } from '../render/parchment';
import { drawDragon, drawShip } from '../render/sprites';

export class TitleScene implements Scene {
  private hover: 'begin' | 'about' | null = null;

  update(_dt: number, game: Game) {
    const cx = game.width / 2;
    const cy = game.height / 2;
    const bw = 260, bh = 56;
    const beginY = cy + 110;
    const aboutY = cy + 110 + bh + 16;
    const mx = game.input.mouseX, my = game.input.mouseY;

    this.hover = null;
    if (buttonHit(mx, my, cx - bw / 2, beginY, bw, bh)) this.hover = 'begin';
    else if (buttonHit(mx, my, cx - bw / 2, aboutY, bw, bh)) this.hover = 'about';

    if (game.input.clicked && this.hover === 'begin') {
      game.goto('map');
    }
  }

  render(ctx: CanvasRenderingContext2D, game: Game) {
    const w = game.width, h = game.height;
    drawParchmentBackground(ctx, w, h);

    const cx = w / 2;
    const cy = h / 2;

    // Compass behind title
    drawCompass(ctx, cx, cy - 200, 60, true);

    // Big banner
    const titleW = Math.min(640, w - 80);
    drawBanner(ctx, cx, cy - 80, titleW, 70, 'ISLES OF VALDOR', 36);

    // Subtitle
    inkText(ctx, 'A Tale of Tides and Steel', cx, cy - 30, 22, false, palette.inkLight);
    drawFlourish(ctx, cx, cy - 8, 220);

    // Decorative dragon
    drawDragon(ctx, cx - titleW / 2 - 30, cy - 170, 0.9, game.time);
    // Decorative ship
    drawShip(ctx, cx + titleW / 2 + 60, cy - 30, 0.9, palette.red);

    // Buttons
    const bw = 260, bh = 56;
    drawButton(ctx, cx - bw / 2, cy + 110, bw, bh, 'Begin Adventure', this.hover === 'begin');
    drawButton(ctx, cx - bw / 2, cy + 110 + bh + 16, bw, bh, 'How to Defend', this.hover === 'about', true);

    // Footer
    inkText(ctx, 'Every Day, Every Knight  ·  The Adventure Continues', cx, h - 36, 14, false, palette.inkSoft);
  }
}
