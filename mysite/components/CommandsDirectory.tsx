'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Check, Copy, Search, ThumbsUp } from 'lucide-react';
import { useApp } from './Provider';
import FavButton from './FavButton';
import { bumpUsed } from '../lib/favs';
import { norm, type Doc } from '../lib/search';
import { useDeepLink } from '../lib/useDeepLink';

const HUES = [350, 24, 150, 200, 270, 48, 320, 180];
const hue = (i: number) => ({ '--h': HUES[i % HUES.length] } as CSSProperties);

type CommandItem = {
  id: string; t: string; b: string;
  name?: string; syntax?: string; example?: string; purpose?: string;
};

const META: Record<string, { name: string; purpose: string; example: string }> = {
  '/me': { name: 'Отыгровка действия', purpose: 'Ролевая отыгровка', example: '/me достал паспорт из кармана' },
  '/do': { name: 'Описание ситуации', purpose: 'Ролевая отыгровка', example: '/do Паспорт лежит на столе' },
  '/try': { name: 'Попытка действия', purpose: 'Ролевая отыгровка', example: '/try взломал замок' },
  '/todo': { name: 'Фраза с действием', purpose: 'Ролевая отыгровка', example: '/todo Держите*протянув документы' },
  '/b': { name: 'OOC-чат', purpose: 'Общение', example: '/b Кто сегодня на собеседование?' },
  '/s': { name: 'Крик', purpose: 'Общение', example: '/s Помогите, нужна помощь!' },
  '/w': { name: 'Шёпот', purpose: 'Общение', example: '/w Подойди сюда' },
  '/pm': { name: 'Личное сообщение', purpose: 'Общение', example: '/pm 123 Привет' },
  '/stats': { name: 'Статистика персонажа', purpose: 'Персонаж', example: '/stats' },
  '/time': { name: 'Игровое время', purpose: 'Персонаж', example: '/time' },
  '/gps': { name: 'Навигация', purpose: 'Персонаж', example: '/gps' },
  '/pay': { name: 'Передача денег', purpose: 'Персонаж', example: '/pay 123 500' },
  '/report': { name: 'Обращение к администрации', purpose: 'Помощь', example: '/report Помогите разобраться с ситуацией' },
  '/anim': { name: 'Меню анимаций', purpose: 'Персонаж', example: '/anim' },
  '/phone': { name: 'Телефон', purpose: 'Персонаж', example: '/phone' },
  '/engine': { name: 'Двигатель транспорта', purpose: 'Транспорт', example: '/engine' },
  '/lock': { name: 'Замок транспорта', purpose: 'Транспорт', example: '/lock' },
  '/key': { name: 'Меню ключей', purpose: 'Транспорт', example: '/key' },
  '/r': { name: 'Рация фракции', purpose: 'Фракции', example: '/r Всем быть готовыми' },
  '/f': { name: 'Чат организации', purpose: 'Фракции', example: '/f Собрание через пять минут' },
};

function describe(item: CommandItem, folderName: string) {
  const syntax = item.syntax?.trim() || item.t.trim();
  const command = (syntax.match(/^\/[\wА-Яа-яЁё]+/i)?.[0] || syntax.split(/\s+/)[0]).toLowerCase();
  const meta = META[command];
  const fromText = item.b.match(/(?:пример|например)\s*:\s*([^\n]+)/i)?.[1]?.trim();
  return {
    syntax,
    name: item.name?.trim() || meta?.name || syntax,
    purpose: item.purpose?.trim() || meta?.purpose || folderName,
    example: item.example?.trim() || (fromText ? fromText : meta?.example || syntax),
  };
}

