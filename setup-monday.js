#!/usr/bin/env node
/**
 * setup-monday.js
 *
 * Crea la estructura base del tablero RESERVAS en Monday.com para el proyecto
 * de automatización de reservas aéreas (auto-vaucher).
 *
 * Uso:
 *   MONDAY_API_TOKEN=xxx node setup-monday.js
 *   O: node setup-monday.js  (carga .env automáticamente si existe)
 *   Board por ID: MONDAY_BOARD_ID=18404261128 node setup-monday.js
 *   Board con nombre distinto: MONDAY_BOARD_NAME="RESERVAS_NUEVO" node setup-monday.js
 *
 * Requisitos: Node.js 18+ (fetch nativo)
 * Idempotente: si el board existe, solo añade columnas faltantes.
 * No destruye datos existentes.
 *
 * NOTA: Las columnas están alineadas con el extractor OpenAI y el generador
 * de PDF (vaucher-to-pdf). Los títulos coinciden con el mapeo por título.
 */

// Cargar .env si existe (sin dependencias externas)
const fs = require('fs');
const path = require('path');
const envPath = path.join(process.cwd(), '.env');
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

const API_URL = process.env.MONDAY_API_URL || 'https://api.monday.com/v2';
const API_TOKEN = process.env.MONDAY_API_TOKEN;
const WORKSPACE_ID = process.env.MONDAY_WORKSPACE_ID;
/** Si está definido, usa este board directamente (ej: 18404261128). No crea ni busca por nombre. */
const BOARD_ID = process.env.MONDAY_BOARD_ID;

// --- Validación de variables de entorno ---
if (!API_TOKEN || API_TOKEN === 'tu_token_aqui') {
  console.error('Error: MONDAY_API_TOKEN no está definido o tiene el valor por defecto.');
  console.error('  Copia .env.example a .env y configura tu token de Monday.');
  process.exit(1);
}

// --- Definición de columnas principales (alineadas con extractor OpenAI + generador PDF) ---
const MAIN_COLUMNS = [
  { title: 'Pasajero principal', column_type: 'text' },
  { title: 'Nombre voucher', column_type: 'text' },
  { title: 'PNR / Código reserva', column_type: 'text' },
  { title: 'Número de boleto', column_type: 'text' },
  { title: 'Lista pasajeros', column_type: 'long_text' },
  { title: 'Aerolínea principal', column_type: 'text' },
  { title: 'Aerolíneas involucradas', column_type: 'long_text' },
  { title: 'Agencia', column_type: 'text' },
  { title: 'Oficina emisora', column_type: 'text' },
  { title: 'Moneda', column_type: 'text' },
  { title: 'Fecha emisión ticket', column_type: 'date' },
  { title: 'Origen principal', column_type: 'text' },
  { title: 'Destino final', column_type: 'text' },
  { title: 'Destino pasajero', column_type: 'text' },
  { title: 'Ruta general', column_type: 'long_text' },
  { title: 'Fecha salida', column_type: 'date' },
  { title: 'Fecha regreso', column_type: 'date' },
  {
    title: 'Tipo viaje',
    column_type: 'status',
    defaults: JSON.stringify({ labels: { '1': 'Solo ida', '2': 'Ida y vuelta', '3': 'Multiciudad' } }),
  },
  { title: 'Cantidad segmentos', column_type: 'numbers' },
  { title: 'Clase', column_type: 'text' },
  { title: 'Equipaje', column_type: 'text' },
  { title: 'Fare basis', column_type: 'text' },
  { title: 'Extras', column_type: 'long_text' },
  {
    title: 'Estado reserva',
    column_type: 'status',
    defaults: JSON.stringify({
      labels: {
        '1': 'Pendiente',
        '2': 'Confirmada',
        '3': 'Emitida',
        '4': 'Cancelada',
        '6': 'Reprogramada',
      },
    }),
  },
  { title: 'Archivo ticket', column_type: 'file' },
  { title: 'Voucher PDF', column_type: 'file' },
  { title: 'Itinerario PDF', column_type: 'file' },
  { title: 'Factura PDF', column_type: 'file' },
  { title: 'Recibo PDF', column_type: 'file' },
  {
    title: 'Estado extracción',
    column_type: 'status',
    defaults: JSON.stringify({
      labels: {
        '1': 'Pendiente',
        '2': 'Listo para extraer',
        '3': 'Enviado a procesar',
        '4': 'Procesado',
        '6': 'Error',
      },
    }),
  },
  { title: 'DocumentID', column_type: 'text' },
  { title: 'Correo cliente', column_type: 'email' },
  { title: 'Teléfono cliente', column_type: 'phone' },
  { title: 'Correo agencia', column_type: 'email' },
  { title: 'Teléfono agencia', column_type: 'phone' },
];

