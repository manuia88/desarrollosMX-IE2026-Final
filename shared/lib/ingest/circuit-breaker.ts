import { CircuitOpenError } from './types';

// Circuit breaker per source (in-memory, módulo singleton). Si una source
// acumula >N failures consecutivos en una ventana, se abre el circuito y
// se rechazan llamadas inmediatamente por cooldown. Half-open tras cooldown.
//
// Upgrade técnico aprobado §5.A FASE 07.

type State = 'closed' | 'open' | 'half_open';

interface BreakerState {
  failures: number;
  state: State;
  openedAt: number;
}

const breakers = new Map<string, BreakerState>();

interface BreakerConfig {
  threshold: number;
  cooldownMs: number;
}

const DEFAULT_CONFIG: BreakerConfig = {
  threshold: 5,
  cooldownMs: 60 * 5 * 1000, // 5 min
};

export function checkCircuit(source: string, cfg: Partial<BreakerConfig> = {}): void {
  const config = { ...DEFAULT_CONFIG, ...cfg };
  const b = breakers.get(source);
  if (!b) return;
  if (b.state === 'open') {
    const elapsed = Date.now() - b.openedAt;
    if (elapsed < config.cooldownMs) {
      throw new CircuitOpenError(source, config.cooldownMs - elapsed);
    }
    // cooldown done → half-open: permitir un intento
    b.state = 'half_open';
  }
}

export function recordSuccess(source: string): void {
  const b = breakers.get(source);
  if (!b) return;
  b.failures = 0;
  b.state = 'closed';
}

export function recordFailure(source: string, cfg: Partial<BreakerConfig> = {}): void {
  const config = { ...DEFAULT_CONFIG, ...cfg };
  const b = breakers.get(source) ?? { failures: 0, state: 'closed' as State, openedAt: 0 };
  b.failures++;
  if (b.failures >= config.threshold || b.state === 'half_open') {
    b.state = 'open';
    b.openedAt = Date.now();
  }
  breakers.set(source, b);
}

// Helper para tests / cleanup.
export function resetCircuit(source: string): void {
  breakers.delete(source);
}
