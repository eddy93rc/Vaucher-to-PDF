#!/usr/bin/env node
/**
 * setup-parseur.js
 *
 * Crea el buzón "Ticket Aereo" en Parseur para extracción de datos de tickets
 * aéreos PDF. Configura IA, instrucciones generales y campos (globales + tabla
 * segments) para mapear luego a Monday y generar vouchers.
 *
 * Uso: node setup-parseur.js
 * Carga .env y .env.parseur automáticamente.
 *
 * Requisitos: Node.js 18+ (fetch nativo)
 * Idempotente: si el buzón existe, solo actualiza campos faltantes o avisa.
 * No destruye buzones existentes.
 */

const fs = require('fs');
const path = require('path');

// --- Cargar variables de entorno ---
function loadEnv(fileName) {
  const envPath = path.join(process.cwd(), fileName);
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eq = trimmed.indexOf('=');
        if (eq > 0) {
          const key = trimmed.slice(0, eq).trim();
          const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
          if (key && !process.env[key]) process.env[key] = val;
        }
      }
    }
  }
}
loadEnv('.env');
loadEnv('.env.parseur');

const API_URL = (process.env.PARSEUR_API_URL || 'https://api.parseur.com').replace(/\/$/, '');
const API_KEY = process.env.PARSEUR_API_KEY;
const MAILBOX_NAME = process.env.PARSEUR_MAILBOX_NAME || 'Ticket Aereo';

// --- Validación ---
if (!API_KEY || API_KEY === 'tu_api_key_aqui') {
  console.error('Error: PARSEUR_API_KEY no está definido o tiene el valor por defecto.');
  console.error('  Añade PARSEUR_API_KEY a .env o .env.parseur');
  process.exit(1);
}

const AI_INSTRUCTIONS =
  'Estos documentos son tickets aéreos en PDF de distintas aerolíneas y agencias, en español o bilingües. Extrae los datos de TODOS los pasajeros, de la reserva y de los segmentos de vuelo aunque el layout cambie. Devuelve solo valores, sin etiquetas como \'Número de Itinerario\', \'Código de Reserva\' o \'Boleto aéreo\'. Mantén nombres, códigos, correos y teléfonos exactamente como aparecen. Si hay varios pasajeros, conserva la relación entre pasajero, ticket y asiento. Ignora textos legales, políticas de cambios y restricciones no necesarios para el voucher.';

// --- Definición de campos globales ---
const GLOBAL_FIELDS = [
  { name: 'passenger_name', format: 'NAME', query: 'Nombre completo del pasajero principal' },
  { name: 'reservation_code', format: 'ONELINE', query: 'PNR, código de reserva, Record Locator' },
  { name: 'ticket_number', format: 'ONELINE', query: 'Número de boleto principal' },
  { name: 'airline_main', format: 'ONELINE', query: 'Aerolínea principal/emisora' },
  {
    name: 'airlines_involved',
    format: 'TEXT',
    query:
      'Lista única de aerolíneas involucradas en el itinerario, una por línea o separadas por coma. Incluir marketing y operadoras si difieren.',
  },
  { name: 'issue_date', format: 'DATE', query: 'Fecha de emisión del boleto' },
  { name: 'origin_main_code', format: 'ONELINE', query: 'Código IATA del aeropuerto de origen principal' },
  { name: 'destination_final_code', format: 'ONELINE', query: 'Código IATA del aeropuerto de destino final' },
  {
    name: 'passenger_destination',
    format: 'ONELINE',
    query:
      'Destino principal del pasajero. En viaje solo ida, devolver el código IATA o ciudad del último destino del itinerario. En ida y vuelta, devolver el destino más lejano, no el aeropuerto de retorno.',
  },
  { name: 'route_summary', format: 'TEXT', query: 'Resumen de la ruta completa del itinerario' },
  { name: 'departure_date', format: 'DATE', query: 'Fecha de salida del primer vuelo' },
  { name: 'return_date', format: 'DATE', query: 'Fecha de regreso si aplica' },
  {
    name: 'trip_type',
    format: 'ONELINE',
    query: 'Tipo de viaje: Solo ida, Ida y vuelta o Multiciudad',
    choice_set: ['Solo ida', 'Ida y vuelta', 'Multiciudad'],
  },
  { name: 'segment_count', format: 'NUMBER', query: 'Cantidad total de segmentos de vuelo' },
  { name: 'travel_class', format: 'ONELINE', query: 'Clase de servicio (Económica, Ejecutiva, etc.)' },
  { name: 'baggage_allowance', format: 'ONELINE', query: 'Inclusión de equipaje' },
  { name: 'fare_basis', format: 'ONELINE', query: 'Código Fare Basis' },
  { name: 'booking_status', format: 'ONELINE', query: 'Estado de la reserva' },
  { name: 'agency_name', format: 'ONELINE', query: 'Nombre de la agencia' },
  { name: 'issuing_office', format: 'ONELINE', query: 'Oficina emisora' },
  { name: 'currency', format: 'ONELINE', query: 'Moneda del ticket o de la tarifa si aparece' },
];

