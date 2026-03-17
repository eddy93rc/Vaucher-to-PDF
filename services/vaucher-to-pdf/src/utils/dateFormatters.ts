const MESES_CORTO: Record<number, string> = {
  1: 'ene', 2: 'feb', 3: 'mar', 4: 'abr', 5: 'may', 6: 'jun',
  7: 'jul', 8: 'ago', 9: 'sep', 10: 'oct', 11: 'nov', 12: 'dic',
};

const MESES_ES: Record<number, string> = {
  1: 'ENERO',
  2: 'FEBRERO',
  3: 'MARZO',
  4: 'ABRIL',
  5: 'MAYO',
  6: 'JUNIO',
  7: 'JULIO',
  8: 'AGOSTO',
  9: 'SEPTIEMBRE',
  10: 'OCTUBRE',
  11: 'NOVIEMBRE',
  12: 'DICIEMBRE',
};

const DÍAS_SEMANA_ES: Record<number, string> = {
  0: 'DOMINGO',
  1: 'LUNES',
  2: 'MARTES',
  3: 'MIÉRCOLES',
  4: 'JUEVES',
  5: 'VIERNES',
  6: 'SÁBADO',
};

const PLACEHOLDER = '—';

function parseDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) return null;
  const d = new Date(dateStr.trim());
  if (isNaN(d.getTime())) return null;
  return d;
}

/** Formato: "11 MARZO 2026" */
export function formatDateLongSpanish(dateStr: string): string {
  const d = parseDate(dateStr);
  if (!d) return PLACEHOLDER;
  const day = d.getDate();
  const month = MESES_ES[d.getMonth() + 1] ?? 'ENERO';
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/** Formato: "MIERCOLES" */
export function getWeekdaySpanish(dateStr: string): string {
  const d = parseDate(dateStr);
  if (!d) return PLACEHOLDER;
  return DÍAS_SEMANA_ES[d.getDay()] ?? 'DOMINGO';
}

/** Formato: "MIERCOLES 11 MARZO 2026" */
export function formatDateWithWeekdaySpanish(dateStr: string): string {
  return `${getWeekdaySpanish(dateStr)} ${formatDateLongSpanish(dateStr)}`;
}

/** Formato hora: "22:50" desde "22:50:00" */
export function normalizeTime(timeStr: string): string {
  if (!timeStr) return '--:--';
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return timeStr;
}

/** Abreviatura día semana: MIERCOLES → Mié */
const DÍA_ABREV: Record<number, string> = {
  0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb',
};

/** Formato corto: "jue 26 mar 2026" */
export function formatDateShortSpanish(dateStr: string): string {
  const d = parseDate(dateStr);
  if (!d) return PLACEHOLDER;
  const day = d.getDate();
  const month = MESES_CORTO[d.getMonth() + 1] ?? 'ene';
  const year = d.getFullYear();
  const weekday = (DÍAS_SEMANA_ES[d.getDay()] ?? 'DOMINGO').toLowerCase();
  return `${weekday} ${day} ${month} ${year}`;
}

/** Formato overview: "28 Mar 2026" */
export function formatDateOverview(dateStr: string): string {
  const d = parseDate(dateStr);
  if (!d) return PLACEHOLDER;
  const day = d.getDate();
  const month = (MESES_CORTO[d.getMonth() + 1] ?? 'ene');
  const monthCap = month.charAt(0).toUpperCase() + month.slice(1);
  const year = d.getFullYear();
  return `${day} ${monthCap} ${year}`;
}

/** Formato timeline: "Mié 11 Mar" (sin año, para display compacto) */
export function formatDateTimeline(dateStr: string): string {
  const d = parseDate(dateStr);
  if (!d) return PLACEHOLDER;
  const day = d.getDate();
  const month = (MESES_CORTO[d.getMonth() + 1] ?? 'ene').charAt(0).toUpperCase() +
    (MESES_CORTO[d.getMonth() + 1] ?? 'ene').slice(1);
  const weekday = DÍA_ABREV[d.getDay()] ?? 'Dom';
  return `${weekday} ${day} ${month}`;
}

/** Hora en formato 24h: "22:50" */
export function formatTime24h(timeStr: string): string {
  return normalizeTime(timeStr || '');
}

/** Hora en formato 12h: "07:30 a. m." o "10:05 p. m." */
export function formatTimeAmPm(timeStr: string): string {
  if (!timeStr) return '--:--';
  const parts = timeStr.replace(/\s/g, '').split(':');
  const h = parseInt(parts[0] ?? '0', 10) % 24;
  const m = (parts[1] ?? '0').padStart(2, '0');
  const ampm = h >= 12 ? 'p. m.' : 'a. m.';
  const h12 = h % 12 || 12;
  return `${h12.toString().padStart(2, '0')}:${m} ${ampm}`;
}

/** Combina fecha y hora para mostrar: "11 MAR 2026 22:50" */
export function formatDateTimeSpanish(dateStr: string, timeStr: string): string {
  const d = parseDate(dateStr);
  if (!d) return `${PLACEHOLDER} ${normalizeTime(timeStr || '')}`;
  const day = d.getDate();
  const month = MESES_ES[d.getMonth() + 1]?.slice(0, 3) ?? 'ENE';
  const year = d.getFullYear();
  const time = normalizeTime(timeStr);
  return `${day} ${month} ${year} ${time}`;
}

/** Duración "08:05" o "8:05" → "8h 5m" */
export function formatDurationDisplay(duration: string): string {
  if (!duration || !duration.trim()) return '—';
  const match = duration.trim().match(/^(\d+)[hH:]?\s*(\d+)?/);
  if (!match) return '—';
  const h = parseInt(match[1] ?? '0', 10);
  const m = parseInt((match[2] ?? '0').replace(/\D/g, '') || '0', 10);
  if (h === 0 && m === 0) return '—';
  const partsOut: string[] = [];
  if (h > 0) partsOut.push(`${h}h`);
  if (m > 0) partsOut.push(`${m}m`);
  return partsOut.join(' ') || '—';
}

/** Calcular layover entre llegada (arrivalDate, arrivalTime) y salida siguiente (depDate, depTime) */
export function computeLayover(
  arrivalDate: string,
  arrivalTime: string,
  depDate: string,
  depTime: string
): string {
  const arr = parseDate(arrivalDate);
  const dep = parseDate(depDate);
  if (!arr || !dep) return '';
  const [ah, am] = (arrivalTime || '00:00').split(':').map((x) => parseInt(x || '0', 10));
  const [dh, dm] = (depTime || '00:00').split(':').map((x) => parseInt(x || '0', 10));
  const arrTs = new Date(arr.getFullYear(), arr.getMonth(), arr.getDate(), ah, am, 0).getTime();
  const depTs = new Date(dep.getFullYear(), dep.getMonth(), dep.getDate(), dh, dm, 0).getTime();
  const diffMs = depTs - arrTs;
  if (diffMs <= 0) return '';
  const totalMins = Math.round(diffMs / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.length ? `Escala de ${parts.join(' ')}` : '';
}

/** Formato para bloque de vuelo: "26 mar 2026 - 23:05 hs" */
export function formatDateWithTimeHs(dateStr: string, timeStr: string): string {
  const d = parseDate(dateStr);
  if (!d) return `${PLACEHOLDER} - ${normalizeTime(timeStr || '')} hs`;
  const day = d.getDate();
  const month = (MESES_CORTO[d.getMonth() + 1] ?? 'ene');
  const year = d.getFullYear();
  const time = normalizeTime(timeStr);
  return `${day} ${month} ${year} - ${time} hs`;
}
