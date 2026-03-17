import * as fs from 'fs';
import * as path from 'path';
import type { MondayItem, MondayColumn } from './mondayFetch';
import {
  fetchBoardColumns,
  getValueFromItem,
  getDateFromItem,
} from './mondayFetch';
import { parsearListaPasajeros } from '../utils/passengerParser';
import type { VoucherPayload } from '../schemas/voucherPayload';

export interface ColumnMapping {
  reservation: Record<string, string>;
  segment: Record<string, string>;
}

const DEFAULT_TITLE_MAP: Record<string, string[]> = {
  passenger_full: [
    'pasajero principal', 'nombre completo pasajero', 'pasajero', 'nombre', 'passenger',
    'preparado para', 'cliente', 'viajero', 'nombre pasajero',
  ],
  passenger_voucher: ['nombre voucher', 'voucher', 'formato iata', 'iata'],
  passenger_list: [
    'lista pasajeros', 'pasajeros', 'passengers', 'lista de pasajeros',
    'pasajeros lista', 'lista pasajero',
  ],
  reservation_code: [
    'pnr', 'código reserva', 'código reservación', 'código', 'reservation', 'codigo',
    'reservacion', 'codigo reserva', 'codigo reservacion', 'pnr código',
  ],
  ticket_number: [
    'número boleto', 'boleto', 'ticket', 'numero', 'ticket no',
    'numero boleto', 'ticket number', 'no boleto', 'ticket no',
  ],
  airline_main: [
    'aerolínea principal', 'aerolínea', 'airline', 'aerolinea',
    'aerolinea principal', 'airlines',
  ],
  airlines_involved: [
    'aerolíneas involucradas', 'aerolineas involucradas', 'airlines involved',
    'aerolineas', 'operadoras',
  ],
  issue_date: [
    'fecha emisión ticket', 'fecha emisión', 'fecha emision', 'issue date',
    'emision', 'emision ticket', 'fecha emision ticket',
  ],
  origin_main_code: ['origen principal', 'origin main', 'origen', 'codigo origen'],
  destination_final_code: ['destino final', 'destination final', 'destino', 'codigo destino'],
  passenger_destination: [
    'destino pasajero', 'destino principal pasajero', 'passenger destination',
    'destino viaje', 'ciudad destino', 'destino ciudad',
  ],
  route_summary: ['ruta general', 'route summary', 'ruta', 'ruta resumida', 'itinerario'],
  return_date: ['fecha regreso', 'fecha retorno', 'return date', 'regreso', 'retorno'],
  trip_type: ['tipo viaje', 'trip type', 'tipo', 'viaje tipo'],
  segment_count: ['cantidad segmentos', 'segment count', 'total segmentos', 'segmentos'],
  travel_class: ['clase', 'clase segmento', 'travel class', 'clase viaje'],
  baggage_allowance: ['equipaje', 'baggage allowance', 'equipaje permiso'],
  baggage: ['equipaje segmento', 'equipaje tramo', 'baggage', 'equipaje tramo'],
  fare_basis: ['fare basis', 'fare basis segmento', 'tarifa'],
  booking_status: ['estado reserva', 'estado segmento', 'booking status', 'estado', 'status'],
  agency_name: ['agencia', 'agency', 'nombre agencia', 'agencia nombre', 'jyl', 'jyd'],
  issuing_office: [
    'oficina emisora', 'issuing office', 'oficina', 'office',
    'oficina emisora', 'city office', 'air europa', 'emisora',
  ],
  agency_emergency_phone: [
    'teléfono agencia', 'emergencia', 'teléfono', 'telefono', 'emergencies',
    'telefono agencia', 'contacto', 'fono',
  ],
  currency: ['moneda', 'currency'],
  extras: [
    'extras', 'recomendaciones', 'recomendación', 'informacion adicional',
    'información adicional', 'notas', 'observaciones',
  ],
  voucher_heading_date: [
    'fecha encabezado voucher', 'fecha segmento', 'fecha', 'date',
    'voucher heading date', 'fecha salida', 'departure date',
  ],
  voucher_heading_destination: [
    'destino voucher', 'destino encabezado', 'ciudad destino', 'destination',
    'destino', 'destino segmento',
  ],
  voucher_trip_type: [
    'tipo tramo', 'tipo viaje', 'trip type', 'salida retorno', 'tipo',
    'tramo tipo', 'salida', 'retorno', 'conexion',
  ],
  marketing_airline: ['marketing airline', 'aerolinea comercial', 'aerolinea marketing', 'marketing'],
  flight_number: [
    'vuelo', 'número vuelo', 'flight', 'numero vuelo', 'flight number',
    'num vuelo', 'no vuelo', 'numero vuelo',
  ],
  operated_by: [
    'operado por', 'operated', 'operador', 'operated by',
    'aerolinea operadora', 'carrier',
  ],
  origin_code: [
    'origen código', 'código origen', 'origin code', 'origen',
    'origen codigo', 'codigo origen',
  ],
  origin_city: [
    'origen ciudad', 'ciudad origen', 'origin city', 'ciudad salida',
    'origen city', 'ciudad',
  ],
  origin_name: [
    'nombre origen', 'origen nombre', 'aeropuerto origen',
    'aeropuerto', 'origen aeropuerto',
  ],
  origin_terminal: ['terminal origen', 'terminal'],
  destination_code: [
    'destino código', 'código destino', 'destination code',
    'destino codigo', 'codigo destino',
  ],
  destination_city: [
    'destino ciudad', 'ciudad destino', 'destination city', 'ciudad llegada',
    'destino city', 'destino ciudad',
  ],
  destination_name: [
    'nombre destino', 'destino nombre', 'aeropuerto destino',
    'destino aeropuerto',
  ],
  destination_terminal: ['terminal destino'],
  departure_date: [
    'fecha salida', 'departure date', 'salida fecha', 'fecha',
    'date salida', 'salida',
  ],
  departure_time: [
    'hora salida', 'departure time', 'salida hora', 'hora',
    'time salida', 'salida hora',
  ],
  arrival_date: [
    'fecha llegada', 'arrival date', 'llegada fecha',
    'date llegada', 'llegada',
  ],
  arrival_time: [
    'hora llegada', 'arrival time', 'llegada hora',
    'time llegada', 'llegada hora',
  ],
  duration: [
    'duración', 'duration', 'duracion',
    'tiempo vuelo', 'flight time', 'horas',
  ],
  seat: ['asiento', 'seat', 'asientos'],
  seat_assignments: [
    'asientos pasajeros', 'asientos por pasajero', 'seat assignments', 'seat map',
    'asientos', 'asiento pasajero', 'asignacion asientos',
  ],
  segment_number: [
    'segmento #', 'segmento', 'número segmento', 'numero segmento',
    'segmento numero', 'num segmento', '#',
  ],
  flight_type: ['tipo vuelo', 'vuelo directo', 'flight type', 'directo', 'conexión', 'conexion'],
};

