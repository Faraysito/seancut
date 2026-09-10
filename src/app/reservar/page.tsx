import { createClient } from "@/lib/supabase/server";
import BookingForm from "./booking-form";

export default async function Reservar() {
  const supabase = await createClient();

  const { data: servicios } = await supabase
    .from("items")
    .select("id, name, price_clp, duration_min")
    .eq("brand", "seancut")
    .eq("kind", "service")
    .order("price_clp");

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">Reservar hora</h1>
      <p className="mb-6 text-sm text-neutral-500">Sean Cut</p>
      <BookingForm servicios={servicios ?? []} />
    </main>
  );
}