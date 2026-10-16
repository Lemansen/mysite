'use client';
import { Star } from 'lucide-react';
import { useApp } from './Provider';
import { useFavs, isFav, toggleFav, Snap } from '../lib/favs';

export default function FavButton({ doc }: { doc: Snap }) {
  const { say } = useApp();
  const s = useFavs();
  const on = isFav(s, doc);
  return <button type="button" className={'favbtn' + (on ? ' on' : '')} aria-pressed={on}
    aria-label={on ? 'Убрать из избранного' : 'Добавить в избранное'} title={on ? 'Убрать из избранного' : 'В избранное'}
    onClick={e => { e.stopPropagation(); say(toggleFav(doc) ? 'Добавлено в избранное' : 'Убрано из избранного'); }}
    onKeyDown={e => e.stopPropagation()}>
    <Star size={17} fill={on ? 'currentColor' : 'none'} />
  </button>;
}
