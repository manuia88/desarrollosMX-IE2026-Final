// STUB UI — auth + listing capture wiring se entrega en 7.E.3.
// Skeleton: render con estados auth/desconectado y conteo desde chrome.storage.local.

import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { type DmxUser, getCaptureCount, getStoredUser } from '../lib/auth';

function Popup() {
  const [user, setUser] = useState<DmxUser | null>(null);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [storedUser, storedCount] = await Promise.all([getStoredUser(), getCaptureCount()]);
      if (cancelled) return;
      setUser(storedUser);
      setCount(storedCount);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <main className="dmx-popup dmx-popup--loading">Cargando…</main>;
  }

  return (
    <main className="dmx-popup">
      <header className="dmx-popup__header">
        <h1 className="dmx-popup__title">DMX Market Assistant</h1>
        <span className="dmx-popup__badge">[alpha]</span>
      </header>

      {user ? (
        <section className="dmx-popup__user" aria-label="Sesión activa">
          <p className="dmx-popup__user-name">{user.name ?? user.email}</p>
          <p className="dmx-popup__count">
            <strong>{count}</strong> listings capturados
          </p>
        </section>
      ) : (
        <section className="dmx-popup__auth" aria-label="Sin sesión">
          <p>No hay sesión DMX activa.</p>
          <p className="dmx-popup__hint">
            Inicia sesión en desarrollosmx.com — el flujo se conectará en BLOQUE 7.E.3.
          </p>
        </section>
      )}

      <footer className="dmx-popup__footer">
        <small>v0.1.0 · skeleton</small>
      </footer>
    </main>
  );
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <Popup />
    </StrictMode>,
  );
}