const RESERVATION_FIELD_KEYS = [
  'passenger_full',
  'passenger_voucher',
  'passenger_list',
  'reservation_code',
  'ticket_number',
  'airline_main',
  'airlines_involved',
  'issue_date',
  'origin_main_code',
  'destination_final_code',
  'passenger_destination',
  'route_summary',
  'departure_date',
  'return_date',
  'trip_type',
  'segment_count',
  'travel_class',
  'baggage_allowance',
  'fare_basis',
  'booking_status',
  'agency_name',
  'issuing_office',
  'agency_emergency_phone',
  'currency',
  'extras',
] as const;

const SEGMENT_FIELD_KEYS = new Set([
  'voucher_heading_date',
  'voucher_heading_destination',
  'voucher_trip_type',
  'marketing_airline',
  'flight_number',
  'operated_by',
  'origin_code',
  'origin_city',
  'origin_name',
  'origin_terminal',
  'destination_code',
  'destination_city',
  'destination_name',
  'destination_terminal',
  'departure_date',
  'departure_time',
  'arrival_date',
  'arrival_time',
  'duration',
  'travel_class',
  'booking_status',
  'baggage',
  'fare_basis',
  'ticket_number',
  'seat',
  'seat_assignments',
  'segment_number',
  'flight_type',
]);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/** Preferimos el match más específico (alternativa más larga) para evitar que
 * "Destino pasajero" mapee a passenger_full por contener "pasajero". */