// --- Definición de columnas de subitems (segmentos, alineadas con extractor OpenAI) ---
const SUBITEM_COLUMNS = [
  { title: 'Segmento #', column_type: 'numbers' },
  { title: 'Fecha encabezado voucher', column_type: 'date' },
  { title: 'Destino voucher', column_type: 'text' },
  {
    title: 'Tipo tramo',
    column_type: 'status',
    defaults: JSON.stringify({ labels: { '1': 'Salida', '2': 'Conexión', '3': 'Retorno' } }),
  },
  { title: 'Vuelo', column_type: 'text' },
  { title: 'Marketing airline', column_type: 'text' },
  { title: 'Operado por', column_type: 'text' },
  { title: 'Origen código', column_type: 'text' },
  { title: 'Origen nombre', column_type: 'text' },
  { title: 'Origen ciudad', column_type: 'text' },
  { title: 'Origen terminal', column_type: 'text' },
  { title: 'Destino código', column_type: 'text' },
  { title: 'Destino nombre', column_type: 'text' },
  { title: 'Destino ciudad', column_type: 'text' },
  { title: 'Destino terminal', column_type: 'text' },
  { title: 'Salida fecha', column_type: 'date' },
  { title: 'Salida hora', column_type: 'text' },
  { title: 'Llegada fecha', column_type: 'date' },
  { title: 'Llegada hora', column_type: 'text' },
  { title: 'Salida y llegada', column_type: 'text' },
  { title: 'Duración', column_type: 'text' },
  { title: 'Clase segmento', column_type: 'text' },
  {
    title: 'Estado segmento',
    column_type: 'status',
    defaults: JSON.stringify({
      labels: { '1': 'Confirmado', '2': 'Pendiente', '3': 'Cancelado', '4': 'Cambiado' },
    }),
  },
  { title: 'Equipaje segmento', column_type: 'text' },
  { title: 'Fare basis segmento', column_type: 'text' },
  { title: 'Ticket No.', column_type: 'text' },
  { title: 'Asiento', column_type: 'text' },
  { title: 'Asientos pasajeros', column_type: 'long_text' },
];

