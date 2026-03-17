import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';
import {
  voucherPayloadSchema,
  voucherUploadPayloadSchema,
  pulseIdPayloadSchema,
} from '../schemas/voucherPayload';
import { buildVoucherViewModel } from '../services/viewModelBuilder';
import { renderVoucherToPdf } from '../services/pdfRenderer';
import { uploadFileToMonday } from '../services/mondayUpload';
import { fetchMondayItem } from '../services/mondayFetch';
import {
  buildColumnMapping,
  mondayItemToVoucherPayload,
} from '../services/mondayToVoucherMapper';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { VoucherPayload } from '../schemas/voucherPayload';

function loadAssetAsBase64(assetName: string, basePath?: string): string | null {
  const dir = basePath ?? config.assetsPath;
  const filePath = path.join(dir, assetName);
  try {
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(assetName).toLowerCase();
      const mime = ext === '.svg' ? 'image/svg+xml' : `image/${ext.slice(1).replace('jpg', 'jpeg')}`;
      return `data:${mime};base64,${buffer.toString('base64')}`;
    }
  } catch {
    // ignore
  }
  return null;
}

function loadTemplateAndCompile(viewModel: ReturnType<typeof buildVoucherViewModel>): string {
  const templatePath = path.join(config.templatesPath, 'voucher.html');
  const cssPath = path.join(config.templatesPath, 'voucher.css');

  const templateSource = fs.readFileSync(templatePath, 'utf-8');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  const logosDir = config.logosImgPath;
  const logoUrl =
    loadAssetAsBase64('logo.jpg', logosDir) ??
    loadAssetAsBase64('logo.png', logosDir) ??
    loadAssetAsBase64('logo.svg', logosDir) ??
    loadAssetAsBase64('logo.png') ??
    loadAssetAsBase64('logo.svg');
  const watermarkUrl =
    loadAssetAsBase64('watermark.png', logosDir) ??
    loadAssetAsBase64('watermark.svg', logosDir) ??
    loadAssetAsBase64('watermark.png') ??
    loadAssetAsBase64('watermark.svg');

  const template = Handlebars.compile(templateSource);
  const html = template({
    ...viewModel,
    logoUrl: logoUrl ?? '',
    watermarkUrl: watermarkUrl ?? '',
    cssContent,
  });

  return html;
}

function validateVoucherBusinessRules(payload: VoucherPayload): string[] {
  const errors: string[] = [];
  const passengers = payload.reservation.passenger_list ?? [];
  const hasPassengerName =
    !!payload.reservation.passenger_full?.trim() ||
    !!payload.reservation.passenger_voucher?.trim() ||
    passengers.length > 0;
  const ticketCount = passengers.filter((passenger) => !!passenger.ticketNumber?.trim()).length;
  const hasGlobalTicket = !!payload.reservation.ticket_number?.trim();

  if (!payload.reservation.reservation_code?.trim()) {
    errors.push('Falta reservation_code');
  }
  if (!hasPassengerName) {
    errors.push('Faltan pasajeros normalizados');
  }
  if (!payload.segments.length) {
    errors.push('Faltan segmentos');
  }
  if (passengers.length > 1 && ticketCount < passengers.length && !hasGlobalTicket) {
    errors.push('Hay más pasajeros que tickets utilizables');
  }

  for (const segment of payload.segments) {
    if (!segment.departure_date || !segment.arrival_date) continue;
    const departure = new Date(`${segment.departure_date}T${(segment.departure_time || '00:00').slice(0, 5)}`);
    const arrival = new Date(`${segment.arrival_date}T${(segment.arrival_time || '00:00').slice(0, 5)}`);
    if (!isNaN(departure.getTime()) && !isNaN(arrival.getTime()) && arrival.getTime() < departure.getTime()) {
      errors.push(`Fechas u horas imposibles en el segmento ${segment.segment_number}`);
    }
  }

  return errors;
}

export const renderVoucherRouter = Router();

