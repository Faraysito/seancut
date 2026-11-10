"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import { Tooltip } from "@/components/tooltip";
import {
  agregarTramo,
  alternarDia,
  alternarHora,
  cerrarOtraFecha,
  editarTramo,
  mostrarTodasDelDia,
  quitarTramo,
  type FormState,
} from "./actions";

const INPUT =
  "rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100";
const BOTON =
  "rounded-md bg-white px-3 py-1.5 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:opacity-50";

function MensajeError({ estado }: { estado: FormState }) {
  if (!estado || !("error" in estado)) return null;
  return (
    <p role="alert" className="mt-2 text-xs text-red-400">
      {estado.error}
    </p>
  );
}

function Horas({
  desde,
  hasta,
  setDesde,
  setHasta,
}: {
  desde: string;
  hasta: string;
  setDesde: (v: string) => void;
  setHasta: (v: string) => void;
}) {
  return (
    <>
      <input type="time" name="opens" aria-label="Desde" required step={1800} value={desde} onChange={(e) => setDesde(e.target.value)} className={INPUT} />
      <span className="text-sm text-neutral-500">a</span>
      <input type="time" name="closes" aria-label="Hasta" required step={1800} value={hasta} onChange={(e) => setHasta(e.target.value)} className={INPUT} />
    </>
  );
}

// un horario del día, editable ahí mismo. el botón guardar solo aparece
// cuando cambiaste algo, para que no quede la duda de si hay que apretarlo
export function TramoEditable({
  id,
  dow,
  opens,
  closes,
}: {
  id: string;
  dow: number;
  opens: string;
  closes: string;
}) {
  // inputs controlados: si el server devuelve un error, lo que escribiste
  // se queda ahí en vez de volver al valor anterior
  const [desde, setDesde] = useState(opens);
  const [hasta, setHasta] = useState(closes);
  const [estado, guardar, guardando] = useActionState(editarTramo, null);
  const [estadoQuitar, quitar, quitando] = useActionState(quitarTramo, null);

  const cambiado = desde !== opens || hasta !== closes;
  const guardado = !cambiado && !!estado && "ok" in estado;

  return (
    <div>
      <form action={guardar} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="dow" value={dow} />
        <Horas desde={desde} hasta={hasta} setDesde={setDesde} setHasta={setHasta} />
        {cambiado && (
          <button disabled={guardando} className={BOTON}>
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        )}
        {guardado && <span className="text-xs text-emerald-400">Guardado ✓</span>}
        <button
          formAction={quitar}
          formNoValidate
          disabled={quitando}
          className="ml-auto text-xs text-neutral-500 underline underline-offset-4 transition hover:text-red-400"
        >
          {quitando ? "Quitando..." : "Quitar"}
        </button>
      </form>
      <MensajeError estado={estado} />
      <MensajeError estado={estadoQuitar} />
    </div>
  );
}

// si el día no tiene ningún horario, el formulario queda abierto de una
export function AgregarTramo({ dow, primero }: { dow: number; primero: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [desde, setDesde] = useState("10:00");
  const [hasta, setHasta] = useState("20:00");

  const [estado, agregar, agregando] = useActionState(
    async (prev: FormState, formData: FormData) => {
      const r = await agregarTramo(prev, formData);
      if (r && "ok" in r) setAbierto(false);
      return r;
    },
    null
  );

  if (!primero && !abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="mt-2 text-sm text-neutral-400 underline underline-offset-4 transition hover:text-white"
      >
        + Agregar otro horario
      </button>
    );
  }

  return (
    <div className="mt-2">
      <form action={agregar} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="dow" value={dow} />
        <Horas desde={desde} hasta={hasta} setDesde={setDesde} setHasta={setHasta} />
        <button disabled={agregando} className={BOTON}>
          {agregando ? "Agregando..." : primero ? "Poner horario" : "Agregar"}
        </button>
        {!primero && (
          <button type="button" onClick={() => setAbierto(false)} className="text-xs text-neutral-500 underline underline-offset-4">
            cancelar
          </button>
        )}
      </form>
      <MensajeError estado={estado} />
    </div>
  );
}

