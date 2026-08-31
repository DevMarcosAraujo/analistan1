-- Reverte a liberacao geral: volta a exigir is_admin = true para
-- criar/editar/apagar setores, pontos e wifi do mapa. Rode no SQL Editor.
-- Seguro rodar mais de uma vez.

drop policy if exists "logados gerenciam mapa_setores" on mapa_setores;
drop policy if exists "admin gerencia mapa_setores" on mapa_setores;
create policy "admin gerencia mapa_setores" on mapa_setores
  for all using (is_admin()) with check (is_admin());

drop policy if exists "logados gerenciam mapa_setores_removidos" on mapa_setores_removidos;
drop policy if exists "admin gerencia mapa_setores_removidos" on mapa_setores_removidos;
create policy "admin gerencia mapa_setores_removidos" on mapa_setores_removidos
  for all using (is_admin()) with check (is_admin());

drop policy if exists "logados gerenciam mapa_pontos" on mapa_pontos;
drop policy if exists "admin gerencia mapa_pontos" on mapa_pontos;
create policy "admin gerencia mapa_pontos" on mapa_pontos
  for all using (is_admin()) with check (is_admin());

drop policy if exists "logados gerenciam mapa_wifi" on mapa_wifi;
drop policy if exists "admin gerencia mapa_wifi" on mapa_wifi;
create policy "admin gerencia mapa_wifi" on mapa_wifi
  for all using (is_admin()) with check (is_admin());
