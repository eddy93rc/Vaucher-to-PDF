export interface PassengerRow {
  nameFull: string;
  nameIata: string;
  nameTableDisplay: string;
  passengerType: string;
  ticketNumber: string;
  ticketNumberDisplay: string;
}

export interface PassengerSeatRow extends PassengerRow {
  seat: string;
  seatClean: string;
}

export interface SegmentViewModel {
  segmentNumber: number;
  journeyLabel: string;
  tripTypeLabel: string;
  marketingAirline: string;
  operatedBy: string;
  carrierDisplay: string;
  flightNumber: string;
  routeDisplay: string;
  airportDisplay: string;
  departureDateTime: string;
  arrivalDateTime: string;
  duration: string;
  travelClass: string;
  baggage: string;
  fareBasis: string;
  bookingStatus: string;
  passengers: PassengerSeatRow[];
}

export interface JourneySectionViewModel {
  title: string;
  segments: SegmentViewModel[];
}

/** Segmento para vista timeline (estilo JYL) */
export interface TimelineSegmentViewModel {
  segmentNumber: number;
  originCity: string;
  originCode: string;
  originAirportFull: string;
  destinationCity: string;
  destinationCode: string;
  destinationAirportFull: string;
  flightInfo: string;
  departureDateShort: string;
  departureTime: string;
  departureCode: string;
  duration: string;
  durationDisplay: string; // "8h 10m"
  arrivalDateShort: string;
  arrivalTime: string;
  arrivalPlus1: boolean;
  arrivalCode: string;
  layoverAfter: string; // "Escala de 2h" o ""
}

/** Sección de itinerario para vista timeline */
export interface TimelineSectionViewModel {
  title: string;
  originCity: string;
  destinationCity: string;
  dateShort: string;
  totalDuration: string;
  segments: TimelineSegmentViewModel[];
}

/** Pasajero con asientos agregados por tramo (para tabla footer) */
export interface PassengerFooterRow extends PassengerRow {
  seatsAggregated: string; // "23A,9A"
}

export interface VoucherViewModel {
  generatedAt: string;
  passengerFull: string;
  reservationCode: string;
  routeSummary: string;
  tripTypeLabel: string;
  issueDate: string;
  departureDate: string;
  returnDate: string;
  airlineMain: string;
  airlinesInvolved: string[];
  airlineDisplay: string;
  agencyName: string;
  issuingOffice: string;
  agencyEmergencyPhone: string;
  agencyTagline: string;
  passengers: PassengerRow[];
  journeySections: JourneySectionViewModel[];
  extras: string[];
  /** Vista header estilo JYL */
  headerDateDest: string;
  departureDateFull: string;
  passengerNamesList: string[];
  /** Secciones timeline para layout limpio */
  timelineSections: TimelineSectionViewModel[];
  /** Pasajeros con asientos agregados para tabla footer */
  passengersFooter: PassengerFooterRow[];
}
