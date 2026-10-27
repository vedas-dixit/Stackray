import type { ColorMode } from '@stackray/renderer';
import type { LegendEntry } from '../components/Legend';
import { color } from '../tokens';

const GHOST: LegendEntry = { swatch: 'rgb(255 90 71 / 0.25)', label: 'ghost' };
const CLIPPED: LegendEntry = { swatch: color.dangerBright, label: 'cut off' };

/** One legend per color mode. Ghosts are always last. */
export const legends: Record<ColorMode, LegendEntry[]> = {
  depth: [{ swatch: ['#3a342e', '#8a7f74', color.cream], label: 'shallow → deep' }, CLIPPED, GHOST],
  context: [
    { swatch: 'hsl(28 45% 62%)', label: 'root context' },
    { swatch: 'hsl(86 45% 62%)', label: 'next context' },
    { swatch: 'hsl(190 45% 62%)', label: 'and so on' },
    CLIPPED,
    GHOST,
  ],
  heat: [
    { swatch: ['#3a342e', color.accentBright, color.dangerBright], label: 'z 0 → max' },
    CLIPPED,
    GHOST,
  ],
  problems: [
    { swatch: 'rgb(242 237 228 / 0.18)', label: 'fine' },
    { swatch: color.dangerBright, label: 'trapped z' },
    CLIPPED,
    GHOST,
  ],
  plain: [{ swatch: 'rgb(242 237 228 / 0.55)', label: 'plane' }, CLIPPED, GHOST],
};

/** Mode names as the picker shows them. */
export const modeLabels: Record<ColorMode, string> = {
  depth: 'Depth',
  context: 'Contexts',
  heat: 'z heat',
  problems: 'Problems',
  plain: 'Plain',
};
