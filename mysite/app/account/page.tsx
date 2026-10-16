'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../components/Provider';
import Skeleton from '../../components/Skeleton';
import HomePref from '../../components/HomePref';
import { roleName } from '../../lib/roles';

const ST: Record<string, string> = { pending: 'На проверке', approved: 'Принято', rejected: 'Отклонено', spam: 'Отмечено как спам' };
const KIND: Record<string, string> = { add_item: 'Новая запись', edit_item: 'Правка записи', add_promo: 'Промокод' };
const EMOJI = ['😎', '🦊', '🐺', '🚗', '🔧', '⭐', '🎮', '🧢', '🔥', '🛡️'];
const HUES = [172, 42, 205, 280, 12, 140, 330, 60];
const fd = (s?: string | null) => s ? new Date(s).toLocaleString('ru-RU') : '';
const bg = (h: number) => 'linear-gradient(135deg, hsl(' + h + ' 70% 55%), hsl(' + ((h + 40) % 360) + ' 75% 60%))';

export default function Account() {
  const { ready, user, profile, banned, refreshProfile, say, signOut } = useApp();
  const [list, setList] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [nick, setNick] = useState('');
  const [bio, setBio] = useState('');
  const [hue, setHue] = useState(172);
  const [emo, setEmo] = useState('');
  const [pw, setPw] = useState('');

  useEffect(() => {
    if (!profile) return;
    setNick(profile.username); setBio(profile.bio ?? ''); setHue(profile.avatar_hue ?? 172); setEmo(profile.avatar_emoji ?? '');
  }, [profile]);
  useEffect(() => {
    if (!supabase || !user) return;
    supabase.from('suggestions').select('id,kind,payload,status,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => setList(data ?? []));
  }, [user]);

  if (!ready) return <Skeleton />;
  if (!supabase || !user || !profile) return <div className="wrap"><h1>Аккаунт</h1><p className="note">Войдите, чтобы увидеть аккаунт.</p><p style={{ marginTop: 16 }}><Link className="btn primary" href="/login">Войти</Link></p></div>;

  const canAppeal = profile.ban_permanent && profile.appeal_status === 'none' && !!profile.appeal_deadline && new Date(profile.appeal_deadline) > new Date();
  const appeal = async () => {
    setBusy(true);
    const { error } = await supabase!.rpc('submit_appeal', { msg });
    setBusy(false);
    if (error) { say(error.message); return; }
    say('Апелляция отправлена'); refreshProfile();
  };
  const save = async () => {
    setBusy(true);
    const { error } = await supabase!.rpc('update_profile', { new_username: nick, new_bio: bio, new_hue: hue, new_emoji: emo, new_home: profile.home_pref ?? 'welcome' });
    setBusy(false);
    if (error) { say(error.message); return; }
    say('Профиль сохранён'); refreshProfile();
  };
  const changePw = async () => {
    if (pw.length < 8) { say('Пароль: минимум 8 символов'); return; }
    const { error } = await supabase!.auth.updateUser({ password: pw });
    if (error) say(error.message); else { say('Пароль изменён'); setPw(''); }
  };

  return <div className="wrap" style={{ maxWidth: 760 }}>
    <h1>{profile.username}</h1>
    <p className="note">{user.email} · {roleName(profile.role)}</p>
    {profile.public_id && <p className="note"><Link href={'/id/' + profile.public_id + '/' + encodeURIComponent(profile.username)} style={{ color: 'var(--accent)' }}>Мой публичный профиль</Link> · ID {profile.public_id}</p>}

    {banned && <div className="card" style={{ marginTop: 22, borderColor: '#ff5470' }}>
      <h3>Ваш аккаунт заблокирован</h3>
      <p>{profile.ban_permanent ? 'Блокировка бессрочная.' : `Блокировка действует до ${fd(profile.banned_until)}.`}</p>
      {profile.ban_reason && <p className="note">Причина: {profile.ban_reason}</p>}
      {profile.ban_permanent && <div style={{ marginTop: 12 }}>
        {canAppeal && <>
          <p className="note" style={{ marginTop: 0 }}>Вы можете подать апелляцию до {fd(profile.appeal_deadline)}. Одну. Если вас разбанят и нарушение повторится, аккаунт будет удалён полностью.</p>
          <textarea className="field" placeholder="Объясните, почему блокировку стоит снять (10–1000 символов)" value={msg} onChange={e => setMsg(e.target.value)} />
          <button className="btn primary" onClick={appeal} disabled={busy}>Отправить апелляцию</button>
        </>}
        {profile.appeal_status === 'pending' && <p className="note">Апелляция на рассмотрении у модераторов.</p>}
        {profile.appeal_status === 'rejected' && <p className="note">Апелляция отклонена. Блокировка остаётся.</p>}
        {profile.appeal_status === 'none' && !canAppeal && <p className="note">Время на апелляцию истекло.</p>}
      </div>}
    </div>}
    {!banned && profile.second_chance && <p className="note" style={{ marginTop: 16 }}>Ваш аккаунт разблокирован по апелляции. При повторном нарушении он будет удалён полностью.</p>}

    <h2>Редактор профиля</h2>
    <div className="card">
      <div className="row" style={{ gap: 16, alignItems: 'center', marginBottom: 14 }}>
        <div className="avatar" style={{ background: bg(hue) }}>{emo || nick.slice(0, 1).toUpperCase()}</div>
        <div className="note" style={{ margin: 0 }}>Так вас увидят другие в публичном профиле.</div>
      </div>
      <label className="note" style={{ display: 'block', marginTop: 0 }}>Ник (3–24 символа, менять можно раз в 7 дней)
        <input className="field" style={{ marginTop: 6 }} value={nick} maxLength={24} onChange={e => setNick(e.target.value)} />
      </label>
      <label className="note" style={{ display: 'block', marginTop: 0 }}>О себе
        <textarea className="field" style={{ marginTop: 6 }} value={bio} maxLength={200} placeholder="Коротко о себе (до 200 символов)" onChange={e => setBio(e.target.value)} />
      </label>
      <div className="note" style={{ marginTop: 0 }}>Цвет аватара</div>
      <div className="row" style={{ marginBottom: 12 }}>
        {HUES.map(h => <button key={h} className="swatch" aria-label={'Цвет ' + h} onClick={() => setHue(h)} style={{ background: bg(h), outline: hue === h ? '2px solid var(--text)' : 'none' }} />)}
      </div>
      <div className="note" style={{ marginTop: 0 }}>Эмодзи на аватаре</div>
      <div className="row" style={{ marginBottom: 14 }}>
        <button className={'btn sm' + (emo === '' ? ' on' : '')} onClick={() => setEmo('')}>Буква</button>
        {EMOJI.map(e => <button key={e} className={'btn sm' + (emo === e ? ' on' : '')} onClick={() => setEmo(e)}>{e}</button>)}
      </div>
      <button className="btn primary" onClick={save} disabled={busy}>Сохранить профиль</button>
    </div>

    <h2>Настройки</h2>
    <div className="card"><HomePref /></div>

    <h2>Пароль</h2>
    <div className="card">
      <input className="field" type="password" autoComplete="new-password" placeholder="Новый пароль (минимум 8 символов)" value={pw} onChange={e => setPw(e.target.value)} />
      <button className="btn" onClick={changePw}>Сменить пароль</button>
    </div>

    <h2>Мои предложения</h2>
    {list.length ? list.map(s => <div className="card" key={s.id}>
      <div className="kv">{KIND[s.kind]} · {fd(s.created_at)}</div>
      <h3>{s.payload.t ?? s.payload.code}</h3>
      <p>{ST[s.status]}</p>
    </div>) : <div className="empty">Вы пока ничего не предлагали. Откройте любой сервер и нажмите «Предложить правку».</div>}
    <p style={{ marginTop: 20 }}><button className="btn" onClick={signOut}>Выйти</button></p>
  </div>;
}
