import { INK } from "../brand";

export type Rect = readonly [x: number, y: number, w: number, h: number];
export type Layer = { rects: readonly Rect[]; fill: string };

function grow([x, y, w, h]: Rect, by: number): Rect {
  return [x - by, y - by, w + by * 2, h + by * 2];
}

export function Rects({ rects, fill, by = 0, dx = 0, dy = 0 }: { rects: readonly Rect[]; fill: string; by?: number; dx?: number; dy?: number }) {
  return (
    <>
      {rects.map((r, i) => {
        const [x, y, w, h] = grow(r, by);
        return <rect key={i} x={x + dx} y={y + dy} width={w} height={h} fill={fill} />;
      })}
    </>
  );
}

/**
 * Pixel art in the site's brutalist treatment: every filled pixel gets an ink
 * outline and a hard ink shadow. Outlines are drawn as grown copies of the
 * rects, so the union of overlapping parts outlines as one shape.
 */
export function PixelArt({ layers, outline = 5, shadow = 7 }: { layers: readonly Layer[]; outline?: number; shadow?: number }) {
  const all = layers.flatMap((l) => l.rects);
  return (
    <>
      {shadow > 0 && <Rects rects={all} fill={INK} by={outline} dx={shadow} dy={shadow} />}
      {outline > 0 && <Rects rects={all} fill={INK} by={outline} />}
      {layers.map((l, i) => (
        <Rects key={i} rects={l.rects} fill={l.fill} />
      ))}
    </>
  );
}

/**
 * Rasterise a shape onto a grid of `px`-sized pixels at (x0, y0), sampling
 * each pixel centre with `inside(col, row)` in grid units. Horizontal runs
 * merge into one rect, so a 28x15 emblem is a few dozen elements, not 400.
 */
export function raster(cols: number, rows: number, px: number, x0: number, y0: number, inside: (cx: number, cy: number) => boolean): Rect[] {
  const out: Rect[] = [];
  for (let j = 0; j < rows; j++) {
    let start = -1;
    for (let i = 0; i <= cols; i++) {
      const on = i < cols && inside(i + 0.5, j + 0.5);
      if (on && start < 0) start = i;
      if (!on && start >= 0) {
        out.push([x0 + start * px, y0 + j * px, (i - start) * px, px]);
        start = -1;
      }
    }
  }
  return out;
}

/** Split rects at vertical `cuts`, colouring the pieces by stripe index. */
export function stripes(rects: readonly Rect[], cuts: readonly number[], fills: readonly string[]): Layer[] {
  const buckets: Rect[][] = fills.map(() => []);
  for (const [x, y, w, h] of rects) {
    const edges = [x, ...cuts.filter((c) => c > x && c < x + w), x + w];
    for (let k = 0; k < edges.length - 1; k++) {
      const a = edges[k] ?? x;
      const b = edges[k + 1] ?? x + w;
      const band = cuts.filter((c) => c <= a).length;
      buckets[band % fills.length]?.push([a, y, b - a, h]);
    }
  }
  return fills.map((fill, i) => ({ fill, rects: buckets[i] ?? [] }));
}
