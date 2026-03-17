import { z } from 'zod';

export const segmentSchema = z.object({
  segment_number: z.number(),
  voucher_heading_date: z.string().optional().default(''),
  voucher_heading_destination: z.string().optional().default(''),
  voucher_trip_type: z.string().optional().default('Salida'),
  marketing_airline: z.string().optional().default(''),
  flight_number: z.string().optional().default(''),
  operated_by: z.string().optional().default(''),
  origin_code: z.string().optional().default(''),
  origin_city: z.string().optional().default(''),
  origin_name: z.string().optional().default(''),
  origin_terminal: z.string().optional().default(''),
  destination_code: z.string().optional().default(''),
  destination_city: z.string().optional().default(''),
  destination_name: z.string().optional().default(''),
  destination_terminal: z.string().optional().default(''),
  departure_date: z.string().optional().default(''),
  departure_time: z.string().optional().default('00:00'),
  arrival_date: z.string().optional().default(''),
  arrival_time: z.string().optional().default('00:00'),
  duration: z.string().optional().default(''),
  travel_class: z.string().optional().default(''),
  booking_status: z.string().optional().default(''),
  baggage: z.string().optional().default(''),
  fare_basis: z.string().optional().default(''),
  ticket_number: z.string().optional().default(''),
  seat: z.string().optional().transform((v) => (v && v.trim() ? v : '-')).default('-'),
  seat_assignments: z.string().optional().default(''),
  flight_type: z.string().optional().default(''),
});

export const passengerSchema = z.object({
  nameIata: z.string(),
  nameFull: z.string(),
  nameTableDisplay: z.string().optional(),
  passengerType: z.string().optional().default(''),
  ticketNumber: z.string().optional().default(''),
});

export const reservationSchema = z.object({
  passenger_full: z.string().optional().default(''),
  passenger_voucher: z.string().optional().default(''),
  passenger_list: z.array(passengerSchema).optional().default([]),
  reservation_code: z.string().optional().default(''),
  ticket_number: z.string().optional().default(''),
  airline_main: z.string().optional().default(''),
  airlines_involved: z.array(z.string()).optional().default([]),
  issue_date: z.string().optional().default(''),
  origin_main_code: z.string().optional().default(''),
  destination_final_code: z.string().optional().default(''),
  passenger_destination: z.string().optional().default(''),
  departure_date: z.string().optional().default(''),
  return_date: z.string().optional().default(''),
  route_summary: z.string().optional().default(''),
  trip_type: z.string().optional().default(''),
  segment_count: z.union([z.number(), z.string()]).optional().transform((v) => (v == null ? '' : String(v))).default(''),
  travel_class: z.string().optional().default(''),
  baggage_allowance: z.string().optional().default(''),
  fare_basis: z.string().optional().default(''),
  booking_status: z.string().optional().default(''),
  agency_name: z.string().optional().default(''),
  issuing_office: z.string().optional().default(''),
  agency_emergency_phone: z.string().optional().default(''),
  currency: z.string().optional().default(''),
  extras: z.array(z.string()).default([]),
});

export const voucherPayloadSchema = z.object({
  reservation: reservationSchema,
  segments: z.array(segmentSchema).default([]),
});

export const voucherUploadPayloadSchema = voucherPayloadSchema.extend({
  item_id: z.union([z.string(), z.number()]).transform((v) => String(v)),
});

export const pulseIdPayloadSchema = z
  .object({
    pulse_id: z.union([z.string(), z.number()]).optional(),
    item_id: z.union([z.string(), z.number()]).optional(),
  })
  .transform((data) => {
    const id = data.pulse_id ?? data.item_id;
    return { pulse_id: id ? String(id) : '' };
  })
  .refine((data) => !!data.pulse_id, { message: 'Se requiere pulse_id o item_id' });

export type Segment = z.infer<typeof segmentSchema>;
export type Reservation = z.infer<typeof reservationSchema>;
export type VoucherPayload = z.infer<typeof voucherPayloadSchema>;
export type VoucherUploadPayload = z.infer<typeof voucherUploadPayloadSchema>;
export type PulseIdPayload = z.infer<typeof pulseIdPayloadSchema>;
