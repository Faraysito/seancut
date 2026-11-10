import type { ReactNode } from "react";
import Link from "next/link";
import { fromZonedTime } from "date-fns-tz";
import { InfoTip } from "@/components/tooltip";
import { TZ, horaCorta } from "@/lib/local";
import {
  diaDe,
  dowDb,
  hoyISO,
  nombreDia,
  partesDia,
  semanaActual,
  sumarDias,
  tituloSemana,
} from "@/lib/semana";
import { createClient } from "@/lib/supabase/server";
import { AgregarTramo, CerrarOtraFecha, HorasDelDia, ReabrirFecha, ToggleDia, TramoEditable } from "./forms";

// postgres devuelve "10:00:00", al input type=time le basta "10:00"
function hhmm(t: string) {
  return t.slice(0, 5);
}

const PLURAL: Record<number, string> = {
  1: "lunes",
  2: "martes",
  3: "miércoles",
  4: "jueves",
  5: "viernes",
  6: "sábados",
};

function fechaCorta(day: string) {
  const p = partesDia(day);
  return nombreDia(day) + " " + p.num + " " + p.mes;
}

function Etiqueta({ children, tono = "neutro" }: { children: ReactNode; tono?: "neutro" | "rojo" | "hoy" }) {
  const estilo = {
    neutro: "border border-neutral-700 text-neutral-500",
    rojo: "bg-red-600/20 text-red-400",
    hoy: "bg-white text-neutral-950",
  }[tono];

  return (
    <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " + estilo}>
      {children}
    </span>
  );
}

function plural(n: number) {
  return n + " " + (n === 1 ? "reserva" : "reservas");
}

