'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { Download, Upload, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useApp } from '../../components/Provider';
import type { Data } from '../../lib/store';
function validData(v: unknown): v is Data {
  if (!v || typeof v !== 'object') return false;
  const d = v as Partial<Data>;
  return Array.isArray(d.rules) && Array.isArray(d.commands) && Array.isArray(d.promos)
    && d.rules.every(x => x && typeof x.name === 'string' && Array.isArray(x.items))
    && d.commands.every(x => x && typeof x.name === 'string' && Array.isArray(x.items))
    && d.promos.every(x => x && typeof x.code === 'string' && typeof x.reward === 'string');
}
export default function BackupPage() {
  const { data, replace, slug, serverName, remote, canEdit, say } = useApp();
  const input = useRef<HTMLInputElement>(null); const [busy, setBusy] = useState(false);
  const exportBackup = () => {
    const backup = { format: 'rp-atlas-backup', version: 1, createdAt: new Date().toISOString(), server: { slug, name: serverName }, data };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `rp-atlas-${slug || 'data'}-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); say('Резервная копия скачана');
  };
  const importBackup = (file?: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { say('Файл слишком большой (максимум 10 МБ)'); return; }
    setBusy(true); const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)); const candidate = parsed?.format === 'rp-atlas-backup' ? parsed.data : parsed;
        if (!validData(candidate)) throw new Error('invalid');
        if (!confirm('Импорт заменит правила, команды и промокоды текущего сервера. Продолжить?')) return;
        replace(candidate); say('Резервная копия восстановлена');
      } catch { say('Файл не распознан или повреждён'); }
      finally { setBusy(false); if (input.current) input.current.value = ''; }
    };
    reader.onerror = () => { setBusy(false); say('Не удалось прочитать файл'); }; reader.readAsText(file);
  };
  return <main className="wrap page" style={{ maxWidth: 820 }}>
    <div className="eyebrow"><ShieldCheck size={15} /> Надёжность и восстановление</div><h1>Резервные копии</h1>
    <p className="muted">Скачай копию данных перед крупными изменениями и храни её отдельно от устройства.</p>
    <section className="card" style={{ padding: 22, marginTop: 20 }}><h2>Текущий набор данных</h2>
      <p>Сервер: <b>{serverName || slug || 'локальные данные'}</b></p><p className="muted">Копия включает правила, команды и промокоды. Пароли и ключи Supabase в неё не входят.</p>
      <button className="btn primary" onClick={exportBackup}><Download size={16} /> Скачать резервную копию</button></section>
    <section className="card" style={{ padding: 22, marginTop: 14 }}><h2>Восстановить из файла</h2>
      <p className="muted">Импорт заменяет данные текущего сервера. Скачай свежую копию перед восстановлением.</p>
      {!canEdit && remote ? <p className="muted">Для восстановления войди в аккаунт с правами редактора.</p> : <>
        <input ref={input} type="file" accept=".json,application/json" hidden onChange={e => importBackup(e.target.files?.[0])} />
        <button className="btn" disabled={busy} onClick={() => input.current?.click()}><Upload size={16} /> {busy ? 'Читаем файл…' : 'Выбрать JSON-файл'}</button></>}
      <p className="muted" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 14 }}><AlertTriangle size={16} /> {remote ? 'Изменения сохраняются в Supabase. Убедись, что выбран правильный сервер.' : 'Локальные данные хранятся в этом браузере. Очистка данных браузера может их удалить.'}</p>
    </section><p style={{ marginTop: 18 }}><Link href="/servers">← К списку серверов</Link></p>
  </main>;
}
