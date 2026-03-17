import path from 'path';

export const config = {
  port: parseInt(process.env.PORT ?? '9110', 10),
  assetsPath: process.env.ASSETS_PATH ?? path.join(process.cwd(), 'assets'),
  logosImgPath: process.env.LOGOS_IMG_PATH ?? path.join(process.cwd(), 'logos-img'),
  templatesPath: process.env.TEMPLATES_PATH ?? path.join(process.cwd(), 'templates'),
  outputPath: process.env.OUTPUT_PATH ?? path.join(process.cwd(), 'output'),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  monday: {
    apiKey: process.env.MONDAY_API_KEY ?? '',
    boardId: process.env.MONDAY_BOARD_ID ?? '18404261128',
    /** Columna donde se sube el PDF del voucher generado (Voucher PDF). Ticket = otra columna, usada en n8n. */
    voucherPdfColumnId:
      process.env.MONDAY_VOUCHER_PDF_COLUMN_ID ??
      process.env.MONDAY_FILE_COLUMN_ID ??
      'file_mm1h5b78',
  },
  agencyPhoneDefault: process.env.AGENCY_PHONE_DEFAULT ?? '849-919-1919',
};
