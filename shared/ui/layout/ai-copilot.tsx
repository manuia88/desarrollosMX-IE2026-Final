'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useCopilotStore } from '@/shared/hooks/useCopilotStore';
import { AI_ASK_EVENT } from '@/shared/lib/command-palette/seed-commands';

export function AICopilot() {
  const isOpen = useCopilotStore((s) => s.isOpen);
  const toggle = useCopilotStore((s) => s.toggle);
  const open = useCopilotStore((s) => s.open);
  const close = useCopilotStore((s) => s.close);
  const context = useCopilotStore((s) => s.context);
  const initialPrompt = useCopilotStore((s) => s.initialPrompt);
  const clearInitialPrompt = useCopilotStore((s) => s.clearInitialPrompt);
  const suggestions = useCopilotStore((s) => s.suggestions);

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
                      <p key={`${m.id}-${p.text.slice(0, 32)}`}>{p.text}</p>
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
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="copilot-submit"
            >
              {isStreaming ? '…' : 'Enviar'}
            </button>
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
