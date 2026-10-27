export type LegendEntry = {
  /** One color, or several for a ramp. */
  swatch: string | string[];
  label: string;
};

/**
 * The legend for the active color mode. Ghosts are always the last entry.
 *
 * @example
 * <Legend entries={[{ swatch: ['#2e2924', '#f2ede4'], label: 'depth' }, { swatch: 'rgb(255 90 71 / .35)', label: 'ghost' }]} />
 */
export function Legend({ entries }: { entries: LegendEntry[] }) {
  return (
    <ul class="sr-legend">
      {entries.map((entry) => (
        <li key={entry.label}>
          {Array.isArray(entry.swatch) ? (
            <span
              class="sr-legend__swatch sr-legend__ramp"
              style={{ background: `linear-gradient(90deg, ${entry.swatch.join(', ')})` }}
            />
          ) : (
            <span class="sr-legend__swatch" style={{ background: entry.swatch }} />
          )}
          {entry.label}
        </li>
      ))}
    </ul>
  );
}
