-- Garante que cada ponto do mapa so pode ter um equipamento vinculado.
-- (o app ja evita isso na tela, isso aqui e a trava no banco).
-- Rode no SQL Editor do Supabase. Seguro rodar mais de uma vez.

create unique index if not exists idx_mapa_pontos_equipamento_unico
  on mapa_pontos (equipamento_id)
  where equipamento_id is not null;
