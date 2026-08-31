-- Libera qualquer usuario logado (nao so admin) para criar/editar/apagar
-- setores, pontos e wifi do mapa. Rode no SQL Editor do Supabase.

drop policy if exists "admin gerencia mapa_setores" on mapa_setores;
create policy "logados gerenciam mapa_setores" on mapa_setores
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "admin gerencia mapa_setores_removidos" on mapa_setores_removidos;
create policy "logados gerenciam mapa_setores_removidos" on mapa_setores_removidos
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "admin gerencia mapa_pontos" on mapa_pontos;
create policy "logados gerenciam mapa_pontos" on mapa_pontos
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "admin gerencia mapa_wifi" on mapa_wifi;
create policy "logados gerenciam mapa_wifi" on mapa_wifi
  for all using (auth.uid() is not null) with check (auth.uid() is not null);
