'use client';
import { useCallback, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useApp } from './Provider';
import { supabase } from '../lib/supabase';
import { KEY, seed, Data } from '../lib/store';
import { Doc, Hit, Kind, KINDS, KIND_LABEL, buildDocs, search, tokens, ranges, hrefOf } from '../lib/search';
import { useFavs } from '../lib/favs';

export const openSearch = () => window.dispatchEvent(new Event('atlas:search'));

function Mark({ t, toks }: { t: string; toks: string[] }) {
  const r = ranges(t, toks);
  if (!r.length) return <>{t}</>;
  const out: ReactNode[] = []; let p = 0;
  r.forEach(([a, b], n) => { if (a > p) out.push(t.slice(p, a)); out.push(<mark key={n}>{t.slice(a, b)}</mark>); p = b; });
  if (p < t.length) out.push(t.slice(p));
  return <>{out}</>;
}

export default function SearchModal() {
  const { data, slug, serverName, ready } = useApp();
  const favState = useFavs();
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [all, setAll] = useState(false);
  const [kinds, setKinds] = useState<Kind[]>(KINDS);
  const [allDocs, setAllDocs] = useState<Doc[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [cur, setCur] = useState(0);
  const [tryN, setTryN] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  const scopeAll = all || !slug;

  useEffect(() => {
    const on = () => setOpen(true);
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o); }
      else if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('atlas:search', on); window.addEventListener('keydown', key);
    return () => { window.removeEventListener('atlas:search', on); window.removeEventListener('keydown', key); };
  }, []);

  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => { if (open) { setErr(''); setAllDocs(null); setTimeout(() => input.current?.focus(), 30); } }, [open]);

  // поиск по всем серверам: данные подгружаются при открытии окна
  useEffect(() => {
    if (!open || !scopeAll || allDocs) return;
    let alive = true;
    setLoading(true); setErr('');
    (async () => {
      try {
        let docs: Doc[] = [];
        if (supabase) {
          const { data: rows, error } = await supabase.from('servers').select('slug,name,data').order('position').order('created_at');
          if (error) throw error;
          (rows ?? []).forEach(r => { const d = r.data as Data; if (d?.rules && d?.commands && d?.promos) docs.push(...buildDocs(r.slug, r.name, d)); });
        } else {
          let d: Data | null = null;
          try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch {}
          docs = buildDocs('local', serverName || 'RP Atlas', d?.rules ? d : seed());
        }
        if (alive) setAllDocs(docs);
      } catch { if (alive) setErr('Не удалось загрузить данные для поиска. Проверьте соединение и попробуйте ещё раз.'); }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [open, scopeAll, allDocs, serverName, tryN]);

  const docs = useMemo(() => scopeAll ? (allDocs ?? []) : slug && ready ? buildDocs(slug, serverName, data) : [], [scopeAll, allDocs, slug, ready, serverName, data]);
  const toks = tokens(q);
  const hits = useMemo(() => search(docs, q, kinds), [docs, q, kinds]);
  // пустой запрос: показываем избранное (закреплённое выше)
  const quick = useMemo<Hit[]>(() => favState.favs
    .filter(f => !f.gone && (scopeAll || f.server === slug) && kinds.includes(f.kind))
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.ts - a.ts)
    .slice(0, 8).map(f => ({ ...f, score: 0, snippet: f.body })), [favState.favs, scopeAll, slug, kinds]);
  const shown = toks.length ? hits : quick;
  useEffect(() => setCur(0), [q, kinds, scopeAll]);
  useEffect(() => { (list.current?.children[cur] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' }); }, [cur]);

  const go = useCallback((d: Doc) => { setOpen(false); router.push(hrefOf(d)); }, [router]);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCur(c => Math.min(c + 1, shown.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCur(c => Math.max(c - 1, 0)); }
    else if (e.key === 'Enter' && shown[cur]) { e.preventDefault(); go(shown[cur]); }
  };
  const toggle = (k: Kind) => setKinds(a => a.includes(k) ? (a.length > 1 ? a.filter(x => x !== k) : a) : [...a, k]);

  if (!open) return null;
  const waiting = scopeAll ? loading : !ready;
  return <div className="sm-back" onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false); }}>
    <div className="sm" role="dialog" aria-modal="true" aria-label="Поиск" onKeyDown={onKey}>
      <div className="sm-head">
        <Search size={18} />
        <input ref={input} value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск по правилам, командам и промокодам" aria-label="Поиск" enterKeyHint="search" autoComplete="off" />
        <button className="btn icon" onClick={() => setOpen(false)} aria-label="Закрыть"><X size={16} /></button>
      </div>
      <div className="sm-filters">
        {slug && <>
          <button className={'chip' + (!scopeAll ? ' on' : '')} onClick={() => setAll(false)}>{serverName || 'Этот сервер'}</button>
          <button className={'chip' + (scopeAll ? ' on' : '')} onClick={() => setAll(true)}>Все серверы</button>
          <span className="chipsep" />
        </>}
        {KINDS.map(k => <button key={k} className={'chip' + (kinds.includes(k) ? ' on' : '')} onClick={() => toggle(k)}>{KIND_LABEL[k]}</button>)}
      </div>
      <div className="sm-body" ref={list} role="listbox">
        {err ? <div className="sm-msg">{err} <button className="btn sm" onClick={() => setTryN(n => n + 1)}>Повторить</button></div>
          : waiting ? <div className="sm-msg">Загрузка…</div>
          : !toks.length && !quick.length ? <div className="sm-msg">Введите одно или несколько слов. Найдём всё, где они встречаются. Звёздочка на карточке добавляет материал в избранное, и он появится здесь.</div>
          : toks.length && !hits.length ? <div className="sm-msg">Ничего не найдено. Попробуйте другое слово{!scopeAll && slug ? ' или поищите по всем серверам' : ''}.</div>
          : shown.map((h, n) => (
            <button key={h.server + h.kind + h.id} role="option" aria-selected={n === cur} className={'sm-hit' + (n === cur ? ' on' : '')} onMouseEnter={() => setCur(n)} onClick={() => go(h)}>
              <span className={'sm-t' + (h.kind === 'commands' ? ' cmd' : '')}><Mark t={h.title} toks={toks} /></span>
              <span className="sm-path">{scopeAll ? h.serverName + ' · ' : ''}{KIND_LABEL[h.kind]}{h.kind !== 'promos' ? ' · ' + h.folder : ''}</span>
              {h.snippet && <span className="sm-s"><Mark t={h.snippet} toks={toks} /></span>}
            </button>
          ))}
      </div>
      <div className="sm-foot">{toks.length && hits.length ? `Найдено: ${hits.length}${hits.length >= 60 ? '+' : ''} · ` : !toks.length && quick.length ? 'Из избранного · ' : ''}↑↓ выбрать · Enter открыть · Esc закрыть</div>
    </div>
  </div>;
}
