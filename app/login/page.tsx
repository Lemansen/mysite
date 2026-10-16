'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../components/Provider';

const tr = (m: string) => /already registered/i.test(m) ? 'Эта почта уже зарегистрирована'
  : /invalid login/i.test(m) ? 'Неверная почта или пароль'
  : /confirm/i.test(m) ? 'Подтвердите почту по ссылке из письма'
  : /signups? not allowed|disabled/i.test(m) ? 'Регистрация сейчас закрыта' : m;

export default function Login() {
  const r = useRouter();
  const { user, ready, signOut } = useApp();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (new URLSearchParams(location.search).get('mode') === 'up') setMode('up'); }, []);

  const go = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setErr(''); setInfo('');
    if (mode === 'up') {
      if (name.trim().length < 3) { setErr('Ник: минимум 3 символа'); return; }
      if (pw.length < 8) { setErr('Пароль: минимум 8 символов'); return; }
    }
    setBusy(true);
    if (mode === 'in') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
      setBusy(false);
      if (error) { setErr(tr(error.message)); return; }
      r.push('/servers');
    } else {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: pw, options: { data: { username: name.trim() }, emailRedirectTo: window.location.origin + '/servers' } });
      setBusy(false);
      if (error) { setErr(tr(error.message)); return; }
      if (!data.session) setInfo('Мы отправили письмо. Подтвердите почту и войдите.');
      else r.push('/servers');
    }
  };

  return <div className="wrap" style={{ maxWidth: 460 }}>
    <h1>{mode === 'in' ? 'Вход' : 'Регистрация'}</h1>
    <p className="note">Аккаунт нужен, чтобы предлагать правки. Они появятся на сайте после проверки модераторами.</p>
    <div className="card" style={{ marginTop: 22 }}>
      {!supabase ? <p>Supabase не настроен: добавьте ключи в .env.local.</p>
        : ready && user ? <>
          <p style={{ marginBottom: 12 }}>Вы уже вошли как {user.email}</p>
          <div className="row"><Link className="btn primary" href="/account">Мой аккаунт</Link><button className="btn" onClick={signOut}>Выйти</button></div>
        </> : <>
          <div className="row" style={{ marginBottom: 12 }}>
            <button className={'btn sm' + (mode === 'in' ? ' on' : '')} onClick={() => { setMode('in'); setErr(''); }}>Вход</button>
            <button className={'btn sm' + (mode === 'up' ? ' on' : '')} onClick={() => { setMode('up'); setErr(''); }}>Регистрация</button>
          </div>
          <form onSubmit={go}>
            {mode === 'up' && <input className="field" placeholder="Ник" autoComplete="nickname" maxLength={24} value={name} onChange={e => setName(e.target.value)} required />}
            <input className="field" type="email" autoComplete="username" placeholder="Почта" value={email} onChange={e => setEmail(e.target.value)} required />
            <input className="field" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} placeholder="Пароль" value={pw} onChange={e => setPw(e.target.value)} required />
            {err && <p className="note" style={{ color: '#ff7285', marginBottom: 10 }}>{err}</p>}
            {info && <p className="note" style={{ color: 'var(--ok)', marginBottom: 10 }}>{info}</p>}
            <button className="btn primary" style={{ width: '100%' }} disabled={busy}>{busy ? 'Подождите…' : mode === 'in' ? 'Войти' : 'Создать аккаунт'}</button>
          </form>
        </>}
    </div>
  </div>;
}
