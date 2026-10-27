import { useEffect, useRef } from 'preact/hooks';
import { Icon } from './Icon';

export type TreeRow = {
  /** Element index, or the first element of a group. */
  index: number;
  depth: number;
  label: string;
  /** Stacking-context reason shown as a badge, e.g. `transform`. */
  badge?: string | undefined;
  badgeProblem?: boolean;
  /** Repeated siblings collapsed into one row: `div.stroke ×36`. */
  count?: number | undefined;
  ghost?: boolean;
  problem?: boolean;
  /** `null` for leaves. */
  group?: 'open' | 'closed' | null;
  /** Label character positions to highlight, from a search. */
  match?: number[] | undefined;
};

export type LayerTreeProps = {
  rows: TreeRow[];
  selected: number | null;
  onSelect: (index: number) => void;
  onToggleGroup?: ((index: number) => void) | undefined;
};

/**
 * Rows with depth indent, a label, a context badge with its reason and the
 * repeat count for grouped siblings. The selected row scrolls into view.
 *
 * @example
 * <LayerTree rows={rows} selected={selected} onSelect={setSelected} />
 */
export function LayerTree({ rows, selected, onSelect, onToggleGroup }: LayerTreeProps) {
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (selected === null) return;
    const row = list.current?.querySelector('[aria-current="true"]');
    row?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  return (
    <ul class="sr-tree" ref={list}>
      {rows.map((row) => {
        const group = row.group ?? null;
        const classes = [
          'sr-row',
          row.index === selected ? 'sr-row--selected' : '',
          row.ghost ? 'sr-row--ghost' : '',
          row.problem ? 'sr-row--problem' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <li key={row.index} class={classes} style={{ '--sr-depth': row.depth }}>
            {group === null ? (
              <span class="sr-row__twisty sr-row__twisty--leaf" />
            ) : (
              <button
                type="button"
                class={`sr-row__twisty${group === 'open' ? ' sr-row__twisty--open' : ''}`}
                aria-label={group === 'open' ? 'Collapse group' : 'Expand group'}
                aria-expanded={group === 'open'}
                onClick={() => onToggleGroup?.(row.index)}
              >
                <Icon name="chevron" size={12} />
              </button>
            )}
            <button
              type="button"
              class="sr-row__main"
              aria-current={row.index === selected ? 'true' : undefined}
              onClick={() => onSelect(row.index)}
            >
              <span class="sr-row__label">{highlight(row.label, row.match)}</span>
              {row.badge ? (
                <span class={`sr-badge${row.badgeProblem ? ' sr-badge--problem' : ''}`}>
                  {row.badge}
                </span>
              ) : null}
              {row.count !== undefined && row.count > 1 ? (
                <span class="sr-row__count">×{row.count}</span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Wrap matched characters in `<mark>`, merging runs so the markup stays small. */
function highlight(label: string, match: number[] | undefined) {
  if (match === undefined || match.length === 0) return label;
  const set = new Set(match);
  const parts: preact.ComponentChildren[] = [];
  let run = '';
  let marked = false;
  for (let i = 0; i < label.length; i += 1) {
    const isMatch = set.has(i);
    if (isMatch !== marked && run !== '') {
      parts.push(marked ? <mark key={`m${i}`}>{run}</mark> : run);
      run = '';
    }
    marked = isMatch;
    run += label[i];
  }
  if (run !== '') parts.push(marked ? <mark key="end">{run}</mark> : run);
  return parts;
}
