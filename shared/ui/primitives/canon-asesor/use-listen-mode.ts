'use client';

// STUB ADR-018 — fallback alert si browser carece de Web Speech API.
// Activar L-NEW-LISTEN cuando se considere TTS server-side (e.g. Whisper/ElevenLabs).
// UI consumer debe ocultar el control si isStub es true.

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseListenModeOptions {
  text: string;
  onListenStart?: () => void;
  onListenEnd?: () => void;
  lang?: string;
  holdMs?: number;
}

export interface UseListenModeReturn {
  holdHandlers: {
    onMouseDown: () => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
    onTouchStart: () => void;
    onTouchEnd: () => void;
  };
  isListening: boolean;
  isStub: boolean;
}

function detectStub(): boolean {
  if (typeof window === 'undefined') return true;
  return !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window);
}

export function useListenMode(options: UseListenModeOptions): UseListenModeReturn {
  const { text, onListenStart, onListenEnd, lang = 'es-MX', holdMs = 800 } = options;
  const [isListening, setIsListening] = useState(false);
  const [isStub] = useState<boolean>(() => detectStub());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
    },
    [],
  );

  const start = useCallback(() => {
    if (isStub) {
      timerRef.current = setTimeout(() => {
        // STUB ADR-018 fallback: notify caller; consumer puede mostrar tooltip "TTS no disponible"
        onListenStart?.();
        if (typeof window !== 'undefined') {
          window.alert(text);
        }
        onListenEnd?.();
      }, holdMs);
      return;
    }
    timerRef.current = setTimeout(() => {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang;
      utter.onend = () => {
        setIsListening(false);
        onListenEnd?.();
      };
      utteranceRef.current = utter;
      window.speechSynthesis.speak(utter);
      setIsListening(true);
      onListenStart?.();
    }, holdMs);
  }, [holdMs, isStub, lang, onListenEnd, onListenStart, text]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    holdHandlers: {
      onMouseDown: start,
      onMouseUp: stop,
      onMouseLeave: stop,
      onTouchStart: start,
      onTouchEnd: stop,
    },
    isListening,
    isStub,
  };
}
