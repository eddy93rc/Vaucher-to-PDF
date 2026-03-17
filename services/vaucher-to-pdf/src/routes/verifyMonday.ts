import { Router, Request, Response } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';

const MONDAY_API = 'https://api.monday.com/v2';

const REQUIRED_RESERVATION_FIELDS = [
  'passenger_full',
  'passenger_voucher',
  'reservation_code',
  'ticket_number',
  'airline_main',
] as const;

const REQUIRED_SEGMENT_FIELDS = [
  'flight_number',
  'origin_code',
  'origin_name',
  'destination_code',
  'destination_name',
  'departure_date',
  'departure_time',
  'arrival_date',
  'arrival_time',
  'duration',
  'voucher_heading_date',
  'voucher_heading_destination',
  'voucher_trip_type',
  'operated_by',
  'ticket_number',
] as const;

export const verifyMondayRouter = Router();

/** Endpoint para diagnosticar por qué Monday no encuentra un item */
verifyMondayRouter.post('/diagnose-monday-item', async (req: Request, res: Response) => {
  try {
    const pulseId = req.body?.pulse_id ?? req.body?.pulseId ?? req.body?.item_id;
    if (!pulseId) {
      res.status(400).json({ error: 'Falta pulse_id en el body' });
      return;
    }
    const id = String(pulseId).trim();

    const apiKey = config.monday.apiKey;
    if (!apiKey) {
      res.status(400).json({ error: 'MONDAY_API_KEY no configurada' });
      return;
    }

    const boardId = config.monday.boardId;

    const query = `
      query {
        items(ids: [${id}], limit: 1, exclude_nonactive: false) {
          id
          name
          board { id }
          parent_item { id name board { id } }
          column_values { id text type }
          subitems { id name }
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

    const json = (await response.json()) as Record<string, unknown>;

    const items = (json?.data as Record<string, unknown> | undefined)?.items as unknown[] | undefined;
    const hasItem = Array.isArray(items) && items.length > 0;

    res.json({
      pulse_id: id,
      http_status: response.status,
      monday_response: json,
      summary: {
        items_returned: items?.length ?? 0,
        item_found: hasItem,
        first_item_id: hasItem && items?.[0] ? (items[0] as Record<string, unknown>).id : null,
        first_item_name: hasItem && items?.[0] ? (items[0] as Record<string, unknown>).name : null,
        has_parent_item: hasItem && items?.[0] ? !!(items[0] as Record<string, unknown>).parent_item : null,
        errors: json?.errors ?? null,
      },
      checks: {
        board_id_in_env: boardId,
        api_key_set: !!apiKey,
        api_key_length: apiKey?.length ?? 0,
      },
      hint: !hasItem
        ? 'El item no existe o el token no tiene acceso. Verifica: 1) Misma cuenta Monday del webhook, 2) Token con acceso al board, 3) Item no archivado/eliminado.'
        : 'Item encontrado. Si sigue fallando el voucher, revisa el mapeo de columnas.',
    });
  } catch (err) {
    logger.errorWithStack('diagnose-monday-item: ERROR', err);
    res.status(500).json({
      error: 'Error al diagnosticar',
      message: err instanceof Error ? err.message : 'Error desconocido',
    });
  }
});

/** Estructura completa: board columns + item + subitems con valores, para entender el mapeo */
verifyMondayRouter.post('/monday-structure', async (req: Request, res: Response) => {
  try {
    const pulseId = req.body?.pulse_id ?? req.body?.pulseId ?? req.body?.item_id;
    if (!pulseId) {
      res.status(400).json({ error: 'Falta pulse_id en el body' });
      return;
    }
    const id = String(pulseId).trim();
    const apiKey = config.monday.apiKey;
    if (!apiKey) {
      res.status(400).json({ error: 'MONDAY_API_KEY no configurada' });
      return;
    }

    const { fetchMondayItem, fetchBoardColumns } = await import('../services/mondayFetch');
    const item = await fetchMondayItem(id);
    if (!item) {
      res.status(404).json({ error: 'Item no encontrado', pulse_id: id });
      return;
    }

    const mainBoardId = item.board?.id ?? config.monday.boardId;
    const mainColumns = await fetchBoardColumns(mainBoardId);
    const colById = new Map(mainColumns.map((c) => [c.id, c]));

    const subitems = item.subitems ?? [];
    const subitemsBoardId = subitems[0]?.board?.id ?? null;
    let segmentColumns = mainColumns;
    if (subitemsBoardId && subitemsBoardId !== mainBoardId) {
      segmentColumns = await fetchBoardColumns(subitemsBoardId);
    }
    const segColById = new Map(segmentColumns.map((c) => [c.id, c]));

    function describeColVal(cv: { id: string; text: string | null; value: string; type: string }, titleMap: Map<string, { title: string; type: string }>) {
      const meta = titleMap.get(cv.id);
      let valuePreview = cv.text ?? '';
      if (!valuePreview && cv.value) {
        try {
          const v = JSON.parse(cv.value);
          if (v?.date) valuePreview = v.date;
          else if (v?.files?.[0]?.name) valuePreview = `[archivo: ${v.files[0].name}]`;
          else if (typeof v === 'string') valuePreview = v;
          else valuePreview = String(cv.value).slice(0, 80);
        } catch {
          valuePreview = String(cv.value).slice(0, 80);
        }
      }
      return {
        column_id: cv.id,
        column_title: meta?.title ?? '(sin título)',
        column_type: meta?.type ?? cv.type,
        value_preview: valuePreview.slice(0, 120),
      };
    }

    const itemCols = (item.column_values ?? []).map((cv) => describeColVal(cv, colById));
    const subitemRows = subitems.map((sub, i) => ({
      index: i + 1,
      subitem_id: sub.id,
      subitem_name: sub.name,
      board_id: sub.board?.id,
      columns: (sub.column_values ?? []).map((cv) => describeColVal(cv, segColById)),
    }));

    res.json({
      pulse_id: id,
      item_name: item.name,
      main_board_id: mainBoardId,
      subitems_board_id: subitemsBoardId,
      main_board_columns: mainColumns.map((c) => ({ id: c.id, title: c.title, type: c.type })),
      segment_board_columns: segmentColumns.map((c) => ({ id: c.id, title: c.title, type: c.type })),
      item_columns: itemCols,
      subitems: subitemRows,
      hint: 'Usa column_id y column_title para crear monday-column-mapping.json o MONDAY_COLUMN_MAPPING. Excluye columnas tipo file de ticket_number y campos de texto.',
    });
  } catch (err) {
    logger.errorWithStack('monday-structure: ERROR', err);
    res.status(500).json({
      error: 'Error al obtener estructura',
      message: err instanceof Error ? err.message : 'Error desconocido',
    });
  }
});

verifyMondayRouter.get('/verify-monday-columns', async (_req: Request, res: Response) => {
  try {
    const apiKey = config.monday.apiKey;
    if (!apiKey) {
      res.status(400).json({
        error: 'MONDAY_API_KEY no configurada',
        hint: 'Define MONDAY_API_KEY en .env',
      });
      return;
    }

    const boardId = config.monday.boardId;
    const query = `
      query {
        boards(ids: [${boardId}]) {
          id
          name
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
      data?: { boards?: Array<{ id: string; name: string; columns: Array<{ id: string; title: string; type: string }> }> };
      errors?: Array<{ message: string }>;
    };

    if (json.errors?.length) {
      res.status(400).json({
        error: 'Monday API error',
        details: json.errors,
      });
      return;
    }

    const board = json.data?.boards?.[0];
    if (!board) {
      res.status(404).json({
        error: 'Board no encontrado',
        boardId,
      });
      return;
    }

    const columns = board.columns ?? [];
    const columnIds = new Set(columns.map((c) => c.id));
    const columnTitles = new Map(columns.map((c) => [c.id, c.title]));

    const requiredReservation = REQUIRED_RESERVATION_FIELDS.map((field) => ({
      field,
      required: true,
      note: 'Columna del item principal (reservation)',
    }));

    const requiredSegment = REQUIRED_SEGMENT_FIELDS.map((field) => ({
      field,
      required: true,
      note: 'Columna de cada subitem (segmento)',
    }));

    res.json({
      board: {
        id: board.id,
        name: board.name,
      },
      columns_count: columns.length,
      columns: columns.map((c) => ({ id: c.id, title: c.title, type: c.type })),
      required_for_voucher: {
        reservation: requiredReservation,
        segments: requiredSegment,
      },
      hint: 'Debes mapear las columnas de Monday (por id o title) a los campos del payload en n8n. Ver docs/MONDAY_COLUMNS_CHECKLIST.md',
    });
  } catch (err) {
    logger.errorWithStack('verify-monday-columns: ERROR', err);
    res.status(500).json({
      error: 'Error al verificar columnas',
      message: err instanceof Error ? err.message : 'Error desconocido',
    });
  }
});
