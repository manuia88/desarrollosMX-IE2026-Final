// STUB — activar en FASE 31 (Agentic Marketplace H2) con SDK @deepgram/sdk.
// Interfaz equivalente a useVoiceInput para permitir swap transparente.
// Activación: feature flag shared.voice.deepgram (off en H1).

export type DeepgramClientOpts = {
  apiKey: string;
  locale: string;
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (msg: string) => void;
};

export class DeepgramClient {
  start(_opts: DeepgramClientOpts): Promise<void> {
    throw new Error('deepgram_not_implemented_h2');
  }

  stop(): void {
    // noop
  }
}

export const DEEPGRAM_FEATURE_FLAG = 'shared.voice.deepgram';
