'use client';

// F14.F.9 Sprint 8 BIBLIA LATERAL 8 — Guest invite flow.
import { type CSSProperties, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';

export interface GuestInviteFlowProps {
  readonly episodeId: string;
}

const wrapperStyle: CSSProperties = {
  background: 'var(--surface-elevated)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  padding: 20,
};

const inputStyle: CSSProperties = {
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 12,
  padding: '10px 16px',
  color: '#FFFFFF',
  fontSize: 14,
  width: '100%',
};

const ctaStyle: CSSProperties = {
  background: 'linear-gradient(90deg, #6366F1, #EC4899)',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: 9999,
  padding: '10px 20px',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
};

export function GuestInviteFlow({ episodeId }: GuestInviteFlowProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'arquitecto' | 'contratista' | 'cliente' | 'inversionista'>(
    'arquitecto',
  );
  const [photoPath, setPhotoPath] = useState('');
  const [voicePath, setVoicePath] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const mutation = trpc.studio.sprint8Series.inviteGuestToEpisode.useMutation();

  const submit = async () => {
    if (!name.trim() || !photoPath.trim() || !voicePath.trim()) return;
    try {
      await mutation.mutateAsync({
        episodeId,
        guestName: name.trim(),
        guestType: role,
        photoStoragePath: photoPath.trim(),
        voiceSampleStoragePath: voicePath.trim(),
      });
      setSubmitted(true);
    } catch {
      /* sentry handled */
    }
  };

  if (submitted) {
    return (
      <div style={wrapperStyle}>
        <div style={{ color: '#34D399', fontWeight: 600 }}>
          Guest invitado. Avatar HeyGen en cola (~2 min).
        </div>
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 18,
          color: '#FFFFFF',
          marginBottom: 12,
        }}
      >
        Invitar guest
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          aria-label="Nombre guest"
          placeholder="Nombre del guest"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />
        <select
          aria-label="Rol del guest"
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
          style={inputStyle}
        >
          <option value="arquitecto">Arquitecto</option>
          <option value="contratista">Contratista</option>
          <option value="cliente">Cliente</option>
          <option value="inversionista">Inversionista</option>
        </select>
        <input
          aria-label="Path foto Storage"
          placeholder="Storage path foto guest"
          value={photoPath}
          onChange={(e) => setPhotoPath(e.target.value)}
          style={inputStyle}
        />
        <input
          aria-label="Path voice sample Storage"
          placeholder="Storage path voice sample"
          value={voicePath}
          onChange={(e) => setVoicePath(e.target.value)}
          style={inputStyle}
        />
        <button type="button" onClick={submit} style={ctaStyle}>
          Invitar guest
        </button>
        <div style={{ color: 'rgba(252,211,77,0.8)', fontSize: 12 }}>
          Disclosure ADR-018: HeyGen avatar generation costo ~$0.50 USD per guest.
        </div>
      </div>
    </div>
  );
}
