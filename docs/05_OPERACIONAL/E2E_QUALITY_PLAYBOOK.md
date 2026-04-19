# E2E Quality Playbook — Cómo enforce "It just works"

> **Propósito:** Runbook operativo para cumplir ADR-018 (E2E Connectedness) en cada fase. Explica *cómo* se construye `audit-dead-ui.mjs`, *cómo* se escriben Playwright smoke tests, *cómo* se hace review manual pre-merge, *qué* anti-patterns evitar, y *cómo* marcar STUBs correctamente.
>
> **Audiencia:** Devs DMX, reviewers PR, founder auditando quality gates.
>
> **Status:** Living doc. Actualizar cuando patrones nuevos emerjan.
> **Última actualización:** 2026-04-18

---

## Sección 1 — Cómo escribir `audit-dead-ui.mjs`

### Stack del auditor

| Dependencia | Versión mínima | Propósito |
|-------------|----------------|-----------|
| Node | 24 | Runtime ESM nativo |
| `@typescript-eslint/parser` | 8+ | Parse TSX → AST |
| `@typescript-eslint/visitor-keys` | 8+ | Traversal AST |
| `fast-glob` | 3.3+ | File discovery rápido |
| `picocolors` | 1.1+ | Output CLI con colores |

Sin deps adicionales (no Babel, no ts-morph — overkill para nuestra superficie).

### Instalación

```bash
npm install --save-dev @typescript-eslint/parser @typescript-eslint/visitor-keys fast-glob picocolors
```

Se agrega al `package.json`:
```json
{
  "scripts": {
    "audit:e2e": "node scripts/audit-dead-ui.mjs",
    "audit:e2e:ci": "node scripts/audit-dead-ui.mjs --ci --json"
  }
}
```

### Skeleton del script

`scripts/audit-dead-ui.mjs`:

```js
#!/usr/bin/env node
// @ts-check
import { parse } from '@typescript-eslint/parser';
import { visitorKeys as tsVisitorKeys } from '@typescript-eslint/visitor-keys';
import fg from 'fast-glob';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pc from 'picocolors';

const ROOT = resolve(process.cwd());
const GLOB = ['features/**/*.tsx', 'app/**/*.tsx', '!**/node_modules/**', '!**/*.stories.tsx', '!**/*.test.tsx'];

const isCi = process.argv.includes('--ci');
const asJson = process.argv.includes('--json');

/** @typedef {{file:string,line:number,column:number,pattern:string,message:string,severity:'error'|'warn'}} Violation */

async function main() {
  const files = await fg(GLOB, { cwd: ROOT, absolute: true });
  /** @type {Violation[]} */
  const violations = [];

  for (const file of files) {
    const code = await readFile(file, 'utf-8');
    try {
      const ast = parse(code, {
        jsx: true,
        loc: true,
        range: true,
        ecmaVersion: 2024,
        sourceType: 'module',
      });
      walk(ast, file, code, violations);
    } catch (err) {
      violations.push({
        file, line: 0, column: 0, pattern: 'parse_error',
        message: `Failed to parse: ${err.message}`, severity: 'error',
      });
    }
  }

  output(violations);
  process.exit(violations.some((v) => v.severity === 'error') ? 1 : 0);
}

/**
 * @param {any} node AST node
 * @param {string} file
 * @param {string} code
 * @param {Violation[]} violations
 */
function walk(node, file, code, violations) {
  if (!node || typeof node !== 'object') return;
  checkNode(node, file, code, violations);
  const keys = tsVisitorKeys[node.type] ?? [];
  for (const key of keys) {
    const child = node[key];
    if (Array.isArray(child)) {
      child.forEach((c) => walk(c, file, code, violations));
    } else if (child && typeof child === 'object' && child.type) {
      walk(child, file, code, violations);
    }
  }
}

function checkNode(node, file, code, violations) {
  // Pattern 1: <Button> without onClick
  if (
    node.type === 'JSXOpeningElement' &&
    node.name.type === 'JSXIdentifier' &&
    ['Button', 'button', 'IconButton'].includes(node.name.name)
  ) {
    const attrs = node.attributes ?? [];
    const hasOnClick = attrs.some((a) => a.type === 'JSXAttribute' && a.name?.name === 'onClick');
    const isDisabled = attrs.some((a) => a.type === 'JSXAttribute' && a.name?.name === 'disabled');
    const isSubmit = attrs.some(
      (a) =>
        a.type === 'JSXAttribute' &&
        a.name?.name === 'type' &&
        a.value?.type === 'Literal' &&
        a.value.value === 'submit',
    );
    const hasHref = attrs.some((a) => a.type === 'JSXAttribute' && a.name?.name === 'href');
    if (!hasOnClick && !isDisabled && !isSubmit && !hasHref) {
      violations.push({
        file: relative(file),
        line: node.loc.start.line,
        column: node.loc.start.column,
        pattern: 'button_no_onclick',
        message: 'Button without onClick handler. Add handler, disabled, type="submit", or href prop.',
        severity: 'error',
      });
    }
  }

  // Pattern 2: empty onClick handler
  if (node.type === 'JSXAttribute' && node.name?.name === 'onClick' && node.value?.type === 'JSXExpressionContainer') {
    const expr = node.value.expression;
    if (isEmptyArrow(expr)) {
      violations.push({
        file: relative(file),
        line: node.loc.start.line,
        column: node.loc.start.column,
        pattern: 'empty_onclick',
        message: 'onClick handler is empty arrow () => {}. Wire to real mutation or remove button.',
        severity: 'error',
      });
    }
    if (isPlaceholderCall(expr)) {
      violations.push({
        file: relative(file),
        line: node.loc.start.line,
        column: node.loc.start.column,
        pattern: 'placeholder_onclick',
        message: 'onClick is alert() / console.log placeholder. Wire to real mutation.',
        severity: 'error',
      });
    }
  }

  // Pattern 3: <form> without onSubmit
  if (node.type === 'JSXOpeningElement' && node.name.type === 'JSXIdentifier' && node.name.name === 'form') {
    const attrs = node.attributes ?? [];
    const hasOnSubmit = attrs.some((a) => a.type === 'JSXAttribute' && a.name?.name === 'onSubmit');
    if (!hasOnSubmit) {
      violations.push({
        file: relative(file),
        line: node.loc.start.line,
        column: node.loc.start.column,
        pattern: 'form_no_onsubmit',
        message: '<form> without onSubmit. Use react-hook-form handleSubmit or equivalent.',
        severity: 'error',
      });
    }
  }

  // Pattern 4: Link/anchor with href="#" or href=""
  if (
    node.type === 'JSXAttribute' &&
    node.name?.name === 'href' &&
    node.value?.type === 'Literal' &&
    (node.value.value === '#' || node.value.value === '')
  ) {
    violations.push({
      file: relative(file),
      line: node.loc.start.line,
      column: node.loc.start.column,
      pattern: 'dead_href',
      message: `Dead link href="${node.value.value}". Use valid route or <button>.`,
      severity: 'error',
    });
  }

  // Pattern 5: useEffect without deps array
  if (
    node.type === 'CallExpression' &&
    node.callee?.type === 'Identifier' &&
    node.callee.name === 'useEffect' &&
    node.arguments?.length === 1
  ) {
    violations.push({
      file: relative(file),
      line: node.loc.start.line,
      column: node.loc.start.column,
      pattern: 'useeffect_no_deps',
      message: 'useEffect without dependency array — runs every render.',
      severity: 'warn',
    });
  }
}

function isEmptyArrow(expr) {
  if (!expr) return false;
  if (expr.type === 'ArrowFunctionExpression') {
    const body = expr.body;
    if (body.type === 'BlockStatement' && body.body.length === 0) return true;
    if (body.type === 'Identifier' && body.name === 'undefined') return true;
  }
  if (expr.type === 'Identifier' && expr.name === 'noop') return true;
  return false;
}

function isPlaceholderCall(expr) {
  if (!expr || expr.type !== 'ArrowFunctionExpression') return false;
  const body = expr.body.type === 'BlockStatement' ? expr.body.body[0]?.expression : expr.body;
  if (!body || body.type !== 'CallExpression') return false;
  const callee = body.callee;
  if (callee?.type === 'Identifier' && callee.name === 'alert') return true;
  if (callee?.type === 'MemberExpression' && callee.object?.name === 'console') return true;
  return false;
}

function relative(abs) {
  return abs.replace(ROOT + '/', '');
}

function output(violations) {
  if (asJson) {
    console.log(JSON.stringify(violations, null, 2));
    return;
  }
  if (!violations.length) {
    console.log(pc.green('✓ audit-dead-ui: 0 violations'));
    return;
  }
  for (const v of violations) {
    const sev = v.severity === 'error' ? pc.red('error') : pc.yellow('warn');
    console.log(`${sev} ${pc.cyan(v.file)}:${v.line}:${v.column} — ${v.pattern} — ${v.message}`);
  }
  console.log(pc.red(`\n${violations.length} violation(s) detected.`));
}

await main();
```