/** Segmentos de ejemplo (del extractor OpenAI) para crear subitems visibles en la Plantilla */
const SAMPLE_SEGMENTS = [
  {
    name: '1 - 088 - SDQ/MAD',
    segment_number: 1,
    flight_number: '088',
    marketing_airline: 'UX',
    operated_by: 'AIR EUROPA',
    origin_code: 'SDQ',
    origin_city: 'SANTO DOMINGO',
    origin_name: 'LAS AMERICAS INTL',
    origin_terminal: '',
    destination_code: 'MAD',
    destination_city: 'MADRID',
    destination_name: 'ADOLFO SUAREZ BARAJAS',
    destination_terminal: 'T1',
    departure_date: '2026-06-01',
    departure_time: '21:10',
    arrival_date: '2026-06-02',
    arrival_time: '11:20',
    duration: '08:10',
    travel_class: 'BUSINESS',
    baggage: '2PC',
    fare_basis: 'I',
    ticket_number: '996 2425484279',
    seat: '03A',
    seat_assignments: 'DIAZCONTRERAS/ANAALEXANDRA=03A,DIAZFELIZ/RAFAELJOSE=03D',
    voucher_heading_date: '2026-06-01',
    voucher_heading_destination: 'MADRID, MAD',
    voucher_trip_type: 'Salida',
    booking_status: 'OK',
    salida_llegada: 'SDQ 2026-06-01 21:10 -> MAD 2026-06-02 11:20',
  },
  {
    name: '2 - 7235 - MAD/LCG',
    segment_number: 2,
    flight_number: '7235',
    marketing_airline: 'UX',
    operated_by: 'AIR EUROPA EXPRESS',
    origin_code: 'MAD',
    origin_city: 'MADRID',
    origin_name: 'ADOLFO SUAREZ BARAJAS',
    origin_terminal: 'T2',
    destination_code: 'LCG',
    destination_city: 'A CORUNA',
    destination_name: 'A CORUNA AIRPORT',
    destination_terminal: '',
    departure_date: '2026-06-02',
    departure_time: '15:10',
    arrival_date: '2026-06-02',
    arrival_time: '16:20',
    duration: '01:10',
    travel_class: 'BUSINESS',
    baggage: '2PC',
    fare_basis: 'I',
    ticket_number: '996 2425484279',
    seat: '03F',
    seat_assignments: 'DIAZCONTRERAS/ANAALEXANDRA=03F,DIAZFELIZ/RAFAELJOSE=03D',
    voucher_heading_date: '2026-06-02',
    voucher_heading_destination: 'A CORUNA, LCG',
    voucher_trip_type: 'Conexión',
    booking_status: 'OK',
    salida_llegada: 'MAD 2026-06-02 15:10 -> LCG 2026-06-02 16:20',
  },
  {
    name: '3 - 089 - MAD/SDQ',
    segment_number: 3,
    flight_number: '089',
    marketing_airline: 'UX',
    operated_by: 'AIR EUROPA',
    origin_code: 'MAD',
    origin_city: 'MADRID',
    origin_name: 'ADOLFO SUAREZ BARAJAS',
    origin_terminal: 'T1',
    destination_code: 'SDQ',
    destination_city: 'SANTO DOMINGO',
    destination_name: 'LAS AMERICAS INTL',
    destination_terminal: '',
    departure_date: '2026-06-11',
    departure_time: '15:35',
    arrival_date: '2026-06-11',
    arrival_time: '18:15',
    duration: '08:40',
    travel_class: 'BUSINESS',
    baggage: '2PC',
    fare_basis: 'O',
    ticket_number: '996 2425484279',
    seat: '02K',
    seat_assignments: 'DIAZCONTRERAS/ANAALEXANDRA=02K,DIAZFELIZ/RAFAELJOSE=02G',
    voucher_heading_date: '2026-06-11',
    voucher_heading_destination: 'SANTO DOMINGO, SDQ',
    voucher_trip_type: 'Retorno',
    booking_status: 'OK',
    salida_llegada: 'MAD 2026-06-11 15:35 -> SDQ 2026-06-11 18:15',
  },
];

/**
 * Ejecuta una query o mutation GraphQL contra la API de Monday.
 */
