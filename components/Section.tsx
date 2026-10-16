'use client';
import { useState, useEffect, CSSProperties } from 'react';
import { Copy, Search } from 'lucide-react';
import { useApp } from './Provider';
import Skeleton from './Skeleton';
import { uid, Item } from '../lib/store';
import { useDeepLink } from '../lib/useDeepLink';
import { openSearch } from './SearchModal';
import FavButton from './FavButton';
import { buildDocs, Doc } from '../lib/search';
import CommandsDirectory from './CommandsDirectory';
import { bumpUsed, pushRecent, syncServer } from '../lib/favs';

const META = { rules: { title: 'Правила', cmd: false }, commands: { title: 'Команды', cmd: true } } as const;
const HUES = [350, 24, 150, 200, 270, 48, 320, 180];
const hue = (i: number) => ({ '--h': HUES[i % HUES.length] } as CSSProperties);

export default function Section({ k }: { k: 'rules' | 'commands' }) {
  const { data, edit, update, ready, copy, slug, serverName } = useApp();
  const link = useDeepLink(ready);
  const [cur, setCur] = useState<string | null>(link.f);
  useEffect(() => { if (link.f) setCur(link.f); }, [link.f]);
  const curId = (data[k].find(x => x.id === cur) ?? data[k][0])?.id;

  // избранное: обновляем названия и помечаем удалённые материалы
  useEffect(() => {
    if (!ready || !slug || data.rules.length + data.commands.length + data.promos.length === 0) return;
    syncServer(slug, buildDocs(slug, serverName, data));
  }, [ready, slug, serverName, data]);
  // история: какую папку открыли
  useEffect(() => {
    const fo = data[k].find(x => x.id === curId);
    if (ready && slug && fo) pushRecent({ kind: k, server: slug, serverName, folderId: fo.id, folder: fo.name });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, slug, serverName, curId, k]);
  // переход по ссылке на конкретный материал считаем использованием
  useEffect(() => {
    if (!ready || !slug || !link.i) return;
    for (const fo of data[k]) { const it = fo.items.find(x => x.id === link.i); if (it) { bumpUsed({ kind: k, server: slug, serverName, folderId: fo.id, folder: fo.name, id: it.id, title: it.t, body: it.b }); break; } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, link.i]);
  if (!ready) return <Skeleton />;
  if (k === 'commands' && !edit) return <CommandsDirectory />;

  const S = META[k], list = data[k];
  const fi = Math.max(0, list.findIndex(x => x.id === cur));
  const f = list[fi];
  const docOf = (i: Item): Doc => ({ kind: k, server: slug ?? '', serverName, folderId: f.id, folder: f.name, id: i.id, title: i.t, body: i.b });
  const setItem = (id: string, key: 't' | 'b' | 'name' | 'syntax' | 'example' | 'purpose', v: string) =>
    update(d => { (d[k].find(x => x.id === f.id)!.items.find(i => i.id === id)! as Item)[key] = v; });
  const move = (ix: number, dir: number) =>
    update(d => { const a = d[k].find(x => x.id === f.id)!.items; const j = ix + dir; if (j >= 0 && j < a.length) [a[ix], a[j]] = [a[j], a[ix]]; });

  const view = (i: Item, ix: number) => (
    <div id={'i-' + i.id} className={'card cat hasfav rise' + (S.cmd ? ' clickable' : '') + (link.flash === i.id ? ' flash' : '')} key={i.id} style={{ ...hue(fi), '--i': Math.min(ix, 12) } as CSSProperties}
      onClick={S.cmd ? () => { copy(i.t); bumpUsed(docOf(i)); } : undefined} role={S.cmd ? 'button' : undefined} tabIndex={S.cmd ? 0 : undefined}
      onKeyDown={S.cmd ? e => { if (e.key === 'Enter') { copy(i.t); bumpUsed(docOf(i)); } } : undefined} title={S.cmd ? 'Нажмите, чтобы скопировать' : undefined}>
      {S.cmd && <Copy className="cico" size={16} />}
      {slug && <FavButton doc={docOf(i)} />}
      <h3 className={S.cmd ? 'cmd' : ''}>{i.t}</h3>
      <p>{i.b}</p>
    </div>
  );
  const editor = (i: Item, ix: number) => (
    <div className="card cat" key={i.id} style={hue(fi)}>
      <input className="field" value={i.t} placeholder={S.cmd ? 'Команда / синтаксис' : 'Название'} onChange={e => setItem(i.id, 't', e.target.value)} />
      <textarea className="field" value={i.b} placeholder="Описание" onChange={e => setItem(i.id, 'b', e.target.value)} />
      {S.cmd && <>
        <input className="field" value={i.name ?? ''} placeholder="Название команды (необязательно)" onChange={e => setItem(i.id, 'name', e.target.value)} />
        <input className="field" value={i.syntax ?? ''} placeholder="Синтаксис (если отличается)" onChange={e => setItem(i.id, 'syntax', e.target.value)} />
        <input className="field" value={i.example ?? ''} placeholder="Пример использования" onChange={e => setItem(i.id, 'example', e.target.value)} />
        <input className="field" value={i.purpose ?? ''} placeholder="Назначение / ключевые слова" onChange={e => setItem(i.id, 'purpose', e.target.value)} />
      </>}
      <div className="row">
        <button className="btn sm" onClick={() => move(ix, -1)}>Выше</button>
        <button className="btn sm" onClick={() => move(ix, 1)}>Ниже</button>
        <button className="btn sm danger" onClick={() => { if (confirm('Удалить запись?')) update(d => { d[k].find(x => x.id === f.id)!.items.splice(ix, 1); }); }}>Удалить</button>
      </div>
    </div>
  );

  let body;
  if (!f) {
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
      <button className="search searchbtn" onClick={openSearch}><Search size={16} /> Поиск<kbd className="kbd">Ctrl K</kbd></button>
      <div className="flist">
        {list.map((fo, n) => (
          <button key={fo.id} style={hue(n)} className={'folder' + (f && fo.id === f.id ? ' on' : '')} onClick={() => setCur(fo.id)}>
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
