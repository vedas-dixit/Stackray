import {
  Button,
  Dots,
  defaultFilters,
  EmptyState,
  Filters,
  Icon,
  type IconName,
  Inspector,
  icons,
  Kbd,
  KeyList,
  keyBindings,
  Ladder,
  LayerTree,
  Legend,
  Pane,
  PixelStack,
  ShareCard,
  Slider,
  Squiggle,
  Stage,
  stageTitle,
  Toggle,
  Tooltip,
  Verdict,
  Window,
} from '@stackray/ui';
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { inspector, ladder, legends, shareStats, treeRows } from './data';
import { ViewportSketch } from './viewport-sketch';

const noop = () => undefined;

/** The tokens-and-components page: `/#preview`. Screenshotted into docs/ui-preview.png. */
export function Preview() {
  return (
    <main class="sr-root preview">
      <header>
        <h1>Stackray, on the desk</h1>
        <p class="preview__intro">
          Every token and component in every state, rendered with the real stylesheet.
        </p>
      </header>

      <section>
        <h2>Stage · both windows open</h2>
        <div class="preview__stage" data-testid="stage-open">
          <StageDemo />
        </div>
      </section>

      <section>
        <h2>Stage · zen, both collapsed</h2>
        <div class="preview__stage preview__stage--small" data-testid="stage-zen">
          <Stage
            title={stageTitle('figma.com', 1660, 172)}
            initial={{ toolsOpen: false, infoOpen: false, layersOpen: false }}
            onClose={noop}
            viewport={<ViewportSketch />}
            tools={null}
            layers={null}
            info={null}
          />
        </div>
      </section>

      <TokensSection />
      <ComponentsSection />
    </main>
  );
}

function StageDemo() {
  const [selected, setSelected] = useState<number | null>(6);
  const [filters, setFilters] = useState(defaultFilters);
  const [explode, setExplode] = useState(64);
  const [depth, setDepth] = useState(36);
  return (
    <Stage
      title={stageTitle('youtube.com', 2607, 172)}
      onClose={noop}
      showGlyphs
      initial={{ infoOpen: true }}
      infoTitle="Element info"
      layersFocused={filters.query !== ''}
      slot={<PixelStack size={16} />}
      viewport={<ViewportSketch />}
      tools={
        <>
          <div class="sr-pane__section">
            <Filters value={filters} onChange={setFilters} matches={null} />
          </div>
          <div class="sr-pane__section">
            <h3 class="sr-pane__heading sr-label">View</h3>
            <Slider
              label="Explode"
              value={explode}
              min={0}
              max={100}
              onChange={setExplode}
              format={(v) => `${v}%`}
            />
            <Slider
              label="Depth cutoff"
              value={depth}
              min={1}
              max={36}
              onChange={setDepth}
              format={(v) => `${v} deep`}
            />
          </div>
          <div class="sr-pane__section">
            <h3 class="sr-pane__heading sr-label">Legend · problems</h3>
            <Legend entries={legends.problems ?? []} />
          </div>
        </>
      }
      layers={
        <LayerTree
          rows={treeRows}
          selected={selected}
          onSelect={setSelected}
          onToggleGroup={noop}
        />
      }
      info={
        <div
          class="sr-pane__section"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 'var(--sr-space-4)' }}
        >
          <Inspector data={inspector} />
          <Verdict kind="problem" fix="Move .dropdown out of .card or remove the transform.">
            <code>.dropdown</code> (z 9999) is trapped inside <code>.card</code>, which creates a
            stacking context via <em>transform</em>, so it paints behind <code>#header</code> (z
            10).
          </Verdict>
        </div>
      }
    />
  );
}

const swatches: { name: string; value: string }[] = [
  { name: 'cream', value: 'var(--sr-cream)' },
  { name: 'cream-2', value: 'var(--sr-cream-2)' },
  { name: 'cream-3', value: 'var(--sr-cream-3)' },
  { name: 'line', value: 'var(--sr-line)' },
  { name: 'line-strong', value: 'var(--sr-line-strong)' },
  { name: 'ink', value: 'var(--sr-ink)' },
  { name: 'ink-2', value: 'var(--sr-ink-2)' },
  { name: 'muted', value: 'var(--sr-muted)' },
  { name: 'accent', value: 'var(--sr-accent)' },
  { name: 'accent-bright', value: 'var(--sr-accent-bright)' },
  { name: 'danger', value: 'var(--sr-danger)' },
  { name: 'danger-bright', value: 'var(--sr-danger-bright)' },
  { name: 'viewport', value: 'var(--sr-viewport)' },
  { name: 'viewport-grid', value: 'var(--sr-viewport-grid)' },
  { name: 'dot-red', value: 'var(--sr-dot-red)' },
  { name: 'dot-yellow', value: 'var(--sr-dot-yellow)' },
  { name: 'dot-green', value: 'var(--sr-dot-green)' },
];

