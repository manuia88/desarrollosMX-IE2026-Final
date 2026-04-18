type CaptureArgs = {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
};

const enabled = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);

export const posthog = {
  capture(_args: CaptureArgs) {
    if (!enabled) return;
  },
};