export default function CommandsDirectory() {
  const { data, ready, slug, serverName, copy } = useApp();
  const link = useDeepLink(ready);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [useful, setUseful] = useState<string[]>([]);
  const usefulKey = `br_cmd_useful_v1:${slug || 'local'}`;

  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem(usefulKey) || '[]');
      setUseful(Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : []);
    } catch { setUseful([]); }
  }, [usefulKey]);

  useEffect(() => {
    if (link.f && data.commands.some(folder => folder.id === link.f)) setCategory(link.f);
    if (link.i) document.getElementById('i-' + link.i)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [link.f, link.i, data.commands]);

  const commands = useMemo(() => data.commands.flatMap((folder, folderIndex) =>
    folder.items.map(raw => {
      const item = raw as CommandItem;
      const details = describe(item, folder.name);
      const doc: Doc = {
        kind: 'commands', server: slug || 'local', serverName,
        folderId: folder.id, folder: folder.name, id: item.id,
        title: item.t, body: item.b,
      };
      return { item, folder, folderIndex, details, doc, usefulKey: `${slug || 'local'}:${item.id}` };
    })), [data.commands, slug, serverName]);

  const filtered = useMemo(() => {
    const words = norm(query.trim()).split(/\s+/).filter(Boolean);
    return commands.filter(c => {
      if (category !== 'all' && c.folder.id !== category) return false;
      const haystack = norm([
        c.details.name, c.details.syntax, c.item.b, c.details.example,
        c.details.purpose, c.folder.name, c.folder.note,
      ].join(' '));
      return words.every(word => haystack.includes(word));
    });
  }, [commands, category, query]);

  const toggleUseful = (key: string) => {
    setUseful(old => {
      const next = old.includes(key) ? old.filter(x => x !== key) : [...old, key];
      try { localStorage.setItem(usefulKey, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  if (!ready) return <div className="empty">Загружаем команды…</div>;

  return <div className="wrap">
    <div className="command-head">
      <div>
        <span className="eyebrow">СПРАВОЧНИК</span>
        <h1>Команды</h1>
        <p className="note">Найдите команду по названию, синтаксису, назначению или примеру. Нажмите «Копировать», чтобы быстро использовать её в игре.</p>
      </div>
      <button className="search searchbtn command-global-search" onClick={() => import('./SearchModal').then(m => m.openSearch())}><Search size={16} /> Общий поиск</button>
    </div>

    <label className="command-search">
      <Search size={18} aria-hidden="true" />
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Например: личное сообщение, транспорт, /me…" aria-label="Поиск команд по названию, синтаксису и назначению" />
      {query && <button type="button" className="btn sm" onClick={() => setQuery('')}>Очистить</button>}
    </label>

    <div className="command-filters" aria-label="Фильтр категорий">
      <button className={'chip' + (category === 'all' ? ' on' : '')} onClick={() => setCategory('all')}>Все категории <span>{commands.length}</span></button>
      {data.commands.map(folder => <button key={folder.id} className={'chip' + (category === folder.id ? ' on' : '')} onClick={() => setCategory(folder.id)}>
        {folder.icon || '📁'} {folder.name} <span>{folder.items.length}</span>
      </button>)}
    </div>

    <div className="command-results-meta"><span>{filtered.length} {filtered.length === 1 ? 'команда' : filtered.length >= 2 && filtered.length <= 4 ? 'команды' : 'команд'}</span>{query && <span>по запросу «{query}»</span>}</div>
    {filtered.length ? <div className="command-grid">
      {filtered.map(({ item, folder, folderIndex, details, doc, usefulKey: voteKey }, ix) => {
        const isUseful = useful.includes(voteKey);
        return <article id={'i-' + item.id} key={folder.id + ':' + item.id} className={'card cat command-card' + (link.flash === item.id ? ' flash' : '')} style={{ ...hue(folderIndex), '--i': Math.min(ix, 12) } as CSSProperties}>
          {slug && <FavButton doc={doc} />}
          <div className="command-card-top"><span className="command-category">{folder.icon || '📁'} {folder.name}</span><span className="command-purpose">{details.purpose}</span></div>
          <h2>{details.name}</h2>
          <div className="command-syntax"><code>{details.syntax}</code><button type="button" className="btn sm primary" onClick={() => { void copy(details.syntax); bumpUsed(doc); }}><Copy size={14} /> Копировать</button></div>
          <p className="command-description">{item.b || 'Описание пока не добавлено.'}</p>
          <div className="command-example"><span>Пример использования</span><code>{details.example}</code></div>
          <div className="command-card-actions"><button type="button" className={'btn sm' + (isUseful ? ' primary' : '')} aria-pressed={isUseful} onClick={() => toggleUseful(voteKey)}><ThumbsUp size={14} /> {isUseful ? 'Полезно' : 'Отметить полезной'} {isUseful && <Check size={14} />}</button></div>
        </article>;
      })}
    </div> : <div className="empty command-empty">Команды не найдены. Измени запрос или выбери другую категорию.</div>}
  </div>;
}
