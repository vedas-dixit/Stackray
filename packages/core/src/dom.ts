import type { Rect } from './types';

/**
 * Computed style the stacking, clip and label models need. Values are the
 * strings `getComputedStyle` returns; the model parses what it has to.
 */
export type DomStyle = {
  position: string;
  zIndex: string;
  display: string;
  opacity: string;
  visibility: string;
  pointerEvents: string;
  overflowX: string;
  overflowY: string;
  transform: string;
  translate: string;
  rotate: string;
  scale: string;
  filter: string;
  backdropFilter: string;
  perspective: string;
  clipPath: string;
  mask: string;
  mixBlendMode: string;
  isolation: string;
  willChange: string;
  contain: string;
  background: string;
};

/**
 * One element as the capture sees it. `browser.ts` builds these from a real
 * `Document`; tests build them with the harness. Nothing else in core knows
 * what a DOM is.
 */
export type DomElement = {
  /** Lower-case tag name. */
  tag: string;
  id: string | null;
  classes: string[];
  /** Attribute lookup; `null` when absent. */
  attr: (name: string) => string | null;
  /** Direct text content with whitespace collapsed. */
  text: string;
  /** Document coordinates. */
  rect: Rect;
  style: DomStyle;
  children: DomElement[];
  /** Children of an open shadow root, or `null` when there is none. */
  shadowChildren: DomElement[] | null;
  /** Opaque leaf: its content is never walked. */
  isIframe: boolean;
  /** Open modal dialog, popover or fullscreen element. */
  topLayer: boolean;
};

/** A page as the capture sees it: the root element plus the facts for `meta`. */
export type DomPage = {
  root: DomElement;
  url: string;
  title: string;
  viewport: { w: number; h: number };
  /** Scroll size of the document. */
  page: { w: number; h: number };
  scroll: { x: number; y: number };
  dpr: number;
};
