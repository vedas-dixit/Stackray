import { type IconName, icons } from '../icons';

export type IconProps = {
  name: IconName;
  /** Rendered size in pixels; the drawing is always 16×16. */
  size?: number;
  /** Accessible name. Omit for decorative icons, which are hidden from AT. */
  title?: string;
  class?: string;
};

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '1.5',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
} as const;

/**
 * One hand-drawn icon in `currentColor`.
 *
 * @example
 * <Icon name="ghost" size={16} />
 */
export function Icon({ name, size = 16, title, class: cls }: IconProps) {
  const paths = icons[name].map((s) => (
    <path
      key={s.d}
      d={s.d}
      fill={'fill' in s && s.fill ? 'currentColor' : 'none'}
      stroke={'fill' in s && s.fill ? 'none' : undefined}
      transform={'transform' in s ? s.transform : undefined}
    />
  ));
  if (title === undefined) {
    return (
      <svg
        class={cls}
        width={size}
        height={size}
        viewBox="0 0 16 16"
        aria-hidden="true"
        {...STROKE}
      >
        {paths}
      </svg>
    );
  }
  return (
    <svg class={cls} width={size} height={size} viewBox="0 0 16 16" role="img" {...STROKE}>
      <title>{title}</title>
      {paths}
    </svg>
  );
}
