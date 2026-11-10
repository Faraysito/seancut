"use client";

import { useActionState, useId, useState } from "react";
import { InfoTip } from "@/components/tooltip";
import { CATEGORIAS, MARCAS, type Categoria, type Marca } from "@/lib/gastos";
import { borrarGasto, registrarGasto, type GastoState } from "./actions";

const BASE =
  "w-full rounded-md border border-neutral-700 bg-neutral-900 py-2 text-sm text-neutral-100 placeholder-neutral-500";
const TITULO = "text-xs uppercase tracking-[0.2em] text-neutral-500";
const LABEL = "mb-2 block " + TITULO;

// la cajita de cada opción (categoría o negocio): un radio de verdad
// escondido, así se puede elegir con el teclado y con las flechas
const OPCION =
  "block h-full rounded-lg border border-neutral-700 px-3 py-2 transition hover:border-neutral-500 peer-checked:border-white peer-checked:bg-white peer-checked:text-neutral-950 peer-focus-visible:ring-2 peer-focus-visible:ring-white/60";

export function GastoForm({ hoy }: { hoy: string }) {
  const id = useId();
  const [detalle, setDetalle] = useState("");
  const [monto, setMonto] = useState(""); // solo dígitos
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [marca, setMarca] = useState<Marca>("seancut");
  const [marcaATiro, setMarcaATiro] = useState(true);

  const [estado, enviar, guardando] = useActionState(
    async (prev: GastoState, formData: FormData) => {
      const r = await registrarGasto(prev, formData);
      // queda listo para el siguiente. la categoría, el negocio y la fecha
      // se mantienen por si está anotando varias compras parecidas
      if (r && "ok" in r) {
        setDetalle("");
        setMonto("");
      }
      return r;
    },
    null
  );

  const falta = !detalle.trim()
    ? "qué compraste"
    : !monto
      ? "cuánto pagaste"
      : !categoria
        ? "elegir la categoría"
        : "";

  return (
    <form action={enviar} className="space-y-5 rounded-lg border border-neutral-800 p-4 md:p-6">
      <h2 className="font-medium">Anotar un gasto</h2>

      <div>
        <label htmlFor={id + "-detalle"} className={LABEL}>
          ¿Qué compraste?
        </label>
        <input
          id={id + "-detalle"}
          name="detalle"
          required
          maxLength={120}
          autoComplete="off"
          placeholder="Ej: 2 navajas, 10 poleras, un chaleco"
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
          className={BASE + " px-3"}
        />
      </div>

      <div>
        <span id={id + "-cat"} className={LABEL}>
          Categoría
        </span>
        <div role="radiogroup" aria-labelledby={id + "-cat"} className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {CATEGORIAS.map((c) => (
            <label key={c.id} className="cursor-pointer">
              <input
                type="radio"
                name="categoria"
                value={c.id}
                checked={categoria === c.id}
                onChange={() => {
                  setCategoria(c.id);
                  // la mercadería es de SeanNova y lo demás de la barbería,
                  // salvo que ya haya elegido el negocio a mano
                  if (marcaATiro) setMarca(c.marca);
                }}
                className="peer sr-only"
              />
              <span className={OPCION}>
                <span className="block text-sm font-medium">{c.label}</span>
                <span className="block truncate text-xs opacity-60">{c.ejemplos}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={id + "-monto"} className={LABEL}>
            ¿Cuánto pagaste?
          </label>
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-neutral-500">
              $
            </span>
            <input
              id={id + "-monto"}
              inputMode="numeric"
              autoComplete="off"
              required
              placeholder="25.000"
              // se ve con puntos (25.000) pero se manda solo el número
              value={monto ? Number(monto).toLocaleString("es-CL") : ""}
              onChange={(e) => setMonto(e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 9))}
              className={BASE + " pl-7 pr-3 tabular-nums"}
            />
          </div>
          <input type="hidden" name="monto" value={monto} />
        </div>

        <div>
          <label htmlFor={id + "-fecha"} className={LABEL}>
            Fecha
          </label>
          <input
            id={id + "-fecha"}
            type="date"
            name="fecha"
            required
            defaultValue={hoy}
            max={hoy}
            className={BASE + " px-3"}
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1.5">
          <span id={id + "-marca"} className={TITULO}>
            Negocio
          </span>
          <InfoTip text="Así el Resumen separa lo de la barbería (Sean Cut) y lo de la ropa (SeanNova). Se elige solo según la categoría, pero lo puedes cambiar." />
        </div>
        <div role="radiogroup" aria-labelledby={id + "-marca"} className="grid grid-cols-2 gap-2">
          {MARCAS.map((m) => (
            <label key={m.id} className="cursor-pointer">
              <input
                type="radio"
                name="marca"
                value={m.id}
                checked={marca === m.id}
                onChange={() => {
                  setMarca(m.id);
                  setMarcaATiro(false);
                }}
                className="peer sr-only"
              />
              <span className={OPCION + " text-center"}>
                <span className="block text-sm font-medium">{m.label}</span>
                <span className="block text-xs opacity-60">{m.ayuda}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <button
          disabled={guardando || !!falta}
          className="w-full rounded-full bg-white py-3 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200 disabled:opacity-30"
        >
          {guardando ? "Guardando..." : "Anotar gasto"}
        </button>
        {falta && !guardando && (
          <p className="mt-2 text-center text-xs text-neutral-600">Falta {falta}</p>
        )}
      </div>

      {estado && "error" in estado && (
        <p role="alert" className="text-sm text-red-400">
          {estado.error}
        </p>
      )}
      {estado && "ok" in estado && (
        <p role="status" className="text-sm text-emerald-400">
          {estado.texto} ✓
        </p>
      )}
    </form>
  );
}

// "borrar" pide confirmar antes, para no perder un gasto por un toque sin querer
export function BorrarGasto({ id, detalle }: { id: string; detalle: string }) {
  const [seguro, setSeguro] = useState(false);
  const [estado, borrar, borrando] = useActionState(borrarGasto, null);

  if (!seguro) {
    return (
      <button
        type="button"
        aria-label={"Borrar gasto: " + detalle}
        onClick={() => setSeguro(true)}
        className="shrink-0 text-xs text-neutral-500 underline underline-offset-4 transition hover:text-red-400"
      >
        borrar
      </button>
    );
  }

  return (
    <form action={borrar} className="flex shrink-0 flex-wrap items-center justify-end gap-2 text-xs">
      <input type="hidden" name="id" value={id} />
      <button disabled={borrando} className="rounded bg-red-600 px-2 py-1 font-medium text-white disabled:opacity-50">
        {borrando ? "Borrando..." : "Sí, borrar"}
      </button>
      <button type="button" onClick={() => setSeguro(false)} className="text-neutral-400 underline underline-offset-4">
        no
      </button>
      {estado && "error" in estado && (
        <span role="alert" className="basis-full text-right text-red-400">
          {estado.error}
        </span>
      )}
    </form>
  );
}
