"use client";

import { useActionState, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { book, type BookState } from "./actions";

const TZ = "America/Santiago";

type Servicio = {
  id: string;
  name: string;
  price_clp: number;
  duration_min: number | null;
};

function hoyEnChile() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

function horaCorta(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  });
}

function diaLargo(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TZ,
  });
}

const INPUT =
  "w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 placeholder-neutral-500 md:px-4 md:py-3 md:text-lg";
const LABEL =
  "mb-2 block text-xs uppercase tracking-[0.2em] text-neutral-500 md:text-sm";

export default function BookingForm({ servicios }: { servicios: Servicio[] }) {
  const [itemId, setItemId] = useState(servicios[0]?.id ?? "");
  const [fecha, setFecha] = useState(hoyEnChile());
  const [slot, setSlot] = useState("");
  const [data, setData] = useState<{ key: string; slots: string[] } | null>(null);

  const [state, formAction, pending] = useActionState<BookState, FormData>(
    book,
    null
  );

  // la key dice a qué combinación servicio+día pertenece lo que hay cargado.
  // con eso "cargando", "slots" y el slot elegido salen derivados y no
  // necesito llamar setState dentro del effect.
  const key = itemId + "|" + fecha;
  const cargando = data?.key !== key;
  const slots = data?.key === key ? data.slots : [];
  const slotElegido = slots.includes(slot) ? slot : "";

  useEffect(() => {
    if (!itemId || !fecha) return;

    let cancelado = false;
    const supabase = createClient();

    supabase
      .rpc("available_slots", { p_date: fecha, p_item_id: itemId })
      .then(({ data }) => {
        if (cancelado) return;
        setData({
          key: itemId + "|" + fecha,
          slots: (data ?? []).map((r) => r.slot),
        });
      });

    return () => {
      cancelado = true;
    };
  }, [itemId, fecha]);

  if (state?.ok) {
    return (
      <div className="rounded-lg border border-emerald-800 bg-emerald-950/40 p-6 md:p-8">
        <p className="font-medium text-emerald-400 md:text-xl">Hora reservada</p>
        <p className="mt-2 text-sm text-neutral-300 md:text-lg">
          Te esperamos el {diaLargo(state.hora)} a las {horaCorta(state.hora)}.
        </p>
        <p className="mt-4 text-xs text-neutral-500 md:text-sm">
          Heriberto Palacios Bonilla 2731, Coquimbo
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6 md:space-y-8">
      <input type="hidden" name="item_id" value={itemId} />
      <input type="hidden" name="starts_at" value={slotElegido} />

      <div>
        <label className={LABEL}>Servicio</label>
        <select value={itemId} onChange={(e) => setItemId(e.target.value)} className={INPUT}>
          {servicios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — ${s.price_clp.toLocaleString("es-CL")}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={LABEL}>Día</label>
        <input type="date" value={fecha} min={hoyEnChile()} onChange={(e) => setFecha(e.target.value)} className={INPUT} />
      </div>

      <div>
        <label className={LABEL}>Hora</label>
        {cargando && <p className="text-sm text-neutral-500">Buscando horas...</p>}
        {!cargando && slots.length === 0 && (
          <p className="text-sm text-neutral-500">No quedan horas ese día</p>
        )}
        {!cargando && slots.length > 0 && (
          <div className="grid grid-cols-4 gap-2 md:grid-cols-5 md:gap-3">
            {slots.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSlot(s)}
                className={
                  "rounded-md border py-2 text-sm transition md:py-3 md:text-base " +
                  (slotElegido === s
                    ? "border-white bg-white text-neutral-950"
                    : "border-neutral-700 text-neutral-300 hover:border-neutral-500")
                }
              >
                {horaCorta(s)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className={LABEL}>Nombre</label>
        <input name="name" required className={INPUT} />
      </div>

      <div>
        <label className={LABEL}>WhatsApp</label>
        <input name="phone" required placeholder="+56912345678" className={INPUT} />
        <p className="mt-2 text-xs text-neutral-600 md:text-sm">Solo para avisarte si pasa algo con tu hora.</p>
      </div>

      {state?.ok === false && <p className="text-sm text-red-400 md:text-base">{state.error}</p>}

      <button type="submit" disabled={pending || !slotElegido} className="w-full rounded-full bg-white px-3 py-4 font-semibold text-neutral-950 transition hover:bg-neutral-200 disabled:opacity-30 md:py-5 md:text-lg">
        {pending ? "Reservando..." : "Reservar"}
      </button>
    </form>
  );
}
