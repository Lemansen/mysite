'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { useApp, Profile } from '../../components/Provider';
import Skeleton from '../../components/Skeleton';
import { Data, uid, iso } from '../../lib/store';
import { roleName, ROLE_BADGE } from '../../lib/roles';

type Sug = { id: string; server_slug: string; user_id: string; kind: string; payload: any; created_at: string; flagged?: boolean; flag_note?: string | null; flagged_by?: string | null };
type Rep = { id: string; target_user: string; reporter: string | null; note: string; created_at: string };
const KIND: Record<string, string> = { add_item: 'Новая запись', edit_item: 'Правка записи', add_promo: 'Промокод' };
const fd = (s?: string | null) => s ? new Date(s).toLocaleString('ru-RU') : '';
const banText = (p: Profile) => p.ban_permanent ? 'Бан навсегда' : p.banned_until && new Date(p.banned_until) > new Date() ? 'Бан до ' + fd(p.banned_until) : '';

export default function Moderation() {
  const { ready, isHelper, isStaff, isAdmin, user, say, servers } = useApp();
  const [tab, setTab] = useState<'sug' | 'app' | 'rep' | 'users'>('sug');
  const [sugs, setSugs] = useState<Sug[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);
  const [profs, setProfs] = useState<Profile[]>([]);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    if (!supabase) return;
    const a = await supabase.from('suggestions').select('*').eq('status', 'pending').order('created_at');
    // Helpers receive only the safe directory fields; staff may load moderation-only profile data.
    const b = isStaff
      ? await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(300)
      : await supabase.from('helper_profiles').select('*').order('created_at', { ascending: false }).limit(300);
    const c = await supabase.from('staff_reports').select('*').eq('resolved', false).order('created_at');
    setSugs((a.data ?? []) as Sug[]); setProfs((b.data ?? []) as Profile[]); setReps((c.data ?? []) as Rep[]);
  }, [isStaff]);
  useEffect(() => { if (isHelper) load(); }, [isHelper, load]);

  if (!ready) return <Skeleton />;
  if (!supabase || !isHelper) return <div className="wrap"><h1>Нет доступа</h1><p className="note">Раздел только для персонала.</p></div>;

  const name = (id?: string | null) => profs.find(p => p.id === id)?.username ?? (id ? id.slice(0, 6) : '—');
  const srv = (s: string) => servers.find(x => x.slug === s)?.name ?? s;
  const appeals = profs.filter(p => p.appeal_status === 'pending');

  const rpc = async (fn: string, args: any, ok: string) => {
    const { error } = await supabase!.rpc(fn, args);
    if (error) say('Ошибка: ' + error.message); else { say(ok); load(); }
  };
  const ask = (text: string) => { const n = prompt(text); if (n === null) return null; if (n.trim().length < 3) { say('Опишите подробнее'); return null; } return n.trim(); };

  const apply = async (s: Sug) => {
    const { data: row, error } = await supabase!.from('servers').select('data').eq('slug', s.server_slug).maybeSingle();
    if (error || !row) throw new Error('Сервер не найден');
    const d = structuredClone(row.data) as Data, p = s.payload;
    if (s.kind === 'add_promo') d.promos.push({ id: uid(), code: p.code, reward: p.reward, added: iso(new Date()), until: p.until || '' });
    else {
      const f = d[p.section as 'rules' | 'commands']?.find(x => x.id === p.folder_id);
      if (!f) throw new Error('Папка не найдена (возможно, удалена)');
      if (s.kind === 'add_item') f.items.push({ id: uid(), t: p.t, b: p.b });
      else { const it = f.items.find(i => i.id === p.item_id); if (!it) throw new Error('Запись не найдена (возможно, удалена)'); it.t = p.t; it.b = p.b; }
    }
    const { error: e2 } = await supabase!.from('servers').update({ data: d, updated_at: new Date().toISOString() }).eq('slug', s.server_slug);
    if (e2) throw e2;
  };
  const decide = async (s: Sug, status: 'approved' | 'rejected') => {
    try {
      if (status === 'approved') await apply(s);
      const { error } = await supabase!.from('suggestions').update({ status, reviewed_by: user!.id, reviewed_at: new Date().toISOString() }).eq('id', s.id);
      if (error) throw error;
      say(status === 'approved' ? 'Принято и добавлено на сайт' : 'Отклонено'); load();
    } catch (e: any) { say('Ошибка: ' + (e.message || e)); }
  };
  const banFlow = async (target: string) => {
    const h = prompt('На сколько часов бан? Введите число. 0 = навсегда (с правом на апелляцию)', '24'); if (h === null) return;
    const hours = parseFloat(h.replace(',', '.')); if (isNaN(hours) || hours < 0) { say('Введите число'); return; }
    const reason = prompt('Причина бана (её увидит пользователь)', ''); if (reason === null) return;
    let days = 7;
    if (hours === 0) { const a = prompt('Сколько дней даётся на апелляцию?', '7'); if (a === null) return; days = Math.max(1, parseInt(a) || 7); }
    const { data, error } = await supabase!.rpc('ban_user', { target, minutes: Math.round(hours * 60), permanent: hours === 0, reason, appeal_days: days });
    if (error) { say('Ошибка: ' + error.message); return; }
    say(data === 'wiped' ? 'Повторное нарушение: аккаунт удалён полностью' : data === 'banned_permanent' ? 'Бан навсегда, время на апелляцию задано' : 'Бан выдан'); load();
  };
  const resolveReport = async (id: string) => {
    const { error } = await supabase!.from('staff_reports').update({ resolved: true }).eq('id', id);
    if (error) say('Ошибка: ' + error.message); else { say('Жалоба закрыта'); load(); }
  };

  const users = profs.filter(p => p.username.toLowerCase().includes(q.trim().toLowerCase()));
  const tabBtn = (k: typeof tab, label: string) => <button className={'btn' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{label}</button>;

  return <div className="wrap">
    <h1>Модерация</h1>
    <p className="note">Ваша роль: {roleName(roleOf(profs, user?.id))}</p>
    <div className="tabs">
      {tabBtn('sug', `Предложения (${sugs.length})`)}
      {isStaff && tabBtn('app', `Апелляции (${appeals.length})`)}
      {isStaff && tabBtn('rep', `Жалобы (${reps.length})`)}
      {tabBtn('users', 'Пользователи')}
    </div>

    {tab === 'sug' && (sugs.length ? sugs.map(s => { const p = s.payload; return <div className="card" key={s.id}>
      <div className="kv">{KIND[s.kind]} · {srv(s.server_slug)} · от {name(s.user_id)} · {fd(s.created_at)}</div>
      {s.flagged && <div className="kv" style={{ color: 'var(--warn)' }}>Жалоба от {name(s.flagged_by)}: {s.flag_note}</div>}
      {s.kind === 'add_promo' ? <><div className="code" style={{ fontSize: 18 }}>{p.code}</div><p>{p.reward}</p><div className="kv">До: {p.until || 'без срока'}</div></> : <>
        <div className="kv">{p.section === 'rules' ? 'Правила' : 'Команды'} / {p.folder_name}</div>
        {s.kind === 'edit_item' && <div className="diff"><div className="kv">Было:</div><p>{p.old_t}{'\n'}{p.old_b}</p></div>}
        <div className="kv">{s.kind === 'edit_item' ? 'Стало:' : 'Предлагается:'}</div><h3>{p.t}</h3><p>{p.b}</p></>}
      <div className="row" style={{ marginTop: 10 }}>
        {isStaff ? <>
          <button className="btn sm primary" onClick={() => decide(s, 'approved')}>Принять</button>
          <button className="btn sm" onClick={() => decide(s, 'rejected')}>Отклонить</button>
          <button className="btn sm danger" onClick={() => banFlow(s.user_id)}>Спам: бан автора</button>
        </> : <button className="btn sm danger" onClick={() => { const n = ask('Что не так с этим предложением? Кратко для модераторов'); if (n) rpc('flag_suggestion', { sid: s.id, note: n }, 'Модераторы уведомлены'); }}>Сообщить модераторам</button>}
      </div></div>; }) : <div className="empty">Новых предложений нет.</div>)}

    {tab === 'app' && isStaff && (appeals.length ? appeals.map(p => <div className="card" key={p.id}>
      <h3>{p.username}</h3>
      <div className="kv">Причина бана: {p.ban_reason || 'не указана'} · срок апелляции до {fd(p.appeal_deadline)}</div>
      <p style={{ marginTop: 8 }}>{p.appeal_text}</p>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn sm primary" onClick={() => rpc('resolve_appeal', { target: p.id, approve: true }, 'Разбанен. При новом нарушении аккаунт будет удалён')}>Разбанить</button>
        <button className="btn sm danger" onClick={() => rpc('resolve_appeal', { target: p.id, approve: false }, 'Апелляция отклонена')}>Отклонить</button>
      </div></div>) : <div className="empty">Апелляций на рассмотрении нет.</div>)}

    {tab === 'rep' && isStaff && (reps.length ? reps.map(r => <div className="card" key={r.id}>
      <div className="kv">Жалоба от {name(r.reporter)} · {fd(r.created_at)}</div>
      <h3>На пользователя: {name(r.target_user)}</h3>
      <p>{r.note}</p>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn sm danger" onClick={() => banFlow(r.target_user)}>Бан</button>
        <button className="btn sm" onClick={() => resolveReport(r.id)}>Закрыть жалобу</button>
      </div></div>) : <div className="empty">Жалоб нет.</div>)}

    {tab === 'users' && <>
      <input className="search" placeholder="Поиск по нику" value={q} onChange={e => setQ(e.target.value)} />
      {users.map(p => <div className="card" key={p.id}>
        <h3>{p.public_id ? <Link href={'/id/' + p.public_id + '/' + encodeURIComponent(p.username)}>{p.username}</Link> : p.username}{' '}
          {p.role !== 'user' && <span className={'badge ' + ROLE_BADGE[p.role]}>{roleName(p.role)}</span>}{' '}
          {banText(p) && <span className="badge b-ban">{banText(p)}</span>}</h3>
        <div className="kv">ID {p.public_id ?? '—'} · регистрация: {fd(p.created_at)}{p.second_chance ? ' · разбанен по апелляции (повтор = удаление)' : ''}</div>
        {p.ban_reason && banText(p) && <div className="kv">Причина: {p.ban_reason}</div>}
        {p.id !== user!.id && p.role !== 'admin' && <div className="row" style={{ marginTop: 8 }}>
          {p.role === 'user' && !isStaff && <button className="btn sm danger" onClick={() => { const n = ask('Опишите жалобу на пользователя'); if (n) rpc('report_user', { target: p.id, note: n }, 'Жалоба отправлена модераторам'); }}>Сообщить модераторам</button>}
          {isStaff && p.role !== 'moderator' && <button className="btn sm danger" onClick={() => banFlow(p.id)}>Бан</button>}
          {isStaff && banText(p) && <button className="btn sm" onClick={() => rpc('unban_user', { target: p.id }, 'Бан снят')}>Снять бан</button>}
          {isAdmin && <select className="field" style={{ width: 'auto', margin: 0 }} value={p.role} onChange={e => rpc('set_role', { target: p.id, new_role: e.target.value }, 'Роль изменена')}>
            <option value="user">Игрок</option><option value="helper">Хелпер</option><option value="moderator">Модератор</option>
          </select>}
        </div>}
      </div>)}
    </>}
  </div>;
}

function roleOf(profs: Profile[], id?: string) { return profs.find(p => p.id === id)?.role ?? 'user'; }
