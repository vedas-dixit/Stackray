import type { KeyBinding } from '../model/keys';
import { Kbd } from './Kbd';

/**
 * The `?` list.
 *
 * @example
 * <KeyList bindings={keyBindings} />
 */
export function KeyList({ bindings }: { bindings: KeyBinding[] }) {
  return (
    <dl class="sr-keylist">
      {bindings.map((b) => (
        <div key={b.action} style={{ display: 'contents' }}>
          <dt>
            {b.keys.map((k) => (
              <Kbd key={k}>{k}</Kbd>
            ))}
          </dt>
          <dd>{b.action}</dd>
        </div>
      ))}
    </dl>
  );
}
