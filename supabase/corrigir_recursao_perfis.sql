-- Corrige recursao infinita na policy de "perfis": a policy antiga
-- consultava a propria tabela perfis dentro da regra de acesso da
-- tabela perfis, causando erro (e isAdmin virando falso silenciosamente
-- no site). Troca para usar a funcao is_admin(), que ja existe e evita
-- a recursao. Rode no SQL Editor do Supabase.

drop policy if exists "admin ve todos os perfis" on perfis;
create policy "admin ve todos os perfis" on perfis
  for select using (is_admin());
