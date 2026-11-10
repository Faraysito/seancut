"use client";

import { useRef } from "react";
import { linkInstagram, linkWhatsApp, telefonoLegible } from "@/lib/contacto";

const ACCION =
  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition";

// botón "Datos del cliente": abre un cuadro con su whatsapp e instagram
// y botones para escribirle por cualquiera de los dos
export function DatosCliente({
  nombre,
  telefono,
  instagram,
  compacto = false,
}: {
  nombre: string;
  telefono: string | null;
  instagram: string | null;
  // en las tarjetas angostas de hoy, en el celu dice solo "Datos"
  compacto?: boolean;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={"Datos del cliente: " + nombre}
        onClick={() => dialogo.current?.showModal()}
        className="shrink-0 rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300 transition hover:border-neutral-400 hover:text-white"
      >
        {compacto ? (
          <>
            <span className="sm:hidden">Datos</span>
            <span className="hidden sm:inline">Datos del cliente</span>
          </>
        ) : (
          "Datos del cliente"
        )}
      </button>

      <dialog
        ref={dialogo}
        aria-label={"Datos de " + nombre}
        onClick={(e) => {
          // tocar afuera del cuadro lo cierra
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-neutral-800 bg-neutral-950 p-0 text-neutral-100 backdrop:bg-black/70"
      >
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Datos del cliente</p>
              <p className="mt-1 truncate text-lg font-semibold">{nombre}</p>
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

          <dl className="mt-5 divide-y divide-neutral-800 border-y border-neutral-800">
            <div className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <dt className="text-xs text-neutral-500">WhatsApp</dt>
                <dd className={"truncate " + (telefono ? "font-mono text-sm" : "text-sm text-neutral-600")}>
                  {telefono ? telefonoLegible(telefono) : "No lo dejó"}
                </dd>
              </div>
              {telefono && (
                <a
                  href={linkWhatsApp(telefono)}
                  target="_blank"
                  rel="noreferrer"
                  className={ACCION + " bg-emerald-500 text-neutral-950 hover:bg-emerald-400"}
                >
                  Escribir por WhatsApp
                </a>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <dt className="text-xs text-neutral-500">Instagram</dt>
                <dd className={"truncate text-sm " + (instagram ? "" : "text-neutral-600")}>
                  {instagram ? "@" + instagram : "No lo dejó"}
                </dd>
              </div>
              {instagram && (
                <a
                  href={linkInstagram(instagram)}
                  target="_blank"
                  rel="noreferrer"
                  className={ACCION + " bg-white text-neutral-950 hover:bg-neutral-200"}
                >
                  Abrir Instagram
                </a>
              )}
            </div>
          </dl>

          {!telefono && !instagram && (
            <p className="mt-4 text-sm text-neutral-500">
              No dejó cómo contactarlo. Si vuelve a reservar y deja su WhatsApp o Instagram, va a
              aparecer acá.
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}
