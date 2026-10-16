'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from './Provider';

type Home = 'welcome' | 'servers' | 'last';

export default function HomePref() {
  const { profile, user, refreshProfile, say } = useApp();
  const [v, setV] = useState<Home>('welcome');
  useEffect(() => {
    setV((profile?.home_pref ?? (localStorage.getItem('br_home') as Home | null) ?? 'welcome') as Home);
  }, [profile?.home_pref]);

  const change = async (x: Home) => {
    setV(x); localStorage.setItem('br_home', x);
    if (supabase && user && profile) {
      const { error } = await supabase.rpc('update_profile', {
        new_username: profile.username, new_bio: profile.bio ?? '', new_hue: profile.avatar_hue ?? 172,
        new_emoji: profile.avatar_emoji ?? '', new_home: x,
      });
      if (error) { say(error.message); return; }
      refreshProfile();
    }
    say('Сохранено');
  };

  return <label className="note" style={{ display: 'block', marginTop: 0 }}>
    Когда я открываю сайт по обычной ссылке
    <select className="field" style={{ marginTop: 6 }} value={v} onChange={e => change(e.target.value as Home)}>
      <option value="welcome">Показывать стартовую страницу</option>
      <option value="servers">Сразу открывать выбор сервера</option>
      <option value="last">Открывать последний сервер</option>
    </select>
  </label>;
}
