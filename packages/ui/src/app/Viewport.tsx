import type { Snapshot } from '@stackray/core';
import {
  type ColorMode,
  createScene,
  type FrameStats,
  isTrapped,
  type LayoutOptions,
  type Scene,
  type Screenshot,
} from '@stackray/renderer';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Tooltip } from '../components/Tooltip';
import { shortReason } from '../model/tree';
import { uiPalette } from './palette';

export type ViewportProps = {
  snapshot: Snapshot;
  layout: Partial<LayoutOptions>;
  mode: ColorMode;
  selected: number | null;
  /** Elements to keep bright while everything else dims; `null` for none. */
  focus?: ReadonlySet<number> | null | undefined;
  /** Photographed screens of the page, from the extension or a fixture. */
  screenshots?: Screenshot[] | null | undefined;
  /** Draw leaf planes with their own pixels. */
  textured?: boolean;
  onPick: (index: number, detail: 'click' | 'dblclick') => void;
  /** The scene once it exists, `null` when it is torn down. */
  onScene?: ((scene: Scene | null) => void) | undefined;
  onStats?: ((stats: FrameStats) => void) | undefined;
};

type Hover = { index: number; x: number; y: number };

/**
 * The canvas plus the hover tooltip. Owns the renderer's lifetime; everything
 * else about the view comes in as props.
 *
 * @example
 * <Viewport snapshot={snapshot} layout={layout} mode="depth" selected={null} onPick={select} />
 */
export function Viewport(props: ViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const [hover, setHover] = useState<Hover | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    let frames = 0;
    const scene = createScene(canvas, {
      palette: uiPalette,
      onHover: (index, x, y) => setHover(index === null ? null : { index, x, y }),
      onPick: (index, detail) => latest.current.onPick(index, detail),
      onFrame: (stats) => {
        frames += 1;
        if (frames % 30 === 0) latest.current.onStats?.(stats);
      },
    });
    sceneRef.current = scene;
    scene.setSnapshot(latest.current.snapshot);
    scene.setLayout(latest.current.layout);
    scene.setMode(latest.current.mode);
    scene.setSelected(latest.current.selected);
    scene.setScreenshots(latest.current.screenshots ?? []);
    scene.setTextured(latest.current.textured ?? false);
    latest.current.onScene?.(scene);
    return () => {
      latest.current.onScene?.(null);
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setSnapshot(props.snapshot);
    sceneRef.current?.setScreenshots(props.screenshots ?? []);
  }, [props.snapshot, props.screenshots]);
  useEffect(() => {
    sceneRef.current?.setTextured(props.textured ?? false);
  }, [props.textured]);
  useEffect(() => {
    sceneRef.current?.setLayout(props.layout);
  }, [props.layout]);
  useEffect(() => {
    sceneRef.current?.setMode(props.mode);
  }, [props.mode]);
  useEffect(() => {
    sceneRef.current?.setSelected(props.selected);
  }, [props.selected]);
  useEffect(() => {
    sceneRef.current?.setFocus(props.focus ?? null);
  }, [props.focus]);

  const el = hover === null ? undefined : props.snapshot.elements[hover.index];
  return (
    <div class="sr-viewport-canvas">
      <canvas ref={canvasRef} tabIndex={-1} aria-label="3D view of the page" />
      {hover !== null && el !== undefined ? (
        <Tooltip
          x={hover.x}
          y={hover.y}
          label={el.sel}
          meta={tooltipMeta(el, props.snapshot)}
          problem={isTrapped(el, props.snapshot) || el.ghost || el.clipped}
        />
      ) : null}
    </div>
  );
}

function tooltipMeta(el: Snapshot['elements'][number], snapshot: Snapshot): string {
  const parts: string[] = [el.z === null ? 'z auto' : `z ${el.z}`];
  if (isTrapped(el, snapshot)) {
    const trap = el.scParent === null ? undefined : snapshot.elements[el.scParent];
    const reason = trap?.scReasons[0];
    parts.push(`trapped by ${trap?.sel ?? '?'}${reason ? ` (${shortReason(reason)})` : ''}`);
  } else if (el.sc && el.scReasons[0] !== undefined) {
    parts.push(shortReason(el.scReasons[0]));
  }
  if (el.ghost) parts.push(el.style.opacity === '0' ? 'opacity 0' : 'hidden');
  if (el.clipped) parts.push('cut off');
  else if (el.scrolledOut) parts.push('scrolled out');
  return parts.join(' · ');
}
