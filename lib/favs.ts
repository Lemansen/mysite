'use client';
import { useSyncExternalStore } from 'react';
import type { Doc, Kind } from './search';
import { supabase } from './supabase';

// Избранное, недавние страницы и счётчик использования. Хранится в браузере (localStorage)
// и сохраняется между посещениями. Ключ материала: вид:сервер:id.
const K = 'br_favs_v1';
let activeUserId: string | null = null;
let authGeneration = 0;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
const storageKey = () => activeUserId ? `${K}:user:${activeUserId}` : K;
const MAX_FAVS = 300, MAX_RECENT = 20, MAX_USED = 80;

export type Snap = Pick<Doc, 'kind' | 'server' | 'serverName' | 'folderId' | 'folder' | 'id' | 'title' | 'body'>;
export type Fav = Snap & { key: string; ts: number; pinned?: boolean; gone?: boolean };
export type Recent = { key: string; ts: number; kind: Kind; server: string; serverName: string; folderId: string; folder: string };
export type Used = Snap & { key: string; n: number; ts: number };
export type FavState = { favs: Fav[]; recent: Recent[]; used: Used[] };

const EMPTY: FavState = { favs: [], recent: [], used: [] };
export const keyOf = (d: Pick<Doc, 'kind' | 'server' | 'id'>) => d.kind + ':' + d.server + ':' + d.id;
const snap = (d: Snap): Snap => ({ kind: d.kind, server: d.server, serverName: d.serverName, folderId: d.folderId, folder: d.folder, id: d.id, title: d.title, body: d.body.slice(0, 220) });

let cache: FavState | null = null;
const subs = new Set<() => void>();
const arr = <T,>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);

function read(): FavState {
  try {
    const s = JSON.parse(localStorage.getItem(storageKey()) || 'null');
    if (s && typeof s === 'object') return { favs: arr<Fav>(s.favs), recent: arr<Recent>(s.recent), used: arr<Used>(s.used) };
  } catch {}
  return EMPTY;
}
const get = () => (typeof window === 'undefined' ? EMPTY : (cache ??= read()));
function put(s: FavState) {
  cache = s;
  try { localStorage.setItem(storageKey(), JSON.stringify(s)); } catch {}
  subs.forEach(f => f());
  queueRemoteSync(s.favs);
}
function subscribe(f: () => void) {
  subs.add(f);
  const on = (e: StorageEvent) => { if (e.key === storageKey()) { cache = null; f(); } };
  window.addEventListener('storage', on);
  return () => { subs.delete(f); window.removeEventListener('storage', on); };
}
export const useFavs = () => useSyncExternalStore(subscribe, get, () => EMPTY);

// Authenticated favorites are synced to Supabase; guest favorites remain local.
// Recent/used history remains local and is scoped per signed-in account.
function queueRemoteSync(favs: Fav[]) {
  if (!supabase || !activeUserId) return;
  if (syncTimer) clearTimeout(syncTimer);
  const uid = activeUserId;
  const generation = authGeneration;
  const snapshot = favs.map(f => ({ ...f }));
  syncTimer = setTimeout(() => { void syncRemoteFavorites(uid, generation, snapshot); }, 350);
}

async function syncRemoteFavorites(uid: string, generation: number, favs: Fav[]) {
  if (!supabase || uid !== activeUserId || generation !== authGeneration) return;
  const { data: rows, error } = await supabase.from('favorites')
    .select('kind,server_slug,item_id,snapshot,pinned')
    .eq('user_id', uid);
  if (error || uid !== activeUserId || generation !== authGeneration) return;
  const byKey = new Map(favs.map(f => [f.key, f]));
  for (const f of favs) {
    if (uid !== activeUserId || generation !== authGeneration) return;
    const { error: upsertError } = await supabase.from('favorites').upsert({
      user_id: uid, kind: f.kind, server_slug: f.server, item_id: f.id,
      snapshot: f, pinned: !!f.pinned, updated_at: new Date(f.ts || Date.now()).toISOString(),
    }, { onConflict: 'user_id,kind,server_slug,item_id' });
    if (upsertError) return;
  }
  for (const row of rows ?? []) {
    const key = `${row.kind}:${row.server_slug}:${row.item_id}`;
    if (byKey.has(key)) continue;
    if (uid !== activeUserId || generation !== authGeneration) return;
    await supabase.from('favorites').delete().eq('user_id', uid)
      .eq('kind', row.kind).eq('server_slug', row.server_slug).eq('item_id', row.item_id);
  }
}

function isFavSnapshot(value: unknown): value is Fav {
  if (!value || typeof value !== 'object') return false;
  const f = value as Partial<Fav>;
  return typeof f.key === 'string' && typeof f.id === 'string' &&
    typeof f.server === 'string' && ['rules', 'commands', 'promos'].includes(String(f.kind));
}

