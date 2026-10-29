import { ladder, type Snapshot } from '@stackray/core';
import type { ColorMode, FrameStats, LayoutOptions, Scene, Screenshot } from '@stackray/renderer';
import { colorModes } from '@stackray/renderer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { EmptyState } from '../components/EmptyState';
import { defaultFilters, type FilterState, Filters } from '../components/Filters';
import { Inspector } from '../components/Inspector';
import { KeyList } from '../components/KeyList';
import { Ladder } from '../components/Ladder';
import { LayerTree } from '../components/LayerTree';
import { Legend } from '../components/Legend';
import { PixelStack } from '../components/PixelStack';
import { Slider } from '../components/Slider';
import { Stage } from '../components/Stage';
import { Toggle } from '../components/Toggle';
import { stageTitle } from '../model/format';
import { inspectorData } from '../model/inspector';
import { keyBindings } from '../model/keys';
import { legends, modeLabels } from '../model/legend';
import { buildTreeRows } from '../model/tree';
import { duration, prefersReducedMotion } from '../tokens';
import { ModePicker } from './ModePicker';
import { Viewport } from './Viewport';

export type OpenSequence = 'full' | 'lift' | 'none';

export type StackrayAppProps = {
  snapshot: Snapshot;
  /** Shown in the title: `youtube.com`. */
  host: string;
  /** Called after the close sequence; the wrapper removes the stage. */
  onExit: () => void;
  /** Double-click a plane: exit, then the wrapper flashes the real element. */
  onFlash?: ((index: number) => void) | undefined;
  /** Photographed screens of the page. Textured mode needs at least one. */
  screenshots?: Screenshot[] | null | undefined;
  storageKey?: string | undefined;
  /** Listen for keys on `window` (the extension) instead of the stage element. */
  globalKeys?: boolean;
  /** `full` shrinks the page into the window and lifts; `lift` only lifts. */
  open?: OpenSequence;
};

type InfoView = 'auto' | 'ladder' | 'keys';
type Phase = 'enter' | 'open' | 'exit';

const ORBIT_STEP = 0.08;
/** Half way: layers apart but still clearly one page. */
const DEFAULT_EXPLODE = 50;

/**
 * The whole tool: the stage with the live viewport, the layer tree, filters,
 * modes, inspector and ladder, plus the open and close sequences from
 * docs/motion.md. Wrappers mount it and decide where it lives.
 *
 * @example
 * render(<StackrayApp snapshot={snapshot} host={location.host} onExit={unmount} globalKeys open="full" />, mount);
 */
