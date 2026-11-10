"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useState } from "react";
import { Tooltip } from "@/components/tooltip";
import { linkInstagram, linkWhatsApp, numeroWa, usuarioInstagram } from "@/lib/contacto";
import { DIRECCION, WHATSAPP_LOCAL, fechaLarga, horaCorta } from "@/lib/local";
import { diaDe, type DiaReserva } from "@/lib/semana";
import { createClient } from "@/lib/supabase/client";
import { book, type BookState } from "./actions";

type Servicio = {
  id: string;
  name: string;
  price_clp: number;
  duration_min: number | null;
};

type Props = {
  servicios: Servicio[];
  dias: DiaReserva[];
  titulo: string;
  // "panel": sean agendando a alguien que le escribió o lo llamó directo
  modo?: "cliente" | "panel";
};

type NoDisponible = "lleno" | "pasado" | "cerrado";

const AVISO: Record<NoDisponible, string> = {
  cerrado: "Este día no estará atendiendo",
  lleno: "Ya no quedan horas este día",
  pasado: "Este día ya pasó",
};

const ESTILO: Record<NoDisponible, string> = {
  cerrado: "border-red-900 bg-red-950/50 text-red-400",
  lleno: "border-neutral-800 text-neutral-600",
  pasado: "border-neutral-900 text-neutral-700",
};

const CAMPO =
  "w-full rounded-md border border-neutral-700 bg-neutral-900 py-2 text-neutral-100 placeholder-neutral-500 md:py-3 md:text-lg";
const INPUT = CAMPO + " px-3 md:px-4";
const TITULO = "text-xs uppercase tracking-[0.2em] text-neutral-500 md:text-sm";
const LABEL = "mb-2 block " + TITULO;
const OPCIONAL = "normal-case tracking-normal text-neutral-600";

export default function BookingForm(props: Props) {
  // "agendar otro" remonta el formulario con otra key: así el
  // useActionState parte limpio sin tener que resetearlo a mano
  const [vuelta, setVuelta] = useState(0);
  return <Formulario key={vuelta} {...props} onOtro={() => setVuelta((v) => v + 1)} />;
}

