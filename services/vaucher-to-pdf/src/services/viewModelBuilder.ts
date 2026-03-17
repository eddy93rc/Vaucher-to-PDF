import type { VoucherPayload } from '../schemas/voucherPayload';
import type {
  JourneySectionViewModel,
  PassengerFooterRow,
  PassengerRow,
  PassengerSeatRow,
  SegmentViewModel,
  TimelineSectionViewModel,
  TimelineSegmentViewModel,
  VoucherViewModel,
} from '../types/voucher';
import {
  computeLayover,
  formatDateLongSpanish,
  formatDateOverview,
  formatDateTimeline,
  formatDateWithWeekdaySpanish,
  formatDurationDisplay,
  normalizeTime,
} from '../utils/dateFormatters';
import { config } from '../config';

function sanitizeTicketNumber(v: string | undefined): string {
  if (!v || !v.trim()) return '';
  const t = v.trim().replace(/\s+/g, '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return '';
  return t;
}

function cleanSeat(v: string | undefined): string {
  if (!v || !v.trim()) return '-';
  const s = v.trim();
  const idx = s.search(/\s+(CONFIRMADO|POR|DE)/i);
  return idx > 0 ? s.slice(0, idx).trim() : s;
}

function normalizePassengerKey(v: string | undefined): string {
  return (v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9/]/g, '');
}

function parseSeatAssignments(value: string | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!value || !value.trim()) return map;

  value
    .split(/[\n\r;]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const pair = line.match(/^(.+?)\s*(?:=|:|->)\s*([0-9]{1,2}[A-Z])$/i);
      if (pair) {
        map.set(normalizePassengerKey(pair[1]), cleanSeat(pair[2]));
        return;
      }

      const rawSeat = cleanSeat(line);
      const seatMatch = rawSeat.match(/^[0-9]{1,2}[A-Z]$/i);
      const nameMatch = line.match(/POR\s+(.+)$/i);
      if (seatMatch && nameMatch?.[1]) {
        map.set(normalizePassengerKey(nameMatch[1]), rawSeat);
      }
    });

  return map;
}

function resolvePassengerSeat(
  passenger: PassengerRow,
  seatAssignments: Map<string, string>,
  fallbackSeat: string,
  index: number,
  totalPassengers: number
): string {
  const candidates = [
    passenger.nameIata,
    passenger.nameTableDisplay,
    passenger.nameFull,
  ]
    .map(normalizePassengerKey)
    .filter(Boolean);

  for (const candidate of candidates) {
    const exact = seatAssignments.get(candidate);
    if (exact) return exact;

    for (const [assignmentKey, seat] of seatAssignments.entries()) {
      if (
        assignmentKey === candidate ||
        assignmentKey.includes(candidate) ||
        candidate.includes(assignmentKey)
      ) {
        return seat;
      }
    }
  }

  if (totalPassengers === 1 && fallbackSeat && fallbackSeat !== '-') {
    return fallbackSeat;
  }

  return index === 0 ? fallbackSeat : '-';
}

