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

