'use client';

import { type CSSProperties, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';

interface Props {
  readonly asesorSlug: string;
  readonly sourceVideoId?: string;
}

const containerStyle: CSSProperties = {
  background: 'var(--surface-elevated)',
  borderRadius: 'var(--canon-radius-card)',
  border: '1px solid var(--canon-border)',
  padding: '32px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const inputStyle: CSSProperties = {
  padding: '12px 14px',
  borderRadius: '8px',
  border: '1px solid var(--canon-border-2)',
  background: 'rgba(0,0,0,0.2)',
  color: 'var(--canon-cream)',
  fontSize: '14px',
};

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-text)',
  fontSize: '12px',
  color: 'rgba(255,255,255,0.7)',
  marginBottom: '4px',
};

export function ReferralForm({ asesorSlug, sourceVideoId }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [interest, setInterest] = useState<string>('comprar');
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitMutation = trpc.studio.sprint7PublicGallery.submitReferralForm.useMutation({
    onSuccess: () => setDone(true),
    onError: (err) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name || !email) return;
    setError(null);
    submitMutation.mutate({
      asesorSlug,
      source: 'studio_gallery',
      sourceVideoId,
      submittedName: name,
      submittedEmail: email,
      submittedPhone: phone || undefined,
      submittedMessage: message || undefined,
      submittedInterestType: interest as 'comprar' | 'vender' | 'rentar' | 'asesoria' | 'otro',
    });
  }
  const submitting = submitMutation.isPending;

  if (done) {
    return (
      <div style={containerStyle} aria-live="polite">
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '20px',
            color: 'var(--canon-cream)',
          }}
        >
          ¡Mensaje enviado!
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
          El asesor recibió tu información y te contactará pronto.
        </p>
      </div>
    );
  }

  return (
    <form style={containerStyle} onSubmit={handleSubmit} aria-label="Formulario de contacto">
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '20px',
          color: 'var(--canon-cream)',
        }}
      >
        Te interesa? Contactame
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={labelStyle}>Nombre</span>
          <input
            style={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            aria-label="Nombre"
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={labelStyle}>Email</span>
          <input
            style={inputStyle}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-label="Email"
          />
        </label>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={labelStyle}>Teléfono (opcional)</span>
          <input
            style={inputStyle}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-label="Teléfono"
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={labelStyle}>Interés</span>
          <select
            style={inputStyle}
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
            aria-label="Interés"
          >
            <option value="comprar">Comprar</option>
            <option value="vender">Vender</option>
            <option value="rentar">Rentar</option>
            <option value="asesoria">Asesoría</option>
            <option value="otro">Otro</option>
          </select>
        </label>
      </div>
      <label style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={labelStyle}>Mensaje (opcional)</span>
        <textarea
          style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          aria-label="Mensaje"
        />
      </label>
      {error ? (
        <p style={{ color: '#ef4444', fontSize: '13px' }} role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={submitting || !name || !email}
        style={{
          padding: '12px 20px',
          borderRadius: '9999px',
          border: 'none',
          background: 'var(--canon-gradient)',
          color: '#fff',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '14px',
          cursor: submitting ? 'not-allowed' : 'pointer',
          opacity: submitting ? 0.6 : 1,
        }}
      >
        {submitting ? 'Enviando…' : 'Enviar mensaje'}
      </button>
    </form>
  );
}