function uniqueList(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw?.trim();
    if (!value) continue;
    const key = value.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function buildPassengerRows(reservation: VoucherPayload['reservation']): PassengerRow[] {
  const list = reservation.passenger_list ?? [];
  if (list.length > 0) {
    return list.map((p) => ({
      nameFull: p.nameFull || p.nameIata,
      nameIata: p.nameIata,
      nameTableDisplay: (p.nameTableDisplayLine ?? p.nameTableDisplay ?? p.nameIata).trim(),
      passengerType: p.passengerType || '',
      ticketNumber: p.ticketNumber || '',
      ticketNumberDisplay: sanitizeTicketNumber(p.ticketNumber),
    }));
  }

  const voucher = reservation.passenger_voucher?.trim() || reservation.passenger_full?.trim() || '';
  const full = reservation.passenger_full?.trim() || voucher;
  const ticket = reservation.ticket_number?.trim() || '';
  return [
    {
      nameFull: full,
      nameIata: voucher,
      nameTableDisplay: (voucher || full).toUpperCase(),
      passengerType: '',
      ticketNumber: ticket,
      ticketNumberDisplay: sanitizeTicketNumber(ticket),
    },
  ];
}

function buildJourneyLabel(hasReturn: boolean, tripType: string, voucherTripType: string): string {
  const normalizedSegmentType = voucherTripType.trim().toLowerCase();
  const normalizedTripType = tripType.trim().toLowerCase();

  if (normalizedSegmentType === 'retorno') return 'RETORNO';
  if (normalizedTripType.includes('ida y vuelta') && hasReturn) return 'IDA';
  if (normalizedTripType.includes('solo ida')) return 'IDA';
  if (normalizedTripType.includes('multiciudad')) return 'ITINERARIO';
  return hasReturn ? 'IDA' : 'ITINERARIO';
}

function formatDateTimeLine(date: string, time: string): string {
  const datePart = date ? formatDateWithWeekdaySpanish(date) : '—';
  const timePart = normalizeTime(time || '');
  return `${datePart} · ${timePart}`;
}

function buildRouteDisplay(segment: VoucherPayload['segments'][0]): string {
  const origin = segment.origin_city || segment.origin_name || segment.origin_code || '—';
  const destination = segment.destination_city || segment.destination_name || segment.destination_code || '—';
  return `${origin} (${segment.origin_code || '—'}) -> ${destination} (${segment.destination_code || '—'})`;
}

function buildAirportDisplay(segment: VoucherPayload['segments'][0]): string {
  const originTerminal = segment.origin_terminal ? ` T${segment.origin_terminal}` : '';
  const destinationTerminal = segment.destination_terminal ? ` T${segment.destination_terminal}` : '';
  return `Origen:${originTerminal || ' -'} | Destino:${destinationTerminal || ' -'}`;
}

function buildCarrierDisplay(segment: VoucherPayload['segments'][0]): string {
  const marketing = segment.marketing_airline?.trim() || '';
  const operated = segment.operated_by?.trim() || '';
  if (marketing && operated && marketing.toUpperCase() !== operated.toUpperCase()) {
    return `${marketing} / ${operated}`;
  }
  return marketing || operated || '—';
}

function buildSegmentPassengers(
  passengers: PassengerRow[],
  segment: VoucherPayload['segments'][0]
): PassengerSeatRow[] {
  const fallbackSeat = cleanSeat(segment.seat || '-');
  const seatAssignments = parseSeatAssignments(segment.seat_assignments);

  return passengers.map((passenger, index) => {
    const resolvedSeat = resolvePassengerSeat(
      passenger,
      seatAssignments,
      fallbackSeat,
      index,
      passengers.length
    );

    return {
      ...passenger,
      seat: resolvedSeat,
      seatClean: cleanSeat(resolvedSeat),
    };
  });
}

function formatCityName(raw: string): string {
  if (!raw || !raw.trim()) return '—';
  const s = raw.trim();
  const words = s.split(/\s+/);
  const title = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
  return title;
}

function buildTimelineSegment(
  seg: VoucherPayload['segments'][0],
  nextSeg: VoucherPayload['segments'][0] | undefined
): TimelineSegmentViewModel {
  const originCity = formatCityName(seg.origin_city || seg.origin_name || '');
  const destCity = formatCityName(seg.destination_city || seg.destination_name || '');
  const originAirport = seg.origin_name?.trim() || `${seg.origin_code || ''}`;
  const destAirport = seg.destination_name?.trim() || `${seg.destination_code || ''}`;
  const operated = seg.operated_by?.trim();
  const flightInfo = operated
    ? `Vuelo ${seg.flight_number || '—'} (Operado por ${operated})`
    : `Vuelo ${seg.flight_number || '—'}`;

  const arrDate = parseDate(seg.arrival_date);
  const depDate = parseDate(seg.departure_date);
  const arrivalPlus1 = !!(
    arrDate &&
    depDate &&
    arrDate.getTime() > depDate.getTime()
  );

  const layoverAfter = nextSeg
    ? computeLayover(
        seg.arrival_date || '',
        seg.arrival_time || '00:00',
        nextSeg.departure_date || '',
        nextSeg.departure_time || '00:00'
      )
    : '';

  return {
    segmentNumber: seg.segment_number ?? 0,
    originCity: originCity || '—',
    originCode: seg.origin_code || '—',
    originAirportFull: seg.origin_code ? `${seg.origin_code}, ${originAirport}` : originAirport || '—',
    destinationCity: destCity || '—',
    destinationCode: seg.destination_code || '—',
    destinationAirportFull: seg.destination_code
      ? `${seg.destination_code}, ${destAirport}`
      : destAirport || '—',
    flightInfo,
    departureDateShort: formatDateTimeline(seg.departure_date || ''),
    departureTime: normalizeTime(seg.departure_time || ''),
    departureCode: seg.origin_code || '—',
    duration: seg.duration || '—',
    durationDisplay: formatDurationDisplay(seg.duration || ''),
    arrivalDateShort: formatDateTimeline(seg.arrival_date || ''),
    arrivalTime: normalizeTime(seg.arrival_time || ''),
    arrivalPlus1,
    arrivalCode: seg.destination_code || '—',
    layoverAfter,
  };
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) return null;
  const d = new Date(dateStr.trim());
  return isNaN(d.getTime()) ? null : d;
}

