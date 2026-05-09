import { palette, setSeed, rand, jitter, pathWobbly, fillStrokeWobbly, inkText } from './hand';

let bgCache: HTMLCanvasElement | null = null;
let bgW = 0, bgH = 0, bgDpr = 0;

export function drawParchmentBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (!bgCache || bgW !== w || bgH !== h || bgDpr !== dpr) {
    bgCache = document.createElement('canvas');
    bgCache.width = Math.floor(w * dpr);
    bgCache.height = Math.floor(h * dpr);
    const c = bgCache.getContext('2d')!;
    c.scale(dpr, dpr);

    const grad = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 1.1);
    grad.addColorStop(0, '#f6e8c2');
    grad.addColorStop(0.55, palette.parchment);
    grad.addColorStop(1, '#a88a55');
    c.fillStyle = grad;
    c.fillRect(0, 0, w, h);

    setSeed(13);
    const speckCount = Math.floor(w * h / 800);
    for (let i = 0; i < speckCount; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = rand() * 1.4 + 0.3;
      c.fillStyle = `rgba(80, 50, 20, ${rand() * 0.22 + 0.05})`;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }

    for (let i = 0; i < 14; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = 30 + rand() * 80;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(110, 80, 40, ${0.04 + rand() * 0.07})`);
      g.addColorStop(1, 'rgba(110, 80, 40, 0)');
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }

    for (let i = 0; i < 60; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const len = 4 + rand() * 14;
      const a = rand() * Math.PI * 2;
      c.strokeStyle = `rgba(80, 50, 20, ${rand() * 0.06 + 0.02})`;
      c.lineWidth = 0.5;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      c.stroke();
    }

    const vig = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(40, 22, 8, 0.4)');
    c.fillStyle = vig;
    c.fillRect(0, 0, w, h);

    bgW = w;
    bgH = h;
    bgDpr = dpr;
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(bgCache, 0, 0);
  ctx.restore();
}

export function drawBanner(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  width: number, height: number,
  text: string,
  textSize?: number
) {
  setSeed(Math.floor(cx + cy * 7 + width * 13));
  const x = cx - width / 2;
  const y = cy - height / 2;
  const tail = height * 0.6;

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Left tail (forked ribbon)
  fillStrokeWobbly(ctx, [
    [x - tail, y - 4],
    [x + 18, y + 2],
    [x + 18, y + height - 2],
    [x - tail, y + height + 4],
    [x - tail * 0.55, y + height / 2],
  ], palette.parchmentDark, palette.ink, 0.4, 1.5);

  // Right tail
  fillStrokeWobbly(ctx, [
    [x + width + tail, y - 4],
    [x + width - 18, y + 2],
    [x + width - 18, y + height - 2],
    [x + width + tail, y + height + 4],
    [x + width + tail * 0.55, y + height / 2],
  ], palette.parchmentDark, palette.ink, 0.4, 1.5);

  // Tail fold shadows
  ctx.fillStyle = 'rgba(60,40,15,0.18)';
  ctx.beginPath();
  ctx.moveTo(x + 18, y);
  ctx.lineTo(x + 24, y + 6);
  ctx.lineTo(x + 24, y + height - 6);
  ctx.lineTo(x + 18, y + height);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + width - 18, y);
  ctx.lineTo(x + width - 24, y + 6);
  ctx.lineTo(x + width - 24, y + height - 6);
  ctx.lineTo(x + width - 18, y + height);
  ctx.closePath();
  ctx.fill();

  // Main banner panel (gentle wave on top/bottom)
  ctx.beginPath();
  ctx.moveTo(x + jitter(0.3), y + jitter(0.3));
  ctx.quadraticCurveTo(cx, y - height * 0.12, x + width + jitter(0.3), y + jitter(0.3));
  ctx.lineTo(x + width + jitter(0.3), y + height + jitter(0.3));
  ctx.quadraticCurveTo(cx, y + height + height * 0.12, x + jitter(0.3), y + height + jitter(0.3));
  ctx.closePath();
  ctx.fillStyle = palette.banner;
  ctx.fill();
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  inkText(ctx, text, cx, cy + 1, textSize ?? height * 0.55, true);
}

export function drawScrollPanel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number
) {
  setSeed(Math.floor(x + y * 7 + w));
  ctx.lineJoin = 'round';

  // Roller ends (top and bottom)
  const rollerH = 14;
  fillStrokeWobbly(ctx, [
    [x - 6, y],
    [x + w + 6, y],
    [x + w + 6, y + rollerH],
    [x - 6, y + rollerH],
  ], palette.parchmentDeep, palette.ink, 0.3, 1.5);
  fillStrokeWobbly(ctx, [
    [x - 6, y + h - rollerH],
    [x + w + 6, y + h - rollerH],
    [x + w + 6, y + h],
    [x - 6, y + h],
  ], palette.parchmentDeep, palette.ink, 0.3, 1.5);

  // Body
  fillStrokeWobbly(ctx, [
    [x, y + rollerH - 1],
    [x + w, y + rollerH - 1],
    [x + w, y + h - rollerH + 1],
    [x, y + h - rollerH + 1],
  ], palette.parchmentLight, palette.ink, 0.3, 1.3);

  // Roller hatch lines
  ctx.strokeStyle = palette.inkLight;
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 6; i++) {
    const px = x - 4 + ((w + 8) * (i + 0.5)) / 6;
    ctx.beginPath();
    ctx.moveTo(px, y + 3);
    ctx.lineTo(px, y + rollerH - 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px, y + h - rollerH + 3);
    ctx.lineTo(px, y + h - 3);
    ctx.stroke();
  }
}

export function drawButton(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  text: string, hover: boolean, disabled = false
) {
  setSeed(Math.floor(x * 11 + y * 17 + w));
  const r = h / 2;
  const fill = disabled ? '#9d8c66' : hover ? palette.parchmentLight : palette.parchmentDark;

  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x + r + jitter(0.4), y + jitter(0.4));
  ctx.lineTo(x + w - r + jitter(0.4), y + jitter(0.4));
  ctx.quadraticCurveTo(x + w + r * 0.3, y + h / 2, x + w - r + jitter(0.4), y + h + jitter(0.4));
  ctx.lineTo(x + r + jitter(0.4), y + h + jitter(0.4));
  ctx.quadraticCurveTo(x - r * 0.3, y + h / 2, x + r + jitter(0.4), y + jitter(0.4));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Inner highlight
  ctx.strokeStyle = 'rgba(255, 245, 215, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + r, y + 3);
  ctx.lineTo(x + w - r, y + 3);
  ctx.stroke();

  inkText(ctx, text, x + w / 2, y + h / 2 + 1, h * 0.42, true, disabled ? '#5a4a30' : palette.ink);
}

export function buttonHit(mx: number, my: number, x: number, y: number, w: number, h: number) {
  return mx >= x && mx <= x + w && my >= y && my <= y + h;
}

export function drawCompass(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, withSword = true) {
  ctx.save();
  ctx.translate(cx, cy);

  // 8-point star
  for (let i = 0; i < 8; i++) {
    const long = i % 2 === 0;
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const len = long ? r : r * 0.45;
    const wide = long ? 0.13 : 0.18;
    const tipX = Math.cos(a) * len;
    const tipY = Math.sin(a) * len;
    const baseAx = Math.cos(a + Math.PI / 2) * len * wide;
    const baseAy = Math.sin(a + Math.PI / 2) * len * wide;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(baseAx, baseAy);
    ctx.lineTo(tipX, tipY);
    ctx.fillStyle = long ? palette.gold : palette.goldDark;
    ctx.fill();
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-baseAx, -baseAy);
    ctx.lineTo(tipX, tipY);
    ctx.fillStyle = long ? palette.parchmentDeep : palette.inkSoft;
    ctx.fill();
    ctx.stroke();
  }

  // Center hub
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = palette.ink;
  ctx.fill();

  // Sword overlay (vertical)
  if (withSword) {
    const sl = r * 1.25;
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 2;
    ctx.fillStyle = palette.steel;
    ctx.beginPath();
    ctx.moveTo(-3, -sl);
    ctx.lineTo(3, -sl);
    ctx.lineTo(4, sl * 0.6);
    ctx.lineTo(0, sl * 0.7);
    ctx.lineTo(-4, sl * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Crossguard
    ctx.fillStyle = palette.gold;
    ctx.beginPath();
    ctx.moveTo(-r * 0.45, -sl * 0.45);
    ctx.lineTo(r * 0.45, -sl * 0.45);
    ctx.lineTo(r * 0.42, -sl * 0.36);
    ctx.lineTo(-r * 0.42, -sl * 0.36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Pommel
    ctx.beginPath();
    ctx.arc(0, -sl - 4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();

  // N/S/E/W labels
  inkText(ctx, 'N', cx, cy - r - 14, 12, true);
  inkText(ctx, 'S', cx, cy + r + 14, 12, true);
  inkText(ctx, 'E', cx + r + 14, cy, 12, true);
  inkText(ctx, 'W', cx - r - 14, cy, 12, true);
}

export function drawFlourish(ctx: CanvasRenderingContext2D, cx: number, cy: number, w = 180) {
  ctx.strokeStyle = palette.inkLight;
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy);
  ctx.bezierCurveTo(cx - w / 4, cy - 8, cx - w / 8, cy + 6, cx, cy);
  ctx.bezierCurveTo(cx + w / 8, cy - 6, cx + w / 4, cy + 8, cx + w / 2, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = palette.inkLight;
  ctx.fill();
}
