/**
 * The element record is the contract between `@stackray/core` and every
 * consumer. SPEC.md §7 is the human-readable copy of this file; keep both in
 * step and change SPEC.md first.
 */

/** Document-space rectangle in CSS pixels. */
export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/** How an overflow ancestor treats content outside its box. */
export type ClipKind = 'hidden' | 'scroll';

/** The subset of computed style the snapshot keeps for every element. */
export type ElementStyle = {
  position: string;
  zIndex: string;
  display: string;
  opacity: string;
  visibility: string;
  pointerEvents: string;
  overflow: string;
  transform: string;
  background: string;
};

/**
 * One element of the captured page.
 *
 * @example
 * const dropdown = snapshot.elements.find((e) => e.sel === '.dropdown');
 * dropdown?.z; // 9999
 * dropdown?.scParent; // index of the `.card` that traps it
 */
export type ElementRecord = {
  /** Index in `snapshot.elements`; stable within a snapshot. */
  i: number;
  /** Index of the parent; `null` for the root. */
  parent: number | null;
  /** Tree depth; the root is 0. */
  depth: number;
  /** Lower-case tag name. */
  tag: string;
  /** `id` attribute, or `null`. */
  id: string | null;
  /** Class list with hashed classes removed. */
  cls: string[];
  /** Display label, at most 30 characters, from the label fallback chain. */
  sel: string;
  /** Document coordinates. The root uses the page's scroll size. */
  rect: Rect;
  /** Zero width or height. */
  empty: boolean;
  /** Invisible (opacity 0 or visibility hidden) but still in the tree. */
  ghost: boolean;
  style: ElementStyle;
  /** Creates a stacking context. */
  sc: boolean;
  /** The exact CSS reasons, e.g. `["transform", "will-change: opacity"]`. */
  scReasons: string[];
  /** Nearest stacking context above this element; `null` for the root. */
  scParent: number | null;
  /** `position` is not `static`. */
  positioned: boolean;
  /**
   * Effective z-index: the integer, `0` for contexts created without a z
   * (opacity, transform…), `null` when no z applies.
   */
  z: number | null;
  /** Nearest ancestor whose overflow clips this element, or `null`. */
  clipBy: number | null;
  /** Whether that ancestor clips or scrolls. */
  clipKind: ClipKind | null;
  /** Entirely outside the clipper and the clipper hides overflow. */
  clipped: boolean;
  /** Entirely outside the clipper and the clipper scrolls. */
  scrolledOut: boolean;
  /** Opaque leaf; cross-origin content is drawn as a labelled slab. */
  iframe: boolean;
  /** Lives inside an open shadow root. */
  shadow: boolean;
  /** In the browser's top layer (modal dialog, open popover, fullscreen); hoisted above everything. */
  topLayer: boolean;
  /** Global paint index, back to front. The Z axis in stacking mode. */
  paint: number;
};

/** Facts about the capture itself. */
export type SnapshotMeta = {
  /** Schema version. Bump when `ElementRecord` changes shape. */
  version: 1;
  url: string;
  title: string;
  viewport: { w: number; h: number };
  /** Scroll size of the document. */
  page: { w: number; h: number };
  scroll: { x: number; y: number };
  dpr: number;
  /** ISO 8601. */
  capturedAt: string;
  captureMs: number;
};

/**
 * A captured page. Plain JSON; safe to save, diff and load anywhere.
 *
 * @example
 * const json = JSON.stringify(snapshot);
 * const again: Snapshot = JSON.parse(json);
 */
export type Snapshot = {
  meta: SnapshotMeta;
  elements: ElementRecord[];
  /** `elements` indices ordered back to front; same information as `paint`. */
  paintOrder: number[];
};

export const SNAPSHOT_VERSION = 1 as const;

/** Labels never exceed this many characters. */
export const LABEL_MAX = 30;
