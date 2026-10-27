import type { Snapshot } from './types';

/** One rung: a direct child context of the root, lowest first. */
export type LadderRow = {
  i: number;
  z: number;
  sel: string;
  reasons: string[];
  topLayer: boolean;
};

/**
 * The z-index ladder: every stacking context that competes directly under the
 * root, sorted by effective z (ties keep DOM order), top-layer entries last.
 *
 * @example
 * ladder(snapshot).map((r) => `${r.sel} ${r.z}`); // ['div#frosted-glass 2018', 'div#masthead 2020', …]
 */
export function ladder(snapshot: Snapshot): LadderRow[] {
  const rows: LadderRow[] = [];
  for (const e of snapshot.elements) {
    if (!e.sc || e.scParent !== 0) continue;
    rows.push({ i: e.i, z: e.z ?? 0, sel: e.sel, reasons: e.scReasons, topLayer: e.topLayer });
  }
  return rows.sort((a, b) => {
    if (a.topLayer !== b.topLayer) return a.topLayer ? 1 : -1;
    return a.z - b.z || a.i - b.i;
  });
}
