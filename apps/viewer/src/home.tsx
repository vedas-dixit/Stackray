import type { Snapshot } from '@stackray/core';
import type { Screenshot } from '@stackray/renderer';
import { EmptyState, layoutKey, StackrayApp, Stage } from '@stackray/ui';
import { useEffect, useState } from 'preact/hooks';
import brokenDropdown from '../../../fixtures/broken-dropdown.json';
import brokenDropdownShot from '../../../fixtures/broken-dropdown.shot.json';

const FIXTURES: Record<string, { snapshot: Snapshot; screenshots: Screenshot[] }> = {
  'broken-dropdown': {
    snapshot: brokenDropdown as unknown as Snapshot,
    screenshots: brokenDropdownShot as Screenshot[],
  },
};

/**
 * The dev loop: drop a snapshot JSON (or open `/?fixture=broken-dropdown`)
 * and the real tool renders it.
 */
export function Home() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(() => {
    const name = new URLSearchParams(location.search).get('fixture');
    return name === null ? null : (FIXTURES[name]?.snapshot ?? null);
  });
  const [screenshots, setScreenshots] = useState<Screenshot[]>(() => {
    const name = new URLSearchParams(location.search).get('fixture');
    return name === null ? [] : (FIXTURES[name]?.screenshots ?? []);
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && snapshot === null) setError(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [snapshot]);

  const onDrop = async (e: DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isSnapshot(parsed))
        throw new Error('Not a Stackray snapshot (missing meta, elements or paintOrder).');
      setSnapshot(parsed);
      setScreenshots([]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that file.');
    }
  };

  return (
    <div class="viewer-page">
      <section
        class="viewer-stage"
        aria-label="Snapshot viewer"
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {snapshot !== null ? (
          <StackrayApp
            key={snapshot.meta.capturedAt}
            snapshot={snapshot}
            host={safeHost(snapshot.meta.url)}
            onExit={() => setSnapshot(null)}
            screenshots={screenshots}
            storageKey={layoutKey('viewer')}
            open="lift"
          />
        ) : (
          <Stage
            title="viewer · drop a snapshot"
            storageKey={layoutKey('viewer')}
            onClose={() => setError(null)}
            viewport={
              <div class="viewer-drop">
                <EmptyState
                  icon="stack"
                  title="Drop a snapshot JSON to begin."
                  hint={
                    error ?? 'Or open /?fixture=broken-dropdown. Run pnpm fixtures to make more.'
                  }
                />
              </div>
            }
            tools={
              <EmptyState
                icon="layers"
                title="No layers yet."
                hint="The tree fills in when a snapshot loads."
              />
            }
            info={
              <EmptyState
                icon="ladder"
                title="Nothing to inspect."
                hint="Press ? for the keys once a page is loaded."
              />
            }
          />
        )}
      </section>
      <p class="viewer-foot">
        <a href="/?fixture=broken-dropdown">Open the broken-dropdown fixture</a> ·{' '}
        <a href="#preview">Tokens and components</a>
      </p>
    </div>
  );
}

function isSnapshot(value: unknown): value is Snapshot {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.meta === 'object' && Array.isArray(v.elements) && Array.isArray(v.paintOrder);
}

function safeHost(url: string): string {
  try {
    const { host, protocol, pathname } = new URL(url);
    return host || (protocol === 'file:' ? (pathname.split('/').pop() ?? url) : url);
  } catch {
    return url;
  }
}
