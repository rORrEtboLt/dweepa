export const TILE_W = 64;
export const TILE_H = 32;
export const TILE_RISE = 14;

export interface IsoOpts {
  tileW?: number;
  tileH?: number;
  rise?: number;
}

export function isoToScreen(gx: number, gy: number, gz = 0, opts: IsoOpts = {}) {
  const w = opts.tileW ?? TILE_W;
  const h = opts.tileH ?? TILE_H;
  const r = opts.rise ?? TILE_RISE;
  return {
    x: (gx - gy) * w / 2,
    y: (gx + gy) * h / 2 - gz * r,
  };
}

export function screenToIso(sx: number, sy: number, opts: IsoOpts = {}) {
  const w = opts.tileW ?? TILE_W;
  const h = opts.tileH ?? TILE_H;
  return {
    x: (sx / (w / 2) + sy / (h / 2)) / 2,
    y: (sy / (h / 2) - sx / (w / 2)) / 2,
  };
}

export function tileDiamond(cx: number, cy: number, w = TILE_W, h = TILE_H): [number, number][] {
  return [
    [cx, cy - h / 2],
    [cx + w / 2, cy],
    [cx, cy + h / 2],
    [cx - w / 2, cy],
  ];
}
