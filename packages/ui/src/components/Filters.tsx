import type { ComponentChildren } from 'preact';
import { Icon } from './Icon';
import { Kbd } from './Kbd';
import { Toggle } from './Toggle';

export type FilterState = {
  hideEmpty: boolean;
  hideGhosts: boolean;
  onlyContexts: boolean;
  isolate: boolean;
  query: string;
};

export const defaultFilters: FilterState = {
  hideEmpty: true,
  hideGhosts: false,
  onlyContexts: false,
  isolate: false,
  query: '',
};

export type FiltersProps = {
  value: FilterState;
  onChange: (next: FilterState) => void;
  /** Number of selector matches; `null` while the query is empty. */
  matches?: number | null;
  /** Isolate needs a selection. */
  isolateDisabled?: boolean;
  /** Enter in the search box: select the top match. */
  onSubmit?: (() => void) | undefined;
  /** The search box gained or lost focus. */
  onSearchFocus?: ((focused: boolean) => void) | undefined;
  /** Rendered between the search box and the toggles, e.g. the textured switch. */
  leading?: ComponentChildren;
};

/**
 * Selector search on top, then hide empty · hide ghosts · only stacking
 * contexts · isolate subtree. Esc in the box clears it; Enter picks the top match.
 *
 * @example
 * <Filters value={filters} onChange={setFilters} matches={12} onSubmit={selectFirst} />
 */
export function Filters({
  value,
  onChange,
  matches = null,
  isolateDisabled = false,
  onSubmit,
  onSearchFocus,
  leading,
}: FiltersProps) {
  const set = (patch: Partial<FilterState>) => onChange({ ...value, ...patch });
  const searching = value.query.trim() !== '';
  const noMatch = searching && matches === 0;
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      set({ query: '' });
      (e.currentTarget as HTMLInputElement).blur();
    } else if (e.key === 'Enter') {
      onSubmit?.();
    } else {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
  };
  return (
    <div class="sr-filters">
      <label class={`sr-search${noMatch ? ' sr-search--no-match' : ''}`}>
        <Icon name="search" size={14} />
        <input
          type="search"
          placeholder="Search layers"
          aria-label="Search layers"
          autocomplete="off"
          spellcheck={false}
          value={value.query}
          onInput={(e) => set({ query: (e.currentTarget as HTMLInputElement).value })}
          onKeyDown={onKeyDown}
          onFocus={() => onSearchFocus?.(true)}
          onBlur={() => onSearchFocus?.(false)}
        />
        {noMatch ? <span class="sr-search__hint">no match</span> : null}
        {!noMatch && searching && matches !== null ? (
          <span class="sr-tooltip__meta">{matches}</span>
        ) : null}
        {!searching ? (
          <span class="sr-search__kbd">
            <Kbd>/</Kbd>
          </span>
        ) : null}
      </label>
      {leading}
      <Toggle
        label="Hide empty"
        checked={value.hideEmpty}
        onChange={(v) => set({ hideEmpty: v })}
      />
      <Toggle
        label="Hide ghosts"
        checked={value.hideGhosts}
        onChange={(v) => set({ hideGhosts: v })}
        kbd="G"
      />
      <Toggle
        label="Only stacking contexts"
        checked={value.onlyContexts}
        onChange={(v) => set({ onlyContexts: v })}
      />
      <Toggle
        label="Isolate subtree"
        checked={value.isolate}
        onChange={(v) => set({ isolate: v })}
        disabled={isolateDisabled}
      />
    </div>
  );
}