// --- Definición de columnas de la tabla passengers ---
const PASSENGER_COLUMNS = [
  { name: 'passenger_number', format: 'NUMBER', query: 'Número del pasajero (1, 2, 3...)' },
  { name: 'passenger_name', format: 'NAME', query: 'Nombre completo del pasajero' },
  {
    name: 'passenger_voucher',
    format: 'ONELINE',
    query: 'Nombre del pasajero en formato voucher/IATA: APELLIDO/NOMBRE, sin títulos como MR o MRS',
  },
  { name: 'passenger_type', format: 'ONELINE', query: 'Tipo de pasajero: ADT, CHD, INF o equivalente si aparece' },
  { name: 'ticket_number', format: 'ONELINE', query: 'Número de boleto de este pasajero' },
];

// Instrucción sugerida para tabla passengers (si se añade manualmente):
// "Extraer una fila por cada pasajero listado en el ticket. Para cada fila devolver passenger_number, passenger_name, passenger_voucher, passenger_type y ticket_number. Si hay varios pasajeros, devolver todos."

// --- Definición de columnas de la tabla segments ---
const SEGMENT_COLUMNS = [
  { name: 'segment_number', format: 'NUMBER', query: 'Número del segmento (1, 2, 3...)' },
  { name: 'voucher_heading_date', format: 'DATE', query: 'Fecha para encabezado del voucher de este tramo' },
  { name: 'voucher_heading_destination', format: 'ONELINE', query: 'Destino del tramo para el voucher' },
  {
    name: 'voucher_trip_type',
    format: 'ONELINE',
    query: 'Tipo de tramo: Salida, Conexión o Retorno',
    choice_set: ['Salida', 'Conexión', 'Retorno'],
  },
  { name: 'marketing_airline', format: 'ONELINE', query: 'Aerolínea comercializadora del tramo' },
  { name: 'flight_number', format: 'ONELINE', query: 'Número de vuelo' },
  { name: 'operated_by', format: 'ONELINE', query: 'Operado por / Aerolínea operadora' },
  { name: 'origin_code', format: 'ONELINE', query: 'Código IATA aeropuerto origen' },
  { name: 'origin_name', format: 'ONELINE', query: 'Nombre del aeropuerto de origen' },
  { name: 'origin_city', format: 'ONELINE', query: 'Ciudad del aeropuerto de origen (ej. Roma, Madrid, Londres, Santo Domingo)' },
  { name: 'origin_terminal', format: 'ONELINE', query: 'Terminal de salida' },
  { name: 'destination_code', format: 'ONELINE', query: 'Código IATA aeropuerto destino' },
  { name: 'destination_name', format: 'ONELINE', query: 'Nombre del aeropuerto de destino' },
  { name: 'destination_city', format: 'ONELINE', query: 'Ciudad del aeropuerto de destino (ej. Roma, Madrid, Londres, Santo Domingo)' },
  { name: 'destination_terminal', format: 'ONELINE', query: 'Terminal de llegada' },
  { name: 'departure_date', format: 'DATE', query: 'Fecha de salida del tramo' },
  { name: 'departure_time', format: 'TIME', query: 'Hora de salida' },
  { name: 'arrival_date', format: 'DATE', query: 'Fecha de llegada' },
  { name: 'arrival_time', format: 'TIME', query: 'Hora de llegada' },
  { name: 'duration', format: 'ONELINE', query: 'Duración del vuelo' },
  { name: 'travel_class', format: 'ONELINE', query: 'Clase en este segmento' },
  { name: 'booking_status', format: 'ONELINE', query: 'Estado del segmento' },
  { name: 'baggage', format: 'ONELINE', query: 'Equipaje en este tramo' },
  { name: 'fare_basis', format: 'ONELINE', query: 'Fare basis del segmento' },
  { name: 'ticket_number', format: 'ONELINE', query: 'Número de ticket del segmento' },
  { name: 'seat', format: 'ONELINE', query: 'Asiento asignado' },
  {
    name: 'seat_assignments',
    format: 'TEXT',
    query:
      'Lista de asientos por pasajero en este segmento. Devuelve una línea por pasajero con el formato APELLIDO/NOMBRE=ASIENTO. Ejemplo: DEOLEOREYES/FRANCISWILLYS=03A',
  },
];

