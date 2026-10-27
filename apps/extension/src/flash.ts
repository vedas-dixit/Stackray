const FLASH_TAG = 'stackray-flash';

/**
 * Outline an element on the restored page for a moment, using a host of our
 * own rather than any style on the element. Removes itself.
 *
 * @example
 * flashElement(captured.elementAt(index));
 */
export function flashElement(el: Element | null): void {
  if (el === null) return;
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const rect = el.getBoundingClientRect();
  const host = document.createElement(FLASH_TAG);
  host.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:2147483647;display:block;';
  const shadow = host.attachShadow({ mode: 'closed' });
  const box = document.createElement('div');
  box.style.cssText = [
    'position:fixed',
    `left:${rect.left - 2}px`,
    `top:${rect.top - 2}px`,
    `width:${rect.width + 4}px`,
    `height:${rect.height + 4}px`,
    'border:2px solid #f0a64a',
    'border-radius:3px',
    'box-shadow:0 0 0 9999px rgb(43 36 32 / 0.25)',
    'transition:opacity 500ms ease-out 400ms',
  ].join(';');
  shadow.append(box);
  document.documentElement.append(host);
  requestAnimationFrame(() => {
    box.style.opacity = '0';
  });
  setTimeout(() => host.remove(), 1000);
}
