-- Permite cadastrar um ponto do mapa "planejado" (so com nome/codigo,
-- ainda sem posicao na planta) para depois so precisar clicar na planta
-- e posicionar. Rode no SQL Editor do Supabase. Seguro rodar mais de uma vez.

alter table mapa_pontos alter column x drop not null;
alter table mapa_pontos alter column y drop not null;
