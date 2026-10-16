'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { useApp } from '../../../components/Provider';
import Skeleton from '../../../components/Skeleton';
import { roleName, levelOf, nextLevel, ROLE_BADGE } from '../../../lib/roles';

type P = { public_id: number; username: string; role: string; created_at: string; approved_count: number; bio?: string | null; avatar_hue?: number; avatar_emoji?: string | null };

export default function PublicProfile() {
  const params = useParams<{ parts: string[] }>();
  const r = useRouter();
  const { profile } = useApp();
  const [p, setP] = useState<P | null | undefined>(undefined);
  const key = (params.parts ?? []).join('/');

  useEffect(() => {
    if (!supabase) { setP(null); return; }
    const parts = key.split('/').map(decodeURIComponent);
    const first = parts[0] ?? '';
    const byId = /^\d+$/.test(first);
    const q = supabase.from('public_profiles').select('*');
    (byId ? q.eq('public_id', Number(first)) : q.eq('username', first)).maybeSingle().then(({ data }) => {
      setP((data as P) ?? null);
      if (data && (!byId || parts[1] !== (data as P).username))
        r.replace('/id/' + (data as P).public_id + '/' + encodeURIComponent((data as P).username));
    });
  }, [key, r]);

  if (p === undefined) return <Skeleton />;
  if (!p) return <div className="wrap"><h1>Профиль не найден</h1><p className="note">Такого пользователя нет или аккаунт удалён.</p><p style={{ marginTop: 16 }}><Link className="btn" href="/">На главную</Link></p></div>;

  const n = p.approved_count;
  const lvl = levelOf(n), nxt = nextLevel(n);
  const pct = nxt ? Math.max(4, ((n - lvl.min) / (nxt.min - lvl.min)) * 100) : 100;
  const mine = profile?.username === p.username;

  return <div className="wrap" style={{ maxWidth: 640 }}>
    <div className="row" style={{ gap: 18, alignItems: 'center' }}>
      <div className="avatar" style={{ background: 'linear-gradient(135deg, hsl(' + (p.avatar_hue ?? 172) + ' 70% 55%), hsl(' + (((p.avatar_hue ?? 172) + 40) % 360) + ' 75% 60%))' }}>{p.avatar_emoji || p.username.slice(0, 1).toUpperCase()}</div>
      <div>
        <h1>{p.username}</h1>
        <div style={{ marginTop: 6 }}>
          <span className={'badge ' + (ROLE_BADGE[p.role] ?? 'b-lvl')} style={{ marginLeft: 0 }}>{roleName(p.role, n)}</span>
          <span className="note" style={{ marginLeft: 10 }}>ID {p.public_id}</span>
        </div>
      </div>
    </div>

    <div className="card" style={{ marginTop: 26 }}>
      {p.bio && <p style={{ marginBottom: 12 }}>{p.bio}</p>}
      <div className="kv">Зарегистрирован: {new Date(p.created_at).toLocaleDateString('ru-RU')}</div>
      <div className="kv">Принято правок: {n}</div>
      {p.role === 'user' && <div style={{ marginTop: 14 }}>
        <div className="bar"><i className="ok" style={{ width: pct + '%' }} /></div>
        <div className="kv" style={{ marginTop: 6 }}>{nxt ? `До уровня «${nxt.name}» осталось ${nxt.min - n}` : 'Достигнут высший уровень'}</div>
      </div>}
    </div>
    {mine && <p style={{ marginTop: 16 }}><Link className="btn" href="/account">Мой аккаунт</Link></p>}
  </div>;
}
