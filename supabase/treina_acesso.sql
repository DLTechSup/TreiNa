-- =====================================================================
-- TreiNa: ACESSO RESTRITO + VÍDEOS DOS EXERCÍCIOS (pasta privada)
-- Rode no Supabase: SQL Editor -> New query -> cole tudo -> Run.
-- Pode rodar mais de uma vez sem problema.
--
-- 1) Lista de e-mails liberados: só essas contas Google entram no app.
-- 2) Backup na nuvem só para quem está na lista.
-- 3) Pasta "videos-treino" no Storage, FECHADA, só para quem está na lista.
-- 4) No fim, coloque os e-mails das contas Google (a dela e a sua).
-- =====================================================================

-- 1) Lista de e-mails liberados (ninguém de fora consegue ler esta lista)
create table if not exists public.acesso_liberado (
  email text primary key,
  criado_em timestamptz not null default now()
);
alter table public.acesso_liberado enable row level security;
revoke all on public.acesso_liberado from anon, authenticated;

-- Responde só "sim/não" para a conta logada (o app usa para abrir ou bloquear)
create or replace function public.treina_tem_acesso()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.acesso_liberado a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.treina_tem_acesso() from public;
grant execute on function public.treina_tem_acesso() to authenticated;

-- 2) Backup: além de ser o dono, precisa estar na lista
drop policy if exists "treina: backup so liberados" on public.backups;
create policy "treina: backup so liberados"
  on public.backups as restrictive
  for all to authenticated
  using (public.treina_tem_acesso())
  with check (public.treina_tem_acesso());

drop policy if exists "treina: versoes so liberados" on public.backups_versoes;
create policy "treina: versoes so liberados"
  on public.backups_versoes as restrictive
  for all to authenticated
  using (public.treina_tem_acesso());

-- 3) Pasta privada dos vídeos (limite de 50 MB por arquivo, só .mp4)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos-treino', 'videos-treino', false, 52428800, array['video/mp4'])
on conflict (id) do update set public = false;

drop policy if exists "treina: ver videos liberados" on storage.objects;
create policy "treina: ver videos liberados"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'videos-treino' and public.treina_tem_acesso());

-- 4) E-MAILS LIBERADOS: troque pelos e-mails das contas Google (um por linha)
insert into public.acesso_liberado (email) values
  ('EMAIL_DELA@gmail.com'),
  ('SEU_EMAIL@gmail.com')
on conflict (email) do nothing;
