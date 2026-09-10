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
      <div className="rounded-md border border-green-600 p-6">
        <p className="font-medium text-green-700">Hora reservada</p>
        <p className="mt-1 text-sm text-neutral-600">
          Te esperamos el {diaLargo(state.hora)} a las {horaCorta(state.hora)}.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="item_id" value={itemId} />
      <input type="hidden" name="starts_at" value={slotElegido} />

      <div>
        <label className="mb-1 block text-sm font-medium">Servicio</label>
        <select
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
        >
          {servicios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — ${s.price_clp.toLocaleString("es-CL")}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Día</label>
        <input
          type="date"
          value={fecha}
          min={hoyEnChile()}
          onChange={(e) => setFecha(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Hora</label>
        {cargando && <p className="text-sm text-neutral-500">Buscando horas...</p>}
        {!cargando && slots.length === 0 && (
          <p className="text-sm text-neutral-500">No quedan horas ese día</p>
        )}
        {!cargando && slots.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {slots.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSlot(s)}
                className={
                  "rounded-md border py-2 text-sm " +
                  (slotElegido === s ? "border-black bg-black text-white" : "")
                }
              >
                {horaCorta(s)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Nombre</label>
        <input name="name" required className="w-full rounded-md border px-3 py-2" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">WhatsApp</label>
        <input
          name="phone"
          required
          placeholder="+56912345678"
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      {state?.ok === false && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || !slotElegido}
        className="w-full rounded-md bg-black px-3 py-3 text-white disabled:opacity-40"
      >
        {pending ? "Reservando..." : "Reservar"}
      </button>
    </form>
  );
}