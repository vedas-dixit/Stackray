import type { ComponentChildren } from 'preact';

export type ButtonProps = {
  children: ComponentChildren;
  onClick?: (() => void) | undefined;
  primary?: boolean;
  disabled?: boolean;
};

/**
 * A plain button. It says what happens: "Export PNG", not "Share".
 *
 * @example
 * <Button primary onClick={exportPng}>Export PNG</Button>
 */
export function Button({ children, onClick, primary = false, disabled = false }: ButtonProps) {
  return (
    <button
      type="button"
      class={`sr-button${primary ? ' sr-button--primary' : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
