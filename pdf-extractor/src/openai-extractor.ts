import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';
import { toFile } from 'openai';
import { config } from './config.js';
import { EXTRACTION_SYSTEM_PROMPT, EXTRACTION_USER_PROMPT, RESPONSE_FORMAT } from './extraction-prompt.js';
import type { TicketExtraction } from './types.js';

export async function extractFromPdf(filePath: string): Promise<TicketExtraction> {
  const client = new OpenAI({ apiKey: config.openai.apiKey });

  // 1. Subir PDF a Files API (toFile con Buffer es compatible)
  const buffer = await fs.readFile(filePath);
  const fileBlob = await toFile(buffer, path.basename(filePath) || 'ticket.pdf');
  const file = await client.files.create({
    file: fileBlob,
    purpose: 'user_data',
  });

  try {
    // 2. Llamar Responses API con el file_id
    const response = await client.responses.create({
      model: config.openai.model,
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_file' as const, file_id: file.id },
            { type: 'input_text' as const, text: EXTRACTION_USER_PROMPT },
          ],
        },
      ],
      instructions: EXTRACTION_SYSTEM_PROMPT,
      text: {
        format: RESPONSE_FORMAT,
      },
    } as Parameters<typeof client.responses.create>[0]);

    const outputText = (response as { output_text?: string }).output_text ?? '';
    const parsed = JSON.parse(outputText) as TicketExtraction;
    return parsed;
  } finally {
    // Borrar archivo temporal (opcional, OpenAI los purga automáticamente)
    try {
      await client.files.del(file.id);
    } catch {
      // Ignorar si falla el borrado
    }
  }
}
