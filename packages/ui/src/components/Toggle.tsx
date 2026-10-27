import { Kbd } from './Kbd';
import { PixelSwitch } from './PixelSwitch';

export type ToggleProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Shortcut shown on the right. */
  kbd?: string | undefined;
};

/**
 * A pixel rocker switch with a label: the lever is up and amber when on,
 * down and ink when off.
 *
 * @example
 * <Toggle label="Hide ghosts" checked={hide} onChange={setHide} kbd="G" />
 */
export function Toggle({ label, checked, onChange, disabled = false, kbd }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      class={`sr-toggle${checked ? ' sr-toggle--on' : ''}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <PixelSwitch on={checked} size={24} />
      <span class="sr-toggle__label">{label}</span>
      {kbd ? <Kbd>{kbd}</Kbd> : null}
    </button>
  );
}
