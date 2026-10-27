import type { InspectorData, LadderRow, LegendEntry, ShareStat, TreeRow } from '@stackray/ui';

export const treeRows: TreeRow[] = [
  { index: 0, depth: 0, label: 'html', badge: 'root', group: 'open' },
  { index: 1, depth: 1, label: 'body', group: 'open' },
  { index: 2, depth: 2, label: '#header', badge: 'sticky' },
  { index: 3, depth: 2, label: 'main', group: 'open' },
  { index: 4, depth: 3, label: '.card', badge: 'transform', badgeProblem: true, group: 'open' },
  { index: 5, depth: 4, label: 'button.menu-button' },
  { index: 6, depth: 4, label: '.dropdown', badge: 'z 9999', problem: true },
  { index: 7, depth: 3, label: '.card', group: 'closed', count: 2 },
  { index: 8, depth: 3, label: 'div.stroke', count: 36, group: 'closed' },
  { index: 9, depth: 2, label: '.ghost-overlay', ghost: true, badge: 'opacity 0' },
  { index: 10, depth: 2, label: 'dialog', badge: 'top layer' },
  { index: 11, depth: 2, label: 'sr-widget', badge: 'shadow' },
];

export const inspector: InspectorData = {
  label: '.dropdown',
  tag: 'div',
  position: 'absolute',
  zIndex: '9999',
  z: 9999,
  reasons: ['position + z-index'],
  chain: [
    { label: 'html', reason: 'root' },
    { label: '.card', reason: 'transform' },
    { label: '.dropdown', reason: 'z-index 9999' },
  ],
};

export const ladder: LadderRow[] = [
  { z: 20000, label: 'snackbar', reason: 'position: fixed, z-index' },
  { z: 2021, label: '#guide', reason: 'position: fixed, z-index' },
  { z: 2020, label: '#masthead', reason: 'position: fixed, z-index' },
  { z: 2018, label: '#frosted-glass', reason: 'position: fixed, z-index' },
  { z: 0, label: '#content', reason: 'will-change: transform' },
  { z: 0, label: 'ytd-app', reason: 'opacity' },
  { z: null, label: '#header', reason: 'position: sticky' },
];

export const legends: Record<string, LegendEntry[]> = {
  depth: [
    { swatch: ['#2e2924', '#8a7f74', '#f2ede4'], label: 'shallow → deep' },
    { swatch: 'rgb(255 90 71 / 0.35)', label: 'ghost' },
  ],
  context: [
    { swatch: 'hsl(28 60% 60%)', label: 'root' },
    { swatch: 'hsl(86 40% 55%)', label: '.card' },
    { swatch: 'hsl(190 45% 55%)', label: '#masthead' },
    { swatch: 'hsl(300 35% 60%)', label: 'dialog' },
    { swatch: 'rgb(255 90 71 / 0.35)', label: 'ghost' },
  ],
  heat: [
    { swatch: ['#2e2924', '#c8761f', '#ff5a47'], label: 'z 0 → 20 000' },
    { swatch: 'rgb(255 90 71 / 0.35)', label: 'ghost' },
  ],
  problems: [
    { swatch: 'var(--sr-plane-edge)', label: 'fine' },
    { swatch: 'var(--sr-danger-bright)', label: 'trapped z' },
    { swatch: 'rgb(255 90 71 / 0.35)', label: 'blocking ghost' },
    { swatch: 'var(--sr-plane-clipped)', label: 'cut off' },
  ],
  textured: [
    { swatch: 'var(--sr-plane-edge)', label: 'plane edge' },
    { swatch: 'rgb(255 90 71 / 0.35)', label: 'ghost' },
  ],
};

export const shareStats: ShareStat[] = [
  { label: 'elements', value: '2 607' },
  { label: 'deep', value: '36' },
  { label: 'contexts', value: '172' },
  { label: 'invisible', value: '326' },
];
