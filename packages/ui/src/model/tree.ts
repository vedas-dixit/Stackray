import type { ElementRecord, Snapshot } from '@stackray/core';
import { isTrapped } from '@stackray/renderer';
import type { FilterState } from '../components/Filters';
import type { TreeRow } from '../components/LayerTree';
import { searchElements } from './search';

export type TreeOptions = {
  filters: FilterState;
  /** Indices whose children are hidden. */
  collapsed: ReadonlySet<number>;
  selected: number | null;
};

/**
 * Children of every element, in DOM order. Elements are stored in preorder,
 * so pushing in index order keeps siblings ordered.
 *
 * @example
 * childrenOf(snapshot)[0]; // [1] for a root with one child
 */
export function childrenOf(snapshot: Snapshot): number[][] {
  const children: number[][] = snapshot.elements.map(() => []);
  for (const el of snapshot.elements) {
    if (el.parent !== null) children[el.parent]?.push(el.i);
  }
  return children;
}

/**
 * Shorten a stacking reason for a badge: `position: fixed` → `fixed`.
 *
 * @example
 * shortReason('will-change: opacity'); // 'will-change'
 */
export function shortReason(reason: string): string {
  if (reason.startsWith('position: ')) return reason.slice('position: '.length);
  if (reason.startsWith('will-change')) return 'will-change';
  const colon = reason.indexOf(':');
  return colon === -1 ? reason : reason.slice(0, colon);
}

/**
 * The badge for a row: root, top layer, the first context reason, or the z.
 *
 * @example
 * badgeFor(card).badge; // 'transform'
 */
export function badgeFor(el: ElementRecord): string | undefined {
  if (el.i === 0) return 'root';
  if (el.topLayer) return 'top layer';
  const reason = el.scReasons[0];
  if (el.sc && reason !== undefined && !reason.includes('z-index')) return shortReason(reason);
  if (el.z !== null) return `z ${el.z}`;
  if (el.sc && reason !== undefined) return shortReason(reason);
  if (el.ghost) return el.style.opacity === '0' ? 'opacity 0' : 'hidden';
  return undefined;
}

/**
 * Rows for the LayerTree: filtered, grouped (`div.stroke ×36`), collapsed.
 *
 * @example
 * buildTreeRows(snapshot, { filters: defaultFilters, collapsed: new Set(), selected: null });
 */
export function buildTreeRows(snapshot: Snapshot, options: TreeOptions): TreeRow[] {
  const { filters, collapsed, selected } = options;
  const { elements } = snapshot;
  const children = childrenOf(snapshot);

  const keepsEmpty = new Array<boolean>(elements.length).fill(false);
  for (let i = elements.length - 1; i >= 0; i -= 1) {
    const el = elements[i];
    if (el === undefined) continue;
    keepsEmpty[i] = !el.empty || (children[i]?.some((c) => keepsEmpty[c]) ?? false);
  }
  const visible = (el: ElementRecord): boolean => {
    if (filters.hideGhosts && el.ghost) return false;
    if (filters.hideEmpty && !keepsEmpty[el.i]) return false;
    return true;
  };
  const row = (el: ElementRecord, depth: number, extra: Partial<TreeRow> = {}): TreeRow => ({
    index: el.i,
    depth,
    label: el.sel,
    badge: badgeFor(el),
    badgeProblem: isTrapped(el, snapshot),
    ghost: el.ghost,
    problem: isTrapped(el, snapshot),
    group: null,
    ...extra,
  });

  const query = filters.query.trim();
  if (query !== '') {
    return searchElements(snapshot, query, visible).flatMap((hit) => {
      const el = elements[hit.index];
      return el === undefined ? [] : [row(el, 0, { match: hit.match })];
    });
  }
  if (filters.onlyContexts) {
    const contextDepth = (el: ElementRecord): number => {
      let depth = 0;
      let cur = el.scParent;
      while (cur !== null) {
        depth += 1;
        cur = elements[cur]?.scParent ?? null;
      }
      return depth;
    };
    return elements.filter((el) => el.sc && visible(el)).map((el) => row(el, contextDepth(el)));
  }

  const rows: TreeRow[] = [];
  const start = filters.isolate && selected !== null ? selected : 0;
  const walk = (index: number, depth: number) => {
    const el = elements[index];
    if (el === undefined) return;
    const kids = (children[index] ?? []).filter((c) => {
      const child = elements[c];
      return child !== undefined && visible(child);
    });
    const hasKids = kids.length > 0;
    const open = hasKids && !collapsed.has(index);
    rows.push(row(el, depth, { group: hasKids ? (open ? 'open' : 'closed') : null }));
    if (!open) return;
    let i = 0;
    while (i < kids.length) {
      const first = elements[kids[i] ?? -1];
      if (first === undefined) break;
      const isLeaf = (c: number) => (children[c]?.length ?? 0) === 0;
      let run = 1;
      while (
        isLeaf(first.i) &&
        i + run < kids.length &&
        elements[kids[i + run] ?? -1]?.sel === first.sel &&
        isLeaf(kids[i + run] ?? -1)
      ) {
        run += 1;
      }
      if (run > 1) {
        rows.push(row(first, depth + 1, { count: run }));
        i += run;
      } else {
        walk(first.i, depth + 1);
        i += 1;
      }
    }
  };
  walk(start, 0);
  return rows;
}
