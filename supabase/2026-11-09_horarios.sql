-- correr una vez en Supabase > SQL Editor. se puede correr de nuevo sin romper nada.

-- 1) los días marcados con "No corto pelo este día" tienen que poder leerse
--    sin login, si no al cliente no le salen en rojo
drop policy if exists "closed_dates lectura publica" on public.closed_dates;
create policy "closed_dates lectura publica" on public.closed_dates
  for select to anon using (true);
grant select on public.closed_dates to anon;

-- 2) horas que sean sacó de "Reservar hora" tocándolas en Administrar horarios.
--    cada fila es una hora de inicio puntual (ej: martes 10 a las 12:00)
create table if not exists public.hidden_slots (
  starts_at timestamptz primary key,
  created_at timestamptz not null default now()
);

alter table public.hidden_slots enable row level security;

drop policy if exists "hidden_slots lectura publica" on public.hidden_slots;
create policy "hidden_slots lectura publica" on public.hidden_slots
  for select to anon, authenticated using (true);

drop policy if exists "hidden_slots sean" on public.hidden_slots;
create policy "hidden_slots sean" on public.hidden_slots
  for all to authenticated using (true) with check (true);

grant select on public.hidden_slots to anon, authenticated;
grant insert, update, delete on public.hidden_slots to authenticated;

-- 3) nadie sin login puede reservar una hora oculta, aunque tenga la página
--    abierta desde antes o llame a la función a mano. sean (logueado) sí
--    puede, para darle esa hora a alguien que le escribió directo.
create or replace function public.no_reservar_hora_oculta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     and exists (select 1 from public.hidden_slots h where h.starts_at = new.starts_at) then
    raise exception 'Esa hora ya no está disponible';
  end if;
  return new;
end;
$$;

drop trigger if exists no_reservar_hora_oculta on public.appointments;
create trigger no_reservar_hora_oculta
  before insert on public.appointments
  for each row execute function public.no_reservar_hora_oculta();

-- que la api vea la tabla nueva al tiro
notify pgrst, 'reload schema';
