'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CSSProperties } from 'react';
import { Server, ArrowRight, Plus } from 'lucide-react';
import { useApp } from '../../components/Provider';
import Skeleton from '../../components/Skeleton';
import { SITE } from '../../lib/config';

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