function matchColumnTitle(columnTitle: string, fieldKeys: string[]): string | null {
  const normalized = normalize(columnTitle);
  let bestMatch: { key: string; matchLen: number } | null = null;
  for (const key of fieldKeys) {
    const alternatives = DEFAULT_TITLE_MAP[key] ?? [key];
    for (const alt of alternatives) {
      const altNorm = normalize(alt);
      if (normalized.includes(altNorm) || altNorm.includes(normalized)) {
        const len = altNorm.length;
        if (!bestMatch || len > bestMatch.matchLen) {
          bestMatch = { key, matchLen: len };
        }
      }
    }
  }
  return bestMatch?.key ?? null;
}

const FILE_TYPES = ['file', 'files'];
const TEXT_ONLY_FIELDS = new Set(['ticket_number', 'passenger_full', 'passenger_voucher', 'reservation_code', 'agency_emergency_phone']);

function isFileColumn(col: MondayColumn): boolean {
  const t = (col.type ?? '').toLowerCase();
  return FILE_TYPES.includes(t);
}

function buildMappingFromTitles(
  columns: MondayColumn[],
  reservationFields: string[],
  segmentFields: string[],
  options?: { excludeFileFromTextFields?: boolean }
): ColumnMapping {
  const reservation: Record<string, string> = {};
  const segment: Record<string, string> = {};
  const excludeFile = options?.excludeFileFromTextFields ?? true;

  for (const col of columns) {
    const resMatch = matchColumnTitle(col.title, reservationFields);
    const segMatch = matchColumnTitle(col.title, segmentFields);
    if (excludeFile && isFileColumn(col)) {
      if (resMatch && TEXT_ONLY_FIELDS.has(resMatch)) continue;
      if (segMatch && TEXT_ONLY_FIELDS.has(segMatch)) continue;
      if (segMatch === 'ticket_number') continue;
    }
    // Prefer first match: subboards pueden tener columnas duplicadas (mismo título, distinto ID);
    // las primeras suelen tener datos, las duplicadas suelen estar vacías.
    if (resMatch && !reservation[resMatch]) reservation[resMatch] = col.id;
    if (segMatch && !segment[segMatch]) segment[segMatch] = col.id;
  }

  return { reservation, segment };
}

/** Mapeo por defecto para board 18404261128 / subboard 18404275758 (evita columnas duplicadas vacías) */
const DEFAULT_BOARD_18404261128: ColumnMapping = {
  reservation: {
    passenger_full: 'text_mm1hp89m',
    passenger_voucher: 'text_mm1h8pm4',
    passenger_list: 'long_text_mm1hctk2',
    reservation_code: 'text_mm1hsfqk',
    ticket_number: 'text_mm1h73tr',
    airline_main: 'text_mm1h4c1x',
    airlines_involved: 'long_text_mm1htsvp',
    agency_name: 'text_mm1hat8',
    issuing_office: 'text_mm1hhfed',
    issue_date: 'date_mm1hm9m1',
    origin_main_code: 'text_mm1hg626',
    destination_final_code: 'text_mm1hw6d4',
    passenger_destination: 'text_mm1h9n6',
    route_summary: 'long_text_mm1hv2bf',
    departure_date: 'date_mm1hrhab',
    return_date: 'date_mm1hw0em',
    trip_type: 'color_mm1hay0h',
    segment_count: 'numeric_mm1hp6de',
    travel_class: 'text_mm1h5h1y',
    baggage_allowance: 'text_mm1h8nxb',
    fare_basis: 'text_mm1h1tj9',
    booking_status: 'color_mm1hjsfa',
    agency_emergency_phone: 'phone_mm1h1s7',
    currency: 'text_mm1hhmv3',
    extras: 'long_text_mm1h8ynj',
  },
  segment: {
    segment_number: 'numeric_mm1hb425',
    voucher_heading_date: 'date_mm1han5w',
    voucher_heading_destination: 'text_mm1hqxn5',
    voucher_trip_type: 'color_mm1hpswz',
    flight_number: 'text_mm1hzm3v',
    marketing_airline: 'text_mm1h8v9y',
    operated_by: 'text_mm1hef1q',
    origin_code: 'text_mm1hxyb7',
    origin_name: 'text_mm1hkx1y',
    origin_city: 'text_mm1h6n0s',
    origin_terminal: 'text_mm1hqczm',
    destination_code: 'text_mm1h7rxx',
    destination_name: 'text_mm1hqc6v',
    destination_city: 'text_mm1hrhf7',
    destination_terminal: 'text_mm1hn6g5',
    departure_date: 'date_mm1hb3qe',
    departure_time: 'text_mm1hbseg',
    arrival_date: 'date_mm1hjj7e',
    arrival_time: 'text_mm1hb0sq',
    duration: 'text_mm1hmb1a',
    travel_class: 'text_mm1hq71s',
    booking_status: 'color_mm1hne1b',
    baggage: 'text_mm1hzhq6',
    fare_basis: 'text_mm1hwrt9',
    ticket_number: 'text_mm1h94ne',
    seat: 'text_mm1ha8fn',
    seat_assignments: 'long_text_mm1h4jjb',
  },
};

