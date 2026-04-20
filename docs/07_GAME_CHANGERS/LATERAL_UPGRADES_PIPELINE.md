# Lateral Upgrades Pipeline — Vista única

> **Propósito:** Registro vivo de upgrades de producto detectados durante ejecución de fases que NO caben en el bloque actual pero deben capitalizarse en fases futuras. Inspirados en empresas que crearon nuevas categorías (Spotify Wrapped, Strava Segments, Robinhood, Zillow Zestimate, Substack, etc.).
> **Filosofía:** DMX no es portal más — es categoría nueva (Spatial Decision Intelligence). Estos laterales convierten datos crudos del IE en features que generan engagement, viralidad, retención y posicionamiento de marca.
> **Maintenance:** cada lateral tiene status (proposed/approved/scheduled/in_progress/done). Cuando se ejecuta la fase target, el lateral pasa a "done" y se mueve a histórico.

---

## Status legend
- 🟢 **proposed** — detectado, esperando aprobación founder
- 🟡 **approved** — aprobado, agendado para fase target
- 🔵 **in_progress** — siendo construido en fase actual
- ✅ **done** — entregado, mover a histórico

---

## Pipeline activo

### L1 — Zona Wrapped anual (Spotify Wrapped pattern)
- **Status:** 🟡 approved (founder OK 2026-04-19, BLOQUE 8.C lateral session)
- **Qué es:** cada zona genera un resumen anual visual compartible con sus scores destacados ("Roma Norte 2026: subió +18% caminabilidad, top 3 vida nocturna, agua mejoró +25 puntos").
- **Para qué sirve:** marketing orgánico viral + lock-in narrativo. La gente comparte su colonia como comparte su Spotify Wrapped.
- **Beneficio concreto:** tráfico orgánico anual masivo + brand awareness sin gastar en ads. Diciembre/enero = explosión de shares en redes.
- **Fase target:** FASE 11 (índices DMX) + FASE 23 (growth/monetización)
- **Dependencia data:** ≥12 meses de score history acumulada (BLOQUE 8.A score_history particionada cubre)
- **Inspiración:** Spotify Wrapped (2016+), Strava Year in Sport, Apple Music Replay
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_11_IE_INDICES_DMX.md` §Laterals pipeline

### L4 — Watchlist + Alertas de zonas (Robinhood pattern)
- **Status:** 🟡 approved (founder OK 2026-04-19, BLOQUE 8.C lateral session)
- **Qué es:** usuario sigue 5-10 zonas como sigue acciones. Recibe push notification cuando algún score cambia >10% (mejora o empeora).
- **Para qué sirve:** transforma la decisión de compra "una vez en la vida" en relación continua con la app.
- **Beneficio concreto:** usuario vuelve diariamente, no solo cuando va a comprar. Construye email/push list activa para monetizar después (B2B + B2C).
- **Fase target:** FASE 20 (portal comprador)
- **Dependencia data:** N0-N11 calculators + delta tracking D2 (incluido BLOQUE 8.C)
- **Inspiración:** Robinhood watchlist + alerts, eToro, TradingView
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_20_PORTAL_COMPRADOR.md` §Laterals pipeline

### L6 — "DMX Vibe Score™" como categoría propia (Zillow Zestimate pattern)
- **Status:** 🟡 approved (founder OK 2026-04-19, BLOQUE 8.C lateral session)
- **Qué es:** combinar momentum (N11) + nightlife (N09) + walkability (N08) + diversity (N01) en UNA métrica con marca propia ("DMX Vibe Score™ de Roma Norte: 92/100").
- **Para qué sirve:** misma estrategia que Zillow con Zestimate — crear categoría propia que la competencia tenga que copiar y citar (legitimando DMX como autoridad).
- **Beneficio concreto:** posicionamiento de categoría nueva ("vibe inmobiliario"), no portal más. Brand asset registrable. Diferenciador permanente vs Habi/Inmuebles24.
- **Fase target:** FASE 11 (definir como índice DMX-VIBE) + FASE 21 (publicar metodología pública)
- **Dependencia data:** N01 + N08 + N09 + N11 implementados (BLOQUE 8.C entrega)
- **Inspiración:** Zillow Zestimate, AirDNA Score, Walk Score
- **Pendiente decisión founder:** registro marca "DMX Vibe Score™" (legal + brand)
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_11_IE_INDICES_DMX.md` §Laterals pipeline

### L8 — "Today's Top Movers" público (Robinhood market dashboard pattern)
- **Status:** 🟡 approved (founder OK 2026-04-19, BLOQUE 8.C lateral session)
- **Qué es:** dashboard público con las 10 zonas que más subieron/bajaron en momentum (N11) esta semana/mes.
- **Para qué sirve:** genera FOMO + tráfico orgánico ("mira lo que está pasando en CDMX esta semana"). Atrae prensa, agentes inmobiliarios, inversores.
- **Beneficio concreto:** posicionamiento como "el Bloomberg del real estate MX". Press coverage recurring + SEO orgánico zonas.
- **Fase target:** FASE 11 (índices DMX, route /indices/movers)
- **Dependencia data:** N11 DMX Momentum Index funcionando ≥3 meses (BLOQUE 8.C N11 + tier 3 gating)
- **Inspiración:** Robinhood Top Movers, Yahoo Finance Trending, CoinMarketCap
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_11_IE_INDICES_DMX.md` §Laterals pipeline

### L9 — Suscripción a zonas con newsletter mensual (Substack pattern)
- **Status:** 🟡 approved (founder OK 2026-04-19, BLOQUE 8.C lateral session)
- **Qué es:** usuario suscribe a zonas + recibe newsletter mensual con cambios scores + nuevas propiedades + opportunities.
- **Para qué sirve:** email recurring + canal owned (no dependes de Google/Meta ads). Construye lista email valiosa.
- **Beneficio concreto:** lista email valuable para B2B (vender insights a desarrolladores) + canal directo monetizable (premium tiers, sponsored content).
- **Fase target:** FASE 20 (portal comprador) + FASE 23 (growth)
- **Dependencia data:** scores con delta tracking + Resend SMTP (stub hasta FASE 22)
- **Inspiración:** Substack, Morning Brew, The Hustle, Zillow Premier Agent newsletters
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_20_PORTAL_COMPRADOR.md` §Laterals pipeline

---

## Histórico (ejecutados)

_Vacío hasta primer lateral entregado._

---

## Convenciones

- Cada lateral nuevo se registra aquí Y en su FASE target con sección `## Laterals pipeline` al final del archivo.
- Cuando founder aprueba lateral nuevo durante ejecución de fase, anotarlo aquí ANTES de continuar.
- Al cerrar una FASE, revisar laterals pipeline → ¿alguno aplicaba? Sí → status update.
- Categorías de inspiración válidas: empresas que crearon nuevas categorías (no copies de competidores directos).

---

**Autor:** PM Sr Dev (sesión BLOQUE 8.C lateral upgrades) | **Fecha inicio:** 2026-04-19
