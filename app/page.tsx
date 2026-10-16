'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ScrollText, TerminalSquare, Gift, UserPlus, LogIn, ArrowRight, ShieldCheck, Users } from 'lucide-react';
import { useApp } from '../components/Provider';
import HomePref from '../components/HomePref';
import QuickAccess from '../components/QuickAccess';
import Skeleton from '../components/Skeleton';
import { SITE } from '../lib/config';
import { LEVELS } from '../lib/roles';

export default function Landing() {
  const r = useRouter();
  const { ready, authReady, user, profile, servers, remote } = useApp();
  const [go, setGo] = useState(false);

  // Вход по обычной ссылке: при выбранной настройке сразу открываем сервер или список серверов
  useEffect(() => {
    if (!ready || !authReady) return;
    if (sessionStorage.getItem('br_entry') !== '/' || sessionStorage.getItem('br_done')) return;
    sessionStorage.setItem('br_done', '1');
    const pref = profile?.home_pref ?? localStorage.getItem('br_home') ?? 'welcome';
    if (pref === 'servers') { setGo(true); r.replace('/servers'); }
    else if (pref === 'last') { setGo(true); const s = localStorage.getItem('br_last_server'); r.replace(s ? '/s/' + s : '/servers'); }
  }, [ready, authReady, profile, r]);

  if (go || !ready || !authReady) return <Skeleton />;

  const features = [
    { Icon: ScrollText, t: 'Правила', d: 'Что можно и нельзя на вашем сервере, и какое за это наказание. Всё по папкам, с поиском.' },
    { Icon: TerminalSquare, t: 'Команды', d: 'Игровые команды с описанием. Нажмите на команду, чтобы скопировать её.' },
    { Icon: Gift, t: 'Промокоды', d: 'Действующие коды сверху, закончившиеся в архиве. У каждого видно, до какого числа он работает.' },
  ];
  const levels = [...LEVELS].reverse();

  return <div className="wrap">
    <section className="hero">
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
      <span className="eyebrow">{SITE.tagline}</span>
      <h1 className="grad">{user && profile ? 'Привет, ' + profile.username : SITE.name}</h1>
      <p className="lead">Правила, команды и актуальные промокоды вашего RP-сервера в одном месте. У каждого сервера своя страница, всё проверяется модераторами.</p>
      <div className="cta">
        {user ? <>
          <Link className="btn primary" href="/servers">Выбрать сервер <ArrowRight size={18} /></Link>
          <Link className="btn" href="/account">Мой профиль</Link>
        </> : <>
          {remote && <Link className="btn primary" href="/login?mode=up"><UserPlus size={18} /> Создать аккаунт</Link>}
          {remote && <Link className="btn" href="/login"><LogIn size={18} /> Войти</Link>}
          <Link className="btn" href="/servers">Смотреть правила и команды <ArrowRight size={18} /></Link>
        </>}
      </div>
      {!user && remote && <p className="note">Читать можно без регистрации. Аккаунт нужен, только чтобы предлагать правки и получать уровни.</p>}
    </section>

    <QuickAccess />

    <div className="stats">
      <div className="stat"><b>{servers.length}</b><span className="note">{servers.length === 1 ? 'сервер' : 'серверов'} в справочнике</span></div>
      <div className="stat"><b>3</b><span className="note">раздела у каждого сервера</span></div>
      <div className="stat"><b>100%</b><span className="note">правок проходят проверку</span></div>
    </div>

    <section className="sec">
      <h2>Что здесь есть</h2>
      <div className="grid3">
        {features.map(({ Icon, t, d }) => <Link key={t} href="/servers" className="card">
          <div className="tico" style={{ ['--h' as any]: 172 }}><Icon size={24} /></div>
          <h3>{t}</h3><p>{d}</p>
        </Link>)}
      </div>
    </section>

    <section className="sec">
      <h2>Как это работает</h2>
      <div className="steps">
        <div className="step"><i>1</i><div><h3>Выберите сервер</h3><p className="note" style={{ marginTop: 2 }}>У каждого сервера свои правила, команды и промокоды.</p></div></div>
        <div className="step"><i>2</i><div><h3>Читайте и копируйте</h3><p className="note" style={{ marginTop: 2 }}>Ищите нужное, копируйте команды и промокоды одним нажатием.</p></div></div>
        <div className="step"><i>3</i><div><h3>Предлагайте правки</h3><p className="note" style={{ marginTop: 2 }}>Нашли ошибку или знаете новый промокод? Зарегистрируйтесь и отправьте правку: модератор её проверит и опубликует.</p></div></div>
      </div>
    </section>

    <section className="sec">
      <h2>Роли и уровни</h2>
      <div className="grid2">
        <div className="card">
          <h3><Users size={18} style={{ verticalAlign: '-3px' }} /> Игроки</h3>
          <p className="note" style={{ marginTop: 4 }}>Уровень растёт от числа принятых правок:</p>
          <p style={{ marginTop: 8 }}>{levels.map(l => l.name + (l.min ? ' (' + l.min + '+)' : '')).join(' → ')}</p>
        </div>
        <div className="card">
          <h3><ShieldCheck size={18} style={{ verticalAlign: '-3px' }} /> Команда сайта</h3>
          <p style={{ marginTop: 8 }}><b>Хелпер</b>: замечает нарушения и сообщает модераторам.</p>
          <p style={{ marginTop: 6 }}><b>Модератор</b>: проверяет правки, выдаёт блокировки, разбирает апелляции.</p>
          <p style={{ marginTop: 6 }}><b>Владелец</b>: полный доступ, назначает роли и серверы.</p>
        </div>
      </div>
    </section>

    <section className="sec">
      <h2>Частые вопросы</h2>
      <details className="card"><summary>Нужна ли регистрация, чтобы читать?</summary><p className="note">Нет. Правила, команды и промокоды открыты всем. Аккаунт нужен только для правок.</p></details>
      <details className="card"><summary>Что будет за спам и мусорные правки?</summary><p className="note">Блокировка на время, которое назначит модератор. За серьёзные нарушения возможна бессрочная блокировка с одной апелляцией. Если после разбана нарушение повторится, аккаунт удаляется полностью.</p></details>
      <details className="card"><summary>Это официальный сайт игры?</summary><p className="note">Нет. Это неофициальный фан-проект, он не связан с разработчиками и издателями игр.</p></details>
    </section>

    <section className="sec">
      <div className="card"><HomePref /></div>
    </section>
  </div>;
}
