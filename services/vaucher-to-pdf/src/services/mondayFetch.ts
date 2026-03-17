import { config } from '../config';
import { logger } from '../utils/logger';

const MONDAY_API = 'https://api.monday.com/v2';

export interface MondayColumn {
  id: string;
  title: string;
  type: string;
}

export interface MondayColumnValue {
  id: string;
  text: string | null;
  value: string;
  type: string;
}

export interface MondayItem {
  id: string;
  name: string;
  board?: { id: string };
  parent_item?: MondayItem | null;
  column_values: MondayColumnValue[];
  subitems?: MondayItem[];
}

export interface MondayItemResponse {
  data?: { items?: MondayItem[] };
  errors?: Array<{ message: string }>;
}

function getColumnValue(col: MondayColumnValue): string {
  if (col.text) return col.text.trim();
  if (!col.value) return '';
  try {
    const v = JSON.parse(col.value);
    if (typeof v === 'string') return v;
    if (v?.date) return v.date;
    if (v?.text) return v.text;
    if (v?.label) return String(v.label);
    return String(v);
  } catch {
    return String(col.value);
  }
}

function getColumnValueByDate(col: MondayColumnValue): string {
  if (col.text) return col.text.trim();
  try {
    const v = JSON.parse(col.value);
    if (v?.date) return v.date;
  } catch {
    // ignore
  }
  return '';
}

export async function fetchMondayItem(itemId: string): Promise<MondayItem | null> {
  const apiKey = config.monday.apiKey;
  if (!apiKey) throw new Error('MONDAY_API_KEY no configurada');

  const query = `
    query {
      items(ids: [${itemId}], limit: 1, exclude_nonactive: false) {
        id
        name
        board { id }
        parent_item {
          id
          name
          board { id }
          column_values { id text value type }
          subitems {
            id
            name
            board { id }
            column_values { id text value type }
          }
        }
        column_values { id text value type }
        subitems {
          id
          name
          board { id }
          column_values { id text value type }
        }
      }
    }
  `;

  const response = await fetch(MONDAY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({ query }),
  });

  const json = (await response.json()) as MondayItemResponse;
  if (json.errors?.length) {
    logger.error('Monday fetch item: API errors', { itemId, errors: json.errors });
    throw new Error(`Monday API: ${JSON.stringify(json.errors)}`);
  }

  const raw = json.data?.items?.[0] ?? null;
  if (!raw) {
    logger.warn('Monday fetch item: item no encontrado', { itemId });
    return null;
  }

  // Si es un subitem, usar el parent para reservation + subitems
  if (raw.parent_item) {
    const parent = raw.parent_item as MondayItem;
    logger.info('Monday fetch item: detectado subitem, usando parent', {
      subitemId: raw.id,
      parentId: parent.id,
    });
    return parent;
  }

  return raw as MondayItem;
}

export async function fetchBoardColumns(
  boardId: string
): Promise<MondayColumn[]> {
  const apiKey = config.monday.apiKey;
  if (!apiKey) throw new Error('MONDAY_API_KEY no configurada');

  const query = `
    query {
      boards(ids: [${boardId}]) {
        columns {
          id
          title
          type
        }
      }
    }
  `;

  const response = await fetch(MONDAY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({ query }),
  });

  const json = (await response.json()) as {
    data?: { boards?: Array<{ columns: MondayColumn[] }> };
    errors?: Array<{ message: string }>;
  };
  if (json.errors?.length) throw new Error(`Monday API: ${JSON.stringify(json.errors)}`);

  return json.data?.boards?.[0]?.columns ?? [];
}

/** Obtiene el ID de la primera columna de tipo file del board. */
export async function getFileColumnId(boardId: string): Promise<string | null> {
  const columns = await fetchBoardColumns(boardId);
  const fileCol = columns.find(
    (c) => c.type?.toLowerCase() === 'file' || c.type?.toLowerCase() === 'files'
  );
  return fileCol?.id ?? null;
}

export function getValueFromItem(
  item: MondayItem,
  columnId: string
): string {
  const col = item.column_values?.find((c) => c.id === columnId);
  if (!col) return '';
  return getColumnValue(col);
}

export function getDateFromItem(
  item: MondayItem,
  columnId: string
): string {
  const col = item.column_values?.find((c) => c.id === columnId);
  if (!col) return '';
  const val = getColumnValueByDate(col);
  if (val) return val;
  return getColumnValue(col);
}
