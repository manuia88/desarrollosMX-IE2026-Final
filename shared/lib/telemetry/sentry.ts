type CaptureContext = {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

const enabled = Boolean(process.env.SENTRY_DSN);

export const sentry = {
  captureException(_err: unknown, _context?: CaptureContext) {
    if (!enabled) return;
  },
};
