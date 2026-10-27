import { type ColorMode, colorModes } from '@stackray/renderer';
import { Kbd } from '../components/Kbd';
import { modeLabels } from '../model/legend';

/**
 * The five color modes as a row of small buttons, keys `1`…`5`.
 *
 * @example
 * <ModePicker mode={mode} onChange={setMode} />
 */
export function ModePicker({
  mode,
  onChange,
}: {
  mode: ColorMode;
  onChange: (mode: ColorMode) => void;
}) {
  return (
    <fieldset class="sr-modes">
      <legend class="sr-visually-hidden">Color mode</legend>
      {colorModes.map((m, i) => (
        <button
          type="button"
          key={m}
          aria-pressed={m === mode}
          class={`sr-button${m === mode ? ' sr-button--on' : ''}`}
          onClick={() => onChange(m)}
        >
          <Kbd>{i + 1}</Kbd> {modeLabels[m]}
        </button>
      ))}
    </fieldset>
  );
}
