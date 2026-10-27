import { useState } from 'preact/hooks';

export type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** How the value reads on the right, e.g. `(v) => `${v}px``. */
  format?: ((value: number) => string) | undefined;
  disabled?: boolean;
  /** Preview only: draw the dragging state. */
  dragging?: boolean;
};

/**
 * Label, track, square thumb and the value in mono. Explode distance and
 * depth cutoff use it.
 *
 * @example
 * <Slider label="Explode" value={explode} min={0} max={100} onChange={setExplode} format={(v) => `${v}%`} />
 */
export function Slider(props: SliderProps) {
  const [active, setActive] = useState(false);
  const dragging = props.dragging ?? active;
  const format = props.format ?? ((v: number) => String(v));
  const classes = [
    'sr-slider',
    dragging ? 'sr-slider--dragging' : '',
    props.disabled ? 'sr-slider--disabled' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <label class={classes}>
      <span class="sr-slider__label">{props.label}</span>
      <span class="sr-slider__value">{format(props.value)}</span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        disabled={props.disabled ?? false}
        onInput={(e) => props.onChange(Number((e.currentTarget as HTMLInputElement).value))}
        onPointerDown={() => setActive(true)}
        onPointerUp={() => setActive(false)}
        onPointerCancel={() => setActive(false)}
      />
    </label>
  );
}
