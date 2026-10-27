import { Tooltip } from '@stackray/ui';

type Plane = {
  x: number;
  y: number;
  w: number;
  h: number;
  level: number;
  kind?: 'selected' | 'ghost' | 'clipped';
};

/** Planes in page space; `level` lifts them. Hand-placed to read like a page. */
const PLANES: Plane[] = [
  { x: 0, y: 0, w: 400, h: 240, level: 0 },
  { x: 0, y: 0, w: 400, h: 28, level: 1 },
  { x: 16, y: 44, w: 110, h: 80, level: 1 },
  { x: 144, y: 44, w: 110, h: 80, level: 1 },
  { x: 272, y: 44, w: 110, h: 80, level: 1 },
  { x: 16, y: 140, w: 366, h: 84, level: 1 },
  { x: 24, y: 72, w: 90, h: 40, level: 2, kind: 'selected' },
  { x: 152, y: 100, w: 70, h: 30, level: 2, kind: 'clipped' },
  { x: 0, y: 0, w: 400, h: 240, level: 3, kind: 'ghost' },
  { x: 300, y: 180, w: 80, h: 32, level: 4 },
];

const LIFT = 34;
const SKEW = 0.42;

function corners(p: Plane): string {
  const dx = (y: number) => y * SKEW;
  const base = 330 - p.level * LIFT;
  const top = base - p.h * 0.5;
  const yTop = top + p.y * 0.5;
  const yBot = yTop + p.h * 0.5;
  const x0 = 120 + p.x + dx(p.y * 0.5);
  const x1 = x0 + p.w;
  const x2 = x1 + dx(p.h * 0.5);
  const x3 = x0 + dx(p.h * 0.5);
  return `${x0},${yTop} ${x1},${yTop} ${x2},${yBot} ${x3},${yBot}`;
}

/**
 * A static sketch of the lifted page for the preview page, so components can
 * be shown in their real layout without starting WebGL.
 */
export function ViewportSketch() {
  return (
    <div class="sr-viewport">
      <svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <g stroke="var(--sr-viewport-grid)" stroke-width="1">
          <line x1={60} y1={400} x2={700} y2={400} />
          <line x1={120} y1={330} x2={580} y2={330} opacity={0.6} />
        </g>
        {PLANES.map((p, i) => {
          const kind = p.kind ?? 'plain';
          const stroke =
            kind === 'selected'
              ? 'var(--sr-plane-selected)'
              : kind === 'ghost' || kind === 'clipped'
                ? 'var(--sr-plane-clipped)'
                : 'var(--sr-plane-edge)';
          const fill =
            kind === 'ghost'
              ? 'var(--sr-plane-ghost)'
              : kind === 'selected'
                ? 'var(--sr-plane-fill-hover)'
                : 'var(--sr-plane-fill)';
          return (
            <polygon
              key={`${i}-${p.level}`}
              points={corners(p)}
              fill={fill}
              stroke={stroke}
              stroke-width={kind === 'selected' ? 2 : 1.25}
              stroke-dasharray={kind === 'clipped' ? '4 3' : undefined}
              stroke-linejoin="round"
            />
          );
        })}
      </svg>
      <Tooltip
        x={226}
        y={118}
        label=".dropdown"
        meta="z 9999 · trapped by .card (transform)"
        problem
      />
    </div>
  );
}
