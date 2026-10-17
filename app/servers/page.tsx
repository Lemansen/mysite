'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CSSProperties } from 'react';
import { FolderKanban, ArrowRight, Plus } from 'lucide-react';
import { useApp } from '../../components/Provider';
import Skeleton from '../../components/Skeleton';
import { SITE } from '../../lib/config';
const HUES = [172, 42, 205, 280, 12, 140, 330, 60];
export default function ProjectsPage() {
 const r=useRouter(); const {ready,projects,servers,edit,addProject}=useApp();
 if(!ready) return <Skeleton/>;
 const add=async()=>{const name=prompt('Название проекта (например, MTA PROVINCE)'); if(!name?.trim())return; const slug=await addProject(name.trim()); if(slug)r.push('/projects/'+slug);};
 return <div className="wrap"><section className="hero"><div className="aurora" aria-hidden="true"><i/><i/><i/></div><span className="eyebrow">{SITE.tagline}</span><h1 className="grad">Игровые проекты</h1><p className="lead">Сначала выберите проект — внутри будут его серверы, категории и подкатегории.</p></section>
 {edit&&<button className="btn primary" style={{marginTop:24}} onClick={add}><Plus size={16}/> Создать проект</button>}
 {projects.length?<div className="servers">{projects.map((p,i)=>{const count=servers.filter(s=>s.project_slug===p.slug).length;return <Link key={p.slug} href={'/projects/'+p.slug} className="tile rise" style={{'--i':Math.min(i,8),'--h':HUES[i%HUES.length]} as CSSProperties}><div className="tico"><FolderKanban size={26}/></div><h3>{p.name}</h3><p>{p.description||'Откройте список серверов этого проекта.'}</p><div className="meta">{count} серверов <ArrowRight size={16}/></div></Link>})}</div>:<div className="empty" style={{marginTop:28}}>Проектов пока нет. Администратор может создать первый проект.</div>}</div>;
}