### Integración CI

`.github/workflows/e2e-audit.yml`:

```yaml
name: E2E Audit (ADR-018)

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  audit:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - name: Audit dead UI
        run: npm run audit:e2e:ci > audit-report.json
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: audit-report
          path: audit-report.json
      - if: failure()
        run: |
          echo "::error::E2E Audit failed. Check audit-report.json artifact."
          exit 1
```

Configurado como **required status check** en branch protection rules de `main`.

---

## Sección 2 — Playwright smoke tests por fase

### Configuración base

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 8'] } },
  ],
});
```

### Helpers compartidos

`tests/e2e/helpers/auth.ts`:

```ts
import { Page, expect } from '@playwright/test';

export async function loginAs(page: Page, email: string, password = 'Test123456!'): Promise<void> {
  await page.goto('/auth/login');
  await page.fill('[name=email]', email);
  await page.fill('[name=password]', password);
  await page.click('button[type=submit]');
  await expect(page).toHaveURL(/\/(crm|portal|comprador|admin)/);
}

export async function logout(page: Page): Promise<void> {
  await page.click('[aria-label="Menu usuario"]');
  await page.click('text=Cerrar sesión');
  await expect(page).toHaveURL('/auth/login');
}
```

`tests/e2e/helpers/seed.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function seedTestUser(email: string, rol = 'asesor'): Promise<string> {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: 'Test123456!',
    email_confirm: true,
    user_metadata: { rol, country_code: 'MX' },
  });
  if (error) throw error;
  return data.user.id;
}

export async function cleanupTestData(emailPrefix: string): Promise<void> {
  await supabase.rpc('cleanup_test_data', { prefix: emailPrefix });
}
```

`tests/e2e/helpers/factories.ts`:

```ts
export const contactoFactory = (overrides: Partial<Contacto> = {}): Contacto => ({
  first_name: 'Test',
  last_name: 'Contact',
  phones: [{ number: '5555551234', label: 'mobile' }],
  emails: [{ address: 'test@example.com', label: 'personal' }],
  tipo: 'comprador',
  temperatura: 'tibio',
  tags: [],
  ...overrides,
});

