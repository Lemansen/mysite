#!/data/data/com.termux/files/usr/bin/bash
# Несколько серверов: у каждого свои правила, команды и промокоды. Запуск: bash ~/update-servers.sh
set -e
cd ~/mysite
mkdir -p "app/s/[slug]/rules" "app/s/[slug]/commands" "app/s/[slug]/promo"
rm -rf app/rules app/commands app/promo

cat > components/Provider.tsx <<'EOF'
'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { Data, KEY, seed } from '../lib/store';
import { supabase } from '../lib/supabase';
import { SITE } from '../lib/config';

type Status = 'idle' | 'saving' | 'saved' | 'error';
export type ServerInfo = { slug: string; name: string };
type Ctx = {
  data: Data; ready: boolean; notFound: boolean; edit: boolean; canEdit: boolean; user: User | null; remote: boolean;
  status: Status; toast: string; theme: 'dark' | 'light';
  servers: ServerInfo[]; slug: string | null; serverName: string;
  setEdit: (v: boolean) => void;
  toggleTheme: () => void;
  update: (fn: (d: Data) => void) => void;
  replace: (d: Data) => void;
  say: (m: string) => void;
  copy: (v: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  addServer: (name: string, from?: string) => Promise<string | null>;
  renameServer: (slug: string, name: string) => Promise<void>;
  deleteServer: (slug: string) => Promise<void>;
};
const C = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(C);
const valid = (s: any): s is Data => !!(s && s.rules && s.commands && s.promos);
const empty = (): Data => ({ rules: [], commands: [], promos: [] });

const TR: Record<string, string> = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
const slugify = (s: string) => s.toLowerCase().split('').map(c => TR[c] ?? c).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'server';

export default function Provider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const slug = useMemo(() => /^\/s\/([^/]+)/.exec(pathname)?.[1] ?? null, [pathname]);

  const [data, setData] = useState<Data>(empty);
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [srvReady, setSrvReady] = useState(false);
  const [ready, setReady] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [flag, setFlag] = useState(false);
  const [toast, setToast] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const dataRef = useRef<Data>(data);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(''), 2200); }, []);

  const loadServers = useCallback(async () => {
    if (!supabase) { setServers([{ slug: 'local', name: SITE.name }]); setSrvReady(true); return; }
    const { data: rows, error } = await supabase.from('servers').select('slug,name').order('position').order('created_at');
    if (error) say('Не удалось загрузить список серверов'); else setServers(rows ?? []);
    setSrvReady(true);
  }, [say]);

  // запуск: тема, вход, список серверов, подсветка карточек
  useEffect(() => {
    setFlag(sessionStorage.getItem('br_edit') === '1');
    const t = localStorage.getItem('br_theme') === 'light' ? 'light' : 'dark';
    setTheme(t); document.documentElement.dataset.theme = t;
    supabase?.auth.getSession().then(({ data: s }) => setUser(s.session?.user ?? null));
    const sub = supabase?.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    loadServers();
    const mv = (e: PointerEvent) => {
      const el = (e.target as Element).closest?.('.card,.tile') as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', e.clientX - r.left + 'px');
      el.style.setProperty('--my', e.clientY - r.top + 'px');
    };
    document.addEventListener('pointermove', mv);
    return () => { document.removeEventListener('pointermove', mv); sub?.data.subscription.unsubscribe(); };
  }, [loadServers]);

  // данные выбранного сервера
  useEffect(() => {
    if (!srvReady) return;
    if (!slug) { setNotFound(false); setReady(true); return; }
    let alive = true;
    setReady(false); setNotFound(false);
    (async () => {
      let d: Data | null = null, nf = false;
      if (supabase) {
        const { data: row, error } = await supabase.from('servers').select('data').eq('slug', slug).maybeSingle();
        if (!alive) return;
        if (error) say('Не удалось загрузить данные сервера');
        else if (valid(row?.data)) d = row!.data as Data; else nf = true;
      } else if (slug === 'local') {
        try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (valid(s)) d = s; } catch {}
        d = d ?? seed();
      } else nf = true;
      const final = d ?? empty();
      dataRef.current = final; setData(final); setNotFound(nf); setReady(true);
    })();
    return () => { alive = false; };
  }, [slug, srvReady, say]);

  const saveRemote = useCallback((d: Data) => {
    if (!supabase || !slug) return;
    if (timer.current) clearTimeout(timer.current);
    setStatus('saving');
    timer.current = setTimeout(async () => {
      const { error } = await supabase!.from('servers').update({ data: d, updated_at: new Date().toISOString() }).eq('slug', slug);
      if (error) { setStatus('error'); say('Ошибка сохранения: ' + error.message); } else setStatus('saved');
    }, 700);
  }, [slug, say]);

  const replace = (d: Data) => {
    dataRef.current = d; setData(d);
    if (supabase) saveRemote(d);
    else { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { say('Не удалось сохранить'); } }
  };
  const update = (fn: (d: Data) => void) => { const d = structuredClone(data); fn(d); replace(d); };

  const addServer = async (name: string, from?: string) => {
    if (!supabase) { say('Для нескольких серверов нужна база Supabase'); return null; }
    const base = slugify(name); let s = base, n = 1;
    while (servers.some(x => x.slug === s)) s = base + '-' + (++n);
    let d: Data = seed();
    if (from) {
      const { data: row } = await supabase.from('servers').select('data').eq('slug', from).maybeSingle();
      if (valid(row?.data)) d = row!.data as Data;
    }
    const { error } = await supabase.from('servers').insert({ slug: s, name, data: d, position: servers.length });
    if (error) { say('Ошибка: ' + error.message); return null; }
    await loadServers(); say('Сервер добавлен'); return s;
  };
  const renameServer = async (s: string, name: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('servers').update({ name }).eq('slug', s);
    if (error) say('Ошибка: ' + error.message); else await loadServers();
  };
  const deleteServer = async (s: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('servers').delete().eq('slug', s);
    if (error) say('Ошибка: ' + error.message); else { await loadServers(); say('Сервер удалён'); }
  };

  const canEdit = supabase ? !!user : true;
  const edit = flag && canEdit;
  const setEdit = (v: boolean) => { setFlag(v); sessionStorage.setItem('br_edit', v ? '1' : '0'); };
  const toggleTheme = () => {
    const t = theme === 'dark' ? 'light' : 'dark';
    setTheme(t); document.documentElement.dataset.theme = t; localStorage.setItem('br_theme', t);
  };
  const copy = async (v: string) => {
    try { await navigator.clipboard.writeText(v); say('Скопировано: ' + v); return true; }
    catch {
      try { const ta = document.createElement('textarea'); ta.value = v; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); say('Скопировано: ' + v); return true; }
      catch { say('Не удалось скопировать'); return false; }
    }
  };
  const signOut = async () => { await supabase?.auth.signOut(); setEdit(false); say('Вы вышли'); };
  const serverName = servers.find(s => s.slug === slug)?.name ?? '';

  return <C.Provider value={{ data, ready, notFound, edit, canEdit, user, remote: !!supabase, status, toast, theme, servers, slug, serverName, setEdit, toggleTheme, update, replace, say, copy, signOut, addServer, renameServer, deleteServer }}>
    {children}
    <div className={'toast' + (toast ? ' show' : '')}>{toast}</div>
  </C.Provider>;
}
EOF