function sumDurations(durations: string[]): string {
  let totalMins = 0;
  for (const d of durations) {
    const m = d.match(/^(\d+)[hH:]?\s*(\d+)?/);
    if (m) {
      totalMins += parseInt(m[1] ?? '0', 10) * 60 + parseInt((m[2] ?? '0').replace(/\D/g, ''), 10);
    }
  }
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.join(' ') || '—';
}

function buildTimelineSections(
  segments: VoucherPayload['segments'],
  tripType: string
): TimelineSectionViewModel[] {
  const ordered = [...segments].sort(
    (a, b) => (a.segment_number ?? 999) - (b.segment_number ?? 999)
  );
  const hasReturn = ordered.some(
    (s) => s.voucher_trip_type?.trim().toLowerCase() === 'retorno'
  );
  const grouped = new Map<string, VoucherPayload['segments']>();

  for (const seg of ordered) {
    const label = buildJourneyLabel(
      hasReturn,
      tripType,
      seg.voucher_trip_type || ''
    );
    const list = grouped.get(label) ?? [];
    list.push(seg);
    grouped.set(label, list);
  }

  return Array.from(grouped.entries()).map(([title, segs]) => {
    const first = segs[0];
    const last = segs[segs.length - 1];
    const originCity = formatCityName(first?.origin_city || first?.origin_name || '');
    const destCity = formatCityName(last?.destination_city || last?.destination_name || '');
    const dateShort = first?.departure_date
      ? formatDateOverview(first.departure_date)
      : '—';
    const totalDuration = sumDurations(segs.map((s) => s.duration || ''));

    const timelineSegs: TimelineSegmentViewModel[] = segs.map((seg, i) =>
      buildTimelineSegment(seg, segs[i + 1])
    );

    return {
      title,
      originCity: originCity || '—',
      destinationCity: destCity || '—',
      dateShort: dateShort.replace(/^\w+\s+/, ''), // "28 Mar 2026" style
      totalDuration,
      segments: timelineSegs,
    };
  });
}

function getSeatForPassengerSegment(
  passenger: PassengerRow,
  segment: VoucherPayload['segments'][0],
  index: number,
  totalPassengers: number
): string {
  const fallbackSeat = cleanSeat(segment.seat || '-');
  const seatMap = parseSeatAssignments(segment.seat_assignments);
  return cleanSeat(
    resolvePassengerSeat(passenger, seatMap, fallbackSeat, index, totalPassengers)
  );
}

function buildPassengersFooter(
  passengers: PassengerRow[],
  segments: VoucherPayload['segments']
): PassengerFooterRow[] {
  const ordered = [...segments].sort(
    (a, b) => (a.segment_number ?? 999) - (b.segment_number ?? 999)
  );

  return passengers.map((p, pIdx) => {
    const seats: string[] = ordered.map((seg) =>
      getSeatForPassengerSegment(p, seg, pIdx, passengers.length)
    );
    const aggregated = seats.filter((s) => s && s !== '-').join(',');
    return {
      ...p,
      seatsAggregated: aggregated || '-',
    };
  });
}

function buildJourneySections(
  segments: VoucherPayload['segments'],
  passengers: PassengerRow[],
  tripType: string
): JourneySectionViewModel[] {
  const orderedSegments = [...segments].sort(
    (a, b) => (a.segment_number || 999) - (b.segment_number || 999)
  );
  const hasReturn = orderedSegments.some(
    (segment) => segment.voucher_trip_type?.trim().toLowerCase() === 'retorno'
  );

  const grouped = new Map<string, SegmentViewModel[]>();

  for (const segment of orderedSegments) {
    const journeyLabel = buildJourneyLabel(hasReturn, tripType, segment.voucher_trip_type || '');
    const row: SegmentViewModel = {
      segmentNumber: segment.segment_number,
      journeyLabel,
      tripTypeLabel: segment.voucher_trip_type || '',
      marketingAirline: segment.marketing_airline || '',
      operatedBy: segment.operated_by || '',
      carrierDisplay: buildCarrierDisplay(segment),
      flightNumber: segment.flight_number || '—',
      routeDisplay: buildRouteDisplay(segment),
      airportDisplay: buildAirportDisplay(segment),
      departureDateTime: formatDateTimeLine(segment.departure_date, segment.departure_time || ''),
      arrivalDateTime: formatDateTimeLine(segment.arrival_date, segment.arrival_time || ''),
      duration: segment.duration || '—',
      travelClass: segment.travel_class || '—',
      baggage: segment.baggage || '—',
      fareBasis: segment.fare_basis || '—',
      bookingStatus: segment.booking_status || '—',
      passengers: buildSegmentPassengers(passengers, segment),
    };

    const current = grouped.get(journeyLabel) ?? [];
    current.push(row);
    grouped.set(journeyLabel, current);
  }

  return Array.from(grouped.entries()).map(([title, sectionSegments]) => ({
    title,
    segments: sectionSegments,
  }));
}

