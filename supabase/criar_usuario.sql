-- Cria um novo usuario de login direto no banco, ja como admin.
-- Troque EMAIL_AQUI e SENHA_AQUI antes de rodar no SQL Editor do Supabase.
-- Pode rodar varias vezes trocando os valores, para criar mais gente.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'EMAIL_AQUI',
  crypt('SENHA_AQUI', gen_salt('bf')),
  now(),
  now(),
  now(),
  '', '', '', ''
);

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, created_at, updated_at
)
select
  gen_random_uuid(),
  u.id,
  u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email',
  now(),
  now()
from auth.users u
where u.email = 'EMAIL_AQUI';

-- O trigger ja cria a linha em "perfis" automaticamente.
-- Essa linha garante que o usuario fica marcado como admin.
update perfis set is_admin = true where email = 'EMAIL_AQUI';