cat > components/ServerGuard.tsx <<'EOF'
'use client';
import Link from 'next/link';
import { ReactNode } from 'react';
import { useApp } from './Provider';
import Skeleton from './Skeleton';

export default function ServerGuard({ children }: { children: ReactNode }) {
  const { ready, notFound } = useApp();
  if (!ready) return <Skeleton />;
  if (notFound) return <div className="wrap">
    <h1>Сервер не найден</h1>
    <p className="note">Такого сервера нет или он был удалён.</p>
    <p style={{ marginTop: 16 }}><Link className="btn" href="/">К списку серверов</Link></p>
  </div>;
  return <>{children}</>;
}
EOF

cat > components/Header.tsx <<'EOF'
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';
import { Sun, Moon, Pencil, Check, LogIn, LogOut } from 'lucide-react';
import BrandMark from './BrandMark';
import { SITE } from '../lib/config';
import { useApp } from './Provider';
import { seed } from '../lib/store';

const SEC: Record<string, string> = { rules: 'Правила', commands: 'Команды', promo: 'Промокоды' };
const STATUS = { idle: '', saving: 'Сохраняется…', saved: 'Сохранено в базе', error: 'Ошибка сохранения' };

export default function Header() {
  const { ready, edit, setEdit, canEdit, user, remote, status, signOut, data, replace, say, theme, toggleTheme, slug, serverName } = useApp();
  const path = usePathname();
  const file = useRef<HTMLInputElement>(null);

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
  const crumbs = path === '/login' ? <><Link href="/">Главная</Link> / Вход</>
    : m ? <><Link href="/">Серверы</Link> / <Link href={`/s/${m[1]}`}>{serverName || m[1]}</Link>{m[2] && <> / {SEC[m[2]]}</>}</> : null;

  return <>
    <header className="top">
      <Link className="logo" href="/"><BrandMark /><span>{SITE.a}<b>{SITE.b}</b></span></Link>
      {crumbs && <div className="crumbs">{crumbs}</div>}
      <div className="sp" />
      <button className="btn icon" onClick={toggleTheme} aria-label="Сменить тему" title="Сменить тему">
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      {ready && canEdit && <button className={'btn' + (edit ? ' on' : '')} onClick={() => setEdit(!edit)}>
        {edit ? <><Check size={16} /> Готово</> : <><Pencil size={16} /> Редактировать</>}
      </button>}
      {ready && remote && !user && <Link className="btn icon" href="/login" aria-label="Вход" title="Вход для администратора"><LogIn size={18} /></Link>}
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
  </>;
}
EOF

