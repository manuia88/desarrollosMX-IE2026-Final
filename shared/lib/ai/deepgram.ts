// Stub Deepgram — upgrade H2.
// Interfaz equivalente a useVoiceInput para permitir swap transparente.
// Activación: feature flag shared.voice.deepgram (off en H1).

export type DeepgramClientOpts = {
  apiKey: string;
  locale: string;
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (msg: string) => void;
};

export class DeepgramClient {
  constructor(_opts: DeepgramClientOpts) {
    // H2: persistir opts y abrir WebSocket a wss://api.deepgram.com/v1/listen
  }

  start(): Promise<void> {
    throw new Error('deepgram_not_implemented_h2');
  }

  stop(): void {
    // noop
  }
}

export const DEEPGRAM_FEATURE_FLAG = 'shared.voice.deepgram';
