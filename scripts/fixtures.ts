/**
 * Pages that `pnpm fixtures` captures. Local pages are deterministic and
 * same-origin; remote ones are captured by hand and reviewed before commit.
 */
export type FixtureSource = {
  name: string;
  /** A file name inside `fixtures/` or an absolute URL. */
  source: string;
  viewport: { width: number; height: number };
};

export const fixtures: FixtureSource[] = [
  {
    name: 'broken-dropdown',
    source: 'broken-dropdown.html',
    viewport: { width: 1200, height: 800 },
  },
];
