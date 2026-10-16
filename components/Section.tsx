'use client';
import { useState, CSSProperties } from 'react';
import { Copy } from 'lucide-react';
import { useApp } from './Provider';
import Skeleton from './Skeleton';
import { uid, Item } from '../lib/store';

const META = { rules: { title: 'Правила', cmd: false }, commands: { title: 'Команды', cmd: true } } as const;
const HUES = [350, 24, 150, 200, 270, 48, 320, 180];
const hue = (i: number) => ({ '--h': HUES[i % HUES.length] } as CSSProperties);

function Hl({ t, q }: { t: string; q: string }) {
  const s = q.trim();
  if (!s) return <>{t}</>;
  const parts = t.split(new RegExp('(' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'));
  return <>{parts.map((p, i) => p.toLowerCase() === s.toLowerCase() ? <mark key={i}>{p}</mark> : p)}</>;
}

export default function Section({ k }: { k: 'rules' | 'commands' }) {
  const { data, edit, update, ready, copy } = useApp();
  const [cur, setCur] = useState<string | null>(null);
  const [q, setQ] = useState('');
  if (!ready) return <Skeleton />;

  const S = META[k], list = data[k];
  const fi = Math.max(0, list.findIndex(x => x.id === cur));
  const f = list[fi];
  const setItem = (id: string, key: 't' | 'b', v: string) =>
    update(d => { d[k].find(x => x.id === f.id)!.items.find(i => i.id === id)![key] = v; });
  const move = (ix: number, dir: number) =>
    update(d => { const a = d[k].find(x => x.id === f.id)!.items; const j = ix + dir; if (j >= 0 && j < a.length) [a[ix], a[j]] = [a[j], a[ix]]; });

  const view = (i: Item & { _f?: string; _i?: number }, ix: number, hl = '') => (
    <div className={'card cat rise' + (S.cmd ? ' clickable' : '')} key={i.id} style={{ ...hue(i._i ?? fi), '--i': Math.min(ix, 12) } as CSSProperties}
      onClick={S.cmd ? () => copy(i.t) : undefined} role={S.cmd ? 'button' : undefined} tabIndex={S.cmd ? 0 : undefined}
      onKeyDown={S.cmd ? e => { if (e.key === 'Enter') copy(i.t); } : undefined} title={S.cmd ? 'Нажмите, чтобы скопировать' : undefined}>
      {S.cmd && <Copy className="cico" size={16} />}
      <h3 className={S.cmd ? 'cmd' : ''}><Hl t={i.t} q={hl} /></h3>
      <p><Hl t={i.b} q={hl} /></p>
      {i._f && <div className="note" style={{ fontSize: 12 }}>Папка: {i._f}</div>}
    </div>
  );
  const editor = (i: Item, ix: number) => (
    <div className="card cat" key={i.id} style={hue(fi)}>
      <input className="field" value={i.t} placeholder={S.cmd ? 'Команда' : 'Название'} onChange={e => setItem(i.id, 't', e.target.value)} />
      <textarea className="field" value={i.b} placeholder="Описание" onChange={e => setItem(i.id, 'b', e.target.value)} />
      <div className="row">
        <button className="btn sm" onClick={() => move(ix, -1)}>Выше</button>
        <button className="btn sm" onClick={() => move(ix, 1)}>Ниже</button>
        <button className="btn sm danger" onClick={() => { if (confirm('Удалить запись?')) update(d => { d[k].find(x => x.id === f.id)!.items.splice(ix, 1); }); }}>Удалить</button>
      </div>
    </div>
  );

  let body;
  if (q.trim()) {
    const s = q.trim().toLowerCase();
    const r = list.flatMap((fo, n) => fo.items.map(i => ({ ...i, _f: fo.name, _i: n }))).filter(i => (i.t + ' ' + i.b).toLowerCase().includes(s));
    body = <>
      <h1>Результаты поиска</h1><p className="note">Запрос: «{q}»{r.length ? ` · найдено: ${r.length}` : ''}</p>
      <div style={{ marginTop: 22 }}>{r.length ? r.map((i, n) => view(i, n, q)) : <div className="empty">Ничего не найдено. Попробуйте другое слово.</div>}</div>
    </>;
  } else if (!f) {
    body = <><h1>{S.title}</h1><div className="empty" style={{ marginTop: 22 }}>Папок пока нет. Включите редактирование и добавьте первую.</div></>;
  } else {
    body = <>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h1 key={f.id} className="rise">{f.name}</h1>
        {edit && <div className="row">
          <button className="btn sm" onClick={() => {
            const n = prompt('Новое название', f.name); if (!n) return;
            const ic = prompt('Эмодзи', f.icon || '📁');
            update(d => { const t = d[k].find(x => x.id === f.id)!; t.name = n; if (ic) t.icon = ic; });
          }}>Переименовать</button>
          <button className="btn sm danger" onClick={() => { if (confirm('Удалить папку «' + f.name + '» со всеми записями?')) { update(d => { d[k] = d[k].filter(x => x.id !== f.id); }); setCur(null); } }}>Удалить папку</button>
        </div>}
      </div>
      {edit
        ? <input className="field" style={{ marginTop: 10 }} value={f.note} placeholder="Описание папки" onChange={e => update(d => { d[k].find(x => x.id === f.id)!.note = e.target.value; })} />
        : f.note && <p className="note">{f.note}</p>}
      <div style={{ marginTop: 22 }} key={f.id}>
        {f.items.length ? f.items.map((i, ix) => edit ? editor(i, ix) : view(i, ix)) : <div className="empty">В этой папке пока пусто.</div>}
      </div>
      {edit && <button className="btn primary" onClick={() => update(d => { d[k].find(x => x.id === f.id)!.items.push({ id: uid(), t: S.cmd ? '/команда' : 'Новая запись', b: '' }); })}>Добавить запись</button>}
    </>;
  }

  return <div className="wrap"><div className="layout">
    <div>
      <input className="search" placeholder={'Поиск: ' + S.title.toLowerCase()} value={q} onChange={e => setQ(e.target.value)} aria-label="Поиск" />
      <div className="flist">
        {list.map((fo, n) => (
          <button key={fo.id} style={hue(n)} className={'folder' + (f && fo.id === f.id && !q.trim() ? ' on' : '')} onClick={() => { setCur(fo.id); setQ(''); }}>
            <span className="ic">{fo.icon || '📁'}</span><span>{fo.name}</span><span className="cnt">{fo.items.length}</span>
          </button>
        ))}
      </div>
      {edit && <button className="btn" style={{ marginTop: 10, width: '100%' }} onClick={() => {
        const n = prompt('Название папки'); if (!n) return;
        const ic = prompt('Эмодзи для папки', '📁') || '📁';
        const id = uid();
        update(d => { d[k].push({ id, name: n, icon: ic, note: '', items: [] }); });
        setCur(id);
      }}>Добавить папку</button>}
    </div>
    <div>{body}</div>
  </div></div>;
}
