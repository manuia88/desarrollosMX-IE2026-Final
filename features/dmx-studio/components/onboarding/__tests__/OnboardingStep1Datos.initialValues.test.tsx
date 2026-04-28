// FASE 14.F.12 — OnboardingStep1Datos initialValues + auto-import banner contract.
// Pattern: Modo A static markup via react-dom/server.node + useForm spy capture
// (mirrors brand-kit-ui.test.tsx). Mocks: trpc client (completeStep1) + next-intl
// + react-hook-form (para validar defaultValues recibidos).

import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
}));

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    studio: {
      onboarding: {
        completeStep1: {
          useMutation: () => ({
            mutate: vi.fn(),
            mutateAsync: vi.fn(),
            isPending: false,
          }),
        },
      },
    },
  },
}));

const useFormSpy = vi.fn();

vi.mock('react-hook-form', async () => {
  const actual = await vi.importActual<typeof import('react-hook-form')>('react-hook-form');
  return {
    ...actual,
    useForm: (config?: Record<string, unknown>) => {
      useFormSpy(config);
      return actual.useForm(config);
    },
  };
});

import { OnboardingStep1Datos } from '../OnboardingStep1Datos';

interface ReactDomServerNode {
  readonly renderToStaticMarkup: (element: ReactElement) => string;
}

function render(element: ReactElement): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-dom/server.node') as ReactDomServerNode;
  return mod.renderToStaticMarkup(element);
}

beforeEach(() => {
  useFormSpy.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('OnboardingStep1Datos — initialValues prop hidrata useForm defaults', () => {
  it('pasa initialValues a useForm.defaultValues cuando viene completo', () => {
    render(
      <OnboardingStep1Datos
        onDone={vi.fn()}
        initialValues={{
          name: 'Manuel Acosta',
          phone: '+525555555555',
          city: 'CDMX',
          zonesText: 'Polanco, Roma Norte',
        }}
      />,
    );
    expect(useFormSpy).toHaveBeenCalled();
    const config = useFormSpy.mock.calls[0]?.[0] as { defaultValues?: Record<string, string> };
    expect(config?.defaultValues).toEqual({
      name: 'Manuel Acosta',
      phone: '+525555555555',
      city: 'CDMX',
      zonesText: 'Polanco, Roma Norte',
    });
  });

  it('pasa empty strings a useForm.defaultValues cuando initialValues undefined (regression preserved)', () => {
    render(<OnboardingStep1Datos onDone={vi.fn()} />);
    expect(useFormSpy).toHaveBeenCalled();
    const config = useFormSpy.mock.calls[0]?.[0] as { defaultValues?: Record<string, string> };
    expect(config?.defaultValues).toEqual({
      name: '',
      phone: '',
      city: '',
      zonesText: '',
    });
  });

  it('mezcla initialValues parcial con empty strings en useForm.defaultValues', () => {
    render(
      <OnboardingStep1Datos onDone={vi.fn()} initialValues={{ name: 'Manuel', city: 'CDMX' }} />,
    );
    const config = useFormSpy.mock.calls[0]?.[0] as { defaultValues?: Record<string, string> };
    expect(config?.defaultValues).toEqual({
      name: 'Manuel',
      phone: '',
      city: 'CDMX',
      zonesText: '',
    });
  });
});

describe('OnboardingStep1Datos — auto-import banner visibility', () => {
  it('muestra banner cuando al menos un campo de initialValues es truthy', () => {
    const html = render(
      <OnboardingStep1Datos onDone={vi.fn()} initialValues={{ name: 'Manuel' }} />,
    );
    expect(html).toContain('data-testid="auto-import-banner"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('autoImportBanner');
  });

  it('NO muestra banner cuando initialValues undefined', () => {
    const html = render(<OnboardingStep1Datos onDone={vi.fn()} />);
    expect(html).not.toContain('data-testid="auto-import-banner"');
  });

  it('NO muestra banner cuando initialValues all empty/whitespace', () => {
    const html = render(
      <OnboardingStep1Datos
        onDone={vi.fn()}
        initialValues={{ name: '   ', phone: '', city: '', zonesText: '' }}
      />,
    );
    expect(html).not.toContain('data-testid="auto-import-banner"');
  });

  it('muestra banner cuando solo zonesText viene truthy', () => {
    const html = render(
      <OnboardingStep1Datos onDone={vi.fn()} initialValues={{ zonesText: 'Polanco' }} />,
    );
    expect(html).toContain('data-testid="auto-import-banner"');
  });
});
