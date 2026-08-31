-- Remove um usuario de login (e o perfil dele, em cascata).
-- Troque EMAIL_AQUI antes de rodar no SQL Editor do Supabase.

delete from auth.users where email = 'EMAIL_AQUI';
