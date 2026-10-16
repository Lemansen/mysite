'use client';
import Link from 'next/link';
import { ReactNode, useEffect } from 'react';
import { useApp } from './Provider';
import Skeleton from './Skeleton';

export default function ServerGuard({ children }: { children: ReactNode }) {
  const { ready, notFound, slug } = useApp();
  useEffect(() => { if (ready && !notFound && slug) localStorage.setItem('br_last_server', slug); }, [ready, notFound, slug]);
  if (!ready) return <Skeleton />;
  if (notFound) return <div className="wrap">
    <h1>Сервер не найден</h1>
    <p className="note">Такого сервера нет или он был удалён.</p>
    <p style={{ marginTop: 16 }}><Link className="btn" href="/servers">К списку серверов</Link></p>
  </div>;
  return <>{children}</>;
}
