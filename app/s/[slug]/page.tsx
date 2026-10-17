'use client';
import Link from 'next/link';
import { CSSProperties, useState } from 'react';
import { ScrollText, TerminalSquare, Gift, ArrowRight, FolderOpen, Plus, X, Trash2 } from 'lucide-react';
import { useApp } from '../../../components/Provider';
import ServerGuard from '../../../components/ServerGuard';
import QuickAccess from '../../../components/QuickAccess';
import { isExpired } from '../../../lib/store';
function Inner() {
 const { data, slug, serverName, edit, update, say } = useApp(); const [showAdd,setShowAdd]=useState(false); const [sectionTitle,setSectionTitle]=useState(''); const [sectionDescription,setSectionDescription]=useState('');
 const n = (k: 'rules' | 'commands') => (data[k]||[]).reduce((s, f) => s + f.items.length, 0);
 const act = (data.promos||[]).filter(p => !isExpired(p, Date.now())).length;
 const base = '/s/' + slug; const addSection=()=>{if(!sectionTitle.trim())return;const id='custom-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6);update(d=>{d.sections=[...(d.sections||[]),{id,title:sectionTitle.trim(),description:sectionDescription.trim(),type:'custom'}];d.customSections=[...(d.customSections||[]),{id,title:sectionTitle.trim(),description:sectionDescription.trim(),folders:[]}]});setSectionTitle('');setSectionDescription('');setShowAdd(false);say('Раздел создан')};
 const available = data.sections ?? [];
 const removeSection=(id:string,title:string)=>{if(!window.confirm(`Удалить раздел «${title}»? Его категории и записи внутри этого раздела тоже будут удалены.`))return;update(d=>{d.sections=(d.sections||[]).filter(section=>section.id!==id);d.customSections=(d.customSections||[]).filter(section=>section.id!==id)});say('Раздел удалён')};
 const tiles = available.map((section,i)=>{
   if(section.type==='rules') return {id:section.id,href:base+'/rules',Icon:ScrollText,title:section.title,text:section.description||'Правила сервера.',meta:`${n('rules')} записей`,h:172};
   if(section.type==='commands') return {id:section.id,href:base+'/commands',Icon:TerminalSquare,title:section.title,text:section.description||'Игровые команды сервера.',meta:`${n('commands')} команд`,h:42};
   if(section.type==='promo') return {id:section.id,href:base+'/promo',Icon:Gift,title:section.title,text:section.description||'Промокоды сервера.',meta:`Действует: ${act}`,h:205};
   return {id:section.id,href:base+'/section/'+section.id,Icon:FolderOpen,title:section.title,text:section.description||'Пользовательский раздел.',meta:'Открыть раздел',h:280};
 });
 return <div className="wrap"><section className="hero"><div className="aurora" aria-hidden="true"><i /><i /><i /></div><span className="eyebrow">Сервер</span><h1 className="grad">{serverName}</h1><p className="lead">Разделы этого сервера. Каждый раздел создаётся отдельно и заполняется вручную.</p></section>
 {edit&&<button className="btn primary" style={{marginTop:20}} onClick={()=>setShowAdd(true)}><Plus size={16}/> Добавить раздел</button>}{tiles.length?<div className="tiles">{tiles.map(({id,href,Icon,title,text,meta,h},i)=><div key={id} className="tile-wrap rise" style={{'--i':i+2,'--h':h} as CSSProperties}><Link href={href} className="tile"><div className="tico"><Icon size={26}/></div><h3>{title}</h3><p>{text}</p><div className="meta">{meta}<ArrowRight size={16}/></div></Link>{edit&&<button type="button" className="btn sm danger tile-delete" title={`Удалить раздел «${title}»`} aria-label={`Удалить раздел «${title}»`} onClick={()=>removeSection(id,title)}><Trash2 size={15}/> Удалить</button>}</div>)}</div>:<div className="empty" style={{marginTop:28}}>У этого сервера пока нет разделов. Вернитесь к списку серверов и создайте нужные разделы при создании сервера.</div>}
 {showAdd&&<div className="modal-backdrop" role="presentation" onClick={()=>setShowAdd(false)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-section-title" onClick={e=>e.stopPropagation()}><div className="row" style={{justifyContent:'space-between',alignItems:'center'}}><h2 id="add-section-title">Добавить раздел</h2><button className="btn sm" onClick={()=>setShowAdd(false)} aria-label="Закрыть"><X size={16}/></button></div><p className="muted">Можно создать сколько угодно разделов. Внутри будут категории, обычные записи и примеры кода.</p><label className="field-label">Название</label><input className="field" value={sectionTitle} onChange={e=>setSectionTitle(e.target.value)} placeholder="Например, Работы, RP-термины, ID предметов" autoFocus/><label className="field-label">Описание</label><textarea className="field" value={sectionDescription} onChange={e=>setSectionDescription(e.target.value)} placeholder="Краткое описание раздела" rows={3}/><div className="row" style={{justifyContent:'flex-end',marginTop:18}}><button className="btn" onClick={()=>setShowAdd(false)}>Отмена</button><button className="btn primary" disabled={!sectionTitle.trim()} onClick={addSection}>Создать раздел</button></div></div></div>}{slug && <QuickAccess server={slug} />}</div>;
}
export default function Page() { return <ServerGuard><Inner /></ServerGuard>; }
