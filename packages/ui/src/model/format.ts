const THIN_SPACE = ' ';

/**
 * Group thousands with a thin space: `2607` → `2 607`.
 *
 * @example
 * formatCount(2607); // '2 607'
 */
export function formatCount(n: number): string {
  const sign = n < 0 ? '-' : '';
  const digits = Math.abs(Math.trunc(n)).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, THIN_SPACE);
  return `${sign}${grouped}`;
}

/**
 * The viewport window title: `host · N layers · M contexts`.
 *
 * @example
 * stageTitle('youtube.com', 2607, 172); // 'youtube.com · 2 607 layers · 172 contexts'
 */
export function stageTitle(host: string, layers: number, contexts: number): string {
  return `${host} · ${formatCount(layers)} layers · ${formatCount(contexts)} contexts`;
}
