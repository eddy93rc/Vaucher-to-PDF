/**
 * Prompt para extracción de datos de ticket aéreo con OpenAI.
 * El JSON retornado debe ser compatible con el nodo "Extraer Datos Parseur" de n8n
 * y el flujo "Formatear Lista Pasajeros" → "Mapear Parseur a Monday".
 */

export const EXTRACTION_SYSTEM_PROMPT = `Eres un experto en extraer datos estructurados de tickets aéreos (boletos) en PDF.

Tu tarea es analizar el documento y devolver ÚNICAMENTE un objeto JSON válido con la estructura exacta indicada.

Reglas importantes:
1. Nombres IATA: Formato APELLIDO/NOMBRE sin espacios (ej: DIAZCONTRERAS/ANAALEXANDRA)
2. Fechas: Formato YYYY-MM-DD (ej: 2026-03-11)
3. Horas: Formato HH:MM o HH:MM:SS (ej: 22:50)
4. seat_assignments: Formato "APELLIDO/NOMBRE=ASIENTO" separados por coma si hay varios (ej: DIAZCONTRERAS/ANAALEXANDRA=03A)
5. voucher_trip_type: "Salida" para el primer tramo de ida, "Conexión" para escalas, "Retorno" para vuelta
6. ticket_number en pasajeros: número de boleto sin espacios o con un espacio entre grupos de 3 dígitos
7. Si un dato no está en el documento, usa cadena vacía "" o array vacío [] según corresponda`;

export const EXTRACTION_USER_PROMPT = `Analiza este ticket aéreo y extrae todos los datos. Responde ÚNICAMENTE con el JSON (sin markdown, sin explicaciones).`;

export const RESPONSE_FORMAT = {
  type: 'json_schema' as const,
  name: 'ticket_extraction',
  strict: false, // strict:true exige additionalProperties:false en todo el árbol; usar false evita el error 400
  schema: {
      type: 'object',
      properties: {
        reservation_code: { type: 'string', description: 'PNR o código de reserva (ej: 8ZTDP5)' },
        ticket_number: { type: 'string', description: 'Número de boleto principal si es uno solo' },
        passenger_name: { type: 'string', description: 'Nombre completo del pasajero principal' },
        passenger_destination: { type: 'string', description: 'Destino final del pasajero (ciudad o código)' },
        airline_main: { type: 'string', description: 'Aerolínea principal' },
        airlines_involved: { type: 'string', description: 'Aerolíneas involucradas separadas por coma o newline' },
        departure_date: { type: 'string', description: 'Fecha de salida YYYY-MM-DD' },
        return_date: { type: 'string', description: 'Fecha de regreso YYYY-MM-DD' },
        segment_count: { type: 'string', description: 'Cantidad de segmentos' },
        issue_date: { type: 'string', description: 'Fecha de emisión del ticket' },
        origin_main_code: { type: 'string', description: 'Código IATA origen principal' },
        destination_final_code: { type: 'string', description: 'Código IATA destino final' },
        route_summary: { type: 'string', description: 'Resumen de ruta ej: FCO-MAD' },
        trip_type: { type: 'string', description: 'Solo ida, Ida y vuelta, o Multiciudad' },
        travel_class: { type: 'string', description: 'ECONOMY, BUSINESS, etc' },
        baggage_allowance: { type: 'string', description: 'Equipaje permitido ej: 1PC' },
        fare_basis: { type: 'string', description: 'Fare basis code' },
        booking_status: { type: 'string', description: 'OK, confirmado, etc' },
        agency_name: { type: 'string', description: 'Nombre de la agencia' },
        issuing_office: { type: 'string', description: 'Oficina emisora' },
        agency_emergency_phone: { type: 'string', description: 'Teléfono emergencia agencia' },
        currency: { type: 'string', description: 'Moneda ej: USD' },
        passengers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              passenger_number: { type: 'number' },
              passenger_name: { type: 'string', description: 'Nombre completo legible' },
              passenger_voucher: { type: 'string', description: 'Formato IATA APELLIDO/NOMBRE' },
              passenger_type: { type: 'string', description: 'ADT, CHD, INF' },
              ticket_number: { type: 'string', description: 'Número de boleto del pasajero' },
            },
            required: ['passenger_voucher', 'ticket_number'],
            additionalProperties: false,
          },
        },
        segments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              segment_number: { type: 'number' },
              flight_number: { type: 'string', description: 'Número de vuelo sin aerolínea' },
              marketing_airline: { type: 'string' },
              operated_by: { type: 'string' },
              origin_code: { type: 'string', description: 'Código IATA origen' },
              origin_city: { type: 'string' },
              origin_name: { type: 'string', description: 'Nombre aeropuerto origen' },
              origin_terminal: { type: 'string' },
              destination_code: { type: 'string' },
              destination_city: { type: 'string' },
              destination_name: { type: 'string' },
              destination_terminal: { type: 'string' },
              departure_date: { type: 'string' },
              departure_time: { type: 'string' },
              arrival_date: { type: 'string' },
              arrival_time: { type: 'string' },
              duration: { type: 'string' },
              travel_class: { type: 'string' },
              baggage: { type: 'string' },
              fare_basis: { type: 'string' },
              ticket_number: { type: 'string' },
              seat: { type: 'string' },
              seat_assignments: { type: 'string', description: 'APELLIDO/NOMBRE=ASIENTO' },
              voucher_heading_date: { type: 'string', description: 'Fecha para encabezado YYYY-MM-DD' },
              voucher_heading_destination: { type: 'string', description: 'Destino para encabezado ej: ROMA (FCO) - MADRID, MAD' },
              voucher_trip_type: { type: 'string', description: 'Salida, Conexión o Retorno' },
            },
            required: ['segment_number', 'origin_code', 'destination_code'],
            additionalProperties: false,
          },
        },
      },
  required: ['reservation_code', 'passengers', 'segments'],
  additionalProperties: false,
  }
};