function loadColumnMapping(): ColumnMapping | null {
  const mappingPath = path.join(process.cwd(), 'monday-column-mapping.json');
  const envMapping = process.env.MONDAY_COLUMN_MAPPING;
  if (envMapping) {
    try {
      return JSON.parse(envMapping) as ColumnMapping;
    } catch {
      // ignore
    }
  }
  if (fs.existsSync(mappingPath)) {
    try {
      return JSON.parse(fs.readFileSync(mappingPath, 'utf-8')) as ColumnMapping;
    } catch {
      // ignore
    }
  }
  return null;
}

export async function buildColumnMapping(
  boardId: string,
  options?: { subitemsBoardId?: string | null }
): Promise<ColumnMapping> {
  const explicit = loadColumnMapping();
  if (explicit && Object.keys(explicit.reservation || {}).length > 0) {
    return explicit;
  }

  if (boardId === '18404261128') {
    return DEFAULT_BOARD_18404261128;
  }

  const [mainColumns, segmentColumns] = await Promise.all([
    fetchBoardColumns(boardId),
    options?.subitemsBoardId
      ? fetchBoardColumns(options.subitemsBoardId)
      : fetchBoardColumns(boardId),
  ]);

  const reservationFields = [...RESERVATION_FIELD_KEYS];
  const segmentFields = Object.keys(DEFAULT_TITLE_MAP).filter((k) =>
    SEGMENT_FIELD_KEYS.has(k)
  );

  const reservation = buildMappingFromTitles(mainColumns, reservationFields, [], { excludeFileFromTextFields: true }).reservation;
  const segment = buildMappingFromTitles(segmentColumns, [], segmentFields, { excludeFileFromTextFields: true }).segment;

  return { reservation, segment };
}

function parseExtras(value: string): string[] {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(/[\n\r]+/)
    .map((s) => s.replace(/^[\s\-•▸]\s*/, '').trim())
    .filter(Boolean);
}