export async function setFavsUser(userId: string | null) {
  if (userId === activeUserId) return;
  authGeneration += 1;
  const generation = authGeneration;
  if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
  const migratingGuest = activeUserId === null && !!userId;
  const guestState = activeUserId === null ? read() : EMPTY;
  activeUserId = userId;
  cache = read();
  subs.forEach(f => f());
  if (!supabase || !userId) return;

  const { data: rows, error } = await supabase.from('favorites')
    .select('kind,server_slug,item_id,snapshot,pinned,updated_at,created_at')
    .eq('user_id', userId);
  if (userId !== activeUserId || generation !== authGeneration || error) return;

  const current = cache ?? read();
  const merged = new Map<string, Fav>();
  for (const f of [...guestState.favs, ...current.favs]) merged.set(f.key, f);
  for (const row of rows ?? []) {
    const raw = row.snapshot;
    const f: Fav = isFavSnapshot(raw) ? { ...raw, key: `${row.kind}:${row.server_slug}:${row.item_id}`, pinned: !!row.pinned,
      ts: Math.max(Number(raw.ts) || 0, Date.parse(row.updated_at || row.created_at || '') || 0) }
      : { kind: row.kind, server: row.server_slug, serverName: row.server_slug, folderId: '', folder: '', id: row.item_id,
          title: row.item_id, body: '', key: `${row.kind}:${row.server_slug}:${row.item_id}`, ts: Date.parse(row.updated_at || row.created_at || '') || Date.now(), pinned: !!row.pinned } as Fav;
    const previous = merged.get(f.key);
    if (!previous || f.ts > previous.ts) merged.set(f.key, f);
  }
  const state: FavState = { ...current, favs: [...merged.values()].sort((a, b) => b.ts - a.ts).slice(0, MAX_FAVS) };
  if (migratingGuest && guestState.favs.length) {
    try { localStorage.setItem(K, JSON.stringify({ ...guestState, favs: [] })); } catch {}
  }
  cache = state;
  try { localStorage.setItem(storageKey(), JSON.stringify(state)); } catch {}
  subs.forEach(f => f());
  queueRemoteSync(state.favs);
}


export const isFav = (s: FavState, d: Pick<Doc, 'kind' | 'server' | 'id'>) => s.favs.some(f => f.key === keyOf(d));

// true, если материал теперь в избранном
export function toggleFav(d: Snap): boolean {
  const s = get(), key = keyOf(d);
  if (s.favs.some(f => f.key === key)) { put({ ...s, favs: s.favs.filter(f => f.key !== key) }); return false; }
  put({ ...s, favs: [{ ...snap(d), key, ts: Date.now() }, ...s.favs].slice(0, MAX_FAVS) });
  return true;
}
export function removeFav(key: string) { const s = get(); put({ ...s, favs: s.favs.filter(f => f.key !== key) }); }
export function togglePin(key: string) { const s = get(); put({ ...s, favs: s.favs.map(f => f.key === key ? { ...f, pinned: !f.pinned } : f) }); }

// страница (раздел сервера или папка) открыта: пишем в историю
export function pushRecent(r: Omit<Recent, 'key' | 'ts'>) {
  const s = get(), key = r.kind + ':' + r.server + ':' + r.folderId;
  if (s.recent[0]?.key === key && Date.now() - s.recent[0].ts < 30000) return;
  put({ ...s, recent: [{ ...r, key, ts: Date.now() }, ...s.recent.filter(x => x.key !== key)].slice(0, MAX_RECENT) });
}
// материал использован (скопирован или открыт по ссылке): считаем для «Часто использую»
export function bumpUsed(d: Snap) {
  const s = get(), key = keyOf(d), old = s.used.find(u => u.key === key);
  const next: Used = { ...snap(d), key, n: (old?.n ?? 0) + 1, ts: Date.now() };
  const rest = s.used.filter(u => u.key !== key);
  const all = [next, ...rest].sort((a, b) => b.n - a.n || b.ts - a.ts).slice(0, MAX_USED);
  put({ ...s, used: all });
}
export function clearRecent() { put({ ...get(), recent: [] }); }
export function clearUsed() { put({ ...get(), used: [] }); }

// после загрузки данных сервера обновляем названия и помечаем удалённые материалы (обратимо)
export function syncServer(server: string, docs: Doc[]) {
  const s = get(), byKey = new Map(docs.map(d => [keyOf(d), d]));
  let changed = false;
  const favs = s.favs.map(f => {
    if (f.server !== server) return f;
    const d = byKey.get(f.key);
    if (!d) { if (f.gone) return f; changed = true; return { ...f, gone: true }; }
    const n = { ...f, ...snap(d), gone: false };
    if (!f.gone && n.title === f.title && n.body === f.body && n.folder === f.folder && n.folderId === f.folderId && n.serverName === f.serverName) return f;
    changed = true; return n;
  });
  if (changed) put({ ...s, favs });
}

export const favHref = (d: Pick<Snap, 'kind' | 'server' | 'folderId' | 'id'>) =>
  '/s/' + d.server + '/' + (d.kind === 'promos' ? 'promo' : d.kind) + '?' + (d.folderId ? 'f=' + encodeURIComponent(d.folderId) + '&' : '') + 'i=' + encodeURIComponent(d.id);
export const pageHref = (r: Pick<Recent, 'kind' | 'server' | 'folderId'>) =>
  '/s/' + r.server + '/' + (r.kind === 'promos' ? 'promo' : r.kind) + (r.folderId ? '?f=' + encodeURIComponent(r.folderId) : '');
