"use client";

import { useActionState, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { linkInstagram, linkWhatsApp } from "@/lib/contacto";
import { anularCobro, cambiarEstadoCita, type FormState } from "./actions";

const ROJO =
  "w-full rounded-full border border-red-900 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-950/60 disabled:opacity-50";
const GRIS =
  "w-full rounded-full border border-neutral-700 py-3 text-sm font-semibold text-neutral-200 transition hover:border-neutral-500 disabled:opacity-50";

function Boton({ children, pendiente, className }: { children: ReactNode; pendiente: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className={className}>
      {pending ? pendiente : children}
    </button>
  );
}

function Opcion({
  accion,
  campos,
  boton,
  pendiente,
  ayuda,
  estilo,
}: {
  accion: (formData: FormData) => void;
  campos: Record<string, string>;
  boton: string;
  pendiente: string;
  ayuda: string;
  estilo: string;
}) {
  return (
    <form action={accion}>
      {Object.entries(campos).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Boton pendiente={pendiente} className={estilo}>
        {boton}
      </Boton>
      <p className="mt-1.5 text-center text-xs text-neutral-500">{ayuda}</p>
    </form>
  );
}

// la parte de la cita con la hora y el nombre: al tocarla se abre un cuadro
// con lo que se puede hacer según cómo esté la cita
export function CitaOpciones({
  id,
  estado,
  nombre,
  detalle,
  horario,
  telefono,
  instagram,
  children,
}: {
  id: string;
  estado: "booked" | "done" | "no_show";
  nombre: string;
  detalle: string;
  horario: string;
  telefono: string | null;
  instagram: string | null;
  children: ReactNode;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);

  const [resultado, enviar] = useActionState(async (prev: FormState, formData: FormData) => {
    const r = formData.get("anular")
      ? await anularCobro(prev, formData)
      : await cambiarEstadoCita(prev, formData);
    if (r && "ok" in r) dialogo.current?.close();
    return r;
  }, null);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => dialogo.current?.showModal()}
        className="min-w-0 flex-1 cursor-pointer text-left transition hover:opacity-75"
      >
        {children}
      </button>

      <dialog
        ref={dialogo}
        aria-label={"Cita de " + nombre}
        onClick={(e) => {
          // tocar afuera del cuadro lo cierra
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-neutral-800 bg-neutral-950 p-0 text-neutral-100 backdrop:bg-black/70"
      >
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{nombre}</p>
              <p className="text-sm text-neutral-400">{detalle}</p>
              <p className="font-mono text-sm text-neutral-400">{horario}</p>
              {estado === "done" && <p className="mt-1 text-sm text-emerald-400">Cobrada</p>}
              {estado === "no_show" && <p className="mt-1 text-sm text-amber-500">No vino</p>}
            </div>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => dialogo.current?.close()}
              className="-mr-1 -mt-1 rounded-full px-2 text-2xl leading-none text-neutral-500 transition hover:text-white"
            >
              ×
            </button>
          </div>

          {(telefono || instagram) && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {telefono && (
                <a href={linkWhatsApp(telefono)} target="_blank" rel="noreferrer" className="text-emerald-400 underline underline-offset-4">
                  Escribirle por WhatsApp
                </a>
              )}
              {instagram && (
                <a href={linkInstagram(instagram)} target="_blank" rel="noreferrer" className="text-neutral-200 underline underline-offset-4">
                  Su Instagram
                </a>
              )}
            </div>
          )}

          <div className="mt-5 space-y-4">
            {estado === "booked" && (
              <>
                <Opcion
                  accion={enviar}
                  campos={{ id, estado: "cancelled" }}
                  boton="Cancelar hora"
                  pendiente="Cancelando..."
                  estilo={ROJO}
                  ayuda="Avisó que no puede venir: la hora vuelve a quedar libre para otro cliente."
                />
                <Opcion
                  accion={enviar}
                  campos={{ id, estado: "no_show" }}
                  boton="No vino"
                  pendiente="Guardando..."
                  estilo={GRIS}
                  ayuda="No llegó y no avisó: queda anotado."
                />
              </>
            )}

            {estado === "done" && (
              <>
                <Opcion
                  accion={enviar}
                  campos={{ id, anular: "1", cancelar: "1" }}
                  boton="Anular cobro y cancelar hora"
                  pendiente="Anulando..."
                  estilo={ROJO}
                  ayuda="Se cobró por error y la hora no va: se borra la venta de la caja y del resumen, y la hora queda libre."
                />
                <Opcion
                  accion={enviar}
                  campos={{ id, anular: "1" }}
                  boton="Anular cobro"
                  pendiente="Anulando..."
                  estilo={GRIS}
                  ayuda="Solo se borra la venta; la cita vuelve a quedar reservada para cobrarla bien."
                />
              </>
            )}

            {estado === "no_show" && (
              <Opcion
                accion={enviar}
                campos={{ id, estado: "booked" }}
                boton="Deshacer: sí vino"
                pendiente="Guardando..."
                estilo={GRIS}
                ayuda="La cita vuelve a quedar reservada para cobrarla."
              />
            )}
          </div>

          {resultado && "error" in resultado && (
            <p role="alert" className="mt-4 text-sm text-red-400">
              {resultado.error}
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}

// para devolver una cancelada a reservada (si fue sin querer)
export function Reactivar({ id }: { id: string }) {
  const [resultado, enviar] = useActionState(cambiarEstadoCita, null);

  return (
    <form action={enviar} className="shrink-0 text-right">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="estado" value="booked" />
      <Boton pendiente="..." className="text-xs text-neutral-400 underline underline-offset-4 transition hover:text-white">
        reactivar
      </Boton>
      {resultado && "error" in resultado && (
        <p role="alert" className="text-xs text-red-400">
          {resultado.error}
        </p>
      )}
    </form>
  );
}
