'use client';
import { useEffect, useState, CSSProperties } from 'react';
import { Flame, Archive, Copy, Check, Clock, Search, SlidersHorizontal } from 'lucide-react';
import { useApp } from './Provider';
import Skeleton from './Skeleton';
import { useDeepLink } from '../lib/useDeepLink';
import FavButton from './FavButton';
import { buildDocs, Doc } from '../lib/search';
import { bumpUsed, pushRecent, syncServer } from '../lib/favs';
import { Promo, uid, iso, addDays, fmt, pl, isExpired, daysLeft, endOf } from '../lib/store';

export default function PromoPage() {
  const { data, edit, update, ready, copy, slug, serverName } = useApp();
  const [now, setNow] = useState(() => Date.now());
  const [done, setDone] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [sortBy, setSortBy] = useState<'smart' | 'ending' | 'newest'>('smart');
  const link = useDeepLink(ready);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);
  const docOf = (p: Promo): Doc => ({ kind: 'promos', server: slug ?? '', serverName, folderId: '', folder: 'Промокоды', id: p.id, title: p.code, body: p.reward });

  useEffect(() => {
    if (!ready || !slug || data.rules.length + data.commands.length + data.promos.length === 0) return;
    syncServer(slug, buildDocs(slug, serverName, data));
  }, [ready, slug, serverName, data]);
  useEffect(() => { if (ready && slug) pushRecent({ kind: 'promos', server: slug, serverName, folderId: '', folder: 'Промокоды' }); }, [ready, slug, serverName]);
  useEffect(() => {
    if (!ready || !slug || !link.i) return;
    const p = data.promos.find(x => x.id === link.i); if (p) bumpUsed(docOf(p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, link.i]);
  if (!ready) return <Skeleton />;

  const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU');
  const matches = (p: Promo) => !normalizedQuery || `${p.code} ${p.reward}`.toLocaleLowerCase('ru-RU').includes(normalizedQuery);
  const sortPromos = (items: Promo[]) => [...items].sort((a, b) => {
    if (sortBy === 'newest') return b.added.localeCompare(a.added);
    if (sortBy === 'ending') {
      if (!a.until) return 1; if (!b.until) return -1; return a.until.localeCompare(b.until);
    }
    const da = a.until ? daysLeft(a, now) : Number.MAX_SAFE_INTEGER;
    const db = b.until ? daysLeft(b, now) : Number.MAX_SAFE_INTEGER;
    if (da !== db) return da - db;
    return b.added.localeCompare(a.added);
  });
  const act = sortPromos(data.promos.filter(p => !isExpired(p, now) && matches(p)));
  const arc = sortPromos(data.promos.filter(p => isExpired(p, now) && matches(p)));
  const shownAct = statusFilter === 'expired' ? [] : act;
  const shownArc = statusFilter === 'active' ? [] : arc;
  const set = (id: string, patch: Partial<Promo>) => update(d => { Object.assign(d.promos.find(p => p.id === id)!, patch); });
  const doCopy = async (p: Promo) => { if (await copy(p.code)) { bumpUsed(docOf(p)); setDone(p.id); setTimeout(() => setDone(''), 1600); } };

  const card = (p: Promo, ix: number) => {
    const old = isExpired(p, now), d = daysLeft(p, now);
    const isNew = !old && now - new Date(p.added + 'T00:00:00').getTime() < 3 * 864e5;
    if (edit) return (
      <div id={'i-' + p.id} className={'card ' + (old ? 'old' : 'fresh') + (link.flash === p.id ? ' flash' : '')} key={p.id}>
        <input className="field" value={p.code} placeholder="Промокод" onChange={e => set(p.id, { code: e.target.value })} />
        <textarea className="field" value={p.reward} placeholder="Что даёт промокод" onChange={e => set(p.id, { reward: e.target.value })} />
        <div className="row">
          <label className="note" style={{ margin: 0 }}>Добавлен <input className="field" style={{ width: 'auto', margin: 0 }} type="date" value={p.added} onChange={e => set(p.id, { added: e.target.value })} /></label>
          <label className="note" style={{ margin: 0 }}>Действует до <input className="field" style={{ width: 'auto', margin: 0 }} type="date" value={p.until} disabled={!p.until} onChange={e => set(p.id, { until: e.target.value })} /></label>
          <label className="note" style={{ margin: 0, display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={!p.until} onChange={e => set(p.id, { until: e.target.checked ? '' : addDays(7) })} /> Бессрочный
          </label>
          <button className="btn sm danger" style={{ marginLeft: 'auto' }} onClick={() => { if (confirm('Удалить промокод?')) update(x => { x.promos = x.promos.filter(y => y.id !== p.id); }); }}>Удалить</button>
        </div>
        {p.until && p.until < p.added && <p className="note" style={{ color: 'var(--warn)' }}>Дата окончания раньше даты добавления.</p>}
      </div>
    );
    let pct = 100, tone = 'ok';
    if (!old && p.until) {
      const total = endOf(p) - new Date(p.added + 'T00:00:00').getTime();
      pct = total > 0 ? Math.max(3, Math.min(100, ((endOf(p) - now) / total) * 100)) : 100;
      tone = pct > 40 ? 'ok' : pct > 15 ? 'warn' : 'bad';
    }
    return (
      <div id={'i-' + p.id} className={'card promo ticket hasfav rise ' + (old ? 'old' : 'fresh') + (link.flash === p.id ? ' flash' : '')} key={p.id} style={{ '--i': Math.min(ix, 12) } as CSSProperties}>
        {slug && <FavButton doc={docOf(p)} />}
        <div>
          <div className="code">{p.code}
            {old && <span className="badge b-old">Закончился</span>}
            {isNew && <span className="badge b-new pulse">Новый</span>}
            {!old && !isNew && p.until && d <= 2 && <span className="badge b-soon">Скоро закончится</span>}
          </div>
          <p style={{ marginTop: 4 }}>{p.reward}</p>
        </div>
        {!old && <button className={'btn copybtn' + (done === p.id ? ' on' : '')} onClick={() => doCopy(p)}>
          {done === p.id ? <><Check size={16} /> Скопировано</> : <><Copy size={16} /> Скопировать</>}
        </button>}
        <div className="dates">
          <Clock size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} />
          {old ? <>Действовал с <b>{fmt(p.added)}</b> до <b>{fmt(p.until)}</b></>
            : p.until ? <>Действует с <b>{fmt(p.added)}</b> до <b>{fmt(p.until)}</b>{' '}
                <span className="live">({d === 1 ? 'остался 1 день' : `осталось ${d} ${pl(d, 'день', 'дня', 'дней')}`}{iso(new Date(now)) === p.until ? ', последний день' : ''})</span></>
              : <>Добавлен <b>{fmt(p.added)}</b>, <span className="live">без срока окончания</span></>}
        </div>
        {!old && p.until && <div className="bar" aria-hidden="true"><i className={tone} style={{ width: pct + '%' }} /></div>}
      </div>
    );
  };

  return <div className="wrap">
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div><h1>Промокоды</h1><p className="note">Новые коды добавляются сверху. Когда срок истекает, код сам переезжает в архив.</p></div>
      {edit && <button className="btn primary" onClick={() => update(d => { d.promos.push({ id: uid(), code: 'НОВЫЙКОД', reward: '', added: iso(new Date()), until: addDays(7) }); })}>Добавить промокод</button>}
    </div>
    <div className="promo-tools" aria-label="Поиск и фильтры промокодов">
      <label className="promo-search"><Search size={18} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Найти по коду или награде…" aria-label="Поиск промокодов" />{query && <button className="btn sm" onClick={() => setQuery('')} aria-label="Очистить поиск">Сбросить</button>}</label>
      <label className="promo-select"><SlidersHorizontal size={17} /><select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} aria-label="Статус промокодов"><option value="all">Все промокоды</option><option value="active">Только актуальные</option><option value="expired">Только архив</option></select></label>
      <label className="promo-select"><select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} aria-label="Сортировка промокодов"><option value="smart">Умная сортировка</option><option value="ending">Сначала истекающие</option><option value="newest">Сначала новые</option></select></label>
    </div>
    <p className="note promo-result-count">Найдено: {shownAct.length + shownArc.length}. Умная сортировка поднимает промокоды, которые скоро закончатся.</p>
    {statusFilter !== 'expired' && <><h2><Flame size={20} color="#ff8a3d" /> Актуальные <span className="badge b-new">{shownAct.length}</span></h2>
    {shownAct.length ? shownAct.map(card) : <div className="empty">{normalizedQuery ? 'По запросу нет актуальных промокодов.' : 'Сейчас нет действующих промокодов.'}</div>}</>}
    {statusFilter !== 'active' && <><h2><Archive size={20} color="var(--muted)" /> Архив <span className="badge b-old">{shownArc.length}</span></h2>
    {shownArc.length ? shownArc.map(card) : <div className="empty">{normalizedQuery ? 'В архиве ничего не найдено.' : 'Архив пока пуст.'}</div>}</>}
  </div>;
}
