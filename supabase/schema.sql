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
  must_change_password boolean not null default true,
  failed_attempts int not null default 0,
  locked boolean not null default false,
  locked_em timestamptz,
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

create policy "admin gerencia perfis" on perfis
  for update using (is_admin()) with check (is_admin());

-- ---------- Seguranca de login: bloqueio apos 5 tentativas + troca de senha obrigatoria ----------

create or replace function checar_bloqueio_login(p_email text)
returns boolean as $$
  select coalesce((select locked from perfis where lower(email) = lower(p_email)), false);
$$ language sql stable security definer;

create or replace function registrar_falha_login(p_email text)
returns void as $$
begin
  update perfis
  set failed_attempts = failed_attempts + 1,
      locked = (failed_attempts + 1) >= 5,
      locked_em = case when (failed_attempts + 1) >= 5 then now() else locked_em end
  where lower(email) = lower(p_email);
end;
$$ language plpgsql security definer;

create or replace function registrar_sucesso_login(p_email text)
returns void as $$
begin
  update perfis set failed_attempts = 0 where lower(email) = lower(p_email);
end;
$$ language plpgsql security definer;

grant execute on function checar_bloqueio_login(text) to anon, authenticated;
grant execute on function registrar_falha_login(text) to anon, authenticated;
grant execute on function registrar_sucesso_login(text) to anon, authenticated;

create or replace function concluir_troca_senha()
returns void as $$
begin
  if auth.uid() is null then raise exception 'Nao autenticado'; end if;
  update perfis set must_change_password = false where id = auth.uid();
end;
$$ language plpgsql security definer;

create or replace function admin_desbloquear_usuario(p_user_id uuid)
returns void as $$
begin
  if not is_admin() then raise exception 'Somente admin pode desbloquear usuarios'; end if;
  update perfis
  set locked = false, failed_attempts = 0, must_change_password = true, locked_em = null
  where id = p_user_id;
end;
$$ language plpgsql security definer;

create or replace function admin_forcar_troca_senha(p_user_id uuid)
returns void as $$
begin
  if not is_admin() then raise exception 'Somente admin pode forcar troca de senha'; end if;
  update perfis set must_change_password = true where id = p_user_id;
end;
$$ language plpgsql security definer;

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

-- Chave de criptografia das senhas e PIN de revelacao ficam guardados
-- aqui dentro (com RLS admin-only), em vez de uma config do banco - assim
-- nao depende de permissao de "alter database" que o Supabase gerenciado
-- nao libera pra role postgres via pooler.
create table if not exists configuracoes_sistema (
  chave text primary key,
  valor text not null
);

alter table configuracoes_sistema enable row level security;
create policy "admin gerencia configuracoes_sistema" on configuracoes_sistema
  for all using (is_admin()) with check (is_admin());

-- IMPORTANTE: depois de criar o projeto, defina a chave de criptografia
-- (troque o valor abaixo por algo aleatorio e longo, gerado uma unica vez):
--   insert into configuracoes_sistema (chave, valor) values ('encryption_key', 'troque-por-uma-chave-aleatoria-longa')
--   on conflict (chave) do nothing;
-- Sem isso, as funcoes abaixo de criptografar/descriptografar senha nao funcionam.

create or replace function salvar_senha_acesso(p_acesso_id uuid, p_senha text)
returns void as $$
declare
  v_key text;
begin
  if not is_admin() then
    raise exception 'Somente admin pode salvar senhas';
  end if;
  select valor into v_key from configuracoes_sistema where chave = 'encryption_key';
  if v_key is null then
    raise exception 'Chave de criptografia nao configurada';
  end if;
  update acessos_equipamento
  set senha_criptografada = pgp_sym_encrypt(p_senha, v_key)
  where id = p_acesso_id;
end;
$$ language plpgsql security definer;

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
  v_key text;
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
  select valor into v_key from configuracoes_sistema where chave = 'encryption_key';
  if v_key is null then
    raise exception 'Chave de criptografia nao configurada';
  end if;
  select senha_criptografada into v_senha from acessos_equipamento where id = p_acesso_id;
  if v_senha is null then
    return null;
  end if;
  return pgp_sym_decrypt(v_senha, v_key);
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
  x numeric,
  y numeric,
  equipamento_nome text,
  equipamento_id uuid references equipamentos(id) on delete set null,
  criado_em timestamptz not null default now()
);

alter table mapa_pontos enable row level security;
create policy "logados leem mapa_pontos" on mapa_pontos for select using (auth.uid() is not null);
create policy "admin gerencia mapa_pontos" on mapa_pontos for all using (is_admin()) with check (is_admin());

create index if not exists idx_mapa_pontos_nivel on mapa_pontos(nivel_id);

-- Cada ponto so pode ter um equipamento vinculado.
create unique index if not exists idx_mapa_pontos_equipamento_unico
  on mapa_pontos (equipamento_id)
  where equipamento_id is not null;

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