function Formulario({
  servicios,
  dias,
  titulo,
  modo = "cliente",
  onOtro,
}: Props & { onOtro: () => void }) {
  const panel = modo === "panel";
  const id = useId();

  const [itemId, setItemId] = useState(servicios[0]?.id ?? "");
  const [fecha, setFecha] = useState("");
  const [slot, setSlot] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [instagram, setInstagram] = useState("");
  const [copiado, setCopiado] = useState<"" | "ok" | "error">("");

  // horas libres de cada día abierto de la semana + las que sean ocultó.
  // se pide todo junto por servicio, así cambiar de día es instantáneo
  const [semana, setSemana] = useState<{
    key: string;
    porDia: Record<string, string[]>;
    ocultas: number[];
  } | null>(null);

  const [state, formAction, pending] = useActionState<BookState, FormData>(book, null);

  // todo derivado de la key: así no toco setState dentro de los effects
  // y de paso las respuestas viejas nunca pisan a las nuevas
  const cargando = semana?.key !== itemId;
  const porDia = semana?.key === itemId ? semana.porDia : {};
  const ocultas = semana?.key === itemId ? semana.ocultas : [];
  const estaOculta = (s: string) => ocultas.includes(Date.parse(s));

  // el cliente no ve las horas que sean ocultó; sean sí (marcadas), por si
  // igual quiere darle esa hora a alguien que le escribió directo
  const horasDe = (day: string) => (porDia[day] ?? []).filter((s) => panel || !estaOculta(s));

  const diasLibres = dias
    .filter((d) => d.estado === "abierto" && horasDe(d.day).length > 0)
    .map((d) => d.day);
  const fechaElegida = diasLibres.includes(fecha) ? fecha : (diasLibres[0] ?? "");
  const slots = fechaElegida ? horasDe(fechaElegida) : [];
  const slotElegido = slots.includes(slot) ? slot : "";

  const servicio = servicios.find((s) => s.id === itemId);
  const hayRojos = dias.some((d) => d.estado === "cerrado");
  const hayOcultas = panel && slots.some(estaOculta);

  // `state` va en las deps a propósito: si la reserva falla (alguien tomó
  // esa hora o sean la ocultó justo antes) vuelvo a preguntar qué queda
  useEffect(() => {
    if (!itemId) return;

    let cancelado = false;
    const supabase = createClient();
    const abiertos = dias.filter((d) => d.estado === "abierto").map((d) => d.day);

    Promise.all([
      Promise.all(
        abiertos.map(async (day) => {
          const { data } = await supabase.rpc("available_slots", { p_date: day, p_item_id: itemId });
          return [day, (data ?? []).map((r) => r.slot)] as const;
        })
      ),
      // si la tabla todavía no existe esto viene vacío y no se oculta nada
      supabase.from("hidden_slots").select("starts_at").gte("starts_at", new Date().toISOString()),
    ]).then(([pares, { data: ocultadas }]) => {
      if (cancelado) return;
      setSemana({
        key: itemId,
        porDia: Object.fromEntries(pares),
        ocultas: (ocultadas ?? []).map((o) => Date.parse(o.starts_at)),
      });
    });

    return () => {
      cancelado = true;
    };
  }, [itemId, dias, state]);

  if (state?.ok && panel) {
    const origen = typeof window === "undefined" ? "" : window.location.origin;
    const texto =
      "Hola " +
      nombre.trim() +
      "! Te dejé agendado para " +
      (servicio?.name ?? "tu hora") +
      " el " +
      fechaLarga(state.hora) +
      " a las " +
      horaCorta(state.hora) +
      ". Acá puedes ver o cancelar tu hora: " +
      origen +
      "/hora/" +
      state.token;

    return (
      <div className="rounded-lg border border-emerald-800 bg-emerald-950/30 p-5 md:p-6">
        <p className="font-medium text-emerald-400 md:text-lg">Listo, quedó agendado</p>
        <p className="mt-2 text-sm text-neutral-300 md:text-base">
          {nombre.trim()} · {servicio?.name}
          <br />
          <span className="capitalize">{fechaLarga(state.hora)}</span> a las {horaCorta(state.hora)}
        </p>

        {numeroWa(telefono) ? (
          <>
            <a
              href={linkWhatsApp(telefono, texto)}
              target="_blank"
              rel="noreferrer"
              className="mt-5 block rounded-full bg-white py-3 text-center text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
            >
              Mandarle su hora por WhatsApp
            </a>
            <p className="mt-2 text-center text-xs text-neutral-500">
              Le llega el link para ver o cancelar su hora.
            </p>
          </>
        ) : usuarioInstagram(instagram) ? (
          <>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard.writeText(texto).then(
                    () => setCopiado("ok"),
                    () => setCopiado("error")
                  )
                }
                className="rounded-full bg-white py-3 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
              >
                {copiado === "ok" ? "Copiado ✓" : "1. Copiar mensaje"}
              </button>
              <a
                href={linkInstagram(instagram)}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-neutral-600 py-3 text-center text-sm font-semibold transition hover:border-neutral-400"
              >
                2. Abrir su Instagram
              </a>
            </div>
            <p className="mt-2 text-center text-xs text-neutral-500">
              {copiado === "error"
                ? "No se pudo copiar. Escríbele su hora a mano por Instagram."
                : "Copia el mensaje con su hora y pégaselo por Instagram."}
            </p>
          </>
        ) : (
          <p className="mt-5 rounded-md border border-dashed border-neutral-700 p-3 text-center text-xs text-neutral-400">
            No dejó WhatsApp ni Instagram, así que no hay cómo mandarle su hora.
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
          <button type="button" onClick={onOtro} className="underline underline-offset-4">
            Agendar otro
          </button>
          <Link
            href={"/panel/agenda?dia=" + diaDe(state.hora)}
            className="text-neutral-400 underline underline-offset-4 hover:text-white"
          >
            Ver ese día en la agenda
          </Link>
        </div>
      </div>
    );
  }

  if (state?.ok) {
    return (
      <div className="rounded-lg border border-emerald-800 bg-emerald-950/30 p-6 md:p-8">
        <p className="font-medium text-emerald-400 md:text-xl">Hora reservada</p>
        <p className="mt-2 text-sm text-neutral-300 md:text-lg">
          Te esperamos el {fechaLarga(state.hora)} a las {horaCorta(state.hora)}.
        </p>
        <p className="mt-4 text-xs text-neutral-500 md:text-sm">{DIRECCION}</p>

        <a href={"/hora/" + state.token} className="mt-6 block rounded-full bg-white py-3 text-center font-semibold text-neutral-950 transition hover:bg-neutral-200">
          Ver y guardar mi hora
        </a>
        <p className="mt-3 text-center text-xs text-neutral-500">
          Desde ahí puedes confirmar por WhatsApp, agregarla a tu calendario o
          cancelarla. Guarda ese link.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6 md:space-y-8">
      <input type="hidden" name="item_id" value={itemId} />
      <input type="hidden" name="starts_at" value={slotElegido} />

      <div>
        <label htmlFor={id + "-servicio"} className={LABEL}>Servicio</label>
        <select id={id + "-servicio"} value={itemId} onChange={(e) => setItemId(e.target.value)} className={INPUT}>
          {servicios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — ${s.price_clp.toLocaleString("es-CL")}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className={TITULO}>Día</span>
          <span className="text-xs text-neutral-500 md:text-sm">{titulo}</span>
        </div>

        <div role="group" aria-label="Día" className="grid grid-cols-7 gap-1.5 md:gap-2">
          {dias.map((d, i) => {
            const contenido = (
              <>
                <span className="text-[10px] uppercase tracking-wide opacity-70 md:text-xs">
                  {d.hoy ? "hoy" : d.dia}
                </span>
                <span className="text-base font-semibold leading-tight md:text-lg">{d.num}</span>
                <span className="text-[10px] uppercase tracking-wide opacity-70 md:text-xs">{d.mes}</span>
              </>
            );
            const caja = "flex w-full flex-col items-center rounded-lg border py-2 transition md:py-3";

            if (d.estado === "abierto" && cargando) {
              return (
                <div key={d.day} className={caja + " animate-pulse border-neutral-800 text-neutral-600"}>
                  {contenido}
                </div>
              );
            }

            if (d.estado === "abierto" && diasLibres.includes(d.day)) {
              const activo = d.day === fechaElegida;
              return (
                <button
                  key={d.day}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setFecha(d.day)}
                  className={
                    caja +
                    (activo
                      ? " border-white bg-white text-neutral-950"
                      : " border-neutral-700 text-neutral-200 hover:border-neutral-400")
                  }
                >
                  {contenido}
                </button>
              );
            }

            // abierto pero sin horas para este servicio = lleno
            const vista: NoDisponible = d.estado === "abierto" ? "lleno" : d.estado;

            return (
              <Tooltip
                key={d.day}
                text={AVISO[vista]}
                tone={vista === "cerrado" ? "danger" : "default"}
                align={i < 2 ? "start" : i > 4 ? "end" : "center"}
                className="flex"
              >
                <button type="button" aria-disabled="true" className={caja + " cursor-help " + ESTILO[vista]}>
                  {contenido}
                </button>
              </Tooltip>
            );
          })}
        </div>

        {hayRojos && (
          <p className="mt-3 flex items-center gap-2 text-xs text-neutral-500 md:text-sm">
            <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
            En rojo, los días que no se atiende.
          </p>
        )}

        {!cargando && diasLibres.length === 0 && (
          <p className="mt-3 rounded-md border border-dashed border-neutral-800 p-4 text-sm text-neutral-500">
            {panel ? (
              "No quedan horas libres esta semana."
            ) : (
              <>
                No quedan horas esta semana.{" "}
                <a href={"https://wa.me/" + WHATSAPP_LOCAL} target="_blank" rel="noreferrer" className="text-neutral-300 underline underline-offset-4">
                  Escríbele a Sean por WhatsApp
                </a>
                .
              </>
            )}
          </p>
        )}
      </div>

      {fechaElegida && (
        <div>
          <span className={LABEL}>Hora</span>
          <div role="group" aria-label="Hora" className="grid grid-cols-4 gap-2 md:grid-cols-5 md:gap-3">
            {slots.map((s) => {
              const activo = slotElegido === s;
              const oculta = panel && estaOculta(s);
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setSlot(s)}
                  className={
                    "rounded-md border py-2 text-sm transition md:py-3 md:text-base " +
                    (activo
                      ? "border-white bg-white text-neutral-950"
                      : oculta
                        ? "border-dashed border-neutral-600 text-neutral-400 hover:border-neutral-400"
                        : "border-neutral-700 text-neutral-300 hover:border-neutral-500")
                  }
                >
                  {horaCorta(s)}
                </button>
              );
            })}
          </div>
          {hayOcultas && (
            <p className="mt-2 text-xs text-neutral-500 md:text-sm">
              Las de borde punteado las sacaste de Reservar hora: tus clientes no las ven, pero tú igual
              puedes agendarlas.
            </p>
          )}
        </div>
      )}

      <div className="space-y-4 md:space-y-6">
        <div>
          <p className={TITULO}>{panel ? "Datos del cliente" : "Tus datos"}</p>
          <p className="mt-1 text-sm text-neutral-500 md:text-base">
            {panel
              ? "WhatsApp e Instagram son opcionales: sirven para mandarle su hora o avisarle si pasa algo."
              : "WhatsApp e Instagram son opcionales, en caso de que Sean necesite contactarse contigo."}
          </p>
        </div>

        <div>
          <label htmlFor={id + "-nombre"} className={LABEL}>
            Nombre
          </label>
          <input
            id={id + "-nombre"}
            name="name"
            required
            minLength={2}
            maxLength={80}
            autoComplete={panel ? "off" : "name"}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={INPUT}
          />
        </div>

        <div>
          <label htmlFor={id + "-tel"} className={LABEL}>
            WhatsApp <span className={OPCIONAL}>(opcional)</span>
          </label>
          <input
            id={id + "-tel"}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete={panel ? "off" : "tel"}
            placeholder="+56 9 1234 5678"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className={INPUT}
          />
        </div>

        <div>
          <label htmlFor={id + "-ig"} className={LABEL}>
            Instagram <span className={OPCIONAL}>(opcional)</span>
          </label>
          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-500 md:left-4 md:text-lg"
            >
              @
            </span>
            <input
              id={id + "-ig"}
              name="instagram"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={60}
              placeholder={panel ? "su_usuario" : "tu_usuario"}
              value={instagram}
              // si pegan "@usuario" o el link del perfil, queda solo el usuario
              onChange={(e) => setInstagram(usuarioInstagram(e.target.value))}
              className={CAMPO + " pl-8 pr-3 md:pl-10 md:pr-4"}
            />
          </div>
        </div>
      </div>

      {slotElegido && servicio && (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4 text-sm text-neutral-300 md:text-base">
          {servicio.name} el <span className="font-medium text-white">{fechaLarga(slotElegido)}</span> a las{" "}
          <span className="font-medium text-white">{horaCorta(slotElegido)}</span>
        </p>
      )}

      {state?.ok === false && (
        <p role="alert" className="text-sm text-red-400 md:text-base">{state.error}</p>
      )}

      <div>
        <button type="submit" disabled={pending || !slotElegido} className="w-full rounded-full bg-white px-3 py-4 font-semibold text-neutral-950 transition hover:bg-neutral-200 disabled:opacity-30 md:py-5 md:text-lg">
          {pending ? (panel ? "Agendando..." : "Reservando...") : panel ? "Agendar" : "Reservar"}
        </button>
        {!slotElegido && !pending && (
          <p className="mt-2 text-center text-xs text-neutral-600 md:text-sm">
            Elige un día y una hora para {panel ? "agendar" : "reservar"}
          </p>
        )}
      </div>
    </form>
  );
}
