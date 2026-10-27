import { contextChain, type Snapshot } from '@stackray/core';
import type { InspectorData } from '../components/Inspector';
import { shortReason } from './tree';

/**
 * What the Inspector card shows for one element.
 *
 * @example
 * inspectorData(snapshot, dropdown).chain.map((c) => c.label); // ['html', '.card', '.dropdown']
 */
export function inspectorData(snapshot: Snapshot, index: number): InspectorData | null {
  const el = snapshot.elements[index];
  if (el === undefined) return null;
  const chain = contextChain(snapshot, index)
    .reverse()
    .map((i) => {
      const link = snapshot.elements[i];
      if (link === undefined) return { label: '?' };
      const reason = link.sc
        ? link.scReasons.map(shortReason).join(', ')
        : link.z !== null
          ? `z-index ${link.z}`
          : undefined;
      return { label: link.sel, reason };
    });
  return {
    label: el.sel,
    tag: el.tag,
    position: el.style.position,
    zIndex: el.style.zIndex,
    z: el.z,
    reasons: el.scReasons,
    chain,
  };
}
