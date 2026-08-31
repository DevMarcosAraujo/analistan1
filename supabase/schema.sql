-- Schema para o projeto "TI Hospitalar" no Supabase (Postgres)
-- Rode isso no SQL Editor do seu projeto Supabase (Database > SQL Editor).

create extension if not exists pgcrypto;

-- ---------- Perfis / admin ----------
-- Guarda quem é admin. O Supabase Auth ja cuida do login (auth.users);
-- essa tabela so adiciona a permissao extra "is_admin".
create table if not exists perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  is_admin boolean not null default false,
  criado_em timestamptz not null default now()
);

alter table perfis enable row level security;

create policy "usuario ve o proprio perfil" on perfis
  for select using (auth.uid() = id);

create policy "admin ve todos os perfis" on perfis
  for select using (exists (select 1 from perfis p where p.id = auth.uid() and p.is_admin));

-- O primeiro usuario que se cadastrar vira admin automaticamente.
-- Os proximos entram como usuario comum (is_admin = false) - promova manualmente
-- rodando: update perfis set is_admin = true where email = 'fulano@email.com';
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into perfis (id, email, is_admin)
  values (
    new.id,
    new.email,
    not exists (select 1 from perfis)
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create or replace function is_admin()
returns boolean as $$
  select coalesce((select is_admin from perfis where id = auth.uid()), false);
$$ language sql stable security definer;

-- ---------- Setores ----------
create table if not exists setores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  predio text,
  andar text,
  criado_em timestamptz not null default now()
);

alter table setores enable row level security;
create policy "logados leem setores" on setores for select using (auth.uid() is not null);
create policy "admin gerencia setores" on setores for all using (is_admin()) with check (is_admin());

-- ---------- Equipamentos ----------
create table if not exists equipamentos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  nome text not null,
  patrimonio text,
  fabricante text,
  modelo text,
  numero_serie text,
  ip text,
  mac text,
  setor_id uuid references setores(id) on delete set null,
  sala text,
  responsavel text,
  switch_porta text,
  status text not null default 'desconhecido',
  observacao text,
  -- local no Mapa (nivel/setor/ponto sao definidos no app, nao sao tabelas)
  mapa_nivel_id text,
  mapa_setor_id text,
  mapa_setor_nome text,
  mapa_ponto_id text,
  mapa_ponto_codigo text,
  criado_em timestamptz not null default now()
);

alter table equipamentos enable row level security;
create policy "logados leem equipamentos" on equipamentos for select using (auth.uid() is not null);
create policy "admin gerencia equipamentos" on equipamentos for all using (is_admin()) with check (is_admin());

create index if not exists idx_equipamentos_setor on equipamentos(setor_id);

-- ---------- Acessos (com senha criptografada) ----------
create table if not exists acessos_equipamento (
  id uuid primary key default gen_random_uuid(),
  equipamento_id uuid not null references equipamentos(id) on delete cascade,
  tipo_acesso text not null,
  url_ou_ip text,
  usuario text,
  senha_criptografada bytea,
  porta text,
  observacao text,
  criado_em timestamptz not null default now()
);

alter table acessos_equipamento enable row level security;
create policy "logados leem acessos (sem a senha)" on acessos_equipamento for select using (auth.uid() is not null);
create policy "admin gerencia acessos" on acessos_equipamento for all using (is_admin()) with check (is_admin());

create index if not exists idx_acessos_equipamento on acessos_equipamento(equipamento_id);

-- IMPORTANTE: depois de criar o projeto, defina a chave de criptografia
-- (troque o valor abaixo por algo aleatorio e longo, e guarde em local seguro):
--   alter database postgres set app.encryption_key = 'troque-por-uma-chave-aleatoria-longa';
-- Sem isso, as funcoes abaixo de criptografar/descriptografar senha nao funcionam.

create or replace function salvar_senha_acesso(p_acesso_id uuid, p_senha text)
returns void as $$
begin
  if not is_admin() then
    raise exception 'Somente admin pode salvar senhas';
  end if;
  update acessos_equipamento
  set senha_criptografada = pgp_sym_encrypt(p_senha, current_setting('app.encryption_key'))
  where id = p_acesso_id;
end;
$$ language plpgsql security definer;

create or replace function ver_senha_acesso(p_acesso_id uuid)
returns text as $$
declare
  v_senha bytea;
begin
  if not is_admin() then
    raise exception 'Somente admin pode ver senhas';
  end if;
  select senha_criptografada into v_senha from acessos_equipamento where id = p_acesso_id;
  if v_senha is null then
    return null;
  end if;
  return pgp_sym_decrypt(v_senha, current_setting('app.encryption_key'));
end;
$$ language plpgsql security definer;
