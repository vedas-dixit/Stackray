import type { ElementRecord } from './types';

/** A positioned z:auto element paints together with its in-flow descendants. */
type ZeroItem = { index: number; group: number[] | null };

/**
 * Global paint order, back to front, following CSS 2 Appendix E (simplified):
 * for every stacking context, the context itself, then child contexts with a
 * negative z, then in-flow descendants, then positioned z:auto descendants and
 * z:0 contexts in tree order, then positive z ascending. Top-layer elements
 * paint last. Sets `paint` on every record and returns the order.
 *
 * @example
 * const order = computePaintOrder(records, children);
 * order[0]; // 0, the root always paints first
 */
export function computePaintOrder(records: ElementRecord[], children: number[][]): number[] {
  const order: number[] = [];
  const topLayer: number[] = [];
  if (records.length === 0) return order;

  const paintContext = (c: number): void => {
    order.push(c);
    const negatives: number[] = [];
    const inflow: number[] = [];
    const zero: ZeroItem[] = [];
    const positives: number[] = [];

    const collect = (node: number, group: number[] | null): void => {
      for (const child of children[node] ?? []) {
        const r = records[child];
        if (r === undefined) continue;
        if (r.topLayer) {
          topLayer.push(child);
          continue;
        }
        if (r.sc) {
          const z = r.z ?? 0;
          if (z < 0) negatives.push(child);
          else if (z > 0) positives.push(child);
          else zero.push({ index: child, group: null });
          continue;
        }
        if (r.positioned) {
          const own: number[] = [];
          zero.push({ index: child, group: own });
          collect(child, own);
          continue;
        }
        (group ?? inflow).push(child);
        collect(child, group);
      }
    };

    collect(c, null);
    for (const n of sortByZ(negatives, records)) paintContext(n);
    for (const i of inflow) order.push(i);
    for (const item of zero) {
      if (item.group === null) {
        paintContext(item.index);
      } else {
        order.push(item.index);
        for (const i of item.group) order.push(i);
      }
    }
    for (const p of sortByZ(positives, records)) paintContext(p);
  };

  paintContext(0);
  for (let k = 0; k < topLayer.length; k++) {
    const t = topLayer[k];
    if (t !== undefined) paintContext(t);
  }
  for (let p = 0; p < order.length; p++) {
    const r = records[order[p] ?? -1];
    if (r !== undefined) r.paint = p;
  }
  return order;
}

/** Stable sort by effective z; ties keep tree order. */
function sortByZ(indices: number[], records: ElementRecord[]): number[] {
  return indices.sort((a, b) => (records[a]?.z ?? 0) - (records[b]?.z ?? 0));
}