function buildAirlinesInvolved(
  reservation: VoucherPayload['reservation'],
  segments: VoucherPayload['segments']
): string[] {
  return uniqueList([
    ...(reservation.airlines_involved ?? []),
    reservation.airline_main,
    ...segments.flatMap((segment) => [segment.marketing_airline, segment.operated_by]),
  ]);
}

function buildExtras(extras: string[], phone: string): string[] {
  const cleaned = extras.map((item) => item.trim()).filter(Boolean);
  if (cleaned.length > 0) return cleaned;

  const defaults = [
    'PRESENTARSE EN AEROPUERTO CON TIEMPO SUFICIENTE PARA CHECK-IN Y SEGURIDAD.',
    'VALIDAR REQUISITOS MIGRATORIOS, VISA Y VIGENCIA MINIMA DEL PASAPORTE.',
    'REVISAR POLITICAS DE CAMBIO, CANCELACION Y EQUIPAJE ANTES DEL VIAJE.',
  ];

  if (phone) {
    defaults.push(`EN CASO DE EMERGENCIA CONTACTAR A LA AGENCIA AL ${phone}.`);
  }

  return defaults;
}

export function buildVoucherViewModel(payload: VoucherPayload): VoucherViewModel {
  const { reservation, segments } = payload;
  const passengers = buildPassengerRows(reservation);
  const journeySections = buildJourneySections(segments, passengers, reservation.trip_type || '');
  const timelineSections = buildTimelineSections(segments, reservation.trip_type || '');
  const passengersFooter = buildPassengersFooter(passengers, segments);
  const airlinesInvolved = buildAirlinesInvolved(reservation, segments);
  const agencyEmergencyPhone =
    reservation.agency_emergency_phone || config.agencyPhoneDefault;

  const orderedSegs = [...segments].sort(
    (a, b) => (a.segment_number ?? 999) - (b.segment_number ?? 999)
  );
  const firstSeg = orderedSegs[0];
  const lastSeg = orderedSegs[orderedSegs.length - 1];
  const firstDepDate = firstSeg?.departure_date || reservation.departure_date || '';
  const lastDestCity = formatCityName(
    lastSeg?.destination_city || lastSeg?.destination_name || ''
  );
  const lastDestCode = lastSeg?.destination_code || '';
  const headerDateDest = firstDepDate
    ? `${formatDateLongSpanish(firstDepDate).toUpperCase()} ▸ ${lastDestCity.toUpperCase()} (${lastDestCode})`
    : '';
  const departureDateFull = firstDepDate
    ? formatDateWithWeekdaySpanish(firstDepDate).toUpperCase()
    : '';
  const passengerNamesList = passengers.map((p) =>
    (p.nameTableDisplay || p.nameFull || p.nameIata).toUpperCase()
  );

  return {
    generatedAt: formatDateLongSpanish(new Date().toISOString()),
    passengerFull: reservation.passenger_full || passengers.map((p) => p.nameFull).join(', '),
    reservationCode: reservation.reservation_code || '—',
    routeSummary: reservation.route_summary || '—',
    tripTypeLabel: reservation.trip_type || 'ITINERARIO',
    issueDate: reservation.issue_date ? formatDateLongSpanish(reservation.issue_date) : '—',
    departureDate: reservation.departure_date
      ? formatDateLongSpanish(reservation.departure_date)
      : '—',
    returnDate: reservation.return_date ? formatDateLongSpanish(reservation.return_date) : '—',
    airlineMain: reservation.airline_main || '—',
    airlinesInvolved,
    airlineDisplay: airlinesInvolved.join(' / ') || reservation.airline_main || '—',
    agencyName: reservation.agency_name || 'JYL CONSULTORES TURISMO Y EVENTOS',
    issuingOffice: reservation.issuing_office || '—',
    agencyEmergencyPhone,
    agencyTagline: 'TURISMO • EVENTOS • CONVENCIONES',
    passengers,
    journeySections,
    extras: buildExtras(reservation.extras ?? [], agencyEmergencyPhone),
    headerDateDest,
    departureDateFull,
    passengerNamesList,
    timelineSections,
    passengersFooter,
  };
}