export function ToggleDia({ day, cerrado }: { day: string; cerrado: boolean }) {
  const [estado, accion, pendiente] = useActionState(alternarDia, null);

  return (
    <form action={accion}>
      <input type="hidden" name="day" value={day} />
      <input type="hidden" name="cerrar" value={cerrado ? "0" : "1"} />
      {cerrado ? (
        <button
          disabled={pendiente}
          className="rounded-full border border-neutral-600 px-3 py-1.5 text-xs font-medium text-neutral-200 transition hover:border-neutral-400 disabled:opacity-50"
        >
          {pendiente ? "Guardando..." : "Volver a atender este día"}
        </button>
      ) : (
        <Tooltip
          text="A tus clientes les va a salir este día en rojo con el aviso «Este día no estará atendiendo», y no van a poder reservar."
          align="end"
        >
          <button
            disabled={pendiente}
            className="rounded-full border border-red-900 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-950/60 disabled:opacity-50"
          >
            {pendiente ? "Guardando..." : "No corto pelo este día"}
          </button>
        </Tooltip>
      )}
      <MensajeError estado={estado} />
    </form>
  );
}

export function CerrarOtraFecha({ min }: { min: string }) {
  const [estado, accion, pendiente] = useActionState(cerrarOtraFecha, null);

  return (
    <div>
      <form action={accion} className="flex flex-wrap items-center gap-2">
        <input type="date" name="day" required min={min} aria-label="Fecha" className={INPUT} />
        <button
          disabled={pendiente}
          className="rounded-md border border-red-900 px-3 py-1.5 text-sm text-red-400 transition hover:bg-red-950/60 disabled:opacity-50"
        >
          {pendiente ? "Guardando..." : "No corto pelo ese día"}
        </button>
      </form>
      <MensajeError estado={estado} />
    </div>
  );
}

export function ReabrirFecha({ day }: { day: string }) {
  const [estado, accion, pendiente] = useActionState(alternarDia, null);

  return (
    <form action={accion} className="text-right">
      <input type="hidden" name="day" value={day} />
      <input type="hidden" name="cerrar" value="0" />
      <button disabled={pendiente} className="text-xs text-neutral-400 underline underline-offset-4 transition hover:text-white">
        {pendiente ? "Guardando..." : "volver a atender"}
      </button>
      <MensajeError estado={estado} />
    </form>
  );
}

type Hora = { slot: string; label: string };
type CambioHora = { ms: number; ocultar: boolean } | "todas";

// las horas libres del día como botones: tocar una la saca de "Reservar
// hora" (queda tachada) y tocarla de nuevo la devuelve. el cambio se ve al
// tiro y se guarda por detrás; si falla, vuelve a como estaba y avisa.
export function HorasDelDia({
  day,
  horas,
  ocultas,
}: {
  day: string;
  horas: Hora[];
  ocultas: string[];
}) {
  const [guardando, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [ocultasAhora, cambiar] = useOptimistic(
    ocultas.map((o) => Date.parse(o)),
    (actual: number[], cambio: CambioHora) => {
      if (cambio === "todas") return [];
      return cambio.ocultar ? [...actual, cambio.ms] : actual.filter((m) => m !== cambio.ms);
    }
  );

  const estaOculta = (slot: string) => ocultasAhora.includes(Date.parse(slot));
  const visibles = horas.filter((h) => !estaOculta(h.slot)).length;

  function alternar(slot: string) {
    const ocultar = !estaOculta(slot);
    setError("");
    startTransition(async () => {
      cambiar({ ms: Date.parse(slot), ocultar });
      const r = await alternarHora(slot, ocultar);
      if (r && "error" in r) setError(r.error);
    });
  }

  function mostrarTodas() {
    setError("");
    startTransition(async () => {
      cambiar("todas");
      const r = await mostrarTodasDelDia(day);
      if (r && "error" in r) setError(r.error);
    });
  }

  if (horas.length === 0) {
    return <p className="text-sm text-neutral-500">No quedan horas libres.</p>;
  }

  return (
    <div>
      <ul className="flex flex-wrap gap-1.5">
        {horas.map((h) => {
          const oculta = estaOculta(h.slot);
          return (
            <li key={h.slot}>
              <button
                type="button"
                aria-pressed={!oculta}
                aria-label={h.label + (oculta ? ", oculta para tus clientes" : ", visible para tus clientes")}
                onClick={() => alternar(h.slot)}
                className={
                  "rounded-md border px-2 py-1 font-mono text-xs transition " +
                  (oculta
                    ? "border-dashed border-neutral-800 text-neutral-600 line-through hover:border-neutral-600"
                    : "border-neutral-600 text-white hover:border-neutral-300")
                }
              >
                {h.label}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="text-neutral-500">
          {visibles === horas.length
            ? "Tus clientes ven todas"
            : visibles === 0
              ? "Tus clientes no ven ninguna"
              : "Tus clientes ven " + visibles + " de " + horas.length}
        </span>
        {visibles < horas.length && (
          <button type="button" onClick={mostrarTodas} className="text-neutral-400 underline underline-offset-4 transition hover:text-white">
            mostrar todas
          </button>
        )}
        {guardando && <span className="text-neutral-600">Guardando...</span>}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
