import type { ElementRecord, Snapshot } from '@stackray/core';

/** One search result: the element, how well it matched, and which label characters matched. */
export type SearchHit = { index: number; score: number; match: number[] };

export type MatchResult = { score: number; match: number[] };

const TOKEN_SPLIT = /[.#[\]\-_\s:="'()]+/;

/**
 * Score one piece of text against a query. Tiers, best first: exact, prefix,
 * token prefix, initials, substring, then characters in order with gaps.
 * `match` holds the positions in `text` to highlight. Null when it does not
 * match at all.
 *
 * @example
 * scoreMatch('wsm', 'div.welcome-screen-menu')?.score; // 75, the initials
 * scoreMatch('menu', 'div.welcome-screen-menu')?.score; // 80, a token prefix
 */
export function scoreMatch(query: string, text: string): MatchResult | null {
  const q = query.trim().toLowerCase();
  const t = text.toLowerCase();
  if (q === '') return null;
  if (t === q) return { score: 100, match: range(0, t.length) };
  if (t.startsWith(q)) return { score: 90, match: range(0, q.length) };

  const tokenStart = tokenPrefix(q, t);
  if (tokenStart !== null) return { score: 80, match: range(tokenStart, tokenStart + q.length) };

  const initials = initialsMatch(q, t);
  if (initials !== null) return { score: 75, match: initials };

  const at = t.indexOf(q);
  if (at !== -1)
    return { score: 70 - Math.min(5, (at / t.length) * 5), match: range(at, at + q.length) };

  return subsequence(q, t);
}

/**
 * Score a query with several words: every word must match, in any order.
 *
 * @example
 * scoreWords('screen menu', 'div.welcome-screen-menu')?.score; // 80
 */
export function scoreWords(query: string, text: string): MatchResult | null {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  if (words.length === 1) return scoreMatch(words[0] ?? '', text);
  let total = 0;
  const match = new Set<number>();
  for (const word of words) {
    const hit = scoreMatch(word, text);
    if (hit === null) return null;
    total += hit.score;
    for (const i of hit.match) match.add(i);
  }
  return { score: total / words.length, match: [...match].sort((a, b) => a - b) };
}

/**
 * Rank every element against a query. The label is scored first; the id,
 * classes and tag are fallbacks that match without highlighting.
 *
 * @example
 * searchElements(snapshot, 'dropdown')[0]?.index; // the .dropdown element
 */
export function searchElements(
  snapshot: Snapshot,
  query: string,
  keep: (el: ElementRecord) => boolean = () => true,
  limit = 300,
): SearchHit[] {
  const hits: SearchHit[] = [];
  if (query.trim() === '') return hits;
  for (const el of snapshot.elements) {
    if (!keep(el)) continue;
    const onLabel = scoreWords(query, el.sel);
    if (onLabel !== null) {
      hits.push({ index: el.i, score: onLabel.score, match: onLabel.match });
      continue;
    }
    const fallback = [el.id ?? '', el.cls.join(' '), el.tag].map((f) => scoreWords(query, f));
    const best = fallback.reduce<MatchResult | null>(
      (a, b) => (b !== null && (a === null || b.score > a.score) ? b : a),
      null,
    );
    if (best !== null) hits.push({ index: el.i, score: best.score - 15, match: [] });
  }
  hits.sort((a, b) => b.score - a.score || a.index - b.index);
  return hits.slice(0, limit);
}

function range(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i < to; i += 1) out.push(i);
  return out;
}

function tokenPrefix(q: string, t: string): number | null {
  let pos = 0;
  for (const token of t.split(TOKEN_SPLIT)) {
    const start = t.indexOf(token, pos);
    if (token.startsWith(q) && start > 0) return start;
    pos = start + token.length;
  }
  return null;
}

function initialsMatch(q: string, t: string): number[] | null {
  const starts: number[] = [];
  let pos = 0;
  for (const token of t.split(TOKEN_SPLIT)) {
    if (token === '') continue;
    const start = t.indexOf(token, pos);
    starts.push(start);
    pos = start + token.length;
  }
  if (q.length < 2 || q.length > starts.length) return null;
  for (let offset = 0; offset + q.length <= starts.length; offset += 1) {
    const slice = starts.slice(offset, offset + q.length);
    if (slice.every((s, i) => t[s] === q[i])) return slice;
  }
  return null;
}

function subsequence(q: string, t: string): MatchResult | null {
  const match: number[] = [];
  let from = 0;
  for (const ch of q) {
    const at = t.indexOf(ch, from);
    if (at === -1) return null;
    match.push(at);
    from = at + 1;
  }
  const first = match[0] ?? 0;
  const last = match[match.length - 1] ?? 0;
  const gaps = last - first + 1 - q.length;
  return { score: Math.max(20, 50 - gaps * 2), match };
}
