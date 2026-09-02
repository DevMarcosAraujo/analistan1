-- Seguranca de login: troca de senha obrigatoria no primeiro acesso
-- (ou apos reset) e bloqueio apos 5 tentativas erradas seguidas.
-- Rode no SQL Editor do Supabase. Seguro rodar mais de uma vez.

alter table perfis add column if not exists must_change_password boolean not null default true;
alter table perfis add column if not exists failed_attempts int not null default 0;
alter table perfis add column if not exists locked boolean not null default false;
alter table perfis add column if not exists locked_em timestamptz;

-- Usuarios ja existentes nao precisam trocar a senha na proxima entrada
-- (so os criados/resetados a partir de agora vao precisar).
update perfis set must_change_password = false where must_change_password is null or must_change_password = true;

-- ---------- Checagem/registro de tentativas (chamado antes do login existir sessao) ----------

create or replace function checar_bloqueio_login(p_email text)
returns boolean as $$
  select coalesce(
    (select locked from perfis where lower(email) = lower(p_email)),
    false
  );
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
  update perfis
  set failed_attempts = 0
  where lower(email) = lower(p_email);
end;
$$ language plpgsql security definer;

-- anon precisa poder chamar essas duas (o login ainda nao tem sessao)
grant execute on function checar_bloqueio_login(text) to anon, authenticated;
grant execute on function registrar_falha_login(text) to anon, authenticated;
grant execute on function registrar_sucesso_login(text) to anon, authenticated;

-- ---------- Concluir troca de senha obrigatoria (usuario logado) ----------

create or replace function concluir_troca_senha()
returns void as $$
begin
  if auth.uid() is null then
    raise exception 'Nao autenticado';
  end if;
  update perfis set must_change_password = false where id = auth.uid();
end;
$$ language plpgsql security definer;

-- ---------- Admin: desbloquear usuario (exige troca de senha de novo) ----------

create or replace function admin_desbloquear_usuario(p_user_id uuid)
returns void as $$
begin
  if not is_admin() then
    raise exception 'Somente admin pode desbloquear usuarios';
  end if;
  update perfis
  set locked = false, failed_attempts = 0, must_change_password = true, locked_em = null
  where id = p_user_id;
end;
$$ language plpgsql security definer;

-- ---------- Admin: forcar troca de senha (ex: "esqueci a senha") ----------

create or replace function admin_forcar_troca_senha(p_user_id uuid)
returns void as $$
begin
  if not is_admin() then
    raise exception 'Somente admin pode forcar troca de senha';
  end if;
  update perfis set must_change_password = true where id = p_user_id;
end;
$$ language plpgsql security definer;

-- Admin ja consegue ver/editar perfis via a policy "admin gerencia perfis".
-- Se ainda nao existir, cria (idempotente):
drop policy if exists "admin gerencia perfis" on perfis;
create policy "admin gerencia perfis" on perfis
  for update using (is_admin()) with check (is_admin());
