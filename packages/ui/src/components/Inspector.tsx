export type ChainLink = { label: string; reason?: string | undefined };

export type InspectorData = {
  label: string;
  tag: string;
  position: string;
  zIndex: string;
  z: number | null;
  reasons: string[];
  /** Stacking-context chain from the root to the element's own context. */
  chain: ChainLink[];
};

/**
 * The card for the selected element: label, tag, z, position and the
 * stacking chain as a breadcrumb with each context's reason.
 *
 * @example
 * <Inspector data={{ label: '.dropdown', tag: 'div', position: 'absolute', zIndex: '9999', z: 9999, reasons: [], chain }} />
 */
export function Inspector({ data }: { data: InspectorData }) {
  return (
    <dl class="sr-inspector">
      <dt class="sr-inspector__key">Element</dt>
      <dd class="sr-inspector__value sr-inspector__value--strong">
        {data.label} <span style={{ color: 'var(--sr-muted)' }}>{data.tag}</span>
      </dd>
      <dt class="sr-inspector__key">Position</dt>
      <dd class="sr-inspector__value">{data.position}</dd>
      <dt class="sr-inspector__key">z-index</dt>
      <dd class="sr-inspector__value">
        {data.zIndex}
        {data.z !== null && String(data.z) !== data.zIndex ? (
          <span style={{ color: 'var(--sr-muted)' }}> (effective {data.z})</span>
        ) : null}
      </dd>
      <dt class="sr-inspector__key">Context</dt>
      <dd class="sr-inspector__value">
        {data.reasons.length > 0 ? data.reasons.join(', ') : 'none'}
      </dd>
      <dt class="sr-inspector__key">Chain</dt>
      <dd class="sr-inspector__value">
        <ol class="sr-chain">
          {data.chain.map((link, i) => (
            <li key={`${link.label}-${i}`} style={{ display: 'contents' }}>
              {i > 0 ? <span class="sr-chain__sep">›</span> : null}
              <span>{link.label}</span>
              {link.reason ? <span class="sr-chain__reason">({link.reason})</span> : null}
            </li>
          ))}
        </ol>
      </dd>
    </dl>
  );
}