// ... más factories (busquedaFactory, operacionFactory, etc.)
```

### Smoke test golden path — FASE 13 Portal Asesor

`tests/e2e/fase-13-asesor-m1-m5.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('FASE 13 — Portal Asesor M1-M5', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'asesor-test@dmx.local');
  });

  test('Command Center renders KPIs + acción rápida flow', async ({ page }) => {
    await page.goto('/crm');
    // M01 Command Center — 11 KPIs visible
    await expect(page.locator('[data-testid="kpi-card"]')).toHaveCount(11);
    // Quick action: crear tarea
    await page.click('text=Nueva tarea');
    await expect(page.locator('[role=dialog]')).toBeVisible();
    await page.fill('[name=title]', 'Llamar a Juan Pérez');
    await page.selectOption('[name=priority]', 'high');
    await page.fill('[name=due_at]', '2026-04-25T10:00');
    await page.click('button:has-text("Crear")');
    await expect(page.locator('text=Tarea creada')).toBeVisible(); // toast
    await expect(page.locator('text=Llamar a Juan Pérez')).toBeVisible();
  });

  test('Registrar llamada actualiza timeline + audit_log', async ({ page, request }) => {
    await page.goto('/crm/contactos');
    await page.click('text=Contacto Test'); // seed row
    await page.click('[aria-label="Registrar llamada rápida"]');
    await page.selectOption('[name=feedback]', 'caliente');
    await page.fill('[name=notas]', 'Cliente listo para cerrar');
    await page.click('button:has-text("Guardar llamada")');
    await expect(page.locator('text=Llamada registrada')).toBeVisible();
    // Timeline updated
    await expect(page.locator('[data-testid="timeline-entry"]').first()).toContainText('Llamada');
    // Verify audit_log via API
    const response = await request.get('/api/test/audit-log-latest');
    const audit = await response.json();
    expect(audit.action).toBe('contactos.call_logged');
  });

  test('Crear operación wizard — 6 pasos + cascadas', async ({ page }) => {
    await page.goto('/crm/operaciones/nueva');
    // Step 1
    await page.selectOption('[name=tipo]', 'venta');
    await page.click('button:has-text("Siguiente")');
    // ...steps 2-5
    // Step 6
    await page.check('[name=declaracion_jurada]');
    await page.click('button:has-text("Finalizar operación")');
    await expect(page.locator('text=Operación creada')).toBeVisible();
    // Verify redirect to detail
    await expect(page).toHaveURL(/\/crm\/operaciones\/[a-z0-9-]+/);
    // Verify comisiones auto-created
    await expect(page.locator('[data-testid="comision-row"]')).toHaveCount(2); // asesor + mb
  });
});
```

### Smoke test — FASE 20 Comprador

`tests/e2e/fase-20-comprador.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('FASE 20 — Portal Comprador', () => {
  test('Signup → Lifestyle DNA → Matches → Wishlist → Share', async ({ page }) => {
    // Signup
    await page.goto('/auth/signup');
    await page.fill('[name=email]', `comprador-${Date.now()}@test.local`);
    await page.fill('[name=password]', 'Test123456!');
    await page.fill('[name=first_name]', 'Test');
    await page.fill('[name=last_name]', 'Buyer');
    await page.selectOption('[name=country_code]', 'MX');
    await page.check('[name=accept_terms]');
    await page.click('button[type=submit]');

    // Lifestyle DNA quiz (6 pasos)
    await expect(page.locator('text=Lifestyle DNA')).toBeVisible();
    for (let i = 0; i < 6; i++) {
      await page.click('[data-testid="quiz-answer"]:nth-child(1)');
      await page.click('button:has-text("Siguiente")');
    }
    await expect(page.locator('text=Tu perfil:')).toBeVisible();

    // Matches render
    await page.goto('/comprador/matches');
    await expect(page.locator('[data-testid="match-card"]')).toHaveCount(10);

    // Click property
    await page.click('[data-testid="match-card"]:first-child');
    await expect(page).toHaveURL(/\/comprador\/propiedad\/[a-z0-9-]+/);

    // Save to wishlist
    await page.click('[aria-label="Guardar en wishlist"]');
    await expect(page.locator('text=Agregado a wishlist')).toBeVisible();

    // Share with partner
    await page.click('text=Compartir con pareja');
    await page.fill('[name=partner_email]', 'partner@test.local');
    await page.click('button:has-text("Compartir")');
    await expect(page.locator('text=Enlace enviado')).toBeVisible();
  });
});
```

### CI workflow

`.github/workflows/e2e-playwright.yml`:

```yaml
name: E2E Playwright

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  playwright:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    services:
      postgres:
        image: supabase/postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps ${{ matrix.browser }}
      - name: Seed DB
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL_TEST }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SRK_TEST }}
        run: npm run db:seed:test
      - name: Build app
        run: npm run build
      - name: Start app
        run: npm run start &
        env:
          PORT: 3000
      - name: Wait for app ready
        run: npx wait-on http://localhost:3000
      - name: Run Playwright
        run: npx playwright test --project=${{ matrix.browser }}
        env:
          PLAYWRIGHT_BASE_URL: http://localhost:3000
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-${{ matrix.browser }}
          path: playwright-report/
