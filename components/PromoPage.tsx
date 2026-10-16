'use client';
import { useEffect, useState, CSSProperties } from 'react';
import { Flame, Archive, Copy, Check, Clock } from 'lucide-react';
import { useApp } from './Provider';
import Skeleton from './Skeleton';
import { Promo, uid, iso, addDays, fmt, pl, isExpired, daysLeft, endOf } from '../lib/store';

export default function PromoPage() {
  const { data, edit, update, ready, copy } = useApp();
  const [now, setNow] = useState(() => Date.now());
  const [done, setDone] = useState('');
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);
  if (!ready) return <Skeleton />;

  const act = data.promos.filter(p => !isExpired(p, now)).sort((a, b) => b.added.localeCompare(a.added));
  const arc = data.promos.filter(p => isExpired(p, now)).sort((a, b) => b.until.localeCompare(a.until));
  const set = (id: string, patch: Partial<Promo>) => update(d => { Object.assign(d.promos.find(p => p.id === id)!, patch); });
  const doCopy = async (p: Promo) => { if (await copy(p.code)) { setDone(p.id); setTimeout(() => setDone(''), 1600); } };

  const card = (p: Promo, ix: number) => {
    const old = isExpired(p, now), d = daysLeft(p, now);
    const isNew = !old && now - new Date(p.added + 'T00:00:00').getTime() < 3 * 864e5;
    if (edit) return (
      <div className={'card ' + (old ? 'old' : 'fresh')} key={p.id}>
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
      <div className={'card promo ticket rise ' + (old ? 'old' : 'fresh')} key={p.id} style={{ '--i': Math.min(ix, 12) } as CSSProperties}>
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
    <h2><Flame size={20} color="#ff8a3d" /> Актуальные <span className="badge b-new">{act.length}</span></h2>
    {act.length ? act.map(card) : <div className="empty">Сейчас нет действующих промокодов.</div>}
    <h2><Archive size={20} color="var(--muted)" /> Архив <span className="badge b-old">{arc.length}</span></h2>
    {arc.length ? arc.map(card) : <div className="empty">Архив пока пуст.</div>}
  </div>;
}
