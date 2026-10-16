'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { Data, KEY, seed } from '../lib/store';
import { supabase } from '../lib/supabase';
import { SITE } from '../lib/config';
import { setFavsUser } from '../lib/favs';

type Status = 'idle' | 'saving' | 'saved' | 'error';
export type Profile = { id: string; username: string; public_id?: number; home_pref?: 'welcome' | 'servers' | 'last'; bio?: string | null; avatar_hue?: number; avatar_emoji?: string | null; username_changed_at?: string | null; role: 'user' | 'helper' | 'moderator' | 'admin'; banned_until: string | null; ban_permanent: boolean; ban_reason: string | null; appeal_deadline: string | null; appeal_status: 'none' | 'pending' | 'approved' | 'rejected'; appeal_text: string | null; second_chance: boolean; created_at: string };
export type ServerInfo = { slug: string; name: string };
type Ctx = {
  profile: Profile | null; authReady: boolean; isHelper: boolean; isStaff: boolean; isAdmin: boolean; banned: boolean; refreshProfile: () => Promise<void>;
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
  const [authReady, setAuthReady] = useState(!supabase);
  const [profile, setProfile] = useState<Profile | null>(null);
  const refreshProfile = useCallback(async () => {
    if (!supabase || !user) { setProfile(null); return; }
    const { data: p, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) { setAuthReady(true); return; }
    if (!p) { setProfile(null); setAuthReady(true); await supabase.auth.signOut(); return; }
    setProfile(p as Profile); setAuthReady(true);
  }, [user]);
  useEffect(() => { refreshProfile(); }, [refreshProfile]);
  useEffect(() => { void setFavsUser(user?.id ?? null); }, [user?.id]);
  const isStaff = profile?.role === 'moderator' || profile?.role === 'admin';
  const isAdmin = profile?.role === 'admin';
  const isHelper = isStaff || profile?.role === 'helper';
  const banned = !!profile && (profile.ban_permanent || (!!profile.banned_until && new Date(profile.banned_until) > new Date()));
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
    supabase?.auth.getSession().then(({ data: s }) => { setUser(s.session?.user ?? null); if (!s.session) setAuthReady(true); });
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

  const canEdit = supabase ? isStaff : true;
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

  return <C.Provider value={{ profile, authReady, isHelper, isStaff, isAdmin, banned, refreshProfile, data, ready, notFound, edit, canEdit, user, remote: !!supabase, status, toast, theme, servers, slug, serverName, setEdit, toggleTheme, update, replace, say, copy, signOut, addServer, renameServer, deleteServer }}>
    {children}
    <div className={'toast' + (toast ? ' show' : '')}>{toast}</div>
  </C.Provider>;
}
