create table if not exists public.projects (
  slug text primary key,
  name text not null,
  description text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.projects enable row level security;
grant select on public.projects to anon, authenticated;
grant insert, update, delete on public.projects to authenticated;
drop policy if exists "projects read" on public.projects;
create policy "projects read" on public.projects for select to anon, authenticated using (true);
drop policy if exists "projects insert admin" on public.projects;
create policy "projects insert admin" on public.projects for insert to authenticated with check (public.is_admin());
drop policy if exists "projects update admin" on public.projects;
create policy "projects update admin" on public.projects for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "projects delete admin" on public.projects;
create policy "projects delete admin" on public.projects for delete to authenticated using (public.is_admin());
alter table public.servers add column if not exists project_slug text references public.projects(slug) on delete set null;