```

### Per-fase naming convention

```
tests/e2e/
├── helpers/
│   ├── auth.ts
│   ├── seed.ts
│   └── factories.ts
├── fase-02-auth.spec.ts
├── fase-07-ingesta.spec.ts
├── fase-13-asesor-m1-m5.spec.ts
├── fase-14-asesor-m6-m10.spec.ts
├── fase-15-developer.spec.ts
├── fase-16-contabilidad.spec.ts
├── fase-19-admin.spec.ts
├── fase-20-comprador.spec.ts
├── fase-23-api-externa.spec.ts
├── fase-31-agents.spec.ts (stub — FASE 31)
├── fase-32-twin.spec.ts (stub)
├── fase-36-investing.spec.ts (stub)
└── ...
```

Comando por fase:
```bash
npm run test:e2e:phase 13     # corre solo fase-13-*.spec.ts
npm run test:e2e:all          # corre todo
```

---

## Sección 3 — Manual review checklist pre-merge

### PR template

Guardar en `.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## Descripción

<!-- Breve descripción del cambio. Link a issue si aplica. -->

## Tipo de cambio

- [ ] feat (nueva feature)
- [ ] fix (bug fix)
- [ ] docs (solo docs)
- [ ] refactor (no cambia behavior)
- [ ] test (tests only)
- [ ] chore (infra / build / deps)

## E2E Verification (ADR-018)

- [ ] `npm run audit:e2e` pasa (0 violations)
- [ ] Playwright smoke de la(s) fase(s) afectada(s) pasa
- [ ] `03.13_E2E_CONNECTIONS_MAP` actualizado con filas nuevas/modificadas
- [ ] Every new button tiene `onClick` con real procedure (o disabled + STUB markers)
- [ ] Every new form tiene `onSubmit` + Zod validation resolver
- [ ] Permission checks validados manualmente para cada rol tocado (asesor/dev/comprador/admin/superadmin)
- [ ] Notification firing verificado para side effects
- [ ] Audit log entry verificado para sensitive mutations
- [ ] Loading / error / empty states implementados y visualmente verificados
- [ ] Mobile responsive (Chrome DevTools 375×667 min)
- [ ] Accessibility: keyboard nav funciona + axe-core report limpio
- [ ] PostHog event firing verificado (si se añaden acciones trackeables)
- [ ] Sentry error capture verificado (intentional crash test durante desarrollo)

## Multi-country impact

- [ ] `formatCurrency`, `formatDate`, `formatAddress`, `formatPhone` usados correctamente (no hardcoded)
- [ ] Strings en i18n `messages/<locale>.json` (sin hardcode)
- [ ] RLS policies testeadas con usuarios de distinto `country_code`

## Database

- [ ] Migration incluida si hay cambios schema
- [ ] RLS policy incluida en misma migration (ADR-018 regla 3)
- [ ] `npm run db:types` regenerado + committed
- [ ] Cascadas/triggers documentados en `03.3_CATALOGO_BD_TRIGGERS.md`

## STUBs (si aplica)

- [ ] Marcados con `// STUB — activar FASE XX con [dep]`
- [ ] Badge visible al user (`[próximamente]` / `[beta]` / etc.)
- [ ] Documentados en §5.B de la fase actual
- [ ] Endpoints devuelven 501 NOT_IMPLEMENTED (no 200 fake)

## Screenshots / videos

<!-- Antes / después si es UI. GIF flow si es nuevo. -->

## Checklist del reviewer

