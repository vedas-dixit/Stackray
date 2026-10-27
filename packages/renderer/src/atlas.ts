import type { Rect, Snapshot } from '@stackray/core';

/** One photographed screen of the page: an image and the page rect it covers. */
export type Tile = { image: CanvasImageSource; width: number; height: number; rect: Rect };

/** Where an element's crop sits in the atlas, as 0..1 UVs: `[u0, v0, u1, v1]`. */
export type UvRect = readonly [number, number, number, number];

export type AtlasResult = { canvas: HTMLCanvasElement; uv: Map<number, UvRect> };

export type AtlasOptions = {
  /** Atlas side in pixels; the GPU's maximum texture size or 4096, whichever is smaller. */
  size: number;
  /** Longest side of one crop in pixels. */
  maxCrop: number;
  /** Elements to texture, most important first. */
  indices: number[];
  /** Let the UI breathe every `chunk` crops. */
  chunk?: number;
};

const REPLACED = new Set([
  'img',
  'video',
  'canvas',
  'svg',
  'picture',
  'input',
  'textarea',
  'select',
]);

/**
 * Elements that get their own pixels in textured mode: leaves and replaced
 * elements, front to back. Containers stay outlines, otherwise every parent
 * would repeat what floats above it.
 *
 * @example
 * texturedCandidates(snapshot); // [23, 19, 7, …]
 */
export function texturedCandidates(snapshot: Snapshot): number[] {
  const hasChildren = new Array<boolean>(snapshot.elements.length).fill(false);
  for (const el of snapshot.elements) {
    if (el.parent !== null) hasChildren[el.parent] = true;
  }
  const out: number[] = [];
  for (let i = snapshot.paintOrder.length - 1; i >= 0; i -= 1) {
    const index = snapshot.paintOrder[i];
    const el = index === undefined ? undefined : snapshot.elements[index];
    if (el === undefined || el.empty || el.ghost || el.iframe) continue;
    if (!hasChildren[el.i] || REPLACED.has(el.tag)) out.push(el.i);
  }
  return out;
}

/**
 * Shelf packing: place boxes left to right in rows of the tallest box so far.
 * Returns `null` for boxes that do not fit. Pure.
 *
 * @example
 * shelfPack([{ w: 10, h: 10 }, { w: 10, h: 5 }], 16); // [{ x: 0, y: 0 }, { x: 0, y: 10 }]
 */
export function shelfPack(
  boxes: { w: number; h: number }[],
  size: number,
): ({ x: number; y: number } | null)[] {
  const out: ({ x: number; y: number } | null)[] = [];
  let x = 0;
  let y = 0;
  let rowH = 0;
  for (const box of boxes) {
    if (box.w > size || box.h > size) {
      out.push(null);
      continue;
    }
    if (x + box.w > size) {
      x = 0;
      y += rowH;
      rowH = 0;
    }
    if (y + box.h > size) {
      out.push(null);
      continue;
    }
    out.push({ x, y });
    x += box.w;
    rowH = Math.max(rowH, box.h);
  }
  return out;
}

/**
 * Cut every candidate's rectangle out of the tiles and pack the crops into
 * one canvas. Async so a 7 000-element page does not freeze the tab.
 *
 * @example
 * const atlas = await buildAtlas(tiles, snapshot, { size: 4096, maxCrop: 320, indices: texturedCandidates(snapshot) });
 */
export async function buildAtlas(
  tiles: Tile[],
  snapshot: Snapshot,
  options: AtlasOptions,
): Promise<AtlasResult> {
  const canvas = document.createElement('canvas');
  canvas.width = options.size;
  canvas.height = options.size;
  const ctx = canvas.getContext('2d');
  const uv = new Map<number, UvRect>();
  if (ctx === null || tiles.length === 0) return { canvas, uv };

  type Crop = { index: number; rect: Rect; scale: number; w: number; h: number };
  const sized = options.indices.flatMap((index): Crop[] => {
    const el = snapshot.elements[index];
    if (el === undefined || !coveredByTiles(el.rect, tiles)) return [];
    const scale = Math.min(1, options.maxCrop / Math.max(el.rect.w, el.rect.h));
    return [{ index, rect: el.rect, scale, w: 0, h: 0 }];
  });

  // Fit everything: if the crops would overflow the atlas, shrink them all.
  const budget = options.size * options.size * 0.82;
  const wanted = sized.reduce(
    (sum, c) => sum + (c.rect.w * c.scale + 2) * (c.rect.h * c.scale + 2),
    0,
  );
  const squeeze = wanted > budget ? Math.sqrt(budget / wanted) : 1;
  const crops = sized.flatMap((c) => {
    const scale = c.scale * squeeze;
    const w = Math.ceil(c.rect.w * scale);
    const h = Math.ceil(c.rect.h * scale);
    return w < 2 || h < 2 ? [] : [{ ...c, scale, w: w + 2, h: h + 2 }];
  });

  // Shelf packing wastes least with rows of similar height.
  const order = crops.map((_, i) => i).sort((a, b) => (crops[b]?.h ?? 0) - (crops[a]?.h ?? 0));
  const places = shelfPack(
    order.map((i) => ({ w: crops[i]?.w ?? 0, h: crops[i]?.h ?? 0 })),
    options.size,
  );
  const chunk = options.chunk ?? 150;

  for (let n = 0; n < order.length; n += 1) {
    const i = order[n];
    const crop = i === undefined ? undefined : crops[i];
    const place = places[n];
    if (crop === undefined || place === null || place === undefined) continue;
    const dx = place.x + 1;
    const dy = place.y + 1;
    for (const tile of tiles) {
      const ox = Math.max(crop.rect.x, tile.rect.x);
      const oy = Math.max(crop.rect.y, tile.rect.y);
      const ox2 = Math.min(crop.rect.x + crop.rect.w, tile.rect.x + tile.rect.w);
      const oy2 = Math.min(crop.rect.y + crop.rect.h, tile.rect.y + tile.rect.h);
      if (ox2 <= ox || oy2 <= oy) continue;
      const sx = tile.width / tile.rect.w;
      const sy = tile.height / tile.rect.h;
      ctx.drawImage(
        tile.image,
        (ox - tile.rect.x) * sx,
        (oy - tile.rect.y) * sy,
        (ox2 - ox) * sx,
        (oy2 - oy) * sy,
        dx + (ox - crop.rect.x) * crop.scale,
        dy + (oy - crop.rect.y) * crop.scale,
        (ox2 - ox) * crop.scale,
        (oy2 - oy) * crop.scale,
      );
    }
    uv.set(crop.index, [
      dx / options.size,
      dy / options.size,
      (dx + crop.w - 2) / options.size,
      (dy + crop.h - 2) / options.size,
    ]);
    if (n % chunk === chunk - 1) await nextTask();
  }
  return { canvas, uv };
}

function coveredByTiles(rect: Rect, tiles: Tile[]): boolean {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  return tiles.some(
    (t) =>
      cx >= t.rect.x && cx <= t.rect.x + t.rect.w && cy >= t.rect.y && cy <= t.rect.y + t.rect.h,
  );
}

function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
