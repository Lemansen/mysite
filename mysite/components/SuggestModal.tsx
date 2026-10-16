'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquarePlus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from './Provider';
import { addDays } from '../lib/store';

type Kind = 'add_item' | 'edit_item' | 'add_promo';

export default function SuggestModal() {
  const { ready, slug, remote, isStaff, user, banned, data, say } = useApp();
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>('add_item');
  const [sec, setSec] = useState<'rules' | 'commands'>('rules');
  const [fid, setFid] = useState('');
  const [iid, setIid] = useState('');
  const [t, setT] = useState(''); const [b, setB] = useState('');
  const [code, setCode] = useState(''); const [reward, setReward] = useState(''); const [until, setUntil] = useState(addDays(7));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  if (!ready || !slug || !remote || isStaff) return null;

  const folders = data[sec];
  const folder = folders.find(f => f.id === fid) ?? folders[0];
  const item = folder?.items.find(i => i.id === iid);
  const reset = () => { setT(''); setB(''); setIid(''); };

  const start = () => {
    if (!user) { r.push('/login'); return; }
    if (banned) { say('Вы заблокированы: отправка правок недоступна'); return; }
    setErr(''); setOpen(true);
  };
  const pick = (id: string) => { setIid(id); const it = folder?.items.find(i => i.id === id); setT(it?.t ?? ''); setB(it?.b ?? ''); };

  const send = async () => {
    let payload: any;
    if (kind === 'add_promo') {
      if (!code.trim() || code.length > 40 || reward.length > 300) { setErr('Укажите код (до 40 символов) и описание (до 300)'); return; }
      payload = { code: code.trim(), reward: reward.trim(), until };
    } else {
      if (!folder) { setErr('Выберите папку'); return; }
      if (!t.trim() || t.length > 120 || b.length > 1500) { setErr('Заголовок обязателен (до 120 символов), текст до 1500'); return; }
      if (kind === 'edit_item' && !item) { setErr('Выберите запись, которую хотите изменить'); return; }
      payload = { section: sec, folder_id: folder.id, folder_name: folder.name, t: t.trim(), b: b.trim(),
        ...(kind === 'edit_item' ? { item_id: item!.id, old_t: item!.t.slice(0, 120), old_b: item!.b.slice(0, 600) } : {}) };
    }
    setBusy(true); setErr('');
    const { error } = await supabase!.from('suggestions').insert({ server_slug: slug, user_id: user!.id, kind, payload });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    say('Отправлено на проверку модераторам'); setOpen(false); reset(); setCode(''); setReward('');
  };

  return <>
    <button className="btn primary fab" onClick={start}><MessageSquarePlus size={18} /> Предложить правку</button>
    {open && <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="card modal">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Предложить правку</h3>
          <button className="btn icon" onClick={() => setOpen(false)} aria-label="Закрыть"><X size={16} /></button>
        </div>
        <p className="note" style={{ marginTop: 0, marginBottom: 12 }}>Правка появится на сайте после проверки модератором. Спам и мусор ведут к блокировке.</p>
        <select className="field" value={kind} onChange={e => { setKind(e.target.value as Kind); reset(); }}>
          <option value="add_item">Добавить запись</option>
          <option value="edit_item">Изменить существующую запись</option>
          <option value="add_promo">Добавить промокод</option>
        </select>
        {kind !== 'add_promo' ? <>
          <select className="field" value={sec} onChange={e => { setSec(e.target.value as 'rules' | 'commands'); setFid(''); reset(); }}>
            <option value="rules">Правила</option><option value="commands">Команды</option>
          </select>
          <select className="field" value={folder?.id ?? ''} onChange={e => { setFid(e.target.value); reset(); }}>
            {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          {kind === 'edit_item' && <select className="field" value={iid} onChange={e => pick(e.target.value)}>
            <option value="">Выберите запись…</option>
            {folder?.items.map(i => <option key={i.id} value={i.id}>{i.t}</option>)}
          </select>}
          <input className="field" placeholder={sec === 'commands' ? 'Команда' : 'Заголовок'} value={t} onChange={e => setT(e.target.value)} />
          <textarea className="field" placeholder="Описание" value={b} onChange={e => setB(e.target.value)} />
        </> : <>
          <input className="field" placeholder="Промокод" value={code} onChange={e => setCode(e.target.value)} />
          <textarea className="field" placeholder="Что даёт промокод" value={reward} onChange={e => setReward(e.target.value)} />
          <label className="note" style={{ display: 'block', marginTop: 0 }}>Действует до <input className="field" type="date" value={until} onChange={e => setUntil(e.target.value)} /></label>
        </>}
        {err && <p className="note" style={{ color: '#ff7285', marginBottom: 10 }}>{err}</p>}
        <button className="btn primary" style={{ width: '100%' }} onClick={send} disabled={busy}>{busy ? 'Отправляем…' : 'Отправить на проверку'}</button>
      </div>
    </div>}
  </>;
}
