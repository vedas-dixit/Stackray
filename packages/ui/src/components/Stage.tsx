import type { ComponentChildren } from 'preact';
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import {
  clampLayout,
  defaultLayout,
  type LayoutState,
  loadLayout,
  saveLayout,
} from '../model/layout-state';
import { Dots } from './Dots';
import { Icon } from './Icon';
import { Pane } from './Pane';
import { Splitter } from './Splitter';
import { Window } from './Window';

export type StageProps = {
  /** The viewport window title, e.g. `youtube.com · 2 607 layers · 172 contexts`. */
  title: string;
  viewport: ComponentChildren;
  /** Top right: the always-visible controls. */
  tools: ComponentChildren;
  /** Bottom right, under the tools: the layer tree. Omit for a single right pane. */
  layers?: ComponentChildren;
  /** Bottom left: element info. Collapsed until something is selected. */
  info: ComponentChildren;
  infoTitle?: string;
  layersTitle?: string;
  /** Extra controls on the right of the viewport title bar. */
  slot?: ComponentChildren;
  onClose: () => void;
  /** `localStorage` key; omit to keep layout in memory only. */
  storageKey?: string | undefined;
  /** Starting layout when nothing is stored. */
  initial?: Partial<LayoutState> | undefined;
  /** Drive the info pane from outside; it follows every change of this value. */
  infoOpen?: boolean | undefined;
  /** Drive the layers pane from outside, e.g. open it while searching. */
  layersOpen?: boolean | undefined;
  /** Highlight the layers frame, e.g. while a search is typed. */
  layersFocused?: boolean;
  /** Listen for `]`, `_`, `Z` and Esc on `window` instead of the stage element. */
  globalKeys?: boolean;
  /** Preview only: draw dot glyphs as if hovered. */
  showGlyphs?: boolean;
  /** Extra classes on the stage root, e.g. the open/close transition states. */
  class?: string | undefined;
  /** Inline style for the viewport window's cell, used by the shrink animation. */
  viewportStyle?: Record<string, string | number | undefined> | undefined;
  /** Fade the panes out, during the open and close sequences. */
  panesHidden?: boolean;
};

/**
 * The four windows: the viewport (three dots) above element info on the left,
 * tools above layers on the right, with drag gaps between them. Keys: `]`
 * toggles the right column, `_` the info pane, `Z` zen, Esc closes.
 *
 * @example
 * <Stage title={stageTitle(host, n, m)} viewport={<Canvas />} tools={<Tools />} layers={<Tree />} info={<Info />} onClose={exit} />
 */
