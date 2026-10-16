'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Sun, Moon, Pencil, Check, LogIn, LogOut, User, ShieldCheck, Search, Star, BookOpen, ShieldCheck as BackupIcon } from 'lucide-react';
import SuggestModal from './SuggestModal';
import SearchModal, { openSearch } from './SearchModal';
import BrandMark from './BrandMark';
import { SITE } from '../lib/config';
import { useApp } from './Provider';
import { seed } from '../lib/store';

const SEC: Record<string, string> = { rules: 'Правила', commands: 'Команды', promo: 'Промокоды' };
const STATUS = { idle: '', saving: 'Сохраняется…', saved: 'Сохранено в базе', error: 'Ошибка сохранения' };

export default function Header() {
  const { isHelper, isStaff, ready, edit, setEdit, canEdit, user, remote, status, signOut, data, replace, say, theme, toggleTheme, slug, serverName } = useApp();
  const path = usePathname();
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!sessionStorage.getItem('br_entry')) sessionStorage.setItem('br_entry', location.pathname); }, []);

  const exportData = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = (slug || 'atlas') + '-data.json'; a.click();
  };
  const importData = (f?: File) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try { const d = JSON.parse(String(r.result)); if (!d.rules || !d.commands || !d.promos) throw 0; replace(d); say('Данные загружены'); }
      catch { say('Файл не подходит'); }
    };
    r.readAsText(f);
  };

  const m = /^\/s\/([^/]+)(?:\/(rules|commands|promo))?/.exec(path);
  const crumbs = path === '/favorites' ? <><Link href="/">Главная</Link> / Избранное</>
    : path === '/login' ? <><Link href="/">Главная</Link> / Вход</>
    : m ? <><Link href="/servers">Серверы</Link> / <Link href={`/s/${m[1]}`}>{serverName || m[1]}</Link>{m[2] && <> / {SEC[m[2]]}</>}</> : null;

  return <>
    <header className="top">
      <Link className="logo" href="/"><BrandMark /><span>{SITE.a}<b>{SITE.b}</b></span></Link>
      {crumbs && <div className="crumbs">{crumbs}</div>}
      <Link className="navlink" href="/servers">Серверы</Link>
      <Link className="navlink" href="/favorites"><Star size={14} style={{ verticalAlign: '-2px' }} /> Избранное</Link>
      <Link className="navlink" href="/knowledge"><BookOpen size={14} style={{ verticalAlign: '-2px' }} /> База знаний</Link>
      <Link className="navlink" href="/backup"><BackupIcon size={14} style={{ verticalAlign: '-2px' }} /> Бэкап</Link>
      <div className="sp" />
      <button className="btn" onClick={openSearch} aria-label="Поиск" title="Поиск (Ctrl+K)"><Search size={16} /><span className="hide-sm">Поиск</span><kbd className="kbd">Ctrl K</kbd></button>
      <button className="btn icon" onClick={toggleTheme} aria-label="Сменить тему" title="Сменить тему">
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      {ready && canEdit && <button className={'btn' + (edit ? ' on' : '')} onClick={() => setEdit(!edit)}>
        {edit ? <><Check size={16} /> Готово</> : <><Pencil size={16} /> Редактировать</>}
      </button>}
      {ready && remote && !user && <Link className="btn icon" href="/login" aria-label="Вход" title="Вход для администратора"><LogIn size={18} /></Link>}
      {ready && isHelper && <Link className="btn icon" href="/moderation" aria-label="Модерация" title="Модерация"><ShieldCheck size={18} /></Link>}
      {ready && remote && user && <Link className="btn icon" href="/account" aria-label="Аккаунт" title="Аккаунт"><User size={18} /></Link>}
      {ready && remote && user && <button className="btn icon" onClick={signOut} aria-label="Выйти" title="Выйти"><LogOut size={18} /></button>}
    </header>
    {edit && <div className="wrap" style={{ paddingBottom: 0, paddingTop: 20 }}>
      <div className="edbar">
        <span>{remote ? `Режим редактирования. Изменения сохраняются в базе. ${slug ? STATUS[status] : ''}` : 'Режим редактирования. Изменения сохраняются в этом браузере автоматически.'}</span>
        {slug && <>
          <button className="btn sm" onClick={exportData}>Скачать данные</button>
          <button className="btn sm" onClick={() => file.current?.click()}>Загрузить данные</button>
          <button className="btn sm danger" onClick={() => { if (confirm('Вернуть шаблон для этого сервера? Его текущее содержимое пропадёт.')) { replace(seed()); say('Сброшено'); } }}>Сбросить</button>
          <input ref={file} type="file" accept=".json" hidden onChange={e => { importData(e.target.files?.[0]); e.target.value = ''; }} />
        </>}
      </div>
    </div>}
  <SuggestModal />
  <SearchModal />
  </>;
}
