'use client';
import { useEffect, useState } from 'react';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';

export type HomeLayout = { quick: boolean; features: boolean; steps: boolean; roles: boolean; faq: boolean };
export const HOME_LAYOUT_KEY = 'br_home_layout';
export const DEFAULT_HOME_LAYOUT: HomeLayout = { quick: true, features: true, steps: true, roles: true, faq: true };

export default function HomePersonalize({ value, onChange }: { value: HomeLayout; onChange: (v: HomeLayout) => void }) {
  const [open, setOpen] = useState(false);
  const items: { key: keyof HomeLayout; label: string }[] = [
    { key: 'quick', label: 'Быстрый доступ' },
    { key: 'features', label: 'Разделы сайта' },
    { key: 'steps', label: 'Как это работает' },
    { key: 'roles', label: 'Роли и уровни' },
    { key: 'faq', label: 'Частые вопросы' },
  ];
  return <section className="home-personalize card">
    <div className="home-personalize-head">
      <div><h2><SlidersHorizontal size={19} /> Настроить главную</h2><p className="note">Оставь только те блоки, которыми пользуешься.</p></div>
      <button className="btn" type="button" onClick={() => setOpen(v => !v)}>{open ? 'Свернуть' : 'Настроить'}</button>
    </div>
    {open && <div className="home-personalize-options">
      {items.map(item => <label className="home-toggle" key={item.key}><input type="checkbox" checked={value[item.key]} onChange={e => onChange({ ...value, [item.key]: e.target.checked })} /><span>{item.label}</span></label>)}
      <button type="button" className="btn subtle" onClick={() => onChange(DEFAULT_HOME_LAYOUT)}><RotateCcw size={15} /> Сбросить настройки</button>
    </div>}
  </section>;
}
