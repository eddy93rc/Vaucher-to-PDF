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
 *
 * Requisitos: Node.js 18+ (fetch nativo)
 * Idempotente: si el board existe, solo añade columnas faltantes.
 * No destruye datos existentes.
 *
 * NOTA: Monday.com no permite forzar IDs de columna por API. Los IDs son
 * asignados automáticamente. El script detecta columnas por TÍTULO y crea
 * solo las que faltan. Al final imprime los IDs actuales para usar en n8n.
 * Ver MONDAY_MAPPING.md para el mapeo completo Parseur → Monday.
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

// --- Validación de variables de entorno ---
if (!API_TOKEN || API_TOKEN === 'tu_token_aqui') {
  console.error('Error: MONDAY_API_TOKEN no está definido o tiene el valor por defecto.');
  console.error('  Copia .env.example a .env y configura tu token de Monday.');
  process.exit(1);
}

// --- Definición de columnas principales del board RESERVAS ---
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
    title: 'Estado Parseur',
    column_type: 'status',
    defaults: JSON.stringify({
      labels: {
        '1': 'Pendiente',
        '2': 'Listo para extraer',
        '3': 'Enviado a Parseur',
        '4': 'Procesado',
        '6': 'Error',
      },
    }),
  },
  { title: 'DocumentID Parseur', column_type: 'text' },
  { title: 'Correo cliente', column_type: 'email' },
  { title: 'Teléfono cliente', column_type: 'phone' },
  { title: 'Correo agencia', column_type: 'email' },
  { title: 'Teléfono agencia', column_type: 'phone' },
];

// --- Definición de columnas de subitems (segmentos) ---
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

/**
 * Busca el board RESERVAS por nombre en la lista de boards.
 */
async function findReservasBoard() {
  const data = await mondayRequest(`
    query {
      boards(limit: 200) {
        id
        name
      }
    }
  `);
  const board = data.boards?.find((b) => b.name === 'RESERVAS');
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
  const variables = { boardName: 'RESERVAS', boardKind: 'public' };
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

  let boardId = await findReservasBoard();

  if (boardId) {
    console.log(`Board RESERVAS encontrado (id: ${boardId}). Verificando columnas...`);
  } else {
    console.log('Board RESERVAS no existe. Creando...');
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
  } else {
    console.log('\n  No se pudo obtener el subboard. Las columnas de subitems no se crearon.');
    console.log('  Ejecuta el script de nuevo o crea manualmente un subitem en cualquier reserva.');
  }

  // Resumen final
  const finalMainCols = await getBoardColumns(boardId);
  const mainMap = Object.fromEntries(finalMainCols.map((c) => [c.title, c.id]));

  console.log('\n=== Resumen ===');
  console.log(`Board RESERVAS id: ${boardId}`);
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
