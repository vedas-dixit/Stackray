import type { DomStyle } from './dom';
import type { ClipKind, ElementRecord, Rect } from './types';

/**
 * How an element treats overflow, or `null` when it lets content through.
 * `html` and `body` never clip: their overflow belongs to the viewport.
 *
 * @example
 * clipKindOf({ ...defaults, overflowY: 'auto' }, 'div'); // 'scroll'
 */
export function clipKindOf(style: DomStyle, tag: string): ClipKind | null {
  if (tag === 'html' || tag === 'body') return null;
  const axes = [style.overflowX, style.overflowY];
  if (axes.some((v) => v === 'scroll' || v === 'auto')) return 'scroll';
  if (axes.some((v) => v === 'hidden' || v === 'clip')) return 'hidden';
  return null;
}

/**
 * Fill `clipBy`, `clipKind`, `clipped` and `scrolledOut` on every record.
 * Absolutely positioned elements escape non-positioned clippers; fixed ones
 * escape every clipper. Records must be in tree (preorder) order.
 *
 * @example
 * computeClipping(records, styles);
 * records[3]?.clipped; // true when it lies entirely outside an overflow: hidden ancestor
 */
export function computeClipping(records: ElementRecord[], styles: readonly DomStyle[]): void {
  const kinds: (ClipKind | null)[] = records.map((r, i) => {
    const style = styles[i];
    return style === undefined ? null : clipKindOf(style, r.tag);
  });

  for (const r of records) {
    if (r.parent === null) continue;
    const parent = records[r.parent];
    if (parent === undefined) continue;
    let clipper: number | null = kinds[r.parent] !== null ? r.parent : parent.clipBy;
    if (r.style.position === 'fixed') clipper = null;
    if (r.style.position === 'absolute') {
      while (clipper !== null && !(records[clipper]?.positioned ?? false)) {
        clipper = records[clipper]?.clipBy ?? null;
      }
    }
    r.clipBy = clipper;
    if (clipper === null) continue;
    const kind = kinds[clipper] ?? null;
    r.clipKind = kind;
    const box = records[clipper]?.rect;
    if (box === undefined || r.empty) continue;
    const outside = !intersects(r.rect, box);
    r.clipped = outside && kind === 'hidden';
    r.scrolledOut = outside && kind === 'scroll';
  }
}

function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