async function mondayRequest(query, variables = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: API_TOKEN,
      'Content-Type': 'application/json',
      'API-Version': '2024-01',
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Monday API HTTP ${res.status}: ${JSON.stringify(json)}`);
  }
  if (json.errors?.length) {
    const msg = json.errors.map((e) => e.message).join('; ');
    throw new Error(`Monday API GraphQL errors: ${msg}`);
  }
  return json.data;
}

/** Nombre del board a crear/buscar (configurable por MONDAY_BOARD_NAME) */
const BOARD_NAME = process.env.MONDAY_BOARD_NAME || 'RESERVAS';

/**
 * Obtiene el board: si BOARD_ID está definido lo usa; si no, busca por nombre.
 */
async function getBoardId() {
  if (BOARD_ID) {
    return String(BOARD_ID).trim();
  }
  const data = await mondayRequest(`
    query {
      boards(limit: 200) {
        id
        name
      }
    }
  `);
  const board = data.boards?.find((b) => b.name === BOARD_NAME);
  return board ? board.id : null;
}

/**
 * Obtiene las columnas actuales de un board (por ID).
 */
async function getBoardColumns(boardId) {
  const data = await mondayRequest(
    `
    query($boardId: [ID!]!) {
      boards(ids: $boardId) {
        columns {
          id
          title
          type
        }
      }
    }
  `,
    { boardId: [boardId] }
  );
  const columns = data.boards?.[0]?.columns ?? [];
  return columns;
}

/**
 * Crea una columna en un board. Devuelve el id y título de la columna creada.
 */
async function createColumn(boardId, def) {
  const hasDefaults = def.defaults != null;
  const mutation = hasDefaults
    ? `
    mutation($boardId: ID!, $title: String!, $columnType: ColumnType!, $defaults: JSON) {
      create_column(board_id: $boardId, title: $title, column_type: $columnType, defaults: $defaults) {
        id
        title
      }
    }
  `
    : `
    mutation($boardId: ID!, $title: String!, $columnType: ColumnType!) {
      create_column(board_id: $boardId, title: $title, column_type: $columnType) {
        id
        title
      }
    }
  `;

  const variables = {
    boardId,
    title: def.title,
    columnType: def.column_type,
    ...(hasDefaults && { defaults: def.defaults }), // API Monday espera string JSON, no objeto
  };
  const data = await mondayRequest(mutation, variables);
  return data.create_column;
}

/**
 * Crea el board RESERVAS y devuelve su ID.
 * Si MONDAY_WORKSPACE_ID está definido, crea el board en ese workspace.
 */
async function createBoard() {
  const variables = { boardName: BOARD_NAME, boardKind: 'public' };
  if (WORKSPACE_ID) {
    variables.workspaceId = WORKSPACE_ID;
  }
  const data = await mondayRequest(
    WORKSPACE_ID
      ? `
    mutation($boardName: String!, $boardKind: BoardKind!, $workspaceId: Int!) {
      create_board(board_name: $boardName, board_kind: $boardKind, workspace_id: $workspaceId) {
        id
      }
    }
  `
      : `
    mutation($boardName: String!, $boardKind: BoardKind!) {
      create_board(board_name: $boardName, board_kind: $boardKind) {
        id
      }
    }
  `,
    variables
  );
  return data.create_board.id;
}

/**
 * Obtiene los grupos de un board.
 */
async function getBoardGroups(boardId) {
  const data = await mondayRequest(
    `
    query($boardId: [ID!]!) {
      boards(ids: $boardId) {
        groups {
          id
          title
        }
      }
    }
  `,
    { boardId: [boardId] }
  );
  return data.boards?.[0]?.groups ?? [];
}

/**
 * Crea un grupo en un board.
 */
async function createGroup(boardId, groupName) {
  const data = await mondayRequest(
    `
    mutation($boardId: ID!, $groupName: String!) {
      create_group(board_id: $boardId, group_name: $groupName) {
        id
      }
    }
  `,
    { boardId, groupName }
  );
  return data.create_group.id;
}

/**
 * Crea un item en un grupo.
 */
async function createItem(boardId, groupId, itemName) {
  const data = await mondayRequest(
    `
    mutation($boardId: ID!, $groupId: String!, $itemName: String!) {
      create_item(board_id: $boardId, group_id: $groupId, item_name: $itemName) {
        id
      }
    }
  `,
    { boardId, groupId, itemName }
  );
  return data.create_item.id;
}

/**
 * Crea un subitem bajo un item padre. Devuelve { id, board_id }.
 * El board_id es el subboard donde se crean las columnas de subitems.
 */
async function createSubitem(parentItemId, subitemName) {
  const data = await mondayRequest(
    `
    mutation($parentItemId: ID!, $itemName: String!) {
      create_subitem(parent_item_id: $parentItemId, item_name: $itemName) {
        id
        board {
          id
        }
      }
    }
  `,
    { parentItemId: parentItemId.toString(), itemName: subitemName }
  );
  return {
    id: data.create_subitem.id,
    boardId: data.create_subitem.board?.id,
  };
}

/**
 * Crea un subitem con valores de columnas. Usado para crear segmentos de ejemplo.
 */
async function createSubitemWithValues(parentItemId, subitemName, columnValues) {
  const data = await mondayRequest(
    `
    mutation($parentItemId: ID!, $itemName: String!, $columnValues: JSON!) {
      create_subitem(parent_item_id: $parentItemId, item_name: $itemName, column_values: $columnValues) {
        id
        board { id }
      }
    }
  `,
    {
      parentItemId: parentItemId.toString(),
      itemName: subitemName,
      columnValues: JSON.stringify(columnValues),
    }
  );
  return data.create_subitem?.id ?? null;
}

/**
 * Actualiza los valores de columnas de un item/subitem existente.
 * @param {string} itemId - ID del item o subitem
 * @param {string} boardId - ID del board (para subitems, usar el subboard id)
 * @param {object} columnValues - Objeto { column_id: value }
 */
async function updateItemColumns(itemId, boardId, columnValues) {
  await mondayRequest(
    `
    mutation($itemId: ID!, $boardId: ID!, $columnValues: JSON!) {
      change_multiple_column_values(item_id: $itemId, board_id: $boardId, column_values: $columnValues) {
        id
      }
    }
  `,
    {
      itemId: itemId.toString(),
      boardId,
      columnValues: JSON.stringify(columnValues),
    }
  );
}

/** Mapeo campo segmento -> título columna Monday (subitems) */
const SEGMENT_FIELD_TO_COLUMN = {
  segment_number: 'Segmento #',
  voucher_heading_date: 'Fecha encabezado voucher',
  voucher_heading_destination: 'Destino voucher',
  voucher_trip_type: 'Tipo tramo',
  flight_number: 'Vuelo',
  marketing_airline: 'Marketing airline',
  operated_by: 'Operado por',
  origin_code: 'Origen código',
  origin_name: 'Origen nombre',
  origin_city: 'Origen ciudad',
  origin_terminal: 'Origen terminal',
  destination_code: 'Destino código',
  destination_name: 'Destino nombre',
  destination_city: 'Destino ciudad',
  destination_terminal: 'Destino terminal',
  departure_date: 'Salida fecha',
  departure_time: 'Salida hora',
  arrival_date: 'Llegada fecha',
  arrival_time: 'Llegada hora',
  salida_llegada: 'Salida y llegada',
  duration: 'Duración',
  travel_class: 'Clase segmento',
  booking_status: 'Estado segmento',
  baggage: 'Equipaje segmento',
  fare_basis: 'Fare basis segmento',
  ticket_number: 'Ticket No.',
  seat: 'Asiento',
  seat_assignments: 'Asientos pasajeros',
};

/**
 * Construye column_values para Monday a partir de un segmento y el mapa título->id.
 * Usa el primer ID encontrado por cada título (puede haber duplicados).
 */
function buildSegmentColumnValues(segment, colTitleToId) {
  const values = {};
  for (const [field, colTitle] of Object.entries(SEGMENT_FIELD_TO_COLUMN)) {
    const colId = colTitleToId.get(colTitle);
    if (!colId) continue;
    const raw = segment[field];
    if (raw === undefined || raw === null) continue;
    const str = String(raw).trim();
    if (field === 'voucher_heading_date' || field === 'departure_date' || field === 'arrival_date') {
      if (str) values[colId] = { date: str };
    } else if (field === 'voucher_trip_type') {
      if (str) values[colId] = { label: str };
    } else if (field === 'booking_status') {
      const label = str === 'OK' ? 'Confirmado' : str;
      if (label) values[colId] = { label };
    } else if (field === 'segment_number') {
      values[colId] = Number(raw) || 0;
    } else if (field === 'seat_assignments') {
      if (str) values[colId] = { text: str };
    } else if (typeof raw === 'string' || typeof raw === 'number') {
      values[colId] = str || raw;
    }
  }
  return values;
}

/**
 * Obtiene los subitems de un item padre.
 */
async function getSubitems(boardId, parentItemId) {
  const data = await mondayRequest(
    `
    query($itemId: [ID!]!) {
      items(ids: $itemId) {
        subitems {
          id
          name
          column_values { id text value }
        }
      }
    }
  `,
    { itemId: [parentItemId.toString()] }
  );
  return data.items?.[0]?.subitems ?? [];
}

/**
 * Crea las columnas faltantes en un board según la definición.
 */
async function ensureColumns(boardId, definitions, existingColumns) {
  const existingTitles = new Set(existingColumns.map((c) => c.title));
  const created = [];

  for (const def of definitions) {
    if (existingTitles.has(def.title)) continue;
    try {
      const col = await createColumn(boardId, def);
      created.push({ id: col.id, title: col.title });
      existingTitles.add(col.title);
    } catch (err) {
      console.error(`  Error creando columna "${def.title}":`, err.message);
    }
  }
  return created;
}

/**
 * Busca un item por nombre en un grupo del board.
 */
async function findItemInGroup(boardId, groupId, itemName) {
  const data = await mondayRequest(
    `
    query($boardId: [ID!]!, $groupId: [String!]!) {
      boards(ids: $boardId) {
        groups(ids: $groupId) {
          items_page(limit: 100) {
            items {
              id
              name
            }
          }
        }
      }
    }
  `,
    { boardId: [boardId], groupId: [groupId] }
  );
  const items = data.boards?.[0]?.groups?.[0]?.items_page?.items ?? [];
  return items.find((i) => i.name === itemName)?.id ?? null;
}

/**
 * Obtiene el subboard ID buscando un subitem existente bajo un item de plantilla.
 * Si no hay plantilla, devuelve null.
 */
async function getSubboardIdFromTemplate(boardId) {
  const groups = await getBoardGroups(boardId);
  const configGroup = groups.find((g) => g.title === 'Configuración');
  if (!configGroup) return null;

  const templateItemId = await findItemInGroup(boardId, configGroup.id, 'Plantilla - Reserva');
  if (!templateItemId) return null;

  const data = await mondayRequest(
    `
    query($itemId: [ID!]!) {
      items(ids: $itemId) {
        subitems {
          id
          board {
            id
          }
        }
      }
    }
  `,
    { itemId: [templateItemId.toString()] }
  );
  const subitem = data.items?.[0]?.subitems?.[0];
  return subitem?.board?.id ?? null;
}

// --- Main ---
async function main() {
  console.log('=== Setup Monday - Tablero RESERVAS ===\n');
  console.log(`API: ${API_URL}\n`);

  let boardId = await getBoardId();

  if (boardId && BOARD_ID) {
    console.log(`Usando board por ID: ${boardId}. Verificando columnas...`);
  } else if (boardId) {
    console.log(`Board "${BOARD_NAME}" encontrado (id: ${boardId}). Verificando columnas...`);
  } else {
    console.log(`Board "${BOARD_NAME}" no existe. Creando...`);
    if (WORKSPACE_ID) {
      console.log(`  Workspace destino: ${WORKSPACE_ID} (IT)`);
    }
    boardId = await createBoard();
    console.log(`  Board creado (id: ${boardId})`);
  }

  const mainColumns = await getBoardColumns(boardId);
  const mainCreated = await ensureColumns(boardId, MAIN_COLUMNS, mainColumns);
  if (mainCreated.length) {
    console.log(`  Columnas principales creadas: ${mainCreated.length}`);
    mainCreated.forEach((c) => console.log(`    - ${c.title} (id: ${c.id})`));
  } else if (!boardId) {
    console.log('  Columnas principales: ya existían o fueron creadas.');
  }

  // Subboard para subitems: necesitamos al menos un subitem para obtener el board_id
  let subboardId = await getSubboardIdFromTemplate(boardId);

  if (!subboardId) {
    console.log('\nInicializando estructura de subitems (requiere item + subitem de plantilla)...');
    const groups = await getBoardGroups(boardId);
    let configGroup = groups.find((g) => g.title === 'Configuración');
    if (!configGroup) {
      const gid = await createGroup(boardId, 'Configuración');
      configGroup = { id: gid, title: 'Configuración' };
      console.log('  Grupo "Configuración" creado.');
    }

    const templateItemId = await findItemInGroup(boardId, configGroup.id, 'Plantilla - Reserva');
    let parentItemId = templateItemId;

    if (!parentItemId) {
      parentItemId = await createItem(boardId, configGroup.id, 'Plantilla - Reserva');
      console.log('  Item "Plantilla - Reserva" creado.');
    }

    const sub = await createSubitem(parentItemId, 'Segmento 1');
    subboardId = sub.boardId;
    if (subboardId) {
      console.log('  Subitem de plantilla creado (subboard id: ' + subboardId + ')');
    }
  }

  if (subboardId) {
    const subColumns = await getBoardColumns(subboardId);
    const subCreated = await ensureColumns(subboardId, SUBITEM_COLUMNS, subColumns);
    if (subCreated.length) {
      console.log(`\n  Columnas de subitems creadas: ${subCreated.length}`);
      subCreated.forEach((c) => console.log(`    - ${c.title} (id: ${c.id})`));
    }

    // Crear subitems de ejemplo bajo Plantilla - Reserva (para que sean visibles en Monday)
    const groups = await getBoardGroups(boardId);
    const configGroup = groups.find((g) => g.title === 'Configuración');
    const templateItemId = configGroup ? await findItemInGroup(boardId, configGroup.id, 'Plantilla - Reserva') : null;

    if (templateItemId) {
      const existingSubs = await getSubitems(boardId, templateItemId);
      const subColumnsFinal = await getBoardColumns(subboardId); // incluye columnas recién creadas
      const colTitleToId = new Map();
      for (const c of subColumnsFinal) {
        if (!colTitleToId.has(c.title)) colTitleToId.set(c.title, c.id);
      }

      console.log('\n  Creando/actualizando subitems de ejemplo en Plantilla - Reserva...');
      let created = 0;
      let updated = 0;

      for (let i = 0; i < SAMPLE_SEGMENTS.length; i++) {
        const seg = SAMPLE_SEGMENTS[i];
        const colValues = buildSegmentColumnValues(seg, colTitleToId);
        if (Object.keys(colValues).length === 0) continue;

        const matchByName = (name) => existingSubs.find((s) => s.name === name);
        const existingForSeg1 = i === 0 ? matchByName('Segmento 1') || matchByName(seg.name) : null;
        const existingForSeg = i > 0 ? matchByName(seg.name) : existingForSeg1;

        if (existingForSeg) {
          try {
            await updateItemColumns(existingForSeg.id, subboardId, colValues);
            updated++;
            console.log(`    Actualizado: ${seg.name}`);
          } catch (err) {
            console.error(`    Error actualizando "${seg.name}":`, err.message);
          }
        } else {
          try {
            await createSubitemWithValues(templateItemId, seg.name, colValues);
            created++;
            console.log(`    Creado: ${seg.name}`);
          } catch (err) {
            console.error(`    Error creando "${seg.name}":`, err.message);
          }
        }
      }
      if (created > 0 || updated > 0) {
        console.log(`  Subitems: ${created} creados, ${updated} actualizados.`);
      }
    }
  } else {
    console.log('\n  No se pudo obtener el subboard. Las columnas de subitems no se crearon.');
    console.log('  Ejecuta el script de nuevo o crea manualmente un subitem en cualquier reserva.');
  }

  // Resumen final
  const finalMainCols = await getBoardColumns(boardId);
  const mainMap = Object.fromEntries(finalMainCols.map((c) => [c.title, c.id]));

  console.log('\n=== Resumen ===');
  console.log(`Board "${BOARD_NAME}" id: ${boardId}`);
  if (subboardId) console.log(`Subboard (segmentos) id: ${subboardId}`);
  console.log('\nIDs de columnas principales (para n8n):');
  Object.entries(mainMap).forEach(([title, id]) => console.log(`  ${title}: ${id}`));

  if (subboardId) {
    const subCols = await getBoardColumns(subboardId);
    console.log('\nIDs de columnas de subitems:');
    subCols.forEach((c) => console.log(`  ${c.title}: ${c.id}`));
  }

  console.log('\n¡Listo!');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