- [ ] Código legible y consistente con el estilo del repo
- [ ] Sin `any`, sin `@ts-ignore`, sin `console.log` olvidados
- [ ] Tests añadidos / actualizados donde corresponde
- [ ] Docs actualizados
- [ ] Sign-off manual: yo @_____ ejecuté el smoke flow localmente y funcionó
```

### Review ritual

1. **Author**: marca todos los items del checklist antes de pedir review.
2. **Reviewer**: ejecuta `npm run audit:e2e && npm run test:e2e:phase NN` en su máquina.
3. **Reviewer**: abre preview deploy Vercel, hace smoke manual del flow principal.
4. **Reviewer**: verifica 1-2 side effects (notif llega al destinatario; audit_log emit).
5. **Reviewer**: firma con "LGTM + E2E validated" en comentario.

Sin sign-off manual → PR no mergea.

---

## Sección 4 — Anti-patterns comunes (cosas que NO hacer)

### ❌ `onClick={() => {}}` — dead handler

**Mal:**
```tsx
<Button onClick={() => {}}>Agendar visita</Button>
```
El botón se ve activo, el user lo clickea, nada pasa. Churn guaranteed.

**Bien:**
```tsx
const { mutate: scheduleVisit } = api.visitas.schedule.useMutation();
<Button onClick={() => scheduleVisit({ contacto_id, project_id })}>Agendar visita</Button>
```

### ❌ `<button>Algo</button>` sin handler — impossibru

**Mal:**
```tsx
<button>Próximamente</button>
```
Parece activo, no responde.

**Bien:**
```tsx
<Button disabled aria-label="Próximamente en FASE 31">
  Próximamente <Badge variant="soon">FASE 31</Badge>
</Button>
```

### ❌ tRPC stub que retorna datos hardcoded

**Mal:**
```ts
export const agents = router({
  list: authenticatedProcedure.query(() => {
    return [{ id: 'fake-1', name: 'Test Agent' }]; // ← fake data, confunde consumers
  }),
});
```

**Bien:**
```ts
// STUB — activar FASE 31 con [dep: LangGraph + Agent templates]
export const agents = router({
  list: authenticatedProcedure.query(() => {
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message: 'agents.list disponible en FASE 31. Ver ADR-014.',
    });
  }),
});
```

### ❌ Form sin resolver Zod

**Mal:**
```tsx
const form = useForm<ContactoInput>();
<form onSubmit={form.handleSubmit((data) => createContacto(data))}>
```
No hay validación → backend falla con error cryptic.

**Bien:**
```tsx
const form = useForm<ContactoInput>({ resolver: zodResolver(contactoCreateInput) });
<form onSubmit={form.handleSubmit((data) => createContacto(data))}>
```

### ❌ `useQuery` sin error boundary

**Mal:**
```tsx
export function ContactList() {
  const { data } = api.contactos.list.useQuery({});
  return <div>{data?.items.map(...)}</div>;
}
```
Si `api` throws, la página entera crashea silenciosamente.

**Bien:**
```tsx
export function ContactList() {
  const { data, error, isLoading } = api.contactos.list.useQuery({});
  if (isLoading) return <ContactListSkeleton />;
  if (error) return <ErrorState error={error} retry={() => refetch()} />;
  if (!data?.items.length) return <EmptyState action={<CreateContactoBtn />} />;
  return <div>{data.items.map(...)}</div>;
}
```
+ Componente padre envuelto en `<ErrorBoundary>`.

### ❌ Delete sin confirm modal

**Mal:**
```tsx
<Button onClick={() => deleteContacto(id)}>Borrar</Button>
```
Click accidental → data loss.

**Bien:**
```tsx
<Button onClick={() => setConfirmOpen(true)}>Borrar</Button>
<ConfirmModal
  open={confirmOpen}
  title="¿Borrar contacto?"
  description="Esta acción se puede deshacer durante 30 días."
  onConfirm={() => { deleteContacto(id); setConfirmOpen(false); }}
  confirmLabel="Sí, borrar"
  destructive
