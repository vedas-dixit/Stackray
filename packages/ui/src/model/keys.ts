/** Every keyboard shortcut, in the order the `?` list shows them. */
export type KeyBinding = { keys: string[]; action: string };

export const keyBindings: KeyBinding[] = [
  { keys: ['Esc'], action: 'Exit and restore the page' },
  { keys: [']'], action: 'Toggle the tools window' },
  { keys: ['_'], action: 'Toggle the info window' },
  { keys: ['Z'], action: 'Zen: collapse both' },
  { keys: ['←', '→', '↑', '↓'], action: 'Orbit' },
  { keys: ['Space', 'drag'], action: 'Pan the view (middle or right drag also pans)' },
  { keys: ['wheel'], action: 'Zoom toward the cursor' },
  { keys: ['1', '…', '5'], action: 'Color modes' },
  { keys: ['/'], action: 'Search selectors' },
  { keys: ['G'], action: 'Toggle ghosts' },
  { keys: ['T'], action: 'Textured planes: each leaf shows its own pixels' },
  {
    keys: ['S'],
    action: 'Staircase: every layer on its own step in paint order, instead of overlap levels',
  },
  { keys: ['L'], action: 'Ladder' },
  { keys: ['?'], action: 'This list' },
];
