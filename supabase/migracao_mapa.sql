-- Rode isso no SQL Editor do seu projeto Supabase.
-- Seguro rodar mais de uma vez (as policies sao recriadas sem erro).

create table if not exists mapa_setores (
  id text primary key,
  nivel_id text not null,
  nome text not null,
  sigla text not null,
  x1 numeric not null,
  y1 numeric not null,
  x2 numeric not null,
  y2 numeric not null,
  criado_em timestamptz not null default now()
);

alter table mapa_setores enable row level security;
drop policy if exists "logados leem mapa_setores" on mapa_setores;
create policy "logados leem mapa_setores" on mapa_setores for select using (auth.uid() is not null);
drop policy if exists "admin gerencia mapa_setores" on mapa_setores;
create policy "admin gerencia mapa_setores" on mapa_setores for all using (is_admin()) with check (is_admin());

create table if not exists mapa_setores_removidos (
  nivel_id text not null,
  setor_id text not null,
  primary key (nivel_id, setor_id)
);

alter table mapa_setores_removidos enable row level security;
drop policy if exists "logados leem mapa_setores_removidos" on mapa_setores_removidos;
create policy "logados leem mapa_setores_removidos" on mapa_setores_removidos for select using (auth.uid() is not null);
drop policy if exists "admin gerencia mapa_setores_removidos" on mapa_setores_removidos;
create policy "admin gerencia mapa_setores_removidos" on mapa_setores_removidos for all using (is_admin()) with check (is_admin());

create table if not exists mapa_pontos (
  id uuid primary key default gen_random_uuid(),
  nivel_id text not null,
  setor_id text not null,
  codigo text not null,
  nome text not null,
  x numeric not null,
  y numeric not null,
  equipamento_nome text,
  equipamento_id uuid references equipamentos(id) on delete set null,
  criado_em timestamptz not null default now()
);

alter table mapa_pontos enable row level security;
drop policy if exists "logados leem mapa_pontos" on mapa_pontos;
create policy "logados leem mapa_pontos" on mapa_pontos for select using (auth.uid() is not null);
drop policy if exists "admin gerencia mapa_pontos" on mapa_pontos;
create policy "admin gerencia mapa_pontos" on mapa_pontos for all using (is_admin()) with check (is_admin());

create index if not exists idx_mapa_pontos_nivel on mapa_pontos(nivel_id);

create table if not exists mapa_wifi (
  id uuid primary key default gen_random_uuid(),
  nivel_id text not null,
  setor_id text not null,
  nome text not null,
  x numeric not null,
  y numeric not null,
  criado_em timestamptz not null default now()
);

alter table mapa_wifi enable row level security;
drop policy if exists "logados leem mapa_wifi" on mapa_wifi;
create policy "logados leem mapa_wifi" on mapa_wifi for select using (auth.uid() is not null);
drop policy if exists "admin gerencia mapa_wifi" on mapa_wifi;
create policy "admin gerencia mapa_wifi" on mapa_wifi for all using (is_admin()) with check (is_admin());

create index if not exists idx_mapa_wifi_nivel on mapa_wifi(nivel_id);
