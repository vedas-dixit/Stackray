import type { ComponentChildren } from 'preact';

export type VerdictProps = {
  kind: 'problem' | 'fine' | 'pending';
  /** Exactly one sentence. Element names go in `<code>`. */
  children: ComponentChildren;
  /** A second sentence, only when there is a concrete fix. */
  fix?: string | undefined;
};

/**
 * One serif sentence with a 2px left rule: danger for a problem, accent when
 * things are fine, hairline while waiting for the second pick.
 *
 * @example
 * <Verdict kind="problem" fix="Move .dropdown out of .card or remove the transform.">
 *   <code>.dropdown</code> (z 9999) is trapped inside <code>.card</code>, which creates a stacking context via <em>transform</em>.
 * </Verdict>
 */
export function Verdict({ kind, children, fix }: VerdictProps) {
  return (
    <p class={`sr-verdict sr-verdict--${kind}`} aria-live="polite">
      {children}
      {fix ? <span class="sr-verdict__fix">Fix: {fix}</span> : null}
    </p>
  );
}
