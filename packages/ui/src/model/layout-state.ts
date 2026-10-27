/** Sizes and open state of the panes, remembered per origin. */
export type LayoutState = {
  /** Width of the right column (tools above, layers below). */
  toolsW: number;
  /** Height of the info pane in the left column. */
  infoH: number;
  /** Height of the tools pane; the layers pane takes the rest of the column. */
  toolsH: number;
  toolsOpen: boolean;
  infoOpen: boolean;
  layersOpen: boolean;
};

export const defaultLayout: LayoutState = {
  toolsW: 300,
  infoH: 220,
  toolsH: 420,
  toolsOpen: true,
  infoOpen: false,
  layersOpen: true,
};

export const layoutLimits = {
  toolsMin: 220,
  toolsMax: 560,
  infoMin: 120,
  infoMax: 480,
  toolsHMin: 120,
  toolsHMax: 720,
} as const;

/**
 * Storage key for a page. The extension passes `location.origin`; the viewer
 * passes `'viewer'`.
 *
 * @example
 * layoutKey('https://youtube.com'); // 'stackray:layout:https://youtube.com'
 */
export function layoutKey(scope: string): string {
  return `stackray:layout:${scope}`;
}

/**
 * Read a saved layout. Storage may be missing, blocked or from an older
 * version; whatever is unusable falls back to the default.
 *
 * @example
 * const layout = loadLayout(layoutKey(location.origin));
 */
export function loadLayout(key: string): LayoutState {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    if (raw === null || raw === undefined) return defaultLayout;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return defaultLayout;
    return clampLayout({ ...defaultLayout, ...pickKnown(parsed as Record<string, unknown>) });
  } catch {
    return defaultLayout;
  }
}

/**
 * Save a layout. Failures are swallowed; layout is a convenience, not state.
 *
 * @example
 * saveLayout(layoutKey('viewer'), { ...layout, toolsOpen: false });
 */
export function saveLayout(key: string, layout: LayoutState): void {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(layout));
  } catch {
    // Storage blocked or full. Nothing to do.
  }
}

/**
 * Keep sizes inside the limits so a stale value cannot hide a pane.
 *
 * @example
 * clampLayout({ ...defaultLayout, toolsW: 9000 }).toolsW; // 560
 */
export function clampLayout(layout: LayoutState): LayoutState {
  const l = layoutLimits;
  return {
    ...layout,
    toolsW: Math.min(l.toolsMax, Math.max(l.toolsMin, layout.toolsW)),
    infoH: Math.min(l.infoMax, Math.max(l.infoMin, layout.infoH)),
    toolsH: Math.min(l.toolsHMax, Math.max(l.toolsHMin, layout.toolsH)),
  };
}

function pickKnown(value: Record<string, unknown>): Partial<LayoutState> {
  const out: Partial<LayoutState> = {};
  for (const key of ['toolsW', 'infoH', 'toolsH'] as const) {
    if (typeof value[key] === 'number') out[key] = value[key];
  }
  for (const key of ['toolsOpen', 'infoOpen', 'layersOpen'] as const) {
    if (typeof value[key] === 'boolean') out[key] = value[key];
  }
  return out;
}
