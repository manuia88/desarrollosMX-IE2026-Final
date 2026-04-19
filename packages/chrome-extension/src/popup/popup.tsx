// Popup MV3 — 3 estados: loading, disconnected (paste-token form), connected.
// Token DMX se obtiene en https://<base>/extension/connect (página server-side, 7.E.4).

import { StrictMode, useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  type DmxUser,
  getCaptureCount,
  getStoredToken,
  getStoredUser,
  isValidTokenFormat,
  login,
  logout,
} from '../lib/auth';
import { API_BASE_OPTIONS, type ApiBase, connectUrl, getApiBase, setApiBase } from '../lib/config';

interface State {
  loading: boolean;
  user: DmxUser | null;
  count: number;
  apiBase: ApiBase;
}

const INITIAL_STATE: State = {
  loading: true,
  user: null,
  count: 0,
  apiBase: API_BASE_OPTIONS[0],
};

function Popup() {
  const [state, setState] = useState<State>(INITIAL_STATE);
  const [tokenInput, setTokenInput] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [token, user, count, apiBase] = await Promise.all([
      getStoredToken(),
      getStoredUser(),
      getCaptureCount(),
      getApiBase(),
    ]);
    setState({
      loading: false,
      user: token ? user : null,
      count,
      apiBase,
    });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onConnect = useCallback(() => {
    void chrome.tabs.create({ url: connectUrl(state.apiBase) });
  }, [state.apiBase]);

  const onSaveToken = useCallback(async () => {
    setError(null);
    const trimmed = tokenInput.trim();
    if (!isValidTokenFormat(trimmed)) {
      setError('Formato de token inválido (32–512 chars alfanuméricos).');
      return;
    }
    setBusy(true);
    const result = await login(trimmed);
    setBusy(false);
    if (!result.ok) {
      setError(`Error: ${result.error ?? 'desconocido'}`);
      return;
    }
    setTokenInput('');
    await refresh();
  }, [tokenInput, refresh]);

  const onLogout = useCallback(async () => {
    setBusy(true);
    await logout();
    setBusy(false);
    await refresh();
  }, [refresh]);

  const onChangeBase = useCallback(
    async (event: React.ChangeEvent<HTMLSelectElement>) => {
      const next = event.target.value;
      const valid = (API_BASE_OPTIONS as readonly string[]).includes(next);
      if (!valid) return;
      await setApiBase(next as ApiBase);
      await refresh();
    },
    [refresh],
  );

  const captureLink = useMemo(() => `${state.apiBase}/asesor/capturas`, [state.apiBase]);

  if (state.loading) {
    return <main className="dmx-popup dmx-popup--loading">Cargando…</main>;
  }

  return (
    <main className="dmx-popup">
      <header className="dmx-popup__header">
        <h1 className="dmx-popup__title">DMX Market Assistant</h1>
        <span className="dmx-popup__badge">[alpha]</span>
      </header>

      {state.user ? (
        <section className="dmx-popup__user" aria-label="Sesión activa">
          <p className="dmx-popup__user-name">{state.user.name ?? state.user.email}</p>
          <p className="dmx-popup__count">
            <strong>{state.count}</strong> listings capturados
          </p>
          <a className="dmx-popup__link" href={captureLink} target="_blank" rel="noreferrer">
            Ver historial /asesor/capturas →
          </a>
          <button
            type="button"
            className="dmx-popup__btn dmx-popup__btn--ghost"
            onClick={() => void onLogout()}
            disabled={busy}
          >
            Cerrar sesión
          </button>
        </section>
      ) : (
        <section className="dmx-popup__auth" aria-label="Conectar con DMX">
          <p>Conecta tu cuenta DMX para empezar a capturar listings.</p>
          <button type="button" className="dmx-popup__btn" onClick={onConnect}>
            Generar token en DMX
          </button>
          <label className="dmx-popup__field">
            <span>Pega tu token aquí</span>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="dmx_live_..."
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <button
            type="button"
            className="dmx-popup__btn"
            onClick={() => void onSaveToken()}
            disabled={busy || tokenInput.trim().length === 0}
          >
            {busy ? 'Verificando…' : 'Guardar token'}
          </button>
          {error ? (
            <p className="dmx-popup__error" role="alert">
              {error}
            </p>
          ) : null}
        </section>
      )}

      <section className="dmx-popup__settings" aria-label="Configuración">
        <label className="dmx-popup__field">
          <span>API base</span>
          <select value={state.apiBase} onChange={onChangeBase}>
            {API_BASE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
      </section>

      <footer className="dmx-popup__footer">
        <small>v0.1.0 · alpha</small>
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