/>
```

### ❌ Hardcoded strings user-facing

**Mal:**
```tsx
<p>Crear nuevo contacto</p>
```

**Bien:**
```tsx
const t = useTranslations('contactos');
<p>{t('create.title')}</p>
```
Y en `messages/es-MX.json`: `"contactos.create.title": "Crear nuevo contacto"`.

### ❌ Botón "Próximamente" sin disable

**Mal:**
```tsx
<Button>Próximamente</Button>
```
Se ve activo, user lo clickea, nada pasa → misleading UX.

**Bien:**
```tsx
<Button disabled aria-label="Esta función llega en FASE 31">
  Agentes IA <Badge>próximamente</Badge>
</Button>
```

### ❌ `catch {}` silencioso

**Mal:**
```ts
try {
  await doSomething();
} catch {
  // noop
}
```
Error desaparece → imposible debuggear.

**Bien:**
```ts
try {
  await doSomething();
} catch (err) {
  Sentry.captureException(err, { tags: { scope: 'contactos.create' } });
  toast.error(t('errors.generic'));
  throw err; // re-throw si caller debe manejarlo
}
```

### ❌ `href="#"` links

**Mal:**
```tsx
<a href="#">Ver más</a>
```

**Bien:**
```tsx
<Link href="/crm/contactos">Ver más</Link>
// o si es acción JS:
<Button variant="link" onClick={handleShowMore}>Ver más</Button>
```

### ❌ Hooks suscritos a mock data en production path

**Mal:**
```tsx
const MOCK_CONTACTOS = [{ id: '1', name: 'Mock' }];
export function useContactos() {
  return useState(MOCK_CONTACTOS);
}
```

**Bien:**
```tsx
export function useContactos(filters: ContactosFilter) {
  return api.contactos.list.useQuery(filters);
}
```

---

## Sección 5 — Cómo marcar correctamente un STUB

Ver ADR-018 §"Qué está permitido (STUBs *marcados*)". Resumen operativo con ejemplos concretos:

### Las 4 señales simultáneas

**Señal 1 — Comentario en código**

```ts
// STUB — activar en FASE 31 (Agentic Marketplace)
// Depende de: LangGraph + Agent templates + feature flag `agents_run`.
// Endpoint devuelve 501 intencional hasta FASE 31 kickoff.
// Tracking: ADR-014 §Impact on FASE 31.
export const agents = router({
  run: authenticatedProcedure
    .input(agentRunInput)
    .mutation(() => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'agents.run disponible en FASE 31 (H2). Ver ADR-014.',
      });
    }),
});
```

**Señal 2 — UI badge visible al user**

```tsx
import { Badge } from '@/shared/ui/Badge';
import { useTranslations } from 'next-intl';

export function AgentRunButton({ agentId }: { agentId: string }) {
  const t = useTranslations('agents');
  return (
    <Button
      disabled
      aria-label={t('run.coming_soon_label')}
      title={t('run.coming_soon_tooltip')}
    >
      {t('run.label')}
      <Badge variant="soon">{t('badges.coming_soon_fase_31')}</Badge>
    </Button>
  );
}
```

En `messages/es-MX.json`:
```json
{
  "agents": {
    "run": {
      "label": "Ejecutar agente",
      "coming_soon_label": "Disponible en FASE 31",
      "coming_soon_tooltip": "Los agentes IA llegan con el Marketplace en FASE 31 (H2)."
    },
    "badges": {
      "coming_soon_fase_31": "próximamente"
    }
  }
}
```

**Señal 3 — Documentado en §5.B**

En el `FASE_NN.md` actual (donde se introduce el stub), sección `## 5.B — Inferencias y stubs permitidos`:

```markdown
## 5.B — Inferencias y stubs permitidos

Durante esta fase se introducen los siguientes STUBs marcados para futuras fases:

### agents.* (router FASE 31)
- **Procedures stub:** `run`, `create`, `list`, `delete`, `schedule`, `publishToMarketplace`, `install`, `observability`.
- **Estado:** Definidos en `server/trpc/routers/agents.ts` con 501 NOT_IMPLEMENTED.
- **Dependencias para activación:** LangGraph + Agent templates + feature flag `agents_run` + infra Vercel WDK.
- **Fase de activación:** FASE 31 (H2).
- **ADR de referencia:** ADR-014 Agentic Marketplace.

### investing.* (router FASE 36)
- **Procedures stub:** `buyFraction`, `sellFraction`, `getPortfolio`, ...
- **Dependencias:** CNBV license + SPV legal structure + KYC provider contract.
- **Fase:** FASE 36 (H3).
- **ADR:** ADR-020 Fractional SPV (TBD H3).
```

