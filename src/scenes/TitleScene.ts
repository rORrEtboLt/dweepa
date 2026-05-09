import { Game, Scene } from '../Game';
import { palette, inkText } from '../render/hand';
import { drawParchmentBackground, drawBanner, drawButton, drawCompass, drawFlourish, drawScrollPanel, buttonHit } from '../render/parchment';
import { drawDragon, drawShip } from '../render/sprites';

export class TitleScene implements Scene {
  private hover: 'begin' | 'about' | 'close' | null = null;
  private showHelp = false;

  update(_dt: number, game: Game) {
    const cx = game.width / 2;
    const cy = game.height / 2;
    const bw = Math.min(260, game.width - 60), bh = 56;
    const mx = game.input.mouseX, my = game.input.mouseY;

    this.hover = null;

    if (this.showHelp) {
      const closeBtnW = 160, closeBtnH = 44;
      const closeX = cx - closeBtnW / 2;
      const closeY = cy + 120;
      if (buttonHit(mx, my, closeX, closeY, closeBtnW, closeBtnH)) {
        this.hover = 'close';
        game.setCursor('pointer');
      }
      if ((game.input.clicked && this.hover === 'close') || game.input.wasPressed('Escape')) {
        this.showHelp = false;
      }
      return;
    }

    const beginY = cy + 110;
    const aboutY = cy + 110 + bh + 16;

    if (buttonHit(mx, my, cx - bw / 2, beginY, bw, bh)) this.hover = 'begin';
    else if (buttonHit(mx, my, cx - bw / 2, aboutY, bw, bh)) this.hover = 'about';

    if (this.hover) game.setCursor('pointer');

    if ((game.input.clicked && this.hover === 'begin') || game.input.wasPressed('Enter')) {
      game.goto('map');
    }
    if (game.input.clicked && this.hover === 'about') {
      this.showHelp = true;
    }
  }

  render(ctx: CanvasRenderingContext2D, game: Game) {
    const w = game.width, h = game.height;
    drawParchmentBackground(ctx, w, h);

    const cx = w / 2;
    const cy = h / 2;

    // Compass behind title
    drawCompass(ctx, cx, Math.max(80, cy - 200), 60, true);

    // Big banner
    const titleW = Math.min(640, w - 80);
    drawBanner(ctx, cx, cy - 80, titleW, 70, 'ISLES OF VALDOR', 36);

    // Subtitle
    inkText(ctx, 'A Tale of Tides and Steel', cx, cy - 30, 22, false, palette.inkLight);
    drawFlourish(ctx, cx, cy - 8, 220);

    // Decorative dragon (hide if it would overflow)
    const dragonX = cx - titleW / 2 - 30;
    if (dragonX > 10) drawDragon(ctx, dragonX, cy - 170, 0.9, game.time);
    // Decorative ship (hide if it would overflow)
    const shipX = cx + titleW / 2 + 60;
    if (shipX < w - 20) drawShip(ctx, shipX, cy - 30, 0.9, palette.red);

    // Buttons
    const bw = Math.min(260, w - 60), bh = 56;
    drawButton(ctx, cx - bw / 2, cy + 110, bw, bh, 'Begin Adventure', this.hover === 'begin');
    drawButton(ctx, cx - bw / 2, cy + 110 + bh + 16, bw, bh, 'How to Defend', this.hover === 'about');

    // Footer
    const footerText = game.isNarrow ? 'The Adventure Continues' : 'Every Day, Every Knight  ·  The Adventure Continues';
    inkText(ctx, footerText, cx, h - 36, 14, false, palette.inkSoft);

    // Help overlay
    if (this.showHelp) {
      ctx.fillStyle = 'rgba(20, 12, 4, 0.6)';
      ctx.fillRect(0, 0, w, h);

      const panelW = Math.min(460, w - 40);
      const panelH = 300;
      const px = cx - panelW / 2;
      const py = cy - panelH / 2 - 20;
      drawScrollPanel(ctx, px, py, panelW, panelH);

      drawBanner(ctx, cx, py + 30, panelW - 40, 40, 'How to Defend', 22);

      const narrow = game.isNarrow;
      const sz = narrow ? 13 : 15;
      const lineH = narrow ? 22 : 26;
      let ty = py + 70;
      const lines = [
        'Choose your island on the world map.',
        'Select a unit type: Knight, Archer, or Pikeman.',
        `${narrow ? 'Tap' : 'Click'} walkable tiles to place defenders.`,
        `${narrow ? 'Long-press' : 'Right-click'} a placed unit to remove it.`,
        'Press "Begin Battle" when ready.',
        'Your units fight raiders automatically.',
        'Survive all waves to claim victory!',
      ];
      for (const line of lines) {
        inkText(ctx, line, cx, ty, sz, false, palette.ink);
        ty += lineH;
      }

      if (!narrow) {
        ty += 6;
        inkText(ctx, 'Keys: 1/2/3 select units · Enter to begin · Esc to retreat', cx, ty, 12, false, palette.inkSoft);
      }

      drawButton(ctx, cx - 80, cy + 120, 160, 44, 'Got it!', this.hover === 'close');
    }
  }
}