function parseStringList(value: string): string[] {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(/[\n\r,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** Extrae ciudad del nombre de aeropuerto cuando no hay origin_city/destination_city */
function extractCityFromAirportName(name: string): string {
  if (!name || !name.trim()) return '';
  const s = name.trim().toUpperCase();
  const skip = ['INTL', 'INTERNATIONAL', 'AIRPORT', 'AIRPORT', 'LAS AMERICAS', 'ADOLFO SUAREZ', 'BARAJAS', 'GATWICK', 'HEATHROW', 'LEONARDO DA VINCI', 'FIUMICINO'];
  let city = s;
  for (const word of skip) {
    city = city.replace(new RegExp(word, 'gi'), ' ').trim();
  }
  city = city.replace(/\s+/g, ' ').trim();
  const first = city.split(/\s/)[0] || '';
  const second = city.split(/\s/)[1] || '';
  if (first && second && first.length >= 3) {
    return `${first} ${second}`;
  }
  return first || city || '';
}

/** Normaliza duración: "8h 10m", "8:10", "08:05" → formato consistente para cálculos */
function normalizeDurationForDisplay(dur: string): string {
  if (!dur || !dur.trim()) return '';
  const s = dur.trim();
  const hMatch = s.match(/(\d+)\s*h/i);
  const mMatch = s.match(/(\d+)\s*m/i);
  if (hMatch || mMatch) return s;
  const colonMatch = s.match(/^(\d+):?(\d{0,2})/);
  if (colonMatch) {
    const h = parseInt(colonMatch[1] ?? '0', 10);
    const m = parseInt(colonMatch[2] ?? '0', 10);
    return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`;
  }
  return s;
}

/** Normaliza hora: "21:10", "9:10 PM", "21:10:00" → "21:10" o "21:10:00" */
function normalizeTimeStr(t: string): string {
  if (!t || !t.trim()) return '';
  const s = t.trim();
  const match = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    let h = parseInt(match[1] ?? '0', 10);
    if (/p\.?m\.?/i.test(s) && h < 12) h += 12;
    if (/a\.?m\.?/i.test(s) && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${(match[2] ?? '00').padStart(2, '0')}:${(match[3] ?? '00').padStart(2, '0')}`;
  }
  return s;
}

/** Normaliza flight_number: "088" + operated_by "AIR EUROPA, UX" → "UX088" si falta prefijo */
function normalizeFlightNumber(num: string, operatedBy: string): string {
  if (!num || !num.trim()) return '—';
  const n = num.trim();
  if (/^[A-Z]{2}\d+$/i.test(n)) return n.toUpperCase();
  const codeMatch = operatedBy?.match(/,?\s*([A-Z]{2})\s*$/i);
  const prefix = codeMatch?.[1] ?? operatedBy?.match(/^([A-Z]{2})/i)?.[1];
  if (prefix) return `${prefix.toUpperCase()}${n.replace(/^0+/, '')}`;
  return n;
}

export async function mondayItemToVoucherPayload(
  item: MondayItem,
  mapping: ColumnMapping
): Promise<VoucherPayload> {
  const R = mapping.reservation ?? {};
  const S = mapping.segment ?? {};

  const getRes = (key: string) => getValueFromItem(item, R[key] ?? '');
  const getResDate = (key: string) => getDateFromItem(item, R[key] ?? '');

  const listaPasajerosRaw = getRes('passenger_list');
  const parsedList = parsearListaPasajeros(listaPasajerosRaw);
  const passengerList = parsedList.map((p) => ({
    nameIata: p.nameIata,
    nameFull: p.nameFull,
    nameTableDisplay: p.nameTableDisplay || p.nameIata,
    nameTableDisplayLine: p.nameTableDisplayLine || p.nameTableDisplay || p.nameIata,
    passengerType: '',
    ticketNumber: p.ticket || getRes('ticket_number'),
  }));
  const hasPassengerList = passengerList.length > 0;

  const passengerFullRaw = getRes('passenger_full') || getRes('passenger_voucher') || item.name || '';
  const reservation = {
    passenger_full: passengerFullRaw,
    passenger_voucher: getRes('passenger_voucher') || getRes('passenger_full') || '',
    passenger_list: hasPassengerList
      ? passengerList
      : [
          (() => {
            const voucher = getRes('passenger_voucher') || getRes('passenger_full') || item.name || '';
            const full = getRes('passenger_full') || item.name || '';
            let nameTableDisplay = full.toUpperCase();
            let nameTableDisplayLine = nameTableDisplay.replace(/\s*\/\s*/g, ' ');
            if (voucher && voucher.includes('/')) {
              const parsed = parsearListaPasajeros(voucher + ' - ')[0];
              if (parsed) {
                nameTableDisplay = parsed.nameTableDisplay || nameTableDisplay;
                nameTableDisplayLine = parsed.nameTableDisplayLine || nameTableDisplay.replace(/\s*\/\s*/g, ' ');
              }
            }
            return {
              nameIata: voucher || full,
              nameFull: full || voucher,
              nameTableDisplay,
              nameTableDisplayLine,
              passengerType: '',
              ticketNumber: getRes('ticket_number'),
            };
          })(),
        ],
    reservation_code: getRes('reservation_code'),
    ticket_number: getRes('ticket_number'),
    airline_main: getRes('airline_main'),
    airlines_involved: (() => {
      const list = parseStringList(getRes('airlines_involved'));
      if (list.length > 0) return list;
      const main = getRes('airline_main');
      return main ? [main] : [];
    })(),
    issue_date: getResDate('issue_date') || getRes('issue_date'),
    origin_main_code: getRes('origin_main_code'),
    destination_final_code: getRes('destination_final_code'),
    passenger_destination: getRes('passenger_destination'),
    departure_date: getResDate('departure_date') || getRes('departure_date'),
    return_date: getResDate('return_date') || getRes('return_date'),
    route_summary: getRes('route_summary'),
    trip_type: getRes('trip_type'),
    segment_count: getRes('segment_count'),
    travel_class: getRes('travel_class'),
    baggage_allowance: getRes('baggage_allowance'),
    fare_basis: getRes('fare_basis'),
    booking_status: getRes('booking_status'),
    agency_name: getRes('agency_name'),
    issuing_office: getRes('issuing_office'),
    agency_emergency_phone: getRes('agency_emergency_phone'),
    currency: getRes('currency'),
    extras: parseExtras(getRes('extras')),
  };

  const subitems = item.subitems ?? [];
  const subWithNum = subitems.map((sub) => {
    const getSeg = (key: string) => getValueFromItem(sub, S[key] ?? '');
    const segNum = parseInt(getSeg('segment_number'), 10) || 0;
    return { sub, segNum };
  });
  subWithNum.sort((a, b) => (a.segNum || 999) - (b.segNum || 999));

  const segments = subWithNum.map(({ sub }, i) => {
    const getSeg = (key: string) => getValueFromItem(sub, S[key] ?? '');
    const getSegDate = (key: string) => getDateFromItem(sub, S[key] ?? '') || getSeg(key);
    const segNum = parseInt(getSeg('segment_number'), 10) || i + 1;

    const originName = getSeg('origin_name');
    const destName = getSeg('destination_name');
    const originCity = getSeg('origin_city') || extractCityFromAirportName(originName);
    const destCity = getSeg('destination_city') || extractCityFromAirportName(destName);

    const operatedBy = getSeg('operated_by') || reservation.airline_main;
    const rawFlightNum = getSeg('flight_number');
    const flightNumber = normalizeFlightNumber(rawFlightNum, operatedBy);

    const rawDuration = getSeg('duration');
    const duration = rawDuration ? (normalizeDurationForDisplay(rawDuration) || rawDuration) : '';

    return {
      segment_number: segNum,
      voucher_heading_date: getSegDate('voucher_heading_date') || getSegDate('departure_date'),
      voucher_heading_destination: getSeg('voucher_heading_destination') || destName || destCity,
      voucher_trip_type: getSeg('voucher_trip_type') || 'Salida',
      marketing_airline: getSeg('marketing_airline') || operatedBy || reservation.airline_main,
      flight_number: flightNumber,
      operated_by: operatedBy || reservation.airline_main,
      origin_code: getSeg('origin_code'),
      origin_city: originCity,
      origin_name: originName || originCity,
      origin_terminal: getSeg('origin_terminal') || '',
      destination_code: getSeg('destination_code'),
      destination_city: destCity,
      destination_name: destName || destCity,
      destination_terminal: getSeg('destination_terminal') || '',
      departure_date: getSegDate('departure_date'),
      departure_time: normalizeTimeStr(getSeg('departure_time')) || '00:00:00',
      arrival_date: getSegDate('arrival_date'),
      arrival_time: normalizeTimeStr(getSeg('arrival_time')) || '00:00:00',
      duration: duration || rawDuration,
      travel_class: getSeg('travel_class') || reservation.travel_class || '',
      booking_status: getSeg('booking_status') || '',
      baggage: getSeg('baggage') || reservation.baggage_allowance || '',
      fare_basis: getSeg('fare_basis') || '',
      ticket_number: getSeg('ticket_number') || reservation.ticket_number,
      seat: getSeg('seat') || '-',
      seat_assignments: getSeg('seat_assignments') || '',
      flight_type: getSeg('flight_type') || '',
    };
  });

  if (!reservation.departure_date && segments.length > 0 && segments[0]?.departure_date) {
    reservation.departure_date = segments[0].departure_date;
  }
  if (!reservation.return_date && segments.length > 1) {
    const lastSeg = segments[segments.length - 1];
    if (lastSeg?.arrival_date) reservation.return_date = lastSeg.arrival_date;
  }

  return { reservation, segments };
}
