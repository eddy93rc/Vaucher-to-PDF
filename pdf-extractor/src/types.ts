/**
 * Estructura compatible con n8n "Extraer Datos Parseur" y "Formatear Lista Pasajeros"
 */
export interface PassengerExtraction {
  passenger_number?: number;
  passenger_name?: string;
  passenger_voucher: string;
  passenger_type?: string;
  ticket_number: string;
}

export interface SegmentExtraction {
  segment_number: number;
  flight_number?: string;
  marketing_airline?: string;
  operated_by?: string;
  origin_code: string;
  origin_city?: string;
  origin_name?: string;
  origin_terminal?: string;
  destination_code: string;
  destination_city?: string;
  destination_name?: string;
  destination_terminal?: string;
  departure_date?: string;
  departure_time?: string;
  arrival_date?: string;
  arrival_time?: string;
  duration?: string;
  travel_class?: string;
  baggage?: string;
  fare_basis?: string;
  ticket_number?: string;
  seat?: string;
  seat_assignments?: string;
  voucher_heading_date?: string;
  voucher_heading_destination?: string;
  voucher_trip_type?: string;
}

export interface TicketExtraction {
  reservation_code: string;
  ticket_number?: string;
  passenger_name?: string;
  passenger_destination?: string;
  airline_main?: string;
  airlines_involved?: string;
  departure_date?: string;
  return_date?: string;
  segment_count?: string;
  issue_date?: string;
  origin_main_code?: string;
  destination_final_code?: string;
  route_summary?: string;
  trip_type?: string;
  travel_class?: string;
  baggage_allowance?: string;
  fare_basis?: string;
  booking_status?: string;
  agency_name?: string;
  issuing_office?: string;
  agency_emergency_phone?: string;
  currency?: string;
  passengers: PassengerExtraction[];
  segments: SegmentExtraction[];
}

/** Payload completo que devuelve el endpoint (compatible con webhook Parseur) */
export interface ExtractionResponse extends TicketExtraction {
  document_id: string;
  monday_pulse_id: string;
  monday_board_id?: string;
}
