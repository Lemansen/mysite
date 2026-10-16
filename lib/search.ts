import type { Data } from './store';

export type Kind = 'rules' | 'commands' | 'promos';
export const KINDS: Kind[] = ['rules', 'commands', 'promos'];
export const KIND_LABEL: Record<Kind, string> = { rules: 'Правила', commands: 'Команды', promos: 'Промокоды' };

export type Doc = {
  kind: Kind; server: string; serverName: string;
  folderId: string; folder: string; id: string; title: string; body: string;
};
export type Hit = Doc & { score: number; snippet: string };

// нижний регистр и «ё» → «е»; длина строки сохраняется, чтобы позиции совпадали с оригиналом
export const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е');
export const tokens = (q: string) => norm(q).split(/\s+/).filter(Boolean);

export function buildDocs(server: string, serverName: string, d: Data): Doc[] {
  const out: Doc[] = [];
  (['rules', 'commands'] as const).forEach(k => d[k]?.forEach(f => f.items.forEach(i =>
    out.push({ kind: k, server, serverName, folderId: f.id, folder: f.name, id: i.id, title: i.t, body: i.b }))));
  d.promos?.forEach(p => out.push({
    kind: 'promos', server, serverName, folderId: '', folder: 'Промокоды', id: p.id, title: p.code, body: p.reward,
  }));
  return out;
}

// диапазоны совпадений для подсветки
export function ranges(text: string, toks: string[]): [number, number][] {
  const n = norm(text), r: [number, number][] = [];
  for (const t of toks) { let i = n.indexOf(t); while (i >= 0) { r.push([i, i + t.length]); i = n.indexOf(t, i + t.length); } }
  r.sort((a, b) => a[0] - b[0]);
  const m: [number, number][] = [];
  for (const x of r) { const l = m[m.length - 1]; if (l && x[0] <= l[1]) l[1] = Math.max(l[1], x[1]); else m.push([x[0], x[1]]); }
  return m;
}

function snippet(body: string, toks: string[]) {
  const flat = body.replace(/\s+/g, ' ').trim();
  const n = norm(flat);
  let at = -1;
  for (const t of toks) { const i = n.indexOf(t); if (i >= 0 && (at < 0 || i < at)) at = i; }
  if (at < 0 || flat.length <= 140) return flat.length > 140 ? flat.slice(0, 140) + '…' : flat;
  const from = Math.max(0, at - 40), to = Math.min(flat.length, from + 140);
  return (from > 0 ? '…' : '') + flat.slice(from, to) + (to < flat.length ? '…' : '');
}

// все слова запроса должны встретиться в названии или тексте (в любом порядке и месте слова)
export function search(docs: Doc[], q: string, kinds: Kind[], limit = 60): Hit[] {
  const toks = tokens(q);
  if (!toks.length) return [];
  const hits: Hit[] = [];
  for (const d of docs) {
    if (!kinds.includes(d.kind)) continue;
    const t = norm(d.title), b = norm(d.body), f = norm(d.folder);
    let score = 0, ok = true;
    for (const w of toks) {
      let s = 0;
      if (t === w) s = 100;
      else if (t.startsWith(w)) s = 60;
      else if (t.includes(w)) s = 40;
      else if (b.includes(w)) s = 15;
      else if (f.includes(w)) s = 5;
      if (!s) { ok = false; break; }
      // совпадение с началом слова ценнее, чем с серединой
      if (s < 60 && new RegExp('(^|[^а-яa-z0-9])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(s >= 40 ? t : b)) s += 8;
      score += s;
    }
    if (ok) hits.push({ ...d, score, snippet: snippet(d.body, toks) });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function hrefOf(d: Doc) {
  const base = '/s/' + d.server + '/' + (d.kind === 'promos' ? 'promo' : d.kind);
  return base + '?' + (d.folderId ? 'f=' + encodeURIComponent(d.folderId) + '&' : '') + 'i=' + encodeURIComponent(d.id);
}
