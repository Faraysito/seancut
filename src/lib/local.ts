// TODO: cambiar por el WhatsApp real de Sean cuando lo confirme.
// Por ahora apunta al de Diego para poder probar el flujo.
export const WHATSAPP_LOCAL = "56932153527";

export const DIRECCION = "Heriberto Palacios Bonilla 2731, Coquimbo";

export const MAPS =
  "https://www.google.com/maps/search/?api=1&query=Heriberto+Palacios+Bonilla+2731+Coquimbo";

export const TZ = "America/Santiago";

export function fechaLarga(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TZ,
  });
}

export function horaCorta(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  });
}

// el cliente le escribe a Sean, no al revés: así no hace falta
// ningún número emisor ni la API de Meta
export function linkConfirmacion(
  nombre: string,
  servicio: string,
  starts_at: string
) {
  const texto =
    "Hola! Reservé hora para " +
    servicio +
    " el " +
    fechaLarga(starts_at) +
    " a las " +
    horaCorta(starts_at) +
    ". " +
    nombre +
    ".";
  return "https://wa.me/" + WHATSAPP_LOCAL + "?text=" + encodeURIComponent(texto);
}
