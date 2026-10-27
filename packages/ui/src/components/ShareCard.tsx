import type { ComponentChildren } from 'preact';

export type ShareStat = { label: string; value: string };

export type ShareCardProps = {
  host: string;
  /** Serif headline, e.g. "youtube.com in 2 607 layers". */
  headline: string;
  stats: ShareStat[];
  /** The tilted render goes here. */
  children: ComponentChildren;
  exporting?: boolean;
};

/**
 * The 1200×630 share card: the tilted page, the host, a stats strip and a
 * serif headline. The PNG export is not built yet.
 *
 * @example
 * <ShareCard host="youtube.com" headline="youtube.com in 2 607 layers" stats={stats}><Render /></ShareCard>
 */
export function ShareCard({ host, headline, stats, children, exporting = false }: ShareCardProps) {
  return (
    <figure class={`sr-share${exporting ? ' sr-share--exporting' : ''}`} style={{ margin: 0 }}>
      <div class="sr-share__render">{children}</div>
      <figcaption class="sr-share__footer">
        <p class="sr-share__headline">{headline}</p>
        <span class="sr-share__stats">
          <span>{host}</span>
          {stats.map((s) => (
            <span key={s.label}>
              {s.value} {s.label}
            </span>
          ))}
        </span>
      </figcaption>
    </figure>
  );
}
