import { LABEL_MAX } from './types';

/** `prefix-hash` classes from CSS-in-JS and scoped-style tools. */
const PREFIXED_HASH = /^[a-z]{1,8}-[a-z0-9]{4,}$/i;
/** CSS-modules style `Name_part__hash`. */
const MODULE_HASH = /__[a-z0-9]{5,}$/i;
/** A bare run of letters and digits, like `x7f9q2`. */
const BARE_HASH = /^[a-z0-9]{5,}$/i;

/**
 * True for class names that are generated hashes rather than words.
 *
 * @example
 * isHashedClass('css-1a2b3c'); // true
 * isHashedClass('nav-item'); // false
 */
export function isHashedClass(cls: string): boolean {
  if (cls.length > 40) return true;
  if (MODULE_HASH.test(cls)) return true;
  const m = PREFIXED_HASH.exec(cls);
  if (m !== null) return hasDigitAndLetter(cls.slice(cls.indexOf('-') + 1));
  if (BARE_HASH.test(cls)) return hasDigitAndLetter(cls);
  return false;
}

/**
 * The class list with hashed names removed, order kept.
 *
 * @example
 * readableClasses(['css-1a2b3c', 'card', 'sc-AbC12']); // ['card']
 */
export function readableClasses(classes: readonly string[]): string[] {
  return classes.filter((c) => !isHashedClass(c));
}

/** What the label fallback chain looks at. */
export type LabelInput = {
  tag: string;
  id: string | null;
  /** Readable classes only. */
  cls: readonly string[];
  testId: string | null;
  ariaLabel: string | null;
  text: string;
};

/**
 * Display label by the fallback chain: id → data-testid → custom element tag
 * → aria-label → readable classes → own text → tag. Never longer than
 * `LABEL_MAX`.
 *
 * @example
 * labelFor({ tag: 'div', id: 'header', cls: [], testId: null, ariaLabel: null, text: '' }); // 'div#header'
 * labelFor({ tag: 'div', id: null, cls: ['card'], testId: null, ariaLabel: null, text: '' }); // 'div.card'
 */
export function labelFor(input: LabelInput): string {
  if (input.id !== null && input.id !== '') return truncate(`${input.tag}#${input.id}`);
  if (input.testId !== null && input.testId !== '')
    return truncate(`${input.tag}[${input.testId}]`);
  if (input.tag.includes('-')) return truncate(input.tag);
  const aria = collapse(input.ariaLabel ?? '');
  if (aria !== '') return truncate(`"${aria}"`);
  if (input.cls.length > 0) return truncate(`${input.tag}.${input.cls.slice(0, 2).join('.')}`);
  const text = collapse(input.text);
  if (text !== '') return truncate(`"${text}"`);
  return truncate(input.tag);
}

/**
 * Cut a label to `max` characters with a single ellipsis.
 *
 * @example
 * truncate('a'.repeat(40)).length; // 30
 */
export function truncate(label: string, max: number = LABEL_MAX): string {
  return label.length <= max ? label : `${label.slice(0, max - 1)}…`;
}

function collapse(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function hasDigitAndLetter(s: string): boolean {
  return /\d/.test(s) && /[a-z]/i.test(s);
}