export function StackrayApp(props: StackrayAppProps) {
  const open = props.open ?? 'lift';
  const reduced = prefersReducedMotion();
  const [selected, setSelected] = useState<number | null>(null);
  const [mode, setMode] = useState<ColorMode>('depth');
  const [textured, setTextured] = useState(true);
  const [staircase, setStaircase] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [explode, setExplode] = useState(DEFAULT_EXPLODE);
  const [depthCutoff, setDepthCutoff] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(() => new Set());
  const [infoView, setInfoView] = useState<InfoView>('auto');
  const [phase, setPhase] = useState<Phase>(open === 'none' || reduced ? 'open' : 'enter');
  const [viewportStyle, setViewportStyle] = useState<Record<string, string> | undefined>(undefined);
  const [stageClass, setStageClass] = useState('');
  const [stats, setStats] = useState<FrameStats | null>(null);
  const [scene, setScene] = useState<Scene | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  sceneRef.current = scene;
  const [searchFocused, setSearchFocused] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const exiting = useRef(false);

  const { snapshot } = props;
  const maxDepth = useMemo(
    () => snapshot.elements.reduce((m, e) => Math.max(m, e.depth), 0),
    [snapshot],
  );
  const contexts = useMemo(() => snapshot.elements.filter((e) => e.sc).length, [snapshot]);
  const rows = useMemo(
    () => buildTreeRows(snapshot, { filters, collapsed, selected }),
    [snapshot, filters, collapsed, selected],
  );
  const rungs = useMemo(
    () =>
      ladder(snapshot)
        .slice()
        .reverse()
        .map((r) => ({
          z: r.topLayer ? null : r.z,
          label: r.sel,
          reason: r.topLayer ? 'top layer' : r.reasons.join(', '),
        })),
    [snapshot],
  );
  const inspector = useMemo(
    () => (selected === null ? null : inspectorData(snapshot, selected)),
    [snapshot, selected],
  );
  const searching = filters.query.trim() !== '';
  const hasShots = (props.screenshots?.length ?? 0) > 0;
  const focus = useMemo(
    () => (searching ? new Set(rows.map((r) => r.index)) : null),
    [searching, rows],
  );
  const infoOpen = selected !== null || infoView !== 'auto';
  const layout = useMemo<Partial<LayoutOptions>>(
    () => ({
      axis: staircase ? 'order' : 'paint',
      hideEmpty: filters.hideEmpty,
      hideGhosts: filters.hideGhosts,
      depthCutoff,
    }),
    [staircase, filters.hideEmpty, filters.hideGhosts, depthCutoff],
  );

  /** Shrink: the viewport window starts covering the whole stage, then settles into its cell. */
  const shrinkTransform = useCallback((): string | undefined => {
    const root = wrapper.current?.querySelector('.sr-stage');
    const cell = wrapper.current?.querySelector('.sr-stage__viewport');
    if (!(root instanceof HTMLElement) || !(cell instanceof HTMLElement)) return undefined;
    const r = root.getBoundingClientRect();
    const c = cell.getBoundingClientRect();
    if (c.width === 0 || c.height === 0) return undefined;
    return `translate(${r.left - c.left}px, ${r.top - c.top}px) scale(${r.width / c.width}, ${r.height / c.height})`;
  }, []);

  useEffect(() => {
    if (scene === null || phase !== 'enter') return;
    let cancelled = false;
    scene.setExplode(0);
    scene.topDown(false);
    const lift = () => {
      if (cancelled) return;
      setPhase('open');
      scene.home(true);
      void scene.lift(DEFAULT_EXPLODE / 100);
    };
    if (open === 'full') {
      const transform = shrinkTransform();
      if (transform !== undefined) {
        setViewportStyle({ transform });
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (cancelled) return;
            setStageClass('sr-stage--shrink');
            setViewportStyle({ transform: 'none' });
            setTimeout(() => {
              setStageClass('');
              setViewportStyle(undefined);
              lift();
            }, duration.shrink + 50);
          }),
        );
        return () => {
          cancelled = true;
        };
      }
    }
    requestAnimationFrame(lift);
    return () => {
      cancelled = true;
    };
  }, [scene, phase, open, shrinkTransform]);

  const exit = useCallback(
    (after?: () => void) => {
      if (exiting.current) return;
      exiting.current = true;
      const finish = () => {
        props.onExit();
        after?.();
      };
      if (scene === null || open === 'none' || reduced) {
        finish();
        return;
      }
      setPhase('exit');
      scene.topDown(true);
      void scene.lift(0).then(() => {
        if (open !== 'full') {
          finish();
          return;
        }
        const transform = shrinkTransform();
        setStageClass('sr-stage--unshrink');
        setViewportStyle(transform === undefined ? undefined : { transform });
        setTimeout(finish, 320);
      });
    },
    [scene, open, reduced, props.onExit, shrinkTransform],
  );

  const select = useCallback(
    (index: number | null) => {
      setSelected(index);
      setInfoView('auto');
      if (index !== null) sceneRef.current?.locate(index, { reduced });
    },
    [reduced],
  );
  const selectTopMatch = useCallback(() => {
    const first = rows[0];
    if (first !== undefined) select(first.index);
  }, [rows, select]);

  const onPick = useCallback(
    (index: number, detail: 'click' | 'dblclick') => {
      if (detail === 'dblclick' && props.onFlash) {
        const flash = props.onFlash;
        exit(() => flash(index));
        return;
      }
      select(selected === index ? null : index);
    },
    [exit, props.onFlash, select, selected],
  );

  const toggleGroup = useCallback((index: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const digit = Number.parseInt(e.key, 10);
      if (digit >= 1 && digit <= colorModes.length) {
        setMode(colorModes[digit - 1] ?? 'depth');
      } else if (e.key === 'g' || e.key === 'G') {
        setFilters((f) => ({ ...f, hideGhosts: !f.hideGhosts }));
      } else if ((e.key === 't' || e.key === 'T') && hasShots) {
        setTextured((v) => !v);
      } else if (e.key === 's' || e.key === 'S') {
        setStaircase((v) => !v);
      } else if (e.key === 'l' || e.key === 'L') {
        setInfoView((v) => (v === 'ladder' ? 'auto' : 'ladder'));
      } else if (e.key === '?') {
        setInfoView((v) => (v === 'keys' ? 'auto' : 'keys'));
      } else if (e.key === '/') {
        const input = wrapper.current?.querySelector('input[type="search"]');
        if (input instanceof HTMLElement) input.focus();
      } else if (e.key === 'ArrowLeft') scene?.orbit(-ORBIT_STEP, 0);
      else if (e.key === 'ArrowRight') scene?.orbit(ORBIT_STEP, 0);
      else if (e.key === 'ArrowUp') scene?.orbit(0, -ORBIT_STEP);
      else if (e.key === 'ArrowDown') scene?.orbit(0, ORBIT_STEP);
      else return;
      e.preventDefault();
      e.stopPropagation();
    },
    [scene, hasShots],
  );

  useEffect(() => {
    if (!props.globalKeys) return;
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [props.globalKeys, onKey]);

  const onExplode = (value: number) => {
    setExplode(value);
    scene?.setExplode(value / 100);
  };

  const info =
    infoView === 'keys' ? (
      <div class="sr-pane__section">
        <KeyList bindings={keyBindings} />
      </div>
    ) : inspector !== null && infoView !== 'ladder' ? (
      <div class="sr-pane__section">
        <Inspector data={inspector} />
      </div>
    ) : infoView === 'ladder' ? (
      rungs.length > 0 ? (
        <div class="sr-pane__section">
          <Ladder rows={rungs} />
        </div>
      ) : (
        <EmptyState
          icon="ladder"
          title="Nothing competes at the root."
          hint="Every element sits in a nested context."
        />
      )
    ) : (
      <EmptyState
        icon="layers"
        title="Nothing selected."
        hint="Click a plane, or press L for the ladder."
      />
    );

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: keyboard scope for the tool when not global
    <div
      ref={wrapper}
      class="sr-app"
      style={{ height: '100%' }}
      onKeyDown={props.globalKeys ? undefined : onKey}
    >
      <Stage
        title={stageTitle(props.host, snapshot.elements.length, contexts)}
        storageKey={props.storageKey}
        globalKeys={props.globalKeys ?? false}
        onClose={() => exit()}
        class={stageClass}
        viewportStyle={viewportStyle}
        panesHidden={phase !== 'open'}
        infoTitle="Element info"
        infoOpen={infoOpen}
        layersOpen={searching ? true : undefined}
        layersFocused={searching || searchFocused}
        slot={
          <>
            {stats ? <span class="sr-stats">{stats.frameMs.toFixed(1)} ms</span> : null}
            <PixelStack size={16} />
          </>
        }
        viewport={
          <Viewport
            snapshot={snapshot}
            layout={layout}
            mode={mode}
            selected={selected}
            focus={focus}
            screenshots={props.screenshots}
            textured={textured}
            onPick={onPick}
            onScene={setScene}
            onStats={setStats}
          />
        }
        tools={
          <>
            <section class="sr-pane__section">
              <Filters
                value={filters}
                onChange={setFilters}
                matches={searching ? rows.length : null}
                isolateDisabled={selected === null}
                onSubmit={selectTopMatch}
                onSearchFocus={setSearchFocused}
                leading={
                  <>
                    <Toggle
                      label={hasShots ? 'Textured planes' : 'Textured planes (no photo)'}
                      checked={textured}
                      onChange={setTextured}
                      disabled={!hasShots}
                      kbd="T"
                    />
                    <Toggle label="Staircase" checked={staircase} onChange={setStaircase} kbd="S" />
                  </>
                }
              />
            </section>
            <section class="sr-pane__section">
              <h3 class="sr-pane__heading sr-label">View</h3>
              <ModePicker mode={mode} onChange={setMode} />
              <Slider
                label="Explode"
                value={explode}
                min={0}
                max={200}
                onChange={onExplode}
                format={(v) => `${v}%`}
              />
              <Slider
                label="Depth cutoff"
                value={depthCutoff ?? maxDepth}
                min={0}
                max={maxDepth}
                onChange={(v) => setDepthCutoff(v >= maxDepth ? null : v)}
                format={(v) => `${v} deep`}
              />
            </section>
            <section class="sr-pane__section">
              <h3 class="sr-pane__heading sr-label">Legend · {modeLabels[mode]}</h3>
              <Legend entries={legends[mode]} />
            </section>
          </>
        }
        layers={
          <LayerTree
            rows={rows}
            selected={selected}
            onSelect={(i) => select(selected === i ? null : i)}
            onToggleGroup={toggleGroup}
          />
        }
        info={info}
      />
    </div>
  );
}
