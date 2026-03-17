export const config = {
  port: parseInt(process.env.PORT ?? '9120', 10),
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    model: process.env.OPENAI_MODEL ?? 'gpt-4o',
    maxFileSize: 20 * 1024 * 1024, // 20 MB
  },
  upload: {
    dir: process.env.UPLOAD_DIR ?? '/tmp/pdf-extractor',
    maxSize: 20 * 1024 * 1024, // 20 MB
  },
} as const;
