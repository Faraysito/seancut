// meses como "YYYY-MM", siempre en hora de chile
import { fromZonedTime } from "date-fns-tz";
import { TZ } from "./local";

const MES = /^\d{4}-(0[1-9]|1[0-2])$/;

export function mesActual() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ }).slice(0, 7);
}

// el de la url si es válido y no es futuro; si no, el actual
export function mesValido(mes: string | undefined) {
  const actual = mesActual();
  return mes && MES.test(mes) && mes <= actual ? mes : actual;
}

export function sumarMeses(mes: string, n: number) {
  const [anio, m] = mes.split("-").map(Number);
  const d = new Date(anio, m - 1 + n, 1, 12);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

// del primer segundo del mes al primero del siguiente, para filtrar happened_at
export function rangoMes(mes: string) {
  return {
    desde: fromZonedTime(mes + "-01T00:00:00", TZ).toISOString(),
    hasta: fromZonedTime(sumarMeses(mes, 1) + "-01T00:00:00", TZ).toISOString(),
  };
}

// "noviembre de 2026" o solo "noviembre"
export function nombreMes(mes: string, conAnio = true) {
  return new Date(mes + "-01T12:00:00").toLocaleDateString(
    "es-CL",
    conAnio ? { month: "long", year: "numeric" } : { month: "long" }
  );
}

// solo la primera letra: el capitalize de css deja "Noviembre De 2026"
export function conMayuscula(t: string) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}