/**
 * Ejecuta una petición HTTP a la API de Parseur.
 */
async function parseurRequest(method, path, body = null) {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const opts = {
    method,
    headers: {
      Authorization: `Token ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  };
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }

  if (!res.ok) {
    const errMsg = json.non_field_errors || json.detail || JSON.stringify(json) || text;
    throw new Error(`Parseur API ${res.status}: ${errMsg}`);
  }
  return json;
}

async function getMailboxDetails(mailboxId) {
  return parseurRequest('GET', `/parser/${mailboxId}`);
}

/**
 * Convierte definición de campo a formato que acepta la API.
 * Omite choice_set si no está presente (no todos los formatos lo soportan).
 */
function toParserField(def) {
  const field = {
    name: def.name,
    format: def.format,
    query: def.query || '',
  };
  if (def.choice_set && def.format === 'ONELINE') {
    field.choice_set = def.choice_set;
  }
  return field;
}

function applySequentialPositions(desiredFields, existingFields = [], basePosition = 1000) {
  const existingByName = new Map(
    existingFields
      .filter((field) => field && field.name)
      .map((field, index) => [field.name, { ...field, position: field.position ?? index }])
  );

  return desiredFields.map((field, index) => {
    const existing = existingByName.get(field.name);
    const nextField = {
      ...field,
      position:
        typeof existing?.position === 'number'
          ? existing.position
          : basePosition + index * 10,
    };

    if (field.format === 'TABLE' && Array.isArray(field.parser_object_set)) {
      nextField.parser_object_set = applySequentialPositions(
        field.parser_object_set,
        Array.isArray(existing?.parser_object_set) ? existing.parser_object_set : [],
        basePosition + 500
      );
    }

    return nextField;
  });
}

/**
 * Busca un buzón por nombre.
 */
async function findMailboxByName(name) {
  const data = await parseurRequest('GET', `/parser?search=${encodeURIComponent(name)}&page_size=100`);
  const results = data.results || [];
  return results.find((m) => m.name === name) || null;
}

/**
 * Crea el buzón en Parseur.
 */
async function createMailbox() {
  const body = {
    name: MAILBOX_NAME,
    ai_engine: 'GCP_AI_2',
    ai_instructions: AI_INSTRUCTIONS,
  };
  const data = await parseurRequest('POST', '/parser', body);
  return data;
}

/**
 * Actualiza el buzón con parser_object_set.
 */
async function updateMailboxFields(mailboxId, parserObjectSet) {
  const body = {
    id: mailboxId,
    name: MAILBOX_NAME,
    ai_engine: 'GCP_AI_2',
    ai_instructions: AI_INSTRUCTIONS,
    parser_object_set: parserObjectSet,
  };
  return parseurRequest('PUT', `/parser/${mailboxId}`, body);
}

/**
 * Construye el parser_object_set completo: campos globales + tabla segments.
 */
function buildParserObjectSet() {
  const globalFields = GLOBAL_FIELDS.map(toParserField);
  const passengerColumns = PASSENGER_COLUMNS.map((col) => {
    const f = toParserField(col);
    delete f.choice_set;
    return f;
  });
  const passengersTable = {
    name: 'passengers',
    format: 'TABLE',
    query:
      'Extraer una fila por cada pasajero listado en el ticket. Para cada fila devolver passenger_number, passenger_name, passenger_voucher, passenger_type y ticket_number. Si hay varios pasajeros, devolver todos.',
    parser_object_set: passengerColumns,
  };
  const segmentColumns = SEGMENT_COLUMNS.map((col) => {
    const f = toParserField(col);
    delete f.choice_set;
    return f;
  });
  const segmentsTable = {
    name: 'segments',
    format: 'TABLE',
    query: 'Tabla de segmentos de vuelo: cada fila es un tramo. Extrae todos los segmentos del ticket.',
    parser_object_set: segmentColumns,
  };

  return [...globalFields, passengersTable, segmentsTable];
}

// --- Main ---
async function main() {
  console.log('=== Setup Parseur - Buzón Ticket Aereo ===\n');
  console.log(`API: ${API_URL}`);
  console.log(`Buzón: ${MAILBOX_NAME}\n`);

  let mailbox = await findMailboxByName(MAILBOX_NAME);

  if (mailbox) {
    console.log(`Buzón "${MAILBOX_NAME}" ya existe (id: ${mailbox.id})`);
  } else {
    try {
      mailbox = await createMailbox();
      console.log(`Buzón creado (id: ${mailbox.id}, email_prefix: ${mailbox.email_prefix || '—'})`);
    } catch (err) {
      console.error('Error creando buzón:', err.message);
      process.exit(1);
    }
  }

  // Actualizar campos
  let parserObjectSet = buildParserObjectSet();
  let fieldsUpdated = false;

  try {
    const mailboxDetails = await getMailboxDetails(mailbox.id);
    parserObjectSet = applySequentialPositions(
      parserObjectSet,
      mailboxDetails?.parser_object_set || []
    );
    await updateMailboxFields(mailbox.id, parserObjectSet);
    fieldsUpdated = true;
    console.log(`\nCampos configurados: ${parserObjectSet.length} objetos`);
    console.log(`  - ${GLOBAL_FIELDS.length} campos globales`);
    console.log(`  - 1 tabla "passengers" con ${PASSENGER_COLUMNS.length} columnas`);
    console.log(`  - 1 tabla "segments" con ${SEGMENT_COLUMNS.length} columnas`);
  } catch (err) {
    console.error('\nError actualizando campos:', err.message);
    console.log('\n--- Pendiente manual ---');
    console.log('Configura en Parseur (app.parseur.com) las tablas passengers y segments');
  }

  // Resumen final
  console.log('\n=== Resumen ===');
  console.log(`Buzón: ${MAILBOX_NAME} (id: ${mailbox.id})`);
  console.log(`AI engine: GCP_AI_2`);
  if (mailbox.email_prefix) {
    console.log(`Email: ${mailbox.email_prefix}@parseur.com`);
  }
  if (fieldsUpdated) {
    console.log('\nCampos globales creados:');
    GLOBAL_FIELDS.forEach((f) => console.log(`  - ${f.name} (${f.format})`));
    console.log('\nTabla passengers - columnas:');
    PASSENGER_COLUMNS.forEach((c) => console.log(`  - ${c.name} (${c.format})`));
    console.log('\nTabla segments - columnas:');
    SEGMENT_COLUMNS.forEach((c) => console.log(`  - ${c.name} (${c.format})`));
  }

  console.log('\n¡Listo!');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
