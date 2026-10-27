import type { IconName } from '../icons';
import { Icon } from './Icon';
import { Squiggle } from './Squiggle';

export type EmptyStateProps = {
  icon: IconName;
  /** One serif line, e.g. "Nothing selected." */
  title: string;
  /** One mono line saying what to do next. */
  hint?: string | undefined;
};

/**
 * A doodle, one serif line and one mono line. Never apologetic.
 *
 * @example
 * <EmptyState icon="layers" title="Nothing selected." hint="Click a plane, or press L for the ladder." />
 */
export function EmptyState({ icon, title, hint }: EmptyStateProps) {
  return (
    <div class="sr-empty">
      <Icon name={icon} size={40} />
      <p class="sr-serif" style={{ margin: 0 }}>
        {title}
      </p>
      {hint ? <p class="sr-empty__hint">{hint}</p> : null}
      <Squiggle />
    </div>
  );
}
