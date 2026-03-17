import { config } from '../config';
import { getFileColumnId } from './mondayFetch';
import { logger } from '../utils/logger';

const MONDAY_FILE_API = 'https://api.monday.com/v2/file';

export interface MondayUploadResult {
  id: string;
}

export async function uploadFileToMonday(
  itemId: string,
  fileBuffer: Buffer,
  filename: string,
  options?: { columnId?: string; boardId?: string }
): Promise<MondayUploadResult> {
  const apiKey = config.monday.apiKey;
  if (!apiKey) {
    throw new Error('MONDAY_API_KEY no configurada');
  }

  let columnId = options?.columnId ?? config.monday.voucherPdfColumnId;
  if (!columnId && options?.boardId) {
    const detected = await getFileColumnId(options.boardId);
    if (detected) {
      columnId = detected;
      logger.info('Columna file detectada dinámicamente', { columnId, boardId: options.boardId });
    }
  }
  if (!columnId) {
    throw new Error(
      'No se encontró columna para el PDF. Define MONDAY_VOUCHER_PDF_COLUMN_ID en .env (ej: file_mm1h5b78 para columna Voucher PDF).'
    );
  }

  const formData = new FormData();
  const mutation = `mutation ($file: File!) { add_file_to_column(file: $file, item_id: ${itemId}, column_id: "${columnId}") { id } }`;
  formData.append('query', mutation);
  formData.append('map', JSON.stringify({ file: 'variables.file' }));
  // El map indica que el campo "file" mapea a variables.file; el archivo debe ir con key "file"
  formData.append('file', new Blob([fileBuffer], { type: 'application/pdf' }), filename);

  const response = await fetch(MONDAY_FILE_API, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Monday API error ${response.status}: ${text}`);
  }

  const json = (await response.json()) as {
    data?: { add_file_to_column?: { id: string } };
    errors?: Array<{ message: string }>;
  };
  if (json.errors?.length) {
    throw new Error(`Monday API: ${JSON.stringify(json.errors)}`);
  }

  const fileId = json?.data?.add_file_to_column?.id;
  if (!fileId) {
    throw new Error('Monday no devolvió ID del archivo');
  }

  return { id: fileId };
}
