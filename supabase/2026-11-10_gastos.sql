-- correr una vez en Supabase > SQL Editor. se puede correr de nuevo sin romper nada.

-- 1) categoría de cada gasto: mercaderia, herramientas, insumos, ropa, local u otro
alter table public.ledger add column if not exists category text;

-- 2) sean puede borrar un gasto mal anotado (y anular un cobro desde Hoy)
drop policy if exists "ledger borrar sean" on public.ledger;
create policy "ledger borrar sean" on public.ledger
  for delete to authenticated using (true);
grant delete on public.ledger to authenticated;

-- que la api vea la columna nueva al tiro
notify pgrst, 'reload schema';
