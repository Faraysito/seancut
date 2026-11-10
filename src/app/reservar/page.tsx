import { ViewTransition } from "react";
import Link from "next/link";
import { semanaParaReservar, serviciosReservables } from "@/lib/reservas";
import BookingForm from "./booking-form";

export default async function Reservar() {
  const [servicios, { dias, titulo }] = await Promise.all([
    serviciosReservables(),
    semanaParaReservar(),
  ]);

  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      default="none"
    >
      <main className="min-h-dvh bg-neutral-950 text-neutral-100">
        <div className="mx-auto w-full max-w-md px-6 py-12 md:max-w-xl md:py-20">
          <Link href="/" transitionTypes={["nav-back"]} className="inline-flex items-center gap-2 rounded-full border border-neutral-700 px-5 py-2.5 text-sm text-neutral-300 transition hover:border-neutral-500 hover:text-white md:px-6 md:py-3 md:text-base">← Volver</Link>

          <h1 className="mt-6 text-2xl font-bold tracking-tight md:mt-8 md:text-4xl">Reservar hora</h1>
          <p className="mb-8 text-xs uppercase tracking-[0.3em] text-neutral-500 md:mb-12 md:text-sm">sean cut</p>

          <BookingForm servicios={servicios} dias={dias} titulo={titulo} />
        </div>
      </main>
    </ViewTransition>
  );
}