export function Stage(props: StageProps) {
  const [layout, setLayout] = useState<LayoutState>(() => ({
    ...(props.storageKey ? loadLayout(props.storageKey) : defaultLayout),
    ...props.initial,
  }));
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (props.storageKey) saveLayout(props.storageKey, layout);
  }, [layout, props.storageKey]);

  const update = useCallback((patch: Partial<LayoutState>, animate = false) => {
    setLayout((prev) => clampLayout({ ...prev, ...patch }));
    if (animate) {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 250);
    }
  }, []);

  useEffect(() => {
    if (props.infoOpen !== undefined) update({ infoOpen: props.infoOpen }, true);
  }, [props.infoOpen, update]);
  useEffect(() => {
    if (props.layersOpen !== undefined) update({ layersOpen: props.layersOpen }, true);
  }, [props.layersOpen, update]);

  const hasLayers = props.layers !== undefined;
  const rightOpen = layout.toolsOpen || (hasLayers && layout.layersOpen);
  const toggleRight = useCallback(
    () => update({ toolsOpen: !rightOpen, layersOpen: !rightOpen }, true),
    [rightOpen, update],
  );
  const toggleTools = useCallback(
    () => update({ toolsOpen: !layout.toolsOpen }, true),
    [layout.toolsOpen, update],
  );
  const toggleLayers = useCallback(
    () => update({ layersOpen: !layout.layersOpen }, true),
    [layout.layersOpen, update],
  );
  const toggleInfo = useCallback(
    () => update({ infoOpen: !layout.infoOpen }, true),
    [layout.infoOpen, update],
  );
  const zen = useCallback(() => {
    const anyOpen = rightOpen || layout.infoOpen;
    update({ toolsOpen: !anyOpen, layersOpen: !anyOpen, infoOpen: !anyOpen }, true);
  }, [rightOpen, layout.infoOpen, update]);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.key === 'Escape') props.onClose();
      else if (e.key === ']') toggleRight();
      else if (e.key === '_') toggleInfo();
      else if (e.key === 'z' || e.key === 'Z') zen();
      else return;
      e.preventDefault();
      e.stopPropagation();
    },
    [props.onClose, toggleRight, toggleInfo, zen],
  );

  useEffect(() => {
    if (!props.globalKeys) return;
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [props.globalKeys, onKey]);

  const style = useMemo(
    () => ({
      '--sr-tools-w': rightOpen ? `${layout.toolsW}px` : 'var(--sr-pane-tab-w)',
      '--sr-info-h': layout.infoOpen ? `${layout.infoH}px` : 'var(--sr-pane-tab-w)',
      '--sr-tools-h': layout.toolsOpen ? `${layout.toolsH}px` : 'var(--sr-pane-tab-w)',
    }),
    [layout, rightOpen],
  );
  const classes = [
    'sr-root sr-stage',
    rightOpen ? '' : 'sr-stage--right-collapsed',
    layout.infoOpen ? '' : 'sr-stage--info-collapsed',
    layout.toolsOpen ? '' : 'sr-stage--tools-collapsed',
    hasLayers && layout.layersOpen ? '' : 'sr-stage--layers-collapsed',
    animating ? 'sr-stage--animating' : '',
    props.panesHidden ? 'sr-stage--panes-hidden' : '',
    props.class ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const glyphs = props.showGlyphs ?? false;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the stage is the keyboard scope when not global
    <div
      class={classes}
      style={style}
      tabIndex={props.globalKeys ? undefined : 0}
      onKeyDown={props.globalKeys ? undefined : onKey}
    >
      <div class="sr-stage__left">
        <div class="sr-stage__viewport" style={props.viewportStyle}>
          <Window
            title={props.title}
            tone="dark"
            viewport
            dots={<Dots variant="traffic" onClose={props.onClose} showGlyphs={glyphs} />}
            slot={props.slot}
            style={{ height: '100%' }}
          >
            {props.viewport}
          </Window>
        </div>
        <Splitter
          direction="row"
          label="Resize the info window"
          disabled={!layout.infoOpen}
          onDrag={(d) => update({ infoH: layout.infoH - d })}
        />
        <div class="sr-stage__info">
          <Pane
            side="bottom"
            title={props.infoTitle ?? 'Info'}
            collapsed={!layout.infoOpen}
            onToggle={toggleInfo}
            showGlyphs={glyphs}
          >
            {props.info}
          </Pane>
        </div>
      </div>
      <Splitter
        direction="col"
        label="Resize the tools column"
        disabled={!rightOpen}
        onDrag={(d) => update({ toolsW: layout.toolsW - d })}
      />
      {rightOpen ? (
        <div class="sr-stage__right">
          <div class="sr-stage__tools">
            <Pane
              side="top"
              title="Tools"
              collapsed={!layout.toolsOpen}
              onToggle={toggleTools}
              showGlyphs={glyphs}
            >
              {props.tools}
            </Pane>
          </div>
          {hasLayers ? (
            <>
              <Splitter
                direction="row"
                label="Resize the tools window"
                disabled={!layout.toolsOpen || !layout.layersOpen}
                onDrag={(d) => update({ toolsH: layout.toolsH + d })}
              />
              <div class="sr-stage__layers">
                <Pane
                  side="bottom"
                  title={props.layersTitle ?? 'Layers'}
                  collapsed={!layout.layersOpen}
                  onToggle={toggleLayers}
                  focused={props.layersFocused ?? false}
                  showGlyphs={glyphs}
                >
                  {props.layers}
                </Pane>
              </div>
            </>
          ) : null}
        </div>
      ) : (
        <div class="sr-stage__right sr-stage__right--collapsed">
          <button
            type="button"
            class="sr-pane__tab sr-pane__tab--vertical"
            aria-label="Open tools"
            onClick={toggleRight}
          >
            <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}>
              <Icon name="chevron" size={14} />
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
