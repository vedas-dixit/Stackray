import type { DomStyle } from './dom';

/** `will-change` values that create a stacking context on their own. */
const WILL_CHANGE_TRIGGERS = [
  'opacity',
  'transform',
  'translate',
  'rotate',
  'scale',
  'filter',
  'backdrop-filter',
  'perspective',
  'clip-path',
  'mask',
  'mix-blend-mode',
  'isolation',
  'contain',
];

const CONTAIN_TRIGGERS = ['layout', 'paint', 'strict', 'content'];

/** What the stacking model needs to know about one element. */
export type StackingInput = {
  style: DomStyle;
  /** The parent is a flex or grid container. */
  flexOrGridItem: boolean;
  topLayer: boolean;
  isRoot: boolean;
};

/**
 * True when `zIndex` is an integer rather than `auto`.
 *
 * @example
 * hasZIndex('10'); // true
 * hasZIndex('auto'); // false
 */
export function hasZIndex(zIndex: string): boolean {
  return /^-?\d+$/.test(zIndex.trim());
}

/**
 * Every CSS reason this element creates a stacking context, in MDN's order.
 * Empty when it does not create one.
 *
 * @example
 * stackingReasons({ style: { ...defaults, transform: 'matrix(1, 0, 0, 1, 0, 0)' }, flexOrGridItem: false, topLayer: false, isRoot: false });
 * // ['transform']
 */
export function stackingReasons(input: StackingInput): string[] {
  const { style } = input;
  const reasons: string[] = [];
  if (input.isRoot) reasons.push('root');
  if (input.topLayer) reasons.push('top layer');
  const z = hasZIndex(style.zIndex);
  if (style.position === 'fixed') reasons.push('position: fixed');
  else if (style.position === 'sticky') reasons.push('position: sticky');
  else if (style.position !== 'static' && z) reasons.push(`z-index: ${style.zIndex}`);
  if (style.position === 'static' && input.flexOrGridItem && z) {
    reasons.push(`z-index: ${style.zIndex} on a flex or grid item`);
  }
  const opacity = Number.parseFloat(style.opacity);
  if (!Number.isNaN(opacity) && opacity < 1) reasons.push(`opacity: ${style.opacity}`);
  if (style.transform !== 'none') reasons.push('transform');
  if (style.translate !== 'none') reasons.push('translate');
  if (style.rotate !== 'none') reasons.push('rotate');
  if (style.scale !== 'none') reasons.push('scale');
  if (style.filter !== 'none') reasons.push('filter');
  if (style.backdropFilter !== 'none') reasons.push('backdrop-filter');
  if (style.perspective !== 'none') reasons.push('perspective');
  if (style.clipPath !== 'none') reasons.push('clip-path');
  if (style.mask !== 'none') reasons.push('mask');
  if (style.mixBlendMode !== 'normal') reasons.push('mix-blend-mode');
  if (style.isolation === 'isolate') reasons.push('isolation: isolate');
  if (WILL_CHANGE_TRIGGERS.some((p) => style.willChange.includes(p))) {
    reasons.push(`will-change: ${style.willChange}`);
  }
  if (CONTAIN_TRIGGERS.some((p) => style.contain.includes(p))) {
    reasons.push(`contain: ${style.contain}`);
  }
  return reasons;
}

/**
 * The z-index the paint order uses: the integer when the element is
 * positioned or a flex/grid item and has one, `0` for a stacking context
 * created any other way, `null` when no z applies.
 *
 * @example
 * effectiveZ({ ...input, style: { ...defaults, opacity: '0.5' } }, true); // 0
 */
export function effectiveZ(input: StackingInput, isContext: boolean): number | null {
  const { style } = input;
  const participates = style.position !== 'static' || input.flexOrGridItem;
  if (participates && hasZIndex(style.zIndex)) return Number.parseInt(style.zIndex, 10);
  return isContext ? 0 : null;
}

/**
 * True when children of an element with this `display` are flex or grid items.
 *
 * @example
 * isFlexOrGridContainer('inline-flex'); // true
 */
export function isFlexOrGridContainer(display: string): boolean {
  return display.includes('flex') || display.includes('grid');
}