renderVoucherRouter.post('/render-voucher-by-pulse', async (req: Request, res: Response) => {
  try {
    const parseResult = pulseIdPayloadSchema.safeParse(req.body);
    if (!parseResult.success) {
      logger.warn('render-voucher-by-pulse: payload inválido', { errors: parseResult.error.errors });
      res.status(400).json({
        error: 'Payload inválido',
        details: parseResult.error.errors,
      });
      return;
    }

    const { pulse_id } = parseResult.data;
    logger.info(`render-voucher-by-pulse: fetch Monday item`, { pulse_id });

    const item = await fetchMondayItem(pulse_id);
    if (!item) {
      logger.warn('render-voucher-by-pulse: item no encontrado en Monday', { pulse_id });
      res.status(404).json({
        error: 'Item no encontrado en Monday',
        pulse_id,
      });
      return;
    }

    const boardId = item.board?.id ?? config.monday.boardId;
    const subitemsBoardId = item.subitems?.[0]?.board?.id ?? null;
    logger.info(`render-voucher-by-pulse: item obtenido, subitems=${item.subitems?.length ?? 0}`, {
      pulse_id,
      board_id: boardId,
      subitems_board_id: subitemsBoardId,
    });

    const mapping = await buildColumnMapping(boardId, { subitemsBoardId });
    const payload = await mondayItemToVoucherPayload(item, mapping);

    const validatedPayload = voucherPayloadSchema.safeParse(payload);
    if (!validatedPayload.success) {
      logger.warn('render-voucher-by-pulse: datos Monday incompletos', {
        pulse_id,
        errors: validatedPayload.error.errors,
      });
      res.status(400).json({
        error: 'Datos de Monday incompletos para el voucher',
        details: validatedPayload.error.errors,
        hint: 'Verifica que el item tenga los campos necesarios y subitems. Usa GET /verify-monday-columns para ver el mapeo.',
      });
      return;
    }

    const businessErrors = validateVoucherBusinessRules(validatedPayload.data);
    if (businessErrors.length > 0) {
      res.status(400).json({
        error: 'Datos de Monday incompletos para el voucher',
        details: businessErrors,
      });
      return;
    }

    const viewModel = buildVoucherViewModel(validatedPayload.data);
    const html = loadTemplateAndCompile(viewModel);

    const download = req.query.download === '1' || req.query.download === 'true';
    const saveToDiskEnabled = req.query.save === '1' || req.query.save === 'true';
    const uploadToMonday = req.query.upload === '1' || req.query.upload === 'true';

    const filename = `voucher-${payload.reservation.reservation_code}-${Date.now()}.pdf`;
    const outputPath = saveToDiskEnabled ? path.join(config.outputPath, filename) : undefined;

    logger.info('render-voucher-by-pulse: generando PDF', { pulse_id, reservation_code: payload.reservation.reservation_code });

    const pdfBuffer = await renderVoucherToPdf(html, {
      saveToDisk: outputPath,
    });

    if (uploadToMonday) {
      const result = await uploadFileToMonday(pulse_id, pdfBuffer, filename, {
        boardId,
      });
      logger.info('render-voucher-by-pulse: PDF generado y subido a Monday', {
        pulse_id,
        file_id: result.id,
      });
      return res.json({
        success: true,
        file_id: result.id,
        pulse_id,
        message: 'PDF generado y subido a Monday',
      });
    }

    logger.info('render-voucher-by-pulse: PDF generado OK', {
      pulse_id,
      size_kb: Math.round(pdfBuffer.length / 1024),
    });

    if (download) {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    logger.errorWithStack('render-voucher-by-pulse: ERROR', err);
    res.status(500).json({
      error: err instanceof Error && err.message.includes('MONDAY_API_KEY')
        ? 'MONDAY_API_KEY no configurada'
        : 'Error al obtener datos de Monday o generar el PDF',
      message: err instanceof Error ? err.message : 'Error desconocido',
    });
  }
});

renderVoucherRouter.post('/render-voucher', async (req: Request, res: Response) => {
  try {
    const parseResult = voucherPayloadSchema.safeParse(req.body);
    if (!parseResult.success) {
      logger.warn('render-voucher: payload inválido', { errors: parseResult.error.errors });
      res.status(400).json({
        error: 'Payload inválido',
        details: parseResult.error.errors,
      });
      return;
    }

    const payload = parseResult.data;
    const businessErrors = validateVoucherBusinessRules(payload);
    if (businessErrors.length > 0) {
      res.status(400).json({
        error: 'Payload inválido para emitir voucher',
        details: businessErrors,
      });
      return;
    }
    logger.info('render-voucher: generando PDF', {
      reservation_code: payload.reservation.reservation_code,
      segments: payload.segments.length,
    });

    const viewModel = buildVoucherViewModel(payload);
    const html = loadTemplateAndCompile(viewModel);

    const download = req.query.download === '1' || req.query.download === 'true';
    const saveToDiskEnabled = req.query.save === '1' || req.query.save === 'true';

    const filename = `voucher-${payload.reservation.reservation_code}-${Date.now()}.pdf`;
    const outputPath = saveToDiskEnabled ? path.join(config.outputPath, filename) : undefined;

    const pdfBuffer = await renderVoucherToPdf(html, {
      saveToDisk: outputPath,
    });

    logger.info('render-voucher: PDF generado OK', {
      reservation_code: payload.reservation.reservation_code,
      size_kb: Math.round(pdfBuffer.length / 1024),
    });

    if (download) {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    logger.errorWithStack('render-voucher: ERROR', err);
    res.status(500).json({
      error: 'Error al generar el PDF',
      message: err instanceof Error ? err.message : 'Error desconocido',
    });
  }
});

renderVoucherRouter.post('/render-voucher-and-upload', async (req: Request, res: Response) => {
  try {
    const parseResult = voucherUploadPayloadSchema.safeParse(req.body);
    if (!parseResult.success) {
      logger.warn('render-voucher-and-upload: payload inválido', { errors: parseResult.error.errors });
      res.status(400).json({
        error: 'Payload inválido',
        details: parseResult.error.errors,
      });
      return;
    }

    const { item_id, ...voucherPayload } = parseResult.data;
    const businessErrors = validateVoucherBusinessRules(voucherPayload);
    if (businessErrors.length > 0) {
      res.status(400).json({
        error: 'Payload inválido para emitir voucher',
        details: businessErrors,
      });
      return;
    }
    logger.info('render-voucher-and-upload: generando y subiendo', {
      item_id,
      reservation_code: voucherPayload.reservation.reservation_code,
    });

    const viewModel = buildVoucherViewModel(voucherPayload);
    const html = loadTemplateAndCompile(viewModel);

    const filename = `voucher-${voucherPayload.reservation.reservation_code}-${Date.now()}.pdf`;
    const pdfBuffer = await renderVoucherToPdf(html);

    const result = await uploadFileToMonday(item_id, pdfBuffer, filename);

    logger.info('render-voucher-and-upload: OK', { item_id, file_id: result.id });

    res.json({
      success: true,
      file_id: result.id,
      item_id,
    });
  } catch (err) {
    logger.errorWithStack('render-voucher-and-upload: ERROR', err);
    res.status(500).json({
      error: err instanceof Error && err.message.includes('MONDAY_API_KEY')
        ? 'MONDAY_API_KEY no configurada'
        : 'Error al generar o subir el PDF',
      message: err instanceof Error ? err.message : 'Error desconocido',
    });
  }
});
