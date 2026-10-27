import type { ComponentChildren } from 'preact';
import { Dots } from './Dots';
import { Icon } from './Icon';
import { Window } from './Window';

export type PaneSide = 'right' | 'bottom' | 'top';

export type PaneProps = {
  /** Which edge the collapsed tab sits on and which way its chevron points. */
  side: PaneSide;
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  /** Highlight the frame, e.g. the layers pane while a search is typed. */
  focused?: boolean;
  /** Extra controls on the right of the title bar. */
  slot?: ComponentChildren;
  /** Preview only: show the dot glyph as if hovered. */
  showGlyphs?: boolean;
  children: ComponentChildren;
};

const CHEVRON_ROTATION: Record<PaneSide, string> = {
  right: 'rotate(180deg)',
  bottom: 'rotate(-90deg)',
  top: 'rotate(90deg)',
};

/**
 * A one-dot window for tools, layers or element info. The dot collapses it
 * to a thin tab on its edge; the tab opens it again.
 *
 * @example
 * <Pane side="bottom" title="Layers" collapsed={!open} onToggle={toggle} focused={searching}>…</Pane>
 */
export function Pane(props: PaneProps) {
  if (props.collapsed) {
    return (
      <div class={`sr-pane sr-pane--collapsed sr-pane--${props.side}`}>
        <button
          type="button"
          class="sr-pane__tab"
          aria-label={`Open ${props.title.toLowerCase()}`}
          onClick={props.onToggle}
        >
          <span class="sr-pane__tab-label">{props.title}</span>
          <span style={{ display: 'inline-flex', transform: CHEVRON_ROTATION[props.side] }}>
            <Icon name="chevron" size={14} />
          </span>
        </button>
      </div>
    );
  }
  return (
    <div class="sr-pane">
      <Window
        title={props.title}
        focused={props.focused ?? false}
        slot={props.slot}
        dots={
          <Dots
            variant="single"
            label={`Collapse ${props.title.toLowerCase()}`}
            onPress={props.onToggle}
            showGlyphs={props.showGlyphs ?? false}
          />
        }
        style={{ height: '100%' }}
      >
        {props.children}
      </Window>
    </div>
  );
}
