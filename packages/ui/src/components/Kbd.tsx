import type { ComponentChildren } from 'preact';

/**
 * A key cap.
 *
 * @example
 * <Kbd>Esc</Kbd>
 */
export function Kbd({ children }: { children: ComponentChildren }) {
  return <kbd class="sr-kbd">{children}</kbd>;
}
