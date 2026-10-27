import { useRef, useState } from 'preact/hooks';

export type SplitterProps = {
  /** `col` sits between the viewport and the tools pane; `row` above the info pane. */
  direction: 'col' | 'row';
  label: string;
  disabled?: boolean;
  /** Pixels moved since the last call; negative grows the pane. */
  onDrag: (delta: number) => void;
};

const KEY_STEP = 16;

/**
 * The drag gap between windows. Pointer drags follow the cursor every frame;
 * arrow keys step 16px.
 *
 * @example
 * <Splitter direction="col" label="Resize tools" onDrag={(d) => setToolsW((w) => w - d)} />
 */
export function Splitter(props: SplitterProps) {
  const [dragging, setDragging] = useState(false);
  const last = useRef<number | null>(null);
  const axis = (e: PointerEvent) => (props.direction === 'col' ? e.clientX : e.clientY);

  const onPointerDown = (e: PointerEvent) => {
    if (props.disabled) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    last.current = axis(e);
    setDragging(true);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!dragging || last.current === null) return;
    const now = axis(e);
    props.onDrag(now - last.current);
    last.current = now;
  };
  const onPointerUp = () => {
    last.current = null;
    setDragging(false);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const grow = props.direction === 'col' ? 'ArrowLeft' : 'ArrowUp';
    const shrink = props.direction === 'col' ? 'ArrowRight' : 'ArrowDown';
    if (e.key === grow) props.onDrag(-KEY_STEP);
    else if (e.key === shrink) props.onDrag(KEY_STEP);
    else return;
    e.preventDefault();
  };

  const classes = [
    'sr-splitter',
    props.direction === 'row' ? 'sr-splitter--row' : '',
    dragging ? 'sr-splitter--dragging' : '',
    props.disabled ? 'sr-splitter--disabled' : '',
    props.direction === 'col' ? 'sr-stage__split-col' : 'sr-stage__split-row',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      class={classes}
      aria-label={props.label}
      disabled={props.disabled ?? false}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    />
  );
}
