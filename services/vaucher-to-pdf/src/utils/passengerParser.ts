/**
 * Parsea la lista de pasajeros en formato APELLIDO/NOMBRE - TICKET
 * y separa nombres concatenados para display legible.
 * Ref: Documento de especificación del voucher.
 */

export interface ParsedPassenger {
  apellidoNombre: string;
  nameIata: string;
  nameFull: string;
  /** Formato APELLIDO / NOMBRE para tabla de pasajeros */
  nameTableDisplay: string;
  /** Formato NOMBRE APELLIDO (sin slash) para tabla: ej. HARONID CEDENO DALMASI */
  nameTableDisplayLine: string;
  ticket: string;
}

/** Inserta espacios en apellidos: DEL, DE LA, DE LOS, DE */
function separarApellidos(s: string): string {
  if (!s?.trim()) return '';
  const u = s.toUpperCase();
  return u
    .replace(/([A-Z])DELA([A-Z])/g, '$1 DE LA $2')
    .replace(/([A-Z])DELOS([A-Z])/g, '$1 DE LOS $2')
    .replace(/([A-Z])DEL([A-Z])/g, '$1 DEL $2')
    .replace(/([A-Z])DE([A-Z])/g, '$1 DE $2')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Nombres cortos que suelen ir primero (ANA, MAR, JOS, etc.) */
const NOMBRES_CORTOS = new Set(['ANA', 'MAR', 'JOS', 'LUI', 'CAR', 'MAR', 'JUA', 'PED', 'LUC', 'SOF', 'VAL', 'CAM']);

/** Inserta espacios en nombres compuestos (ej: ANAALEXANDRA → ANA ALEXANDRA, RAFAELJOSE → RAFAEL JOSE) */
function separarNombres(s: string): string {
  if (!s?.trim()) return '';
  if (s.length <= 6) return s;
  if (/DEL|DE LA|DE LOS|DE\s/i.test(s)) return separarApellidos(s);
  const u = s.toUpperCase();
  if (s.length >= 10 && NOMBRES_CORTOS.has(u.slice(0, 3))) {
    return s.slice(0, 3) + ' ' + s.slice(3);
  }
  if (s.length === 10) return s.slice(0, 6) + ' ' + s.slice(6);
  const cut = s.length > 10 ? 5 : 4;
  return s.slice(0, cut) + ' ' + s.slice(cut);
}

/** Formato legible: Mayúscula inicial en cada palabra */
function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Parsea una línea: "APELLIDO/NOMBRE - TICKET" */
export function parsearLineaPasajero(linea: string): ParsedPassenger | null {
  const trimmed = linea?.trim();
  if (!trimmed) return null;

  const idx = trimmed.indexOf(' - ');
  const parte = idx >= 0 ? trimmed.slice(0, idx).trim() : trimmed;
  const ticket = idx >= 0 ? trimmed.slice(idx + 3).trim() : '';

  const slashIdx = parte.indexOf('/');
  const apellido = slashIdx >= 0 ? parte.slice(0, slashIdx).trim() : parte;
  const nombre = slashIdx >= 0 ? parte.slice(slashIdx + 1).trim() : '';

  const apellidoDisplay = separarApellidos(apellido);
  const nombreDisplay = separarNombres(nombre);
  const nameFull =
    apellidoDisplay && nombreDisplay
      ? `${toTitleCase(apellidoDisplay)} ${toTitleCase(nombreDisplay)}`
      : toTitleCase(apellidoDisplay || nombreDisplay || parte);
  const nameTableDisplay =
    apellidoDisplay && nombreDisplay
      ? `${apellidoDisplay.toUpperCase()} / ${nombreDisplay.toUpperCase()}`
      : (apellidoDisplay || nombreDisplay || parte).toUpperCase();
  const nameTableDisplayLine =
    apellidoDisplay && nombreDisplay
      ? `${nombreDisplay.toUpperCase()} ${apellidoDisplay.toUpperCase()}`.trim()
      : (apellidoDisplay || nombreDisplay || parte).toUpperCase();

  return {
    apellidoNombre: parte,
    nameIata: parte,
    nameFull: nameFull || parte,
    nameTableDisplay,
    nameTableDisplayLine,
    ticket,
  };
}

/**
 * Cuando varios pasajeros vienen en una sola línea sin saltos:
 * "DIAZ/CONTRERAS/ANAALEXANDRA - 996 2425484279 DIAZ/FELIZ/RAFAELJOSE - 996 2425484280"
 * Inserta saltos de línea para separar cada "APELLIDO/NOMBRE - TICKET"
 */
function splitMultiPassengerLine(linea: string): string[] {
  const trimmed = linea?.trim();
  if (!trimmed) return [];

  const lines: string[] = [];
  const parts = trimmed.split(/\s+-\s+/);

  if (parts.length <= 1) return [trimmed];

  let i = 0;
  while (i < parts.length) {
    const part = parts[i].trim();
    if (!part) {
      i++;
      continue;
    }
    if (part.includes('/')) {
      const nextPart = parts[i + 1];
      if (nextPart !== undefined) {
        const ticketAndMaybeNext = nextPart.trim();
        const spaceIdx = ticketAndMaybeNext.search(/\s+[A-Za-z]+\/[A-Za-z/]+/);
        if (spaceIdx > 0) {
          const ticket = ticketAndMaybeNext.slice(0, spaceIdx).trim();
          const nextName = ticketAndMaybeNext.slice(spaceIdx).trim();
          lines.push(`${part} - ${ticket}`);
          parts[i + 1] = nextName;
          i++;
          continue;
        }
        lines.push(`${part} - ${ticketAndMaybeNext}`);
        i += 2;
        continue;
      }
      lines.push(part);
      i++;
    } else {
      i++;
    }
  }
  return lines.length > 0 ? lines : [trimmed];
}

/** Parsea lista completa de pasajeros (una línea por pasajero, o varios en una línea) */
export function parsearListaPasajeros(texto: string): ParsedPassenger[] {
  if (!texto?.trim()) return [];
  const lineas: string[] = [];
  texto.split(/[\n\r]+/).forEach((l) => {
    const expanded = splitMultiPassengerLine(l);
    lineas.push(...expanded);
  });
  return lineas
    .map((l) => parsearLineaPasajero(l))
    .filter((p): p is ParsedPassenger => p !== null && (!!p.nameIata || !!p.ticket));
}
