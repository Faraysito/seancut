-- correr una vez en Supabase > SQL Editor. se puede correr de nuevo sin romper nada.

-- 1) instagram del cliente, y el whatsapp pasa a ser opcional
alter table public.clients add column if not exists instagram text;
alter table public.clients alter column phone drop not null;

-- 2) reservar con whatsapp e instagram opcionales. la app ahora usa esta;
--    book_appointment queda igual en la base, sin usarse, por si hay que volver atrás.
--    la hora se valida con available_slots: las mismas reglas que ve el cliente.
create or replace function public.book_appointment_v2(
  p_item_id uuid,
  p_starts_at timestamptz,
  p_name text,
  p_phone text default null,
  p_instagram text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_digitos text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_phone text;
  v_ig text := lower(btrim(coalesce(p_instagram, '')));
  v_dur public.items.duration_min%type;
  v_client public.clients.id%type;
  v_token public.appointments.token%type;
begin
  if length(v_name) < 2 then
    raise exception 'Escribe tu nombre';
  end if;
  if length(v_name) > 80 then
    raise exception 'El nombre es muy largo';
  end if;
  if p_starts_at is null then
    raise exception 'Elige un día y una hora';
  end if;

  -- whatsapp opcional. si viene, queda guardado como +569XXXXXXXX
  if v_digitos <> '' then
    if length(v_digitos) = 8 then
      v_digitos := '569' || v_digitos;
    elsif length(v_digitos) = 9 then
      v_digitos := '56' || v_digitos;
    end if;
    if length(v_digitos) not between 10 and 15 then
      raise exception 'Revisa el número de WhatsApp';
    end if;
    v_phone := '+' || v_digitos;
  end if;

  -- instagram opcional. acepta "@usuario", "usuario" o el link del perfil
  v_ig := regexp_replace(v_ig, '^(https?://)?(www\.)?instagram\.com/', '');
  v_ig := regexp_replace(v_ig, '[/?#].*$', '');
  v_ig := ltrim(v_ig, '@');
  if v_ig = '' then
    v_ig := null;
  elsif v_ig !~ '^[a-z0-9._]{1,30}$' then
    raise exception 'Revisa el usuario de Instagram';
  end if;

  select i.duration_min into v_dur
  from public.items i
  where i.id = p_item_id and i.kind = 'service' and i.active;

  if v_dur is null then
    raise exception 'Ese servicio no está disponible';
  end if;

  -- una reserva a la vez, así dos personas no se quedan con la misma hora
  perform pg_advisory_xact_lock(hashtext('seancut_reservas'));

  if not exists (
    select 1
    from public.available_slots(
      p_date => (p_starts_at at time zone 'America/Santiago')::date,
      p_item_id => p_item_id
    ) s
    where s.slot = p_starts_at
  ) then
    raise exception 'Esa hora ya no está disponible';
  end if;

  -- si ya existe un cliente con ese whatsapp (o ese instagram) lo reutilizo,
  -- así su historial queda junto. comparo los últimos 9 dígitos para que
  -- "+56 9 1234 5678" y "912345678" cuenten como el mismo número
  if v_phone is not null then
    select c.id into v_client
    from public.clients c
    where right(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), 9) = right(v_digitos, 9)
    order by c.created_at
    limit 1;
  end if;

  if v_client is null and v_ig is not null then
    select c.id into v_client
    from public.clients c
    where lower(c.instagram) = v_ig
    order by c.created_at
    limit 1;
  end if;

  if v_client is null then
    insert into public.clients (name, phone, instagram)
    values (v_name, v_phone, v_ig)
    returning id into v_client;
  else
    update public.clients
    set name = v_name,
        phone = coalesce(v_phone, phone),
        instagram = coalesce(v_ig, instagram)
    where id = v_client;
  end if;

  insert into public.appointments (client_id, item_id, starts_at, ends_at, status)
  values (v_client, p_item_id, p_starts_at, p_starts_at + make_interval(mins => v_dur::int), 'booked')
  returning token into v_token;

  return v_token::text;
end;
$$;

grant execute on function public.book_appointment_v2(uuid, timestamptz, text, text, text) to anon, authenticated;

-- que la api vea los cambios al tiro
notify pgrst, 'reload schema';
