import type { ComponentChildren } from 'preact';
import { useRef, useState } from 'preact/hooks';
import { Icon } from './Icon';

export type WindowProps = {
  title: string;
  /** The dots on the left of the title bar. */
  dots: ComponentChildren;
  /** Light cream title bar (panes) or dark brown (the viewport window). */
  tone?: 'light' | 'dark';
  /** Extra controls on the right of the title bar. */
  slot?: ComponentChildren;
  focused?: boolean;
  /** Dark body with no scrolling; for the 3D canvas. */
  viewport?: boolean;
  /** Show the bottom-right grip and report drags in pixels. */
  onResize?: ((dx: number, dy: number) => void) | undefined;
  class?: string;
  style?: Record<string, string | number | undefined>;
  children: ComponentChildren;
};

/**
 * A retro-Mac window: 1px brown frame, 10px corners, a title bar with dots
 * and an uppercase mono title, and an optional resize grip.
 *
 * @example
 * <Window title="youtube.com · 2 607 layers" tone="dark" dots={<Dots variant="traffic" onClose={exit} />} viewport>
 *   <canvas />
 * </Window>
 */
export function Window(props: WindowProps) {
  const [resizing, setResizing] = useState(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const tone = props.tone ?? 'light';
  const classes = [
    'sr-window',
    props.focused ? 'sr-window--focused' : '',
    resizing ? 'sr-window--resizing' : '',
    props.class ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const onPointerDown = (e: PointerEvent) => {
    if (!props.onResize) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    last.current = { x: e.clientX, y: e.clientY };
    setResizing(true);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!resizing || last.current === null || !props.onResize) return;
    props.onResize(e.clientX - last.current.x, e.clientY - last.current.y);
    last.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = () => {
    last.current = null;
    setResizing(false);
  };

  return (
    <section class={classes} style={props.style} aria-label={props.title}>
      <header class={`sr-titlebar${tone === 'dark' ? ' sr-titlebar--dark' : ''}`}>
        {props.dots}
        <h2 class="sr-titlebar__title" style={{ margin: 0, fontWeight: 'inherit' }}>
          {props.title}
        </h2>
        {props.slot ? <div class="sr-titlebar__slot">{props.slot}</div> : null}
      </header>
      <div class={`sr-window__body${props.viewport ? ' sr-window__body--viewport' : ''}`}>
        {props.children}
      </div>
      {props.onResize ? (
        <button
          type="button"
          class="sr-resize"
          aria-label="Resize window"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <Icon name="grip" size={14} />
        </button>
      ) : null}
    </section>
  );
}
