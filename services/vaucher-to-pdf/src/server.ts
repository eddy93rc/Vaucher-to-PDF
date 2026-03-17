import express from 'express';
import path from 'path';
import { config } from './config';
import { renderVoucherRouter } from './routes/renderVoucher';
import { verifyMondayRouter } from './routes/verifyMonday';
import { logger } from './utils/logger';

export function createApp() {
  const app = express();

  app.use((req, _res, next) => {
    const bodySummary =
      req.method === 'POST' && req.body
        ? Object.keys(req.body).length > 0
          ? ` body_keys=[${Object.keys(req.body).join(', ')}]`
          : ''
        : '';
    logger.info(`→ ${req.method} ${req.path}${bodySummary}`);
    next();
  });

  app.use(express.json({ limit: '1mb' }));

  app.use('/assets', express.static(config.assetsPath));
  app.use('/templates', express.static(config.templatesPath));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(renderVoucherRouter);
  app.use(verifyMondayRouter);

  return app;
}

export function startServer() {
  const app = createApp();

  app.listen(config.port, '0.0.0.0', () => {
    logger.info(`Servidor voucher-pdf en http://0.0.0.0:${config.port}`);
    logger.info('Endpoints: GET /health | POST /render-voucher | POST /render-voucher-by-pulse | POST /render-voucher-and-upload | GET /verify-monday-columns | POST /diagnose-monday-item | POST /monday-structure');
  });
}
