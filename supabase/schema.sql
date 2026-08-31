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

-- Definida antes das policies que a usam: precisa existir primeiro,
-- e por ser security definer, uma consulta a "perfis" aqui dentro
-- nao reaciona a RLS de "perfis" (evita recursao infinita).
create or replace function is_admin()
returns boolean as $$
  select coalesce((select is_admin from perfis where id = auth.uid()), false);
$$ language sql stable security definer;

create policy "usuario ve o proprio perfil" on perfis
  for select using (auth.uid() = id);

-- Usa is_admin() em vez de uma subconsulta direta em "perfis" aqui,
-- para nao causar recursao infinita na policy.
create policy "admin ve todos os perfis" on perfis
  for select using (is_admin());

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
  ip_modo text,
  host text,
  conectados_ids uuid[] not null default '{}',
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

-- PIN unico do sistema para revelar senhas: qualquer logado que souber
-- o PIN consegue ver, nao precisa ser admin.
create table if not exists configuracoes_sistema (
  chave text primary key,
  valor text not null
);

alter table configuracoes_sistema enable row level security;
create policy "admin gerencia configuracoes_sistema" on configuracoes_sistema
  for all using (is_admin()) with check (is_admin());

create or replace function definir_pin_senha(p_pin text)
returns void as $$
begin
  if not is_admin() then
    raise exception 'Somente admin pode definir o PIN';
  end if;
  if p_pin is null or length(p_pin) < 4 then
    raise exception 'O PIN precisa ter pelo menos 4 digitos';
  end if;
  insert into configuracoes_sistema (chave, valor)
  values ('pin_senha', crypt(p_pin, gen_salt('bf')))
  on conflict (chave) do update set valor = excluded.valor;
end;
$$ language plpgsql security definer;

create or replace function ver_senha_acesso(p_acesso_id uuid, p_pin text)
returns text as $$
declare
  v_senha bytea;
  v_hash text;
begin
  if auth.uid() is null then
    raise exception 'Nao autenticado';
  end if;
  select valor into v_hash from configuracoes_sistema where chave = 'pin_senha';
  if v_hash is null then
    raise exception 'Nenhum PIN foi configurado ainda. Peca para um admin definir um.';
  end if;
  if crypt(p_pin, v_hash) <> v_hash then
    raise exception 'PIN invalido';
  end if;
  select senha_criptografada into v_senha from acessos_equipamento where id = p_acesso_id;
  if v_senha is null then
    return null;
  end if;
  return pgp_sym_decrypt(v_senha, current_setting('app.encryption_key'));
end;
$$ language plpgsql security definer;

-- ---------- Mapa (planta baixa interativa) ----------
-- Antes: pontos/wifi/salas customizadas ficavam em localStorage do navegador
-- (sumia ao trocar de dispositivo). Agora tudo fica salvo aqui.

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
create policy "logados leem mapa_setores" on mapa_setores for select using (auth.uid() is not null);
create policy "admin gerencia mapa_setores" on mapa_setores for all using (is_admin()) with check (is_admin());

create table if not exists mapa_setores_removidos (
  nivel_id text not null,
  setor_id text not null,
  primary key (nivel_id, setor_id)
);

alter table mapa_setores_removidos enable row level security;
create policy "logados leem mapa_setores_removidos" on mapa_setores_removidos for select using (auth.uid() is not null);
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
create policy "logados leem mapa_pontos" on mapa_pontos for select using (auth.uid() is not null);
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
create policy "logados leem mapa_wifi" on mapa_wifi for select using (auth.uid() is not null);
create policy "admin gerencia mapa_wifi" on mapa_wifi for all using (is_admin()) with check (is_admin());

create index if not exists idx_mapa_wifi_nivel on mapa_wifi(nivel_id);
