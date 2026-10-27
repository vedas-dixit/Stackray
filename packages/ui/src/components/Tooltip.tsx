export type TooltipProps = {
  x: number;
  y: number;
  label: string;
  /** Second line: `z 9999 · transform`. */
  meta: string;
  problem?: boolean;
};

/**
 * The hover label in the viewport. Follows the cursor by 12px.
 *
 * @example
 * <Tooltip x={120} y={80} label=".dropdown" meta="z 9999 · transform" />
 */
export function Tooltip({ x, y, label, meta, problem = false }: TooltipProps) {
  return (
    <div
      class={`sr-tooltip${problem ? ' sr-tooltip--problem' : ''}`}
      style={{ left: `${x}px`, top: `${y}px` }}
      role="tooltip"
    >
      {label}
      <span class="sr-tooltip__meta">{meta}</span>
    </div>
  );
}
