'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useCopilotStore } from '@/shared/hooks/useCopilotStore';
import { useCopilotSuggestions } from '@/shared/hooks/useCopilotSuggestions';
import { useVoiceInput } from '@/shared/hooks/useVoiceInput';
import { parseCitations } from '@/shared/lib/ai/citations';
import { AI_ASK_EVENT } from '@/shared/lib/command-palette/seed-commands';

function isSupportedUnknown(v: boolean | null): boolean {
  return v === null;
}

export function AICopilot() {
  const isOpen = useCopilotStore((s) => s.isOpen);
  const toggle = useCopilotStore((s) => s.toggle);
  const open = useCopilotStore((s) => s.open);
  const close = useCopilotStore((s) => s.close);
  const context = useCopilotStore((s) => s.context);
  const setContext = useCopilotStore((s) => s.setContext);
  const initialPrompt = useCopilotStore((s) => s.initialPrompt);
  const clearInitialPrompt = useCopilotStore((s) => s.clearInitialPrompt);
  const suggestions = useCopilotStore((s) => s.suggestions);
  useCopilotSuggestions();

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/ai/copilot',
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            messages,
            context: useCopilotStore.getState().context,
          },
        }),
      }),
    [],
  );

  const { messages, sendMessage, status, stop } = useChat({ transport });

  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const voice = useVoiceInput({
    locale: 'es-MX',
    onTranscript: (text, isFinal) => {
      setInput((prev) => (isFinal ? `${prev}${prev ? ' ' : ''}${text}`.trim() : text));
    },
  });

  useHotkeys('mod+j', () => toggle(), {
    preventDefault: true,
    enableOnFormTags: true,
    enableOnContentEditable: true,
  });

  useEffect(() => {
    const onAsk = (e: Event) => {
      const ce = e as CustomEvent<{ query?: string } | undefined>;
      open(ce.detail?.query);
    };
    window.addEventListener(AI_ASK_EVENT, onAsk);
    return () => window.removeEventListener(AI_ASK_EVENT, onAsk);
  }, [open]);

  useEffect(() => {
    if (isOpen && initialPrompt) {
      setInput(initialPrompt);
      clearInitialPrompt();
      setTimeout(() => inputRef.current?.focus(), 50);
    } else if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialPrompt, clearInitialPrompt]);

  const isStreaming = status === 'streaming' || status === 'submitted';

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    await sendMessage({ text });
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen ? (
        <motion.aside
          key="expanded"
          initial={{ width: 60, opacity: 0.8 }}
          animate={{ width: 420, opacity: 1 }}
          exit={{ width: 60, opacity: 0.8 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          className="copilot-panel"
          aria-label="Copilot DMX"
        >
          <header className="copilot-header">
            <div className="copilot-title">
              <span className="copilot-orb" aria-hidden="true" />
              <span>DMX Copilot</span>
            </div>
            <div className="copilot-actions">
              {isStreaming ? (
                <button type="button" onClick={() => stop()} className="copilot-btn-ghost">
                  Detener
                </button>
              ) : null}
              <button
                type="button"
                onClick={close}
                className="copilot-btn-ghost"
                aria-label="Cerrar copilot"
              >
                ×
              </button>
            </div>
          </header>

          {context ? (
            <div className="copilot-context-chips">
              <span className="copilot-chip">módulo: {context.module}</span>
              {context.entity ? (
                <span className="copilot-chip">
                  {context.entity.type}: {context.entity.id.slice(0, 8)}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => setContext(null)}
                className="copilot-chip-drop"
                aria-label="Quitar contexto"
                title="Quitar contexto"
              >
                ×
              </button>
            </div>
          ) : null}

          <div className="copilot-messages">
            {messages.length === 0 ? (
              <div className="copilot-empty">
                Preguntame lo que sea sobre tu cartera, contactos, zonas o pipeline.
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`copilot-msg copilot-msg-${m.role}`}>
                  {m.parts
                    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                    .map((p) => (
                      <p key={`${m.id}-${p.text.slice(0, 32)}`}>
                        {parseCitations(p.text).map((seg) =>
                          seg.kind === 'text' ? (
                            <span key={seg.key}>{seg.text}</span>
                          ) : (
                            <button
                              key={seg.key}
                              type="button"
                              className="copilot-citation"
                              title={`${seg.source_type}:${seg.source_id}`}
                            >
                              [{seg.source_type}]
                            </button>
                          ),
                        )}
                      </p>
                    ))}
                </div>
              ))
            )}
          </div>

          {suggestions.length > 0 ? (
            <div className="copilot-suggestions">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setInput(s.prompt);
                    setTimeout(() => inputRef.current?.focus(), 0);
                  }}
                  className="copilot-suggestion"
                >
                  {s.label}
                </button>
              ))}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="copilot-form">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
              placeholder="Escribe o ⇧Enter para salto de línea"
              rows={2}
              className="copilot-input"
              disabled={isStreaming}
            />
            <div className="copilot-form-actions">
              {voice.isSupported ? (
                <button
                  type="button"
                  onClick={() => (voice.isListening ? voice.stop() : voice.start())}
                  className={voice.isListening ? 'copilot-mic copilot-mic-active' : 'copilot-mic'}
                  title={voice.isListening ? 'Detener voz' : 'Dictar por voz'}
                  aria-label={voice.isListening ? 'Detener voz' : 'Dictar por voz'}
                >
                  {voice.isListening ? '●' : '🎤'}
                </button>
              ) : isSupportedUnknown(voice.isSupported) ? null : (
                <span className="copilot-mic-off" title="Voz no disponible en este navegador">
                  —
                </span>
              )}
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className="copilot-submit"
              >
                {isStreaming ? '…' : 'Enviar'}
              </button>
            </div>
          </form>
        </motion.aside>
      ) : (
        <motion.button
          key="collapsed"
          type="button"
          initial={{ width: 420, opacity: 0.8 }}
          animate={{ width: 60, opacity: 1 }}
          exit={{ width: 420, opacity: 0.8 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          onClick={toggle}
          className="copilot-rail"
          aria-label="Abrir Copilot DMX"
        >
          <span className="copilot-orb-lg" aria-hidden="true" />
          {suggestions.length > 0 ? (
            <span className="copilot-badge">{suggestions.length}</span>
          ) : null}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
