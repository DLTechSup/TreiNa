-- =====================================================================
--  TreiNa — backup na nuvem (Supabase)
--  Cole TUDO no Supabase > SQL Editor > New query  e clique em RUN.
--  Pode rodar de novo sem problema (o script é idempotente).
-- =====================================================================

-- 1) Tabela principal: 1 linha por pessoa, com todos os dados do app
create table if not exists public.backups (
  user_id       uuid primary key default auth.uid()
                references auth.users (id) on delete cascade,
  dados         jsonb not null,
  versao_app    text,
  dispositivo   text,
  atualizado_em timestamptz not null default now(),
  constraint backups_tamanho_max check (octet_length(dados::text) < 5000000)
);

comment on table public.backups is
  'TreiNa: cópia de segurança (perfil, favoritos, treinos, histórico) de cada usuário.';

-- 2) Histórico de versões (rede de segurança: guarda até 20 cópias antigas —
--    1 por hora, e sempre que o backup vem de outro aparelho — para desfazer um backup ruim)
create table if not exists public.backups_versoes (
  id       bigint generated always as identity primary key,
  user_id  uuid not null references auth.users (id) on delete cascade,
  dados    jsonb not null,
  salvo_em timestamptz not null default now()
);

create index if not exists backups_versoes_user_idx
  on public.backups_versoes (user_id, salvo_em desc);

-- 3) Segurança: cada pessoa só enxerga e altera o PRÓPRIO backup
alter table public.backups         enable row level security;
alter table public.backups_versoes enable row level security;

drop policy if exists "backup: ler o proprio"     on public.backups;
drop policy if exists "backup: criar o proprio"   on public.backups;
drop policy if exists "backup: alterar o proprio" on public.backups;
drop policy if exists "backup: apagar o proprio"  on public.backups;
drop policy if exists "versoes: ler as proprias"  on public.backups_versoes;

create policy "backup: ler o proprio" on public.backups
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "backup: criar o proprio" on public.backups
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "backup: alterar o proprio" on public.backups
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "backup: apagar o proprio" on public.backups
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "versoes: ler as proprias" on public.backups_versoes
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Visitante sem login não acessa nada; logado acessa só o que as regras acima deixam
revoke all on public.backups, public.backups_versoes from anon;
grant select, insert, update, delete on public.backups to authenticated;
grant select on public.backups_versoes to authenticated;

-- 4) Gatilho: a cada atualização, carimba a hora e guarda a versão anterior
create or replace function public.treina_antes_de_atualizar_backup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.atualizado_em := now();

  if old.dados is distinct from new.dados
     and (
       old.dispositivo is distinct from new.dispositivo
       or not exists (
         select 1 from public.backups_versoes v
         where v.user_id = old.user_id
           and v.salvo_em > now() - interval '1 hour'
       )
     )
  then
    insert into public.backups_versoes (user_id, dados)
    values (old.user_id, old.dados);

    -- mantém só as 20 mais recentes
    delete from public.backups_versoes v
    where v.user_id = old.user_id
      and v.id not in (
        select v2.id from public.backups_versoes v2
        where v2.user_id = old.user_id
        order by v2.salvo_em desc, v2.id desc
        limit 20
      );
  end if;

  return new;
end;
$$;

revoke all on function public.treina_antes_de_atualizar_backup() from public, anon, authenticated;

drop trigger if exists treina_backup_antes_update on public.backups;
create trigger treina_backup_antes_update
  before update on public.backups
  for each row execute function public.treina_antes_de_atualizar_backup();

-- 5) Manter o projeto ativo: o robô do GitHub chama esta função a cada 2 dias
--    (o plano grátis do Supabase pausa projetos com 7 dias sem uso no banco).
create table if not exists public.manter_ativo (
  id          int primary key default 1 check (id = 1),
  ultimo_ping timestamptz not null default now(),
  total       bigint not null default 0
);
alter table public.manter_ativo enable row level security;  -- ninguém lê/escreve direto pela API
revoke all on public.manter_ativo from anon, authenticated;

create or replace function public.treina_manter_ativo()
returns timestamptz
language sql
security definer
set search_path = ''
as $$
  insert into public.manter_ativo as m (id, ultimo_ping, total)
  values (1, now(), 1)
  on conflict (id) do update set ultimo_ping = now(), total = m.total + 1
  returning ultimo_ping;
$$;

revoke all on function public.treina_manter_ativo() from public;
grant execute on function public.treina_manter_ativo() to anon, authenticated;

-- Pronto! Para conferir: Table Editor > backups (fica vazia até alguém entrar no app).
