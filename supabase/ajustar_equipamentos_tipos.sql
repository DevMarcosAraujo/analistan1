-- Ajusta a tabela equipamentos para os tipos especificos do hospital
-- (desktop, notebook, impressora A4/etiqueta/pulseira/termica/nina) e
-- adiciona o PIN unico para revelar senhas de acesso (TeamViewer etc).
-- Rode no SQL Editor do Supabase. Seguro rodar mais de uma vez.

alter table equipamentos add column if not exists host text;
alter table equipamentos add column if not exists ip_modo text;
alter table equipamentos add column if not exists conectados_ids uuid[] not null default '{}';

create table if not exists configuracoes_sistema (
  chave text primary key,
  valor text not null
);

alter table configuracoes_sistema enable row level security;
drop policy if exists "admin gerencia configuracoes_sistema" on configuracoes_sistema;
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

-- Troca ver_senha_acesso(uuid) por uma versao que pede o PIN em vez de
-- exigir admin: qualquer logado que souber o PIN consegue ver a senha.
drop function if exists ver_senha_acesso(uuid);

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

-- salvar_senha_acesso tambem passa a usar a chave guardada em
-- configuracoes_sistema (nao depende mais de "alter database").
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