cat > app/page.tsx <<'EOF'
'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CSSProperties } from 'react';
import { Server, ArrowRight, Plus } from 'lucide-react';
import { useApp } from '../components/Provider';
import Skeleton from '../components/Skeleton';
import { SITE } from '../lib/config';

const HUES = [172, 42, 205, 280, 12, 140, 330, 60];

export default function Servers() {
  const r = useRouter();
  const { ready, servers, edit, addServer, renameServer, deleteServer } = useApp();
  if (!ready) return <Skeleton />;

  const add = async () => {
    const name = prompt('Название сервера'); if (!name?.trim()) return;
    const s = await addServer(name.trim()); if (s) r.push('/s/' + s);
  };
  return <div className="wrap">
    <section className="hero">
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
      <span className="eyebrow">{SITE.tagline}</span>
      <h1 className="grad">{SITE.name}</h1>
      <p className="lead">Выберите свой сервер: у каждого свои правила, команды и промокоды.</p>
    </section>
    {edit && <button className="btn primary" style={{ marginTop: 24 }} onClick={add}><Plus size={16} /> Добавить сервер</button>}
    {servers.length ? <div className="servers">
      {servers.map((s, i) => (
        <div key={s.slug}>
          <Link href={'/s/' + s.slug} className="tile rise" style={{ '--i': Math.min(i, 8), '--h': HUES[i % HUES.length] } as CSSProperties}>
            <div className="tico"><Server size={26} /></div>
            <h3>{s.name}</h3><p>Правила, команды и промокоды этого сервера.</p>
            <div className="meta">Открыть<ArrowRight size={16} /></div>
          </Link>
          {edit && <div className="row" style={{ marginTop: 8 }}>
            <button className="btn sm" onClick={() => { const n = prompt('Новое название', s.name); if (n?.trim()) renameServer(s.slug, n.trim()); }}>Переименовать</button>
            <button className="btn sm" onClick={async () => { const n = prompt('Название копии', s.name + ' (копия)'); if (n?.trim()) await addServer(n.trim(), s.slug); }}>Дублировать</button>
            <button className="btn sm danger" onClick={() => { if (confirm('Удалить сервер «' + s.name + '» со всеми правилами, командами и промокодами?')) deleteServer(s.slug); }}>Удалить</button>
          </div>}
        </div>
      ))}
    </div> : <div className="empty" style={{ marginTop: 28 }}>Серверов пока нет. Войдите как администратор, включите редактирование и добавьте первый.</div>}
  </div>;
}
EOF

