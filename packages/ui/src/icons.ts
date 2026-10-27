/**
 * Hand-drawn icon paths on a 16×16 grid. Strokes are 1.5px with round caps;
 * corners overshoot by about half a pixel and long lines bow a little, the
 * way a pen does (STYLEGUIDE.md §5). `fill` marks the few filled shapes.
 */

export type IconStroke = { d: string; fill?: boolean; transform?: string };

export const icons = {
  stack: [
    { d: 'M2.6 11.4 L8 14.1 L13.4 11.3 L8 8.7 Z' },
    { d: 'M2.5 8.3 L8 11 L13.5 8.2 L8 5.6 Z' },
    { d: 'M2.4 4.4 L8 7.1 L13.6 4.2 L8 1.7 Z' },
  ],
  layers: [
    { d: 'M8 2.2 L14.1 5.1 L8 8 L1.9 5.1 Z' },
    { d: 'M2.2 8.3 L8 11.1 L13.8 8.2' },
    { d: 'M2.3 11.3 L8 14.1 L13.7 11.1' },
  ],
  ghost: [
    {
      d: 'M3.2 14.2 V7.4 C3.2 4.6 5.3 2.3 8 2.3 C10.7 2.3 12.8 4.6 12.8 7.4 V14 L11 12.4 L9.5 14 L8 12.5 L6.5 14 L5 12.4 Z',
    },
    { d: 'M6.2 7.2 m-0.9 0 a0.9 0.9 0 1 0 1.8 0 a0.9 0.9 0 1 0 -1.8 0', fill: true },
    { d: 'M9.8 7.1 m-0.9 0 a0.9 0.9 0 1 0 1.8 0 a0.9 0.9 0 1 0 -1.8 0', fill: true },
  ],
  scissors: [
    { d: 'M4.5 11.5 m-2.2 0 a2.2 2.2 0 1 0 4.4 0 a2.2 2.2 0 1 0 -4.4 0' },
    { d: 'M11.5 11.5 m-2.2 0 a2.2 2.2 0 1 0 4.4 0 a2.2 2.2 0 1 0 -4.4 0' },
    { d: 'M6.2 10.2 L12.6 2.4' },
    { d: 'M9.8 10.2 L3.4 2.5' },
  ],
  ladder: [
    { d: 'M4.4 1.8 V14.3' },
    { d: 'M11.6 1.7 V14.2' },
    { d: 'M4.5 4.6 H11.5' },
    { d: 'M4.4 7.8 H11.6' },
    { d: 'M4.5 11 H11.5' },
  ],
  chevron: [{ d: 'M6 3.4 L10.6 8 L6 12.6' }],
  search: [
    { d: 'M7 7 m-4.2 0 a4.2 4.2 0 1 0 8.4 0 a4.2 4.2 0 1 0 -8.4 0' },
    { d: 'M10.2 10.3 L14 14.1' },
  ],
  keys: [
    {
      d: 'M1.8 5.2 a1 1 0 0 1 1 -1 H13.2 a1 1 0 0 1 1 1 V11.2 a1 1 0 0 1 -1 1 H2.8 a1 1 0 0 1 -1 -1 Z',
    },
    { d: 'M4.2 7 H5.4 M7.4 7 H8.6 M10.6 7 H11.8 M5 9.8 H11' },
  ],
  orbit: [
    { d: 'M8 8 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0' },
    {
      d: 'M8 8 m-6.8 0 a6.8 2.6 0 1 0 13.6 0 a6.8 2.6 0 1 0 -13.6 0',
      transform: 'rotate(-25 8 8)',
    },
  ],
  close: [{ d: 'M3.6 3.4 L12.5 12.4' }, { d: 'M12.3 3.6 L3.5 12.6' }],
  minus: [{ d: 'M3.4 8.1 H12.6' }],
  plus: [{ d: 'M8 3.4 V12.6' }, { d: 'M3.4 8.1 H12.6' }],
  grip: [{ d: 'M12.5 5.5 L5.5 12.5' }, { d: 'M12.6 9.6 L9.6 12.6' }],
  pin: [{ d: 'M6.2 2.4 H9.8 L9.3 7.2 L11.6 9.6 H4.4 L6.7 7.2 Z' }, { d: 'M8 9.6 V14' }],
} as const satisfies Record<string, readonly IconStroke[]>;

export type IconName = keyof typeof icons;

/** The squiggle divider from the blog, as an 80×8 path. */
export const squigglePath = 'M1 5 C 8 1, 14 9, 21 5 S 34 1, 41 5 S 54 9, 61 5 S 74 1, 79 5';
