import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config.js';
import { extractFromPdf } from './openai-extractor.js';
import type { ExtractionResponse } from './types.js';

const app = express();

// Asegurar que el directorio de upload existe
fs.mkdirSync(config.upload.dir, { recursive: true });

const storage = multer.diskStorage({
  destination: config.upload.dir,
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, `ticket-${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxSize },
  fileFilter: (_, file, cb) => {
    const allowed = ['application/pdf', 'application/octet-stream'];
    if (allowed.includes(file.mimetype) || file.originalname?.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se aceptan archivos PDF'));
    }
  },
});

/**
 * POST /extract
 *
 * multipart/form-data:
 *   - file: PDF del ticket aéreo
 *   - monday_pulse_id: (opcional) ID del item en Monday para asociar
 *   - monday_board_id: (opcional) ID del board
 *
 * Respuesta: JSON compatible con webhook Parseur (Extraer Datos Parseur de n8n)
 */
app.post('/extract', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'Se requiere un archivo PDF (campo "file")' });
      return;
    }

    const mondayPulseId = (req.body?.monday_pulse_id ?? req.body?.pulse_id ?? '').trim();
    const mondayBoardId = (req.body?.monday_board_id ?? '').trim();
    const documentId = `openai-${uuidv4().slice(0, 8)}`;

    const extraction = await extractFromPdf(file.path);

    const response: ExtractionResponse = {
      document_id: documentId,
      monday_pulse_id: mondayPulseId,
      monday_board_id: mondayBoardId || undefined,
      ...extraction,
    };

    // Limpiar archivo temporal
    const fs = await import('fs/promises');
    await fs.unlink(file.path).catch(() => {});

    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    const status = message.includes('OPENAI') || message.includes('API') ? 502 : 500;
    res.status(status).json({ error: message });
  }
});

/**
 * GET /health
 */
app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    service: 'pdf-extractor-openai',
    openai_configured: !!config.openai.apiKey,
  });
});

const server = app.listen(config.port, () => {
  console.log(`pdf-extractor escuchando en puerto ${config.port}`);
});

export { app, server };
