'use client';
import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Star, Clock, Flame } from 'lucide-react';
import { useApp } from '../../components/Provider';
import Skeleton from '../../components/Skeleton';
import FavItem from '../../components/FavItem';
import { useFavs, pageHref, clearRecent, clearUsed } from '../../lib/favs';
import { Kind, KINDS, KIND_LABEL } from '../../lib/search';

type Tab = 'favs' | 'recent' | 'used';

function Inner() {
  const { ready, authReady, say, user, remote } = useApp();
  const sp = useSearchParams();
  const s = useFavs();
  const [tab, setTab] = useState<Tab>('favs');
  const [srv, setSrv] = useState<string>(sp.get('s') ?? '');
  const [kind, setKind] = useState<Kind | ''>('');

  const servers = useMemo(() => {
    const m = new Map<string, string>();
    s.favs.forEach(f => m.set(f.server, f.serverName));
    return [...m];
  }, [s.favs]);
  const list = useMemo(() => s.favs
    .filter(f => (!srv || f.server === srv) && (!kind || f.kind === kind))
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.ts - a.ts), [s.favs, srv, kind]);

  if (!ready || !authReady) return <Skeleton />;
  const showSrv = !srv;
  const tabs: [Tab, string, number, typeof Star][] = [['favs', 'Избранное', s.favs.length, Star], ['recent', 'Недавние', s.recent.length, Clock], ['used', 'Часто использую', s.used.length, Flame]];

  return <div className="wrap">
    <h1>Избранное</h1>
    <p className="note">Нажмите на звёздочку у правила, команды или промокода, и он появится здесь. {remote && user ? 'Избранное синхронизируется с вашим аккаунтом на разных устройствах.' : 'Без входа данные хранятся только в этом браузере.'}</p>

    <div className="chips" role="tablist" style={{ marginTop: 18 }}>
      {tabs.map(([t, label, n, Icon]) => <button key={t} role="tab" aria-selected={tab === t} className={'chip' + (tab === t ? ' on' : '')} onClick={() => setTab(t)}><Icon size={14} style={{ verticalAlign: '-2px' }} /> {label} {n > 0 && <span className="cnt">{n}</span>}</button>)}
    </div>

    {tab === 'favs' && <>
      {s.favs.length > 0 && <div className="chips" style={{ marginTop: 10 }}>
        {servers.length > 1 && <>
          <button className={'chip' + (!srv ? ' on' : '')} onClick={() => setSrv('')}>Все серверы</button>
          {servers.map(([sl, name]) => <button key={sl} className={'chip' + (srv === sl ? ' on' : '')} onClick={() => setSrv(sl)}>{name}</button>)}
          <span className="chipsep" />
        </>}
        <button className={'chip' + (!kind ? ' on' : '')} onClick={() => setKind('')}>Всё</button>
        {KINDS.map(k => <button key={k} className={'chip' + (kind === k ? ' on' : '')} onClick={() => setKind(kind === k ? '' : k)}>{KIND_LABEL[k]}</button>)}
      </div>}
      <div style={{ marginTop: 16 }}>
        {!s.favs.length ? <div className="empty">Пока пусто. Откройте любой сервер и нажмите звёздочку рядом с нужным материалом.<p style={{ marginTop: 14 }}><Link className="btn primary" href="/servers">Выбрать сервер</Link></p></div>
          : !list.length ? <div className="empty">В этой подборке ничего нет. Выберите другой сервер или раздел.</div>
          : list.map(f => <FavItem key={f.key} d={f} fav={f} withServer={showSrv} />)}
      </div>
    </>}

    {tab === 'recent' && <div style={{ marginTop: 16 }}>
      {!s.recent.length ? <div className="empty">История пуста. Здесь появятся разделы и папки, которые вы открывали.</div> : <>
        {s.recent.map(r => <div className="fav" key={r.key}>
          <Link className="fav-main" href={pageHref(r)}>
            <span className="fav-t">{r.kind === 'promos' ? 'Промокоды' : r.folder}</span>
            <span className="fav-path">{r.serverName} · {KIND_LABEL[r.kind]} · {new Date(r.ts).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
          </Link>
        </div>)}
        <button className="btn sm" style={{ marginTop: 8 }} onClick={() => { clearRecent(); say('История очищена'); }}>Очистить историю</button>
      </>}
    </div>}

    {tab === 'used' && <div style={{ marginTop: 16 }}>
      {!s.used.length ? <div className="empty">Пока нечего показать. Сюда попадают команды и промокоды, которые вы копируете, и материалы, которые открываете из поиска.</div> : <>
        {s.used.map(u => <div key={u.key} className="usedrow"><FavItem d={u} /><span className="cnt" title="Сколько раз использовано">×{u.n}</span></div>)}
        <button className="btn sm" style={{ marginTop: 8 }} onClick={() => { clearUsed(); say('Список очищен'); }}>Очистить список</button>
      </>}
    </div>}
  </div>;
}

export default function Page() { return <Suspense fallback={<Skeleton />}><Inner /></Suspense>; }