**Señal 4 — Endpoint devuelve 501**

No 200 con fake payload:

```ts
// ❌ PROHIBIDO
.query(() => {
  return { agents: [], total: 0 }; // parece funcionar, confunde clientes
})

// ✓ OBLIGATORIO
.query(() => {
  throw new TRPCError({
    code: 'NOT_IMPLEMENTED',
    message: 'agents.list disponible en FASE 31.',
  });
})
```

### Si falta cualquiera de las 4 → audit-dead-ui falla

El auditor AST pre-merge detecta:
- `throw new Error(...)` sin comentario `// STUB` → error.
- Procedure con `return {...}` sin cambios en appRouter → warning (posible stub oculto).
- UI con `onClick={real_function}` y backend procedure que retorna hardcoded → runtime check en Playwright test suite.

La combinación de detectores hace que stubs ocultos sean muy difíciles de mergear.

### Template de "Inferencia no bloqueante" en §5.B

```markdown
## 5.B — Inferencias y stubs permitidos

### Inferencias documentales no bloqueantes
<!-- Decisiones que tomé sin consultar founder pero documentadas aquí. -->
1. [inferencia]: por [razón]. Impacto: [N fases].

### STUBs marcados (las 4 señales cumplidas)
| ID | Procedure/UI | Fase activación | Dependencia | ADR |
|---|---|---|---|---|
| S-FASE-31-01 | `agents.run` | FASE 31 | LangGraph | ADR-014 |
| S-FASE-31-02 | `agents.create` UI modal | FASE 31 | Template library | ADR-014 |
| S-FASE-36-01 | `investing.buyFraction` | FASE 36 | CNBV license | ADR-020 (TBD) |

Total STUBs introducidos esta fase: N.
Total STUBs en el repo después de esta fase: M (ver `npm run audit:stubs-count`).
```

---

## Checklists consolidados

### Checklist al iniciar una fase (§5.A)

- [ ] Lee `FASE_NN.md` completo, incluye sección `## E2E VERIFICATION CHECKLIST`.
- [ ] Identifica UI elements nuevos que se añadirán a `03.13 E2E Map`.
- [ ] Revisa STUBs existentes marcados para activación en esta fase.
- [ ] Verifica que el test harness esté limpio (`npm run test:e2e` pasa vs baseline).

### Checklist al cerrar un módulo

- [ ] `npm run audit:e2e` pasa.
- [ ] Nuevas rows añadidas a `03.13 E2E Map`.
- [ ] Smoke test del módulo pasa localmente.
- [ ] Commit con convención `fase-NN/modulo-X: ...`.

### Checklist al cerrar la fase (§5.B)

- [ ] `audit-dead-ui` 0 violations.
- [ ] Playwright smoke full fase pasa en CI.
- [ ] `03.13` actualizado con TODAS las UI nuevas.
- [ ] `§5.B` Inferencias documentadas.
- [ ] Tag `fase-NN-complete` aplicado.

---

## Cross-references

- [ADR-018 — E2E Connectedness](../01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md)
- [03.13 — E2E Connections Map](../03_CATALOGOS/03.13_E2E_CONNECTIONS_MAP.md)
- [CONTRATO_EJECUCION §6.bis](./CONTRATO_EJECUCION.md)
- [ADR-006 — Testing Strategy](../01_DECISIONES_ARQUITECTONICAS/ADR-006_TESTING_STRATEGY.md)
- Playwright docs — https://playwright.dev
- ts-morph / `@typescript-eslint/parser` docs — https://typescript-eslint.io

---

**Autor:** Claude Opus 4.7 (biblia v2 moonshot) | **Fecha:** 2026-04-18
