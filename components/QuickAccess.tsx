'use client';
import Link from 'next/link';
import { ArrowRight, Clock, Flame, Star } from 'lucide-react';
import { useFavs, pageHref } from '../lib/favs';
import { KIND_LABEL } from '../lib/search';
import FavItem from './FavItem';

// быстрый доступ: закреплённое, недавние страницы, часто используемое. server — показать только один сервер
export default function QuickAccess({ server }: { server?: string }) {
  const s = useFavs();
  const ok = (x: { server: string }) => !server || x.server === server;
  const pinned = s.favs.filter(f => f.pinned && !f.gone && ok(f)).slice(0, 6);
  const favs = s.favs.filter(f => !f.pinned && !f.gone && ok(f)).slice(0, 4);
  const recent = s.recent.filter(ok).slice(0, 5);
  const used = s.used.filter(u => u.n >= 2 && ok(u)).slice(0, 5);
  if (!pinned.length && !favs.length && !recent.length && !used.length) return null;

  return <section className="sec">
    <div className="row" style={{ justifyContent: 'space-between', marginTop: 0 }}>
      <h2 style={{ margin: 0 }}>Быстрый доступ</h2>
      <Link className="navlink" href={'/favorites' + (server ? '?s=' + encodeURIComponent(server) : '')}>Всё избранное <ArrowRight size={14} style={{ verticalAlign: '-2px' }} /></Link>
    </div>
    <div className="qa">
      {(pinned.length > 0 || favs.length > 0) && <div className="qa-col">
        <h3><Star size={16} /> Избранное</h3>
        {[...pinned, ...favs].map(f => <FavItem key={f.key} d={f} fav={f} withServer={!server} compact />)}
      </div>}
      {used.length > 0 && <div className="qa-col">
        <h3><Flame size={16} /> Часто использую</h3>
        {used.map(u => <FavItem key={u.key} d={u} withServer={!server} compact />)}
      </div>}
      {recent.length > 0 && <div className="qa-col">
        <h3><Clock size={16} /> Недавно смотрел</h3>
        {recent.map(r => <div className="fav" key={r.key}>
          <Link className="fav-main" href={pageHref(r)}>
            <span className="fav-t">{r.kind === 'promos' ? 'Промокоды' : r.folder}</span>
            <span className="fav-path">{(server ? '' : r.serverName + ' · ') + (r.kind === 'promos' ? '' : KIND_LABEL[r.kind])}</span>
          </Link>
        </div>)}
      </div>}
    </div>
  </section>;
}