cat > "app/s/[slug]/page.tsx" <<'EOF'
'use client';
import Link from 'next/link';
import { CSSProperties } from 'react';
import { ScrollText, TerminalSquare, Gift, ArrowRight } from 'lucide-react';
import { useApp } from '../../../components/Provider';
import ServerGuard from '../../../components/ServerGuard';
import { isExpired } from '../../../lib/store';

function Inner() {
  const { data, slug, serverName } = useApp();
  const n = (k: 'rules' | 'commands') => data[k].reduce((s, f) => s + f.items.length, 0);
  const act = data.promos.filter(p => !isExpired(p, Date.now())).length;
  const base = '/s/' + slug;
  const tiles = [
    { href: base + '/rules', Icon: ScrollText, title: 'Правила', text: 'Правила ролевой игры, транспорта, фракций и таблица наказаний. Всё разложено по папкам.', meta: `${n('rules')} записей`, h: 172 },
    { href: base + '/commands', Icon: TerminalSquare, title: 'Команды', text: 'Игровые команды. Нажмите на команду, чтобы скопировать.', meta: `${n('commands')} команд`, h: 42 },
    { href: base + '/promo', Icon: Gift, title: 'Промокоды', text: 'Актуальные сверху, закончившиеся в архиве. У каждого видна дата.', meta: `Сейчас действует: ${act}`, h: 205 },
  ];
  return <div className="wrap">
    <section className="hero">
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
      <span className="eyebrow">Сервер</span>
      <h1 className="grad">{serverName}</h1>
      <p className="lead">Правила, команды и актуальные промокоды этого сервера.</p>
    </section>
    <div className="tiles">
      {tiles.map(({ href, Icon, title, text, meta, h }, i) => (
        <Link key={href} href={href} className="tile rise" style={{ '--i': i + 2, '--h': h } as CSSProperties}>
          <div className="tico"><Icon size={26} /></div>
          <h3>{title}</h3><p>{text}</p>
          <div className="meta">{meta}<ArrowRight size={16} /></div>
        </Link>
      ))}
    </div>
  </div>;
}
export default function Page() { return <ServerGuard><Inner /></ServerGuard>; }
EOF

cat > "app/s/[slug]/rules/page.tsx" <<'EOF'
import Section from '../../../../components/Section';
import ServerGuard from '../../../../components/ServerGuard';
export default function Page() { return <ServerGuard><Section k="rules" /></ServerGuard>; }
EOF
cat > "app/s/[slug]/commands/page.tsx" <<'EOF'
import Section from '../../../../components/Section';
import ServerGuard from '../../../../components/ServerGuard';
export default function Page() { return <ServerGuard><Section k="commands" /></ServerGuard>; }
EOF
cat > "app/s/[slug]/promo/page.tsx" <<'EOF'
import PromoPage from '../../../../components/PromoPage';
import ServerGuard from '../../../../components/ServerGuard';
export default function Page() { return <ServerGuard><PromoPage /></ServerGuard>; }
EOF

if ! grep -q "SERVERS-V1" app/globals.css; then
cat >> app/globals.css <<'EOF'

/* SERVERS-V1: сетка выбора сервера */
.servers{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;margin-top:28px}
.servers .tile:nth-child(n){grid-column:auto;grid-row:auto;display:block}
EOF
fi

echo ""
echo "Готово. Остановите сервер, затем:"
echo "  rm -rf .next && npm run dev -- --webpack"
echo "Сначала выполните SQL из чата в Supabase (SQL Editor)."
