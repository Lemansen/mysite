'use client';
import Link from 'next/link';
import { Copy, Pin, PinOff, X } from 'lucide-react';
import { useApp } from './Provider';
import { KIND_LABEL } from '../lib/search';
import { Fav, Snap, bumpUsed, favHref, removeFav, togglePin } from '../lib/favs';

export const pathOf = (d: Snap, withServer: boolean) =>
  (withServer ? d.serverName + ' · ' : '') + KIND_LABEL[d.kind] + (d.kind !== 'promos' && d.folder ? ' · ' + d.folder : '');

// строка материала: избранное (с закреплением и удалением) или «часто использую» (fav = null)
export default function FavItem({ d, fav, withServer = true, compact = false }: { d: Snap; fav?: Fav; withServer?: boolean; compact?: boolean }) {
  const { copy } = useApp();
  const gone = !!fav?.gone;
  const canCopy = d.kind !== 'rules' && !gone;
  const main = <>
    <span className={'fav-t' + (d.kind === 'commands' ? ' cmd' : '')}>{d.title}</span>
    <span className="fav-path">{pathOf(d, withServer)}{gone && ' · материал удалён'}</span>
    {!compact && d.body && <span className="fav-s">{d.body.length > 140 ? d.body.slice(0, 140) + '…' : d.body}</span>}
  </>;
  return <div className={'fav' + (gone ? ' gone' : '') + (fav?.pinned ? ' pinned' : '')}>
    {gone ? <div className="fav-main">{main}</div> : <Link className="fav-main" href={favHref(d)}>{main}</Link>}
    <div className="fav-act">
      {canCopy && <button className="btn icon sm" aria-label="Скопировать" title="Скопировать" onClick={async () => { if (await copy(d.title)) bumpUsed(d); }}><Copy size={15} /></button>}
      {fav && <button className={'btn icon sm' + (fav.pinned ? ' on' : '')} aria-pressed={!!fav.pinned} aria-label={fav.pinned ? 'Открепить' : 'Закрепить на главной'} title={fav.pinned ? 'Открепить' : 'Закрепить на главной'} onClick={() => togglePin(fav.key)}>{fav.pinned ? <PinOff size={15} /> : <Pin size={15} />}</button>}
      {fav && <button className="btn icon sm" aria-label="Убрать из избранного" title="Убрать из избранного" onClick={() => removeFav(fav.key)}><X size={15} /></button>}
    </div>
  </div>;
}
