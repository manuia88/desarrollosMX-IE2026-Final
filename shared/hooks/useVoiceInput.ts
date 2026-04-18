'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>> & { length: number };
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type UseVoiceInputOpts = {
  locale: string;
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (msg: string) => void;
  continuous?: boolean;
};

export function useVoiceInput(opts: UseVoiceInputOpts) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    setIsSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const start = useCallback(async () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      optsRef.current.onError?.('voice_not_supported');
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
        const status = await navigator.permissions.query({
          name: 'microphone' as PermissionName,
        });
        if (status.state === 'denied') {
          optsRef.current.onError?.('microphone_denied');
          return;
        }
      }
    } catch {
      // Algunos navegadores no soportan permissions.query para microphone; ignorar.
    }

    const recognition = new Ctor();
    recognition.lang = optsRef.current.locale;
    recognition.continuous = optsRef.current.continuous ?? false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result) continue;
        const alt = result[0];
        if (!alt) continue;
        // @ts-expect-error isFinal exists on SpeechRecognitionResult at runtime
        if (result.isFinal) final += alt.transcript;
        else interim += alt.transcript;
      }
      if (final) optsRef.current.onTranscript(final, true);
      else if (interim) optsRef.current.onTranscript(interim, false);
    };

    recognition.onerror = (event) => {
      optsRef.current.onError?.(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  return { start, stop, isListening, isSupported };
}
