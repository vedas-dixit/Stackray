/** Rows of the 8×8 glyph; `#` is ink, `.` is clear. Three offset bars. */
const ROWS = [
  '........',
  '..#####.',
  '.#####..',
  '........',
  '...#####',
  '..#####.',
  '........',
  '.#####..',
];

/**
 * A tiny pixel stack for the viewport title bar, the way the apple sits on
 * vedasdixit.com. One of the two pixel-art pieces the style guide allows; the
 * other is the rocker switch.
 *
 * @example
 * <PixelStack size={16} />
 */
export function PixelStack({ size = 16 }: { size?: number }) {
  const px = size / 8;
  const cells: { x: number; y: number }[] = [];
  ROWS.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] === '#') cells.push({ x, y });
    }
  });
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      shape-rendering="crispEdges"
    >
      {cells.map((c) => (
        <rect
          key={`${c.x}-${c.y}`}
          x={c.x * px}
          y={c.y * px}
          width={px}
          height={px}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