function TokensSection() {
  const iconNames = Object.keys(icons) as IconName[];
  return (
    <section>
      <h2>Tokens</h2>
      <div class="preview__grid preview__grid--wide">
        <div class="preview__card">
          <h3>Color</h3>
          <div class="preview__swatches">
            {swatches.map((s) => (
              <div key={s.name} class="preview__swatch">
                <span style={{ background: s.value }} />
                <span>{s.name}</span>
                <code>--sr-{s.name}</code>
              </div>
            ))}
          </div>
        </div>
        <div class="preview__card">
          <h3>Type</h3>
          <div class="preview__type">
            <p class="sr-serif">The dropdown is trapped inside the card.</p>
            <p class="sr-serif">
              <em>Instrument Serif, italic for emphasis.</em>
            </p>
            <p style={{ fontSize: 'var(--sr-text-sm)' }}>
              JetBrains Mono 13px · controls, rows, values 0123456789
            </p>
            <p style={{ fontSize: 'var(--sr-text-sm)', fontWeight: 600 }}>
              JetBrains Mono 600 · the selected row
            </p>
            <p class="sr-label">Mono 11px uppercase · metadata and titles</p>
          </div>
        </div>
        <div class="preview__card">
          <h3>Space · 4px steps</h3>
          <div class="preview__space">
            {[4, 8, 12, 16, 20, 24, 32].map((n) => (
              <span key={n} style={{ width: `${n}px`, height: `${n}px` }} title={`${n}px`} />
            ))}
          </div>
          <h3>Shape</h3>
          <div class="preview__row">
            <span
              style={{
                width: 64,
                height: 40,
                border: '1px solid var(--sr-line-strong)',
                borderRadius: 'var(--sr-radius-window)',
              }}
            />
            <span
              style={{
                width: 64,
                height: 28,
                border: '1px solid var(--sr-line)',
                borderRadius: 'var(--sr-radius-control)',
              }}
            />
            <Squiggle />
          </div>
        </div>
        <div class="preview__card">
          <h3>Icons · hand-drawn, 1.5px</h3>
          <div class="preview__icons">
            {iconNames.map((name) => (
              <span key={name}>
                <Icon name={name} size={24} />
                {name}
              </span>
            ))}
            <span>
              <PixelStack size={24} />
              pixel
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ComponentsSection() {
  const [explode, setExplode] = useState(40);
  return (
    <section>
      <h2>Components</h2>
      <div class="preview__grid">
        <div class="preview__card">
          <h3>Dots</h3>
          <State label="default">
            <Dots variant="traffic" onClose={noop} />
          </State>
          <State label="hover (glyphs)">
            <Dots variant="traffic" onClose={noop} onZen={noop} onFill={noop} showGlyphs />
          </State>
          <State label="single, pane">
            <Dots variant="single" label="Collapse" onPress={noop} />
          </State>
        </div>

        <div class="preview__card" style={{ gridColumn: 'span 2' }}>
          <h3>Window · default, focused, dark</h3>
          <div class="preview__pane-demo">
            <Window title="Tools" dots={<Dots variant="single" label="Collapse" onPress={noop} />}>
              <div class="sr-pane__section">Default</div>
            </Window>
            <Window
              title="Tools"
              focused
              dots={<Dots variant="single" label="Collapse" onPress={noop} />}
              onResize={noop}
            >
              <div class="sr-pane__section">Focused, with grip</div>
            </Window>
            <Window
              title="github.com · 1 204 layers"
              tone="dark"
              viewport
              dots={<Dots variant="traffic" onClose={noop} />}
            >
              <ViewportSketch />
            </Window>
          </div>
        </div>

        <div class="preview__card">
          <h3>Pane · open and collapsed</h3>
          <div class="preview__pane-demo">
            <Pane side="right" title="Tools" collapsed={false} onToggle={noop}>
              <div class="sr-pane__section">Open</div>
            </Pane>
            <Pane side="bottom" title="Layers" collapsed={false} onToggle={noop} focused>
              <div class="sr-pane__section">Focused, while searching</div>
            </Pane>
            <div class="narrow">
              <Pane side="bottom" title="Layers" collapsed onToggle={noop}>
                {null}
              </Pane>
            </div>
          </div>
        </div>

        <div class="preview__card">
          <h3>LayerTree · every row state</h3>
          <LayerTree rows={treeRows} selected={6} onSelect={noop} onToggleGroup={noop} />
          <h3>Search results · matched letters</h3>
          <LayerTree
            rows={[
              {
                index: 6,
                depth: 0,
                label: '.dropdown',
                badge: 'z 9999',
                problem: true,
                match: [1, 2, 3, 4],
              },
              { index: 4, depth: 0, label: '.card', badge: 'transform', match: [1, 3] },
              { index: 8, depth: 0, label: 'div.stroke', count: 36, match: [4, 5] },
            ]}
            selected={null}
            onSelect={noop}
          />
        </div>

        <div class="preview__card">
          <h3>Filters</h3>
          <State label="default">
            <Filters value={defaultFilters} onChange={noop} />
          </State>
          <State label="typing, 12 matches">
            <Filters
              value={{ ...defaultFilters, query: '.card', hideGhosts: true }}
              onChange={noop}
              matches={12}
            />
          </State>
          <State label="no match, isolate disabled">
            <Filters
              value={{ ...defaultFilters, query: '.nope' }}
              onChange={noop}
              matches={0}
              isolateDisabled
            />
          </State>
        </div>

        <div class="preview__card">
          <h3>Toggle</h3>
          <Toggle label="Off" checked={false} onChange={noop} />
          <Toggle label="On" checked onChange={noop} kbd="G" />
          <Toggle label="Disabled" checked={false} onChange={noop} disabled />
          <Toggle label="Disabled, on" checked onChange={noop} disabled />
        </div>

        <div class="preview__card">
          <h3>Slider</h3>
          <Slider
            label="Explode"
            value={explode}
            min={0}
            max={100}
            onChange={setExplode}
            format={(v) => `${v}%`}
          />
          <Slider
            label="Dragging"
            value={72}
            min={0}
            max={100}
            onChange={noop}
            format={(v) => `${v}%`}
            dragging
          />
          <Slider
            label="Disabled"
            value={12}
            min={1}
            max={36}
            onChange={noop}
            format={(v) => `${v} deep`}
            disabled
          />
        </div>

        <div class="preview__card">
          <h3>Inspector</h3>
          <Inspector data={inspector} />
        </div>

        <div class="preview__card" style={{ gridColumn: 'span 2' }}>
          <h3>Verdict · problem, fine, pending</h3>
          <Verdict kind="problem" fix="Move .dropdown out of .card or remove the transform.">
            <code>.dropdown</code> (z 9999) is trapped inside <code>.card</code>, which creates a
            stacking context via <em>transform</em>, so it paints behind <code>#header</code> (z
            10).
          </Verdict>
          <Verdict kind="fine">
            <code>#masthead</code> (z 2020) paints above <code>#frosted-glass</code> (z 2018)
            because both sit in the root context.
          </Verdict>
          <Verdict kind="pending">Pick a second element to compare.</Verdict>
        </div>

        <div class="preview__card">
          <h3>Ladder</h3>
          <Ladder rows={ladder} />
        </div>

        <div class="preview__card preview__card--dark">
          <h3 style={{ color: 'var(--sr-muted)' }}>Tooltip · default and problem</h3>
          <div class="preview__tooltip-demo">
            <Tooltip x={0} y={0} label="#masthead" meta="z 2020 · position: fixed" />
            <Tooltip
              x={200}
              y={0}
              label=".ghost-overlay"
              meta="opacity 0 · blocks clicks"
              problem
            />
          </div>
        </div>

        <div class="preview__card">
          <h3>Kbd and key list</h3>
          <div class="preview__row">
            <Kbd>Esc</Kbd>
            <Kbd>]</Kbd>
            <Kbd>_</Kbd>
            <Kbd>?</Kbd>
          </div>
          <KeyList bindings={keyBindings} />
        </div>

        <div class="preview__card">
          <h3>Legend · one per color mode</h3>
          {Object.entries(legends).map(([mode, entries]) => (
            <State key={mode} label={mode}>
              <Legend entries={entries} />
            </State>
          ))}
        </div>

        <div class="preview__card">
          <h3>Empty state</h3>
          <EmptyState
            icon="layers"
            title="Nothing selected."
            hint="Click a plane, or press L for the ladder."
          />
        </div>

        <div class="preview__card">
          <h3>Buttons</h3>
          <div class="preview__row">
            <Button onClick={noop}>Export PNG</Button>
            <Button primary onClick={noop}>
              Export PNG
            </Button>
            <Button disabled>Exporting…</Button>
          </div>
        </div>

        <div class="preview__card" style={{ gridColumn: 'span 2' }}>
          <h3>Share card · preview and exporting</h3>
          <ShareCard host="youtube.com" headline="youtube.com in 2 607 layers" stats={shareStats}>
            <ViewportSketch />
          </ShareCard>
          <ShareCard
            host="youtube.com"
            headline="youtube.com in 2 607 layers"
            stats={shareStats}
            exporting
          >
            <ViewportSketch />
          </ShareCard>
        </div>
      </div>
    </section>
  );
}

function State({ label, children }: { label: string; children: ComponentChildren }) {
  return (
    <div class="preview__state">
      <span>{label}</span>
      {children}
    </div>
  );
}
