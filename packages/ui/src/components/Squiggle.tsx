import { squigglePath } from '../icons';

/**
 * The blog's hand-drawn wavy rule. Reserved for the empty state and the
 * share card, where a little play is welcome.
 *
 * @example
 * <Squiggle />
 */
export function Squiggle({ class: cls = 'sr-squiggle' }: { class?: string }) {
  return (
    <svg
      class={cls}
      viewBox="0 0 80 8"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      aria-hidden="true"
    >
      <path d={squigglePath} />
    </svg>
  );
}
