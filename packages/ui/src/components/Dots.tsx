import { Icon } from './Icon';

export type TrafficDotsProps = {
  variant: 'traffic';
  onClose: () => void;
  onZen?: (() => void) | undefined;
  onFill?: (() => void) | undefined;
  /** Preview only: show the glyphs as if hovered. */
  showGlyphs?: boolean;
};

export type SingleDotProps = {
  variant: 'single';
  label: string;
  onPress: () => void;
  showGlyphs?: boolean;
};

export type DotsProps = TrafficDotsProps | SingleDotProps;

/**
 * The three traffic lights of a Window, or the single idle dot of a Pane.
 * Red closes (same as Esc). Yellow and green are drawn but inert until a
 * handler is passed (SPEC.md §4.1). Glyphs appear on hover.
 *
 * @example
 * <Dots variant="traffic" onClose={exit} />
 * <Dots variant="single" label="Collapse tools" onPress={collapse} />
 */
export function Dots(props: DotsProps) {
  const force = props.showGlyphs === true ? ' sr-dots--glyphs' : '';
  if (props.variant === 'single') {
    return (
      <div class={`sr-dots${force}`}>
        <button type="button" class="sr-dot" aria-label={props.label} onClick={props.onPress}>
          <Icon name="minus" size={8} class="sr-dot__glyph" />
        </button>
      </div>
    );
  }
  return (
    <div class={`sr-dots${force}`}>
      <button
        type="button"
        class="sr-dot sr-dot--red"
        aria-label="Close Stackray and restore the page"
        onClick={props.onClose}
      >
        <Icon name="close" size={8} class="sr-dot__glyph" />
      </button>
      <button
        type="button"
        class={`sr-dot sr-dot--yellow${props.onZen ? '' : ' sr-dot--inert'}`}
        aria-label="Zen: collapse both windows"
        aria-disabled={props.onZen ? undefined : 'true'}
        tabIndex={props.onZen ? undefined : -1}
        onClick={props.onZen}
      >
        <Icon name="minus" size={8} class="sr-dot__glyph" />
      </button>
      <button
        type="button"
        class={`sr-dot sr-dot--green${props.onFill ? '' : ' sr-dot--inert'}`}
        aria-label="Fill the stage with the viewport"
        aria-disabled={props.onFill ? undefined : 'true'}
        tabIndex={props.onFill ? undefined : -1}
        onClick={props.onFill}
      >
        <Icon name="plus" size={8} class="sr-dot__glyph" />
      </button>
    </div>
  );
}
