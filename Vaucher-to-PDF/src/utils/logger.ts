const LOG_LEVEL = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LEVELS[LOG_LEVEL as keyof typeof LEVELS] ?? 1;

function timestamp(): string {
  return new Date().toISOString();
}

function log(level: keyof typeof LEVELS, msg: string, meta?: object): void {
  if (LEVELS[level] < currentLevel) return;
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  const line = `[${timestamp()}] [${level.toUpperCase()}] ${msg}${metaStr}`;
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (msg: string, meta?: object) => log('debug', msg, meta),
  info: (msg: string, meta?: object) => log('info', msg, meta),
  warn: (msg: string, meta?: object) => log('warn', msg, meta),
  error: (msg: string, meta?: object) => log('error', msg, meta),
  errorWithStack: (msg: string, err: unknown) => {
    const meta: Record<string, unknown> = { message: err instanceof Error ? err.message : String(err) };
    if (err instanceof Error && err.stack) {
      meta.stack = err.stack;
    }
    log('error', msg, meta);
  },
};
