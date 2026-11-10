import Link from "next/link";
import { fromZonedTime } from "date-fns-tz";
import { DatosCliente } from "@/components/datos-cliente";
import { FALTA_SQL_CONTACTO } from "@/lib/contacto";
import { diaDe, dowDb, esDomingo, hoyISO, nombreDia, partesDia, semanaActual } from "@/lib/semana";
import { createClient } from "@/lib/supabase/server";
import { cobrarCita } from "./actions";
import { CitaOpciones, Reactivar } from "./cita-opciones";

const TZ = "America/Santiago";
const HOUR_PX = 96; // alto de una hora en la grilla
const ALTO_MIN = 46; // para que una Barba de 25 min siga siendo clickeable

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  });
}

// minutos desde medianoche, en hora de Chile. en-GB para que medianoche
// sea 00:00 y no 24:00, que es lo que devuelve es-CL con hour12 false
function minutosEnChile(iso: string) {
  const txt = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  }).format(new Date(iso));
  const [h, m] = txt.split(":").map(Number);
  return h * 60 + m;
}

function clp(n: number) {
  return "$" + n.toLocaleString("es-CL");
}

function etiquetaHora(h: number) {
  return String(h).padStart(2, "0") + ":00";
}

export default async function Panel({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; dia?: string }>;
}) {
  const { error: aviso, dia } = await searchParams;
  const supabase = await createClient();

  const hoy = hoyISO();
  const semana = semanaActual(hoy);

  // por defecto se ve hoy; con ?dia=YYYY-MM-DD, cualquier otro día
  const elegido = dia && /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : hoy;
  const esHoy = elegido === hoy;

  const desde = fromZonedTime(elegido + "T00:00:00", TZ);
  const hasta = fromZonedTime(elegido + "T23:59:59.999", TZ);

  const { data: citas, error } = await supabase
    .from("appointments")
    .select("id, starts_at, ends_at, status, clients(name, phone, instagram), items(name, price_clp)")
    .gte("starts_at", desde.toISOString())
    .lte("starts_at", hasta.toISOString())
    .order("starts_at");

  if (error) {
    return (
      <p className="rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">
        {error.code === "42703" ? FALTA_SQL_CONTACTO : error.message}
      </p>
    );
  }

  // 1=lunes ... 7=domingo, igual que en business_hours
  const dow = dowDb(elegido);

  const { data: tramos } = await supabase
    .from("business_hours")
    .select("opens, closes")
    .eq("dow", dow);

  // para los botones de la semana: cuántas citas tiene cada día y cuáles
  // no se atienden (en rojo, igual que los ve el cliente)
  const [{ data: citasSemana }, { data: cerradosSemana }, { data: dowsConHorario }] = await Promise.all([
    supabase
      .from("appointments")
      .select("starts_at")
      .neq("status", "cancelled")
      .gte("starts_at", fromZonedTime(semana[0] + "T00:00:00", TZ).toISOString())
      .lte("starts_at", fromZonedTime(semana[6] + "T23:59:59.999", TZ).toISOString()),
    supabase.from("closed_dates").select("day").gte("day", semana[0]).lte("day", semana[6]),
    supabase.from("business_hours").select("dow"),
  ]);

  const citasPorDia = new Map<string, number>();
  for (const c of citasSemana ?? []) {
    const d = diaDe(c.starts_at);
    citasPorDia.set(d, (citasPorDia.get(d) ?? 0) + 1);
  }
  const cerrados = new Set((cerradosSemana ?? []).map((c) => c.day));
  const conHorario = new Set((dowsConHorario ?? []).map((t) => t.dow));
  const noAtiende = (day: string) =>
    esDomingo(day) || cerrados.has(day) || !conHorario.has(dowDb(day));

  const lista = (citas ?? []).filter((c) => c.status !== "cancelled");
  const canceladas = (citas ?? []).filter((c) => c.status === "cancelled");

  const aMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

  // la grilla cubre el horario del día, pero se estira si hay una cita
  // fuera de él (por ejemplo agendada antes de cambiar los horarios)
  const inicios = [
    ...(tramos ?? []).map((t) => aMin(t.opens)),
    ...lista.map((c) => minutosEnChile(c.starts_at)),
  ];
  const finales = [
    ...(tramos ?? []).map((t) => aMin(t.closes)),
    ...lista.map((c) => minutosEnChile(c.ends_at)),
  ];

  const desdeMin = Math.floor((inicios.length ? Math.min(...inicios) : 9 * 60) / 60) * 60;
  const hastaMin = Math.ceil((finales.length ? Math.max(...finales) : 21 * 60) / 60) * 60;

  const horas: number[] = [];
  for (let h = desdeMin / 60; h <= hastaMin / 60; h++) horas.push(h);

  const ahora = new Date();
  const ahoraMin = minutosEnChile(ahora.toISOString());

  // "lunes, 9 de noviembre" (solo la primera en mayúscula)
  const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const titulo = esHoy ? "Hoy" : mayuscula(nombreDia(elegido));
  const fecha = mayuscula(
    new Date(elegido + "T12:00:00").toLocaleDateString(
      "es-CL",
      esHoy ? { weekday: "long", day: "numeric", month: "long" } : { day: "numeric", month: "long" }
    )
  );

  return (
    <>
      <h1 className="text-xl font-semibold">{titulo}</h1>
      <p className="mb-4 text-sm text-neutral-500">{fecha}</p>

      <nav aria-label="Elegir día" className="grid grid-cols-7 gap-1.5 md:gap-2">
        {semana.map((day) => {
          const p = partesDia(day);
          const activo = day === elegido;
          const n = citasPorDia.get(day) ?? 0;
          const rojo = noAtiende(day);

          return (
            <Link
              key={day}
              href={day === hoy ? "/panel" : "/panel?dia=" + day}
              aria-current={activo ? "date" : undefined}
              aria-label={
                nombreDia(day) + " " + p.num +
                (n ? ", " + n + (n === 1 ? " cita" : " citas") : "") +
                (rojo ? ", no atiendes" : "")
              }
              className={
                "relative flex flex-col items-center rounded-lg border py-2 transition md:py-3 " +
                (activo
                  ? "border-white bg-white text-neutral-950"
                  : rojo
                    ? "border-red-900 bg-red-950/40 text-red-400 hover:border-red-700"
                    : "border-neutral-700 text-neutral-200 hover:border-neutral-400")
              }
            >
              <span className="text-[10px] uppercase tracking-wide opacity-70 md:text-xs">
                {day === hoy ? "hoy" : p.dia}
              </span>
              <span className="text-base font-semibold leading-tight md:text-lg">{p.num}</span>
              <span className="text-[10px] uppercase tracking-wide opacity-70 md:text-xs">{p.mes}</span>
              {n > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-neutral-950">
                  {n}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <p className="mb-6 mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
          Citas de ese día
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
          Días que no atiendes
        </span>
      </p>

      {aviso && (
        <p className="mb-4 rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">{aviso}</p>
      )}

      {lista.length === 0 && (
        <p className="mb-6 rounded-md border border-dashed border-neutral-800 p-6 text-center text-sm text-neutral-500">
          {esHoy ? "Sin horas para hoy" : "Sin horas para este día"}
        </p>
      )}

      {lista.length > 0 && (
        <p className="mb-3 text-xs text-neutral-500">
          Toca una cita para cancelarla, marcar que no vino o anular un cobro.
        </p>
      )}

      <div
        className="relative"
        style={{ height: ((hastaMin - desdeMin) / 60) * HOUR_PX + 16 }}
      >
        {horas.map((h, i) => (
          <div key={h} className="absolute inset-x-0 flex items-center gap-3" style={{ top: i * HOUR_PX }}>
            <span className="w-10 shrink-0 text-right font-mono text-xs text-neutral-600">
              {etiquetaHora(h)}
            </span>
            <div className="h-px flex-1 bg-neutral-900" />
          </div>
        ))}

        {esHoy && ahoraMin >= desdeMin && ahoraMin <= hastaMin && (
          <div
            className="absolute inset-x-0 z-10 flex items-center gap-1 pl-10"
            style={{ top: ((ahoraMin - desdeMin) / 60) * HOUR_PX }}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
            <div className="h-px flex-1 bg-amber-400/60" />
          </div>
        )}

        {lista.map((c) => {
          const inicio = minutosEnChile(c.starts_at);
          const fin = minutosEnChile(c.ends_at);
          const top = ((inicio - desdeMin) / 60) * HOUR_PX;
          const alto = Math.max(((fin - inicio) / 60) * HOUR_PX, ALTO_MIN);
          const cobrada = c.status === "done";
          const noVino = c.status === "no_show";
          const apagada = cobrada || noVino;

          const texto = (
            <>
              <span className={"block truncate text-sm font-medium " + (apagada ? "text-neutral-500" : "")}>
                <span className="font-mono text-neutral-400">{hora(c.starts_at)}</span>{" "}
                {c.clients?.name}
              </span>
              {alto >= 62 && (
                <span className="block truncate text-xs text-neutral-500">
                  {c.items?.name} · {clp(c.items?.price_clp ?? 0)}
                </span>
              )}
            </>
          );

          return (
            <div
              key={c.id}
              className={
                "absolute right-0 z-20 overflow-hidden rounded-md border pl-3 pr-2 " +
                (apagada
                  ? "border-neutral-800 bg-neutral-900/60"
                  : "border-neutral-700 bg-neutral-900")
              }
              style={{ top, height: alto, left: 56 }}
            >
              <div className="flex h-full items-center gap-2">
                {c.status === "booked" || cobrada || noVino ? (
                  <CitaOpciones
                    id={c.id}
                    estado={cobrada ? "done" : noVino ? "no_show" : "booked"}
                    nombre={c.clients?.name ?? "Cliente"}
                    detalle={(c.items?.name ?? "Servicio") + " · " + clp(c.items?.price_clp ?? 0)}
                    horario={hora(c.starts_at) + " a " + hora(c.ends_at)}
                    telefono={c.clients?.phone ?? null}
                    instagram={c.clients?.instagram ?? null}
                  >
                    {texto}
                  </CitaOpciones>
                ) : (
                  <div className="min-w-0 flex-1">{texto}</div>
                )}

                <DatosCliente
                  compacto
                  nombre={c.clients?.name ?? "Cliente"}
                  telefono={c.clients?.phone ?? null}
                  instagram={c.clients?.instagram ?? null}
                />

                {cobrada ? (
                  <span className="shrink-0 text-xs text-neutral-600">cobrado</span>
                ) : noVino ? (
                  <span className="shrink-0 text-xs text-amber-500">no vino</span>
                ) : (
                  <form action={cobrarCita} className="flex shrink-0 gap-1">
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="dia" value={esHoy ? "" : elegido} />
                    <select name="payment_method" className="rounded border border-neutral-700 bg-neutral-950 px-1 text-xs text-neutral-100">
                      <option value="efectivo">efec</option>
                      <option value="transferencia">transf</option>
                      <option value="debito">déb</option>
                      <option value="credito">créd</option>
                    </select>
                    <button className="rounded bg-white px-2 py-1 text-xs font-medium text-neutral-950">Cobrar</button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {canceladas.length > 0 && (
        <section className="mt-10 border-t border-neutral-800 pt-6">
          <h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
            Canceladas ({canceladas.length})
          </h2>
          <ul className="divide-y divide-neutral-800">
            {canceladas.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-12 shrink-0 font-mono text-neutral-600 line-through">{hora(c.starts_at)}</span>
                <span className="min-w-0 flex-1 truncate text-neutral-500 line-through">
                  {c.clients?.name} · {c.items?.name}
                </span>
                <DatosCliente
                  compacto
                  nombre={c.clients?.name ?? "Cliente"}
                  telefono={c.clients?.phone ?? null}
                  instagram={c.clients?.instagram ?? null}
                />
                <Reactivar id={c.id} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
