import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

export interface PdfRenderOptions {
  saveToDisk?: string;
}

export async function renderVoucherToPdf(
  html: string,
  options: PdfRenderOptions = {}
): Promise<Buffer> {
  const savePath = options.saveToDisk;

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: 'networkidle',
      timeout: 10000,
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
      printBackground: true,
    });

    if (savePath) {
      const outputDir = path.dirname(savePath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.writeFileSync(savePath, pdfBuffer);
    }

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
