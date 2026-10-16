'use client';
import Link from 'next/link';
import { CSSProperties } from 'react';
import { ScrollText, TerminalSquare, Gift, ArrowRight } from 'lucide-react';
import { useApp } from '../../../components/Provider';
import ServerGuard from '../../../components/ServerGuard';
import QuickAccess from '../../../components/QuickAccess';
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
    {slug && <QuickAccess server={slug} />}
  </div>;
}
export default function Page() { return <ServerGuard><Inner /></ServerGuard>; }
