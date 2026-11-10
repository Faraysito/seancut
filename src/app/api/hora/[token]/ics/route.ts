import { createClient } from "@/lib/supabase/server";
import { DIRECCION } from "@/lib/local";

// YYYYMMDDTHHMMSSZ, que es lo que pide el formato iCalendar
function aUtc(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapar(t: string) {
  return t.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = await createClient();

  const { data } = await supabase.rpc("appointment_by_token", { p_token: token });
  const cita = data?.[0];

  if (!cita || cita.status === "cancelled") {
    return new Response("No encontrado", { status: 404 });
  }

  // CRLF obligatorio: hay clientes de calendario que rechazan el archivo con \n
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sean Cut//Reservas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:" + token + "@seancut",
    "DTSTAMP:" + aUtc(new Date().toISOString()),
    "DTSTART:" + aUtc(cita.starts_at),
    "DTEND:" + aUtc(cita.ends_at),
    "SUMMARY:" + escapar("Sean Cut · " + cita.servicio),
    "LOCATION:" + escapar(DIRECCION),
    "DESCRIPTION:" + escapar("Tu hora en Sean Cut. " + cita.servicio + "."),
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    "DESCRIPTION:" + escapar("Tu hora en Sean Cut es en 15 minutos"),
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-PT12H",
    "ACTION:DISPLAY",
    "DESCRIPTION:" + escapar("Mañana tienes hora en Sean Cut"),
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sean-cut.ics"',
    },
  });
}
