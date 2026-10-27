import { err, ok, type Result } from './result';
import type { ElementRecord, Snapshot } from './types';

export type VerdictKind = 'behind' | 'above' | 'same';

/** The one-sentence answer to "why is A behind B?". */
export type Verdict = {
  /** How `a` relates to `b` in paint order. */
  kind: VerdictKind;
  /** Exactly one sentence; always describes the lower element first. */
  sentence: string;
  /** A second sentence, only when there is a concrete fix. */
  fix: string | null;
  /** `a`, then its stacking contexts up to the root. */
  chainA: number[];
  chainB: number[];
  /** The lowest stacking context both chains share. */
  sharedAncestor: number | null;
};

/**
 * The element followed by every stacking context above it, ending at the root.
 *
 * @example
 * contextChain(snapshot, dropdown); // [dropdown, card, 0]
 */
export function contextChain(snapshot: Snapshot, i: number): number[] {
  const chain: number[] = [];
  let cur: number | null = i;
  while (cur !== null) {
    chain.push(cur);
    const r: ElementRecord | undefined = snapshot.elements[cur];
    cur = r === undefined ? null : r.scParent;
  }
  return chain;
}

/**
 * Explain the paint order of two elements in one sentence, plus a fix when
 * there is one. Fails only when an index is out of range.
 *
 * @example
 * const v = why(snapshot, dropdown, header);
 * if (v.ok) v.value.sentence;
 * // "`div.dropdown` (z 9999) is trapped inside `section.card`, which creates a stacking context via transform, so it paints behind `header#header` (z 10)."
 */
export function why(snapshot: Snapshot, a: number, b: number): Result<Verdict> {
  const ra = snapshot.elements[a];
  const rb = snapshot.elements[b];
  if (ra === undefined) return err({ code: 'unknown', message: `No element at index ${a}.` });
  if (rb === undefined) return err({ code: 'unknown', message: `No element at index ${b}.` });
  const chainA = contextChain(snapshot, a);
  const chainB = contextChain(snapshot, b);
  const shared = sharedAncestor(chainA, chainB);
  if (a === b) {
    const sentence = `${name(ra)} is the same element on both sides.`;
    return ok({ kind: 'same', sentence, fix: null, chainA, chainB, sharedAncestor: shared });
  }
  const aIsLower = ra.paint < rb.paint;
  const lower = aIsLower ? ra : rb;
  const upper = aIsLower ? rb : ra;
  const lowerChain = aIsLower ? chainA : chainB;
  const upperChain = aIsLower ? chainB : chainA;
  const { sentence, fix } = explain(snapshot, lower, upper, lowerChain, upperChain, shared);
  return ok({
    kind: aIsLower ? 'behind' : 'above',
    sentence,
    fix,
    chainA,
    chainB,
    sharedAncestor: shared,
  });
}

function explain(
  snapshot: Snapshot,
  lower: ElementRecord,
  upper: ElementRecord,
  lowerChain: number[],
  upperChain: number[],
  shared: number | null,
): { sentence: string; fix: string | null } {
  if (shared === lower.i) {
    return {
      sentence: `${name(lower)} paints behind ${name(upper)} because ${name(upper)} is inside it.`,
      fix: null,
    };
  }
  const trap = snapshot.elements[representative(lowerChain, shared)];
  const upperRep = snapshot.elements[representative(upperChain, shared)];
  if (trap === undefined || upperRep === undefined) {
    return { sentence: `${name(lower)} paints behind ${name(upper)}.`, fix: null };
  }
  const upperText =
    upperRep.i === upper.i
      ? `${name(upper)} ${zText(upper)}`
      : `${name(upper)} ${zText(upper)}, which sits inside ${name(upperRep)} ${zText(upperRep)}`;
  if (trap.i !== lower.i) {
    const via = trap.scReasons.filter((r) => r !== 'root').join(' and ');
    return {
      sentence: `${name(lower)} ${zText(lower)} is trapped inside ${name(trap)}, which creates a stacking context via ${via}, so it paints behind ${upperText}.`,
      fix: trapFix(lower, trap, upperRep),
    };
  }
  const context = shared === null ? 'the root' : name(snapshot.elements[shared] ?? lower);
  return {
    sentence: `${name(lower)} ${zText(lower)} paints behind ${upperText} because they share the stacking context ${context} and ${compareText(lower, upperRep)}.`,
    fix: directFix(lower, upperRep),
  };
}

function compareText(lower: ElementRecord, upper: ElementRecord): string {
  const zl = lower.z;
  const zu = upper.z;
  if (zu !== null && zl !== null && zu > zl) return `${name(upper)} has the higher z-index`;
  if (zu !== null && zl === null && zu >= 0)
    return `${name(upper)} has a z-index and ${name(lower)} has none`;
  if (zl !== null && zl < 0 && (zu === null || zu >= 0))
    return `${name(lower)} has a negative z-index`;
  if (upper.positioned && !lower.positioned)
    return `${name(upper)} is positioned and ${name(lower)} is not`;
  return `${name(upper)} comes later in the DOM`;
}

function directFix(lower: ElementRecord, upper: ElementRecord): string {
  const target = upper.z ?? 0;
  return lower.positioned
    ? `Fix: give ${name(lower)} a z-index above ${target}.`
    : `Fix: position ${name(lower)} and give it a z-index above ${target}.`;
}

function trapFix(lower: ElementRecord, trap: ElementRecord, upper: ElementRecord): string {
  const removable = trap.scReasons.filter((r) => r !== 'root' && !r.startsWith('z-index'));
  if (removable.length > 0) {
    return `Fix: remove ${removable.join(' and ')} from ${name(trap)}, or move ${name(lower)} out of it.`;
  }
  return `Fix: raise the z-index of ${name(trap)} above ${upper.z ?? 0}, or move ${name(lower)} out of it.`;
}

/** The chain element directly below the shared ancestor, or the element itself. */
function representative(chain: number[], shared: number | null): number {
  const at = shared === null ? chain.length : chain.indexOf(shared);
  const rep = chain[Math.max(0, at - 1)];
  return rep ?? chain[0] ?? 0;
}

function sharedAncestor(chainA: number[], chainB: number[]): number | null {
  const inB = new Set(chainB);
  for (const i of chainA) if (inB.has(i)) return i;
  return null;
}

function name(r: ElementRecord): string {
  return `\`${r.sel}\``;
}

function zText(r: ElementRecord): string {
  return r.z === null ? '(no z-index)' : `(z ${r.z})`;
}