export default async function Horarios() {
  const supabase = await createClient();

  const hoy = hoyISO();
  const semana = semanaActual(hoy);
  const domingo = semana[6];
  const desde = fromZonedTime(semana[0] + "T00:00:00", TZ).toISOString();
  const hasta = fromZonedTime(domingo + "T23:59:59.999", TZ).toISOString();

  const [{ data: tramos }, { data: cerrados }, { data: citas }, { data: corto }, { data: ocultas }] = await Promise.all([
    supabase.from("business_hours").select("id, dow, opens, closes").order("dow").order("opens"),
    supabase.from("closed_dates").select("day, reason").gte("day", semana[0]).order("day"),
    supabase
      .from("appointments")
      .select("starts_at")
      .eq("status", "booked")
      .gte("starts_at", desde)
      .lte("starts_at", hasta),
    // las horas libres dependen de cuánto dura el servicio: con el más
    // corto salen todas las horas en que todavía cabe alguien
    supabase
      .from("items")
      .select("id, name, duration_min")
      .eq("brand", "seancut")
      .eq("kind", "service")
      .eq("active", true)
      .order("duration_min")
      .limit(1)
      .maybeSingle(),
    // horas que sean sacó a mano de reservar hora
    supabase.from("hidden_slots").select("starts_at").gte("starts_at", desde).lte("starts_at", hasta),
  ]);

  const cerradosSemana = new Set((cerrados ?? []).filter((c) => c.day <= domingo).map((c) => c.day));
  const cerradosDespues = (cerrados ?? []).filter((c) => c.day > domingo);

  const reservasPorDia = new Map<string, number>();
  for (const c of citas ?? []) {
    const d = diaDe(c.starts_at);
    reservasPorDia.set(d, (reservasPorDia.get(d) ?? 0) + 1);
  }

  const ocultasPorDia = new Map<string, string[]>();
  for (const o of ocultas ?? []) {
    const d = diaDe(o.starts_at);
    ocultasPorDia.set(d, [...(ocultasPorDia.get(d) ?? []), o.starts_at]);
  }

  // lunes a sábado; el domingo va aparte porque siempre está cerrado
  const dias = await Promise.all(
    semana.slice(0, 6).map(async (day) => {
      const dow = dowDb(day);
      const delDia = (tramos ?? []).filter((t) => t.dow === dow);
      const pasado = day < hoy;
      const cerrado = cerradosSemana.has(day);

      let libres: string[] = [];
      if (!pasado && !cerrado && delDia.length > 0 && corto) {
        const { data } = await supabase.rpc("available_slots", { p_date: day, p_item_id: corto.id });
        libres = (data ?? []).map((r) => r.slot);
      }

      return {
        day,
        dow,
        delDia,
        pasado,
        cerrado,
        // la etiqueta sale del server para que el html calce al hidratar
        horas: libres.map((s) => ({ slot: s, label: horaCorta(s) })),
        ocultas: ocultasPorDia.get(day) ?? [],
        reservas: reservasPorDia.get(day) ?? 0,
      };
    })
  );

  const ayudaHoras =
    "Las horas libres de ese día" +
    (corto ? " (calculadas con " + corto.name + ", " + corto.duration_min + " min, tu servicio más corto)" : "") +
    ". Las tachadas no las ven tus clientes, pero tú igual puedes agendarlas desde la agenda. Las ya tomadas o que pasaron no salen.";

  return (
    <>
      <h1 className="text-xl font-semibold">Administrar horarios</h1>
      <p className="text-sm text-neutral-400">Semana del {tituloSemana(semana)}</p>
      <p className="mb-6 mt-2 text-sm text-neutral-500">
        Así ven tus clientes esta semana en Reservar hora. Toca una hora para sacarla (queda tachada)
        y tócala de nuevo para que vuelva. Si no vas a cortar en todo el día, apreta{" "}
        <span className="text-red-400">No corto pelo este día</span> y les va a salir en rojo.
      </p>

      <div className="space-y-4">
        {dias.map((d) => {
          const sinHorario = d.delDia.length === 0;
          const rojo = !d.pasado && (d.cerrado || sinHorario);

          return (
            <section
              key={d.day}
              className={
                "rounded-lg border p-4 " +
                (rojo
                  ? "border-red-900/70 bg-red-950/20"
                  : d.day === hoy
                    ? "border-neutral-600"
                    : "border-neutral-800")
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className={"font-medium capitalize " + (d.pasado ? "text-neutral-500" : "")}>
                    {fechaCorta(d.day)}
                  </h2>
                  {d.day === hoy && <Etiqueta tono="hoy">Hoy</Etiqueta>}
                  {d.pasado && <Etiqueta>Ya pasó</Etiqueta>}
                  {!d.pasado && d.cerrado && <Etiqueta tono="rojo">No atiendes</Etiqueta>}
                  {!d.pasado && !d.cerrado && sinHorario && <Etiqueta tono="rojo">Sin horario</Etiqueta>}
                </div>
                {!d.pasado && (d.cerrado || !sinHorario) && <ToggleDia day={d.day} cerrado={d.cerrado} />}
              </div>

              {!d.pasado && d.cerrado && (
                <div className="mt-3 space-y-2 text-sm">
                  <p className="text-neutral-400">
                    Tus clientes ven este día en rojo con el aviso{" "}
                    <span className="text-red-400">«Este día no estará atendiendo»</span>.
                  </p>
                  {d.reservas > 0 && (
                    <p className="rounded-md border border-amber-900/60 bg-amber-950/30 p-3 text-amber-400">
                      Ojo: ya tenías {plural(d.reservas)} este día y no se cancelan solas.{" "}
                      <Link href={"/panel/agenda?dia=" + d.day} className="underline underline-offset-4">
                        Avísales desde la agenda →
                      </Link>
                    </p>
                  )}
                </div>
              )}

              {!d.pasado && !d.cerrado && sinHorario && (
                <p className="mt-3 text-sm text-neutral-400">
                  Sin horario, a tus clientes les sale en rojo. Ponle uno abajo para que puedan reservar.
                </p>
              )}

              {!d.pasado && !d.cerrado && !sinHorario && (
                <div className="mt-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs uppercase tracking-[0.2em] text-neutral-500">Horas para tus clientes</h3>
                      <InfoTip text={ayudaHoras} />
                    </div>
                    {d.reservas > 0 && (
                      <Link
                        href={"/panel/agenda?dia=" + d.day}
                        className="text-xs text-neutral-400 underline underline-offset-4 transition hover:text-white"
                      >
                        {plural(d.reservas)} →
                      </Link>
                    )}
                  </div>

                  <HorasDelDia day={d.day} horas={d.horas} ocultas={d.ocultas} />
                </div>
              )}

              <div className="mt-4 border-t border-neutral-800/70 pt-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <h3 className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                    Horario de los {PLURAL[d.dow]}
                  </h3>
                  <InfoTip
                    text={
                      "Se repite todas las semanas: si lo cambias acá, cambia para todos los " +
                      PLURAL[d.dow] +
                      ". Puedes tener más de uno el mismo día, por ejemplo 10:00 a 14:00 y 16:00 a 20:00."
                    }
                  />
                </div>
                <div className="space-y-2">
                  {d.delDia.map((t) => (
                    <TramoEditable key={t.id} id={t.id} dow={d.dow} opens={hhmm(t.opens)} closes={hhmm(t.closes)} />
                  ))}
                </div>
                <AgregarTramo dow={d.dow} primero={sinHorario} />
              </div>
            </section>
          );
        })}

        <section className="rounded-lg border border-red-900/70 bg-red-950/20 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium capitalize">{fechaCorta(domingo)}</h2>
            {domingo === hoy && <Etiqueta tono="hoy">Hoy</Etiqueta>}
            <Etiqueta tono="rojo">No se atiende</Etiqueta>
          </div>
          <p className="mt-2 text-sm text-neutral-400">Los domingos siempre les salen en rojo a tus clientes.</p>
        </section>
      </div>

      <section className="mt-10 border-t border-neutral-800 pt-6">
        <h2 className="mb-1 text-xs uppercase tracking-[0.2em] text-neutral-500">Más adelante</h2>
        <p className="mb-3 text-sm text-neutral-500">
          ¿Ya sabes que vas a faltar un día de otra semana? Márcalo ahora y cuando llegue esa semana
          les va a salir en rojo solo.
        </p>

        <CerrarOtraFecha min={sumarDias(domingo, 1)} />

        {cerradosDespues.length > 0 && (
          <ul className="mt-4 divide-y divide-neutral-800">
            {cerradosDespues.map((c) => (
              <li key={c.day} className="flex items-center gap-3 py-2">
                <span className="text-sm capitalize">{fechaCorta(c.day)}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-neutral-500">{c.reason ?? ""}</span>
                <ReabrirFecha day={c.day} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
