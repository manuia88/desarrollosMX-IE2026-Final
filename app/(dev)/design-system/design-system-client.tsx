'use client';

import { useState } from 'react';
import { AnimNum } from '@/shared/ui/dopamine/anim-num';
import { Card3D } from '@/shared/ui/dopamine/card-3d';
import { FloatingShapes } from '@/shared/ui/dopamine/floating-shapes';
import { LabelPill } from '@/shared/ui/dopamine/label-pill';
import { ParticleField } from '@/shared/ui/dopamine/particle-field';
import { ThemeToggle } from '@/shared/ui/layout/theme-toggle';
import { Badge, Chip, Tag } from '@/shared/ui/primitives/badge';
import { Button } from '@/shared/ui/primitives/button';
import { Card } from '@/shared/ui/primitives/card';
import { Combobox } from '@/shared/ui/primitives/combobox';
import { Dialog } from '@/shared/ui/primitives/dialog';
import { Dropdown } from '@/shared/ui/primitives/dropdown';
import { Input } from '@/shared/ui/primitives/input';
import { MultiSelect } from '@/shared/ui/primitives/multi-select';
import { NumberInput } from '@/shared/ui/primitives/number-input';
import { Popover } from '@/shared/ui/primitives/popover';
import { Select } from '@/shared/ui/primitives/select';
import { Sheet } from '@/shared/ui/primitives/sheet';
import { Textarea } from '@/shared/ui/primitives/textarea';
import { toast } from '@/shared/ui/primitives/toast';
import { SimpleTooltip } from '@/shared/ui/primitives/tooltip';

const OPTIONS = [
  { value: 'mx', label: 'México' },
  { value: 'co', label: 'Colombia' },
  { value: 'ar', label: 'Argentina' },
  { value: 'br', label: 'Brasil' },
];

export function DesignSystemClient() {
  const [multiValue, setMultiValue] = useState<string[]>(['mx', 'co']);
  const [comboValue, setComboValue] = useState<string>('mx');
  const [selectValue, setSelectValue] = useState<string>('mx');
  const [chipOn, setChipOn] = useState(false);
  const [number, setNumber] = useState<number | null>(1500000);
  const [tiltDemo, setTiltDemo] = useState(true);

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-base)]/80 px-8 py-4 backdrop-blur">
        <div>
          <h1 className="text-2xl font-bold">Design System · Dopamine</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Fase 04 · dev-only preview · toggle tema para validar contraste
          </p>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-[1100px] space-y-16 px-8 py-10">
        <Section title="1. Tokens — paleta">
          <PaletteSwatches />
        </Section>

        <Section title="1.1 Gradientes">
          <Gradients />
        </Section>

        <Section title="1.2 Tipografía">
          <Typography />
        </Section>

        <Section title="2. Button (7 variants × 3 sizes)">
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="tertiary">Tertiary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="success">Success</Button>
            <Button variant="shimmer">Shimmer ✨</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">SM</Button>
            <Button size="md">MD</Button>
            <Button size="lg">LG</Button>
            <Button isLoading>Loading</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        <Section title="3. Card (5 variants)">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {(['default', 'elevated', 'outlined', 'filled', 'glass'] as const).map((v) => (
              <Card key={v} variant={v}>
                <Card.Header>
                  <Card.Title>Variant: {v}</Card.Title>
                  <Card.Description>Descripción secundaria</Card.Description>
                </Card.Header>
                <Card.Body>Contenido del card.</Card.Body>
                <Card.Footer>
                  <Button size="sm" variant="ghost">
                    Acción
                  </Button>
                </Card.Footer>
              </Card>
            ))}
          </div>
        </Section>

        <Section title="4. Input · Textarea · NumberInput">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input label="Nombre" placeholder="Escribe tu nombre" />
            <Input label="Email" type="email" error="Email inválido" />
            <Input label="Con icono" leftIcon={<span>🔍</span>} placeholder="Buscar" />
            <Textarea label="Descripción" autoResize placeholder="Expand on type…" />
            <NumberInput
              label="Precio"
              currency="MXN"
              value={number}
              onChange={setNumber}
              helperText="Se formatea con Intl"
            />
          </div>
        </Section>

        <Section title="5. Select · Combobox · MultiSelect">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Select
              options={OPTIONS}
              value={selectValue}
              onChange={setSelectValue}
              aria-label="País"
            />
            <Combobox
              options={OPTIONS}
              value={comboValue}
              onChange={setComboValue}
              aria-label="País buscable"
            />
            <MultiSelect
              options={OPTIONS}
              value={multiValue}
              onChange={setMultiValue}
              aria-label="Países"
            />
          </div>
        </Section>

        <Section title="6. Badge · Tag · Chip">
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="danger">Danger</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="neutral">Neutral</Badge>
            <Badge variant="gradient">Gradient</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Tag>Solo texto</Tag>
            <Tag icon={<span>🏷</span>}>Con icono</Tag>
            <Tag onRemove={() => toast.info('Removido')}>Removible</Tag>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip isSelected={chipOn} onToggle={setChipOn}>
              Toggle me {chipOn ? '✓' : ''}
            </Chip>
            <Chip>Inactivo</Chip>
          </div>
        </Section>

        <Section title="7. Dialog · Sheet · Dropdown · Popover · Tooltip · Toast">
          <div className="flex flex-wrap gap-3">
            <Dialog.Root>
              <Dialog.Trigger asChild>
                <Button variant="secondary">Abrir Dialog</Button>
              </Dialog.Trigger>
              <Dialog.Content>
                <Dialog.Header>
                  <Dialog.Title>Dialog de ejemplo</Dialog.Title>
                  <Dialog.Description>Focus trap + escape to close.</Dialog.Description>
                </Dialog.Header>
                <p className="text-sm">Contenido del dialog.</p>
                <Dialog.Footer>
                  <Dialog.Close asChild>
                    <Button variant="ghost">Cancelar</Button>
                  </Dialog.Close>
                  <Dialog.Close asChild>
                    <Button>Confirmar</Button>
                  </Dialog.Close>
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog.Root>

            <Sheet.Root>
              <Sheet.Trigger asChild>
                <Button variant="secondary">Abrir Sheet</Button>
              </Sheet.Trigger>
              <Sheet.Content side="right">
                <Sheet.Title>Sheet lateral</Sheet.Title>
                <Sheet.Description>Desde la derecha.</Sheet.Description>
              </Sheet.Content>
            </Sheet.Root>

            <Dropdown.Root>
              <Dropdown.Trigger asChild>
                <Button variant="secondary">Dropdown</Button>
              </Dropdown.Trigger>
              <Dropdown.Content>
                <Dropdown.Item>Perfil</Dropdown.Item>
                <Dropdown.Item>Preferencias</Dropdown.Item>
                <Dropdown.Separator />
                <Dropdown.Item>Cerrar sesión</Dropdown.Item>
              </Dropdown.Content>
            </Dropdown.Root>

            <Popover.Root>
              <Popover.Trigger asChild>
                <Button variant="secondary">Popover</Button>
              </Popover.Trigger>
              <Popover.Content>
                <p className="text-sm">Contenido libre dentro del popover.</p>
              </Popover.Content>
            </Popover.Root>

            <SimpleTooltip content="Tooltip con delay 400ms">
              <Button variant="ghost">Hover me</Button>
            </SimpleTooltip>

            <Button
              onClick={() => toast.success('Guardado', { description: 'Los cambios se aplicaron' })}
            >
              Toast success
            </Button>
            <Button
              variant="danger"
              onClick={() => toast.error('Error', { description: 'Algo salió mal' })}
            >
              Toast error
            </Button>
          </div>
        </Section>

        <Section title="8. Dopamine — Card3D">
          <div className="flex items-center gap-3">
            <Chip isSelected={tiltDemo} onToggle={setTiltDemo}>
              Tilt habilitado
            </Chip>
            <p className="text-sm text-[var(--color-text-muted)]">
              Default es <code>tilt=false</code>. Activar solo en heroes/pricing — NO en módulos
              Dopamine M1-M10.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card3D tilt={tiltDemo}>
              <Card variant="elevated" className="p-6">
                <h3 className="mb-2 text-lg font-semibold">Con tilt {tiltDemo ? '✓' : '✗'}</h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Mueve el mouse encima — perspective 800, rotate ±12°.
                </p>
              </Card>
            </Card3D>
            <Card3D>
              <Card variant="elevated" className="p-6">
                <h3 className="mb-2 text-lg font-semibold">Sin tilt (default)</h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Este es el estado que usarán los módulos M1-M10.
                </p>
              </Card>
            </Card3D>
          </div>
        </Section>

        <Section title="9. Dopamine — AnimNum">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card variant="filled" className="p-6">
              <p className="text-xs text-[var(--color-text-muted)]">Contactos</p>
              <p className="text-3xl font-bold">
                <AnimNum value={1284} />
              </p>
            </Card>
            <Card variant="filled" className="p-6">
              <p className="text-xs text-[var(--color-text-muted)]">Comisión estimada</p>
              <p className="text-3xl font-bold">
                <AnimNum value={4820000} format="currency" currency="MXN" />
              </p>
            </Card>
            <Card variant="filled" className="p-6">
              <p className="text-xs text-[var(--color-text-muted)]">Conversión</p>
              <p className="text-3xl font-bold">
                <AnimNum value={27.8} format="percent" decimals={1} />
              </p>
            </Card>
          </div>
        </Section>

        <Section title="10. Dopamine — LabelPill">
          <div className="flex flex-wrap gap-2">
            <LabelPill tone="primary">AI Match 92%</LabelPill>
            <LabelPill tone="warm">Certificado SAT</LabelPill>
            <LabelPill tone="cool">Pre-venta</LabelPill>
            <LabelPill tone="fresh">Hot Zone</LabelPill>
            <LabelPill tone="sunset">Último día</LabelPill>
            <LabelPill tone="iridescent">Premium</LabelPill>
          </div>
        </Section>

        <Section title="11. Dopamine — FloatingShapes">
          <div className="relative h-64 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
            <FloatingShapes />
            <div className="relative z-10 flex h-full items-center justify-center">
              <p className="text-xl font-[var(--font-weight-semibold)]">
                Hero decorativo con blobs flotantes
              </p>
            </div>
          </div>
        </Section>

        <Section title="12. Dopamine — ParticleField">
          <div className="relative h-64 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
            <ParticleField />
            <div className="relative z-10 flex h-full items-center justify-center">
              <p className="text-xl font-[var(--font-weight-semibold)]">
                Canvas de partículas conectadas
              </p>
            </div>
          </div>
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

const PALETTE = [
  'color-brand-primary',
  'color-brand-secondary',
  'color-accent-warm',
  'color-success',
  'color-warning',
  'color-danger',
  'color-info',
  'color-surface-raised',
  'color-surface-sunken',
  'color-bg-lavender',
  'color-bg-mint',
  'color-bg-peach',
  'color-bg-rose',
  'color-text-primary',
  'color-text-secondary',
  'color-text-muted',
];

function PaletteSwatches() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
      {PALETTE.map((name) => (
        <div
          key={name}
          className="flex flex-col gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-2"
        >
          <div
            className="h-14 rounded-[var(--radius-sm)] border border-[var(--color-border-subtle)]"
            style={{ background: `var(--${name})` }}
          />
          <span className="truncate text-[10px] text-[var(--color-text-muted)]">{name}</span>
        </div>
      ))}
    </div>
  );
}

const GRADIENTS = [
  'gradient-p',
  'gradient-warm',
  'gradient-cool',
  'gradient-fresh',
  'gradient-sunset',
  'gradient-iridescent',
];

function Gradients() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {GRADIENTS.map((name) => (
        <div
          key={name}
          className="h-16 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] p-3 text-sm font-[var(--font-weight-semibold)] text-white shadow-[var(--shadow-sm)]"
          style={{ background: `var(--${name})` }}
        >
          {name}
        </div>
      ))}
    </div>
  );
}

function Typography() {
  return (
    <div className="space-y-1">
      <p
        className="text-5xl font-[var(--font-weight-bold)]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Display 5xl — Outfit bold
      </p>
      <p
        className="text-3xl font-[var(--font-weight-semibold)]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Heading 3xl — Outfit semibold
      </p>
      <p className="text-base" style={{ fontFamily: 'var(--font-body)' }}>
        Body base — DM Sans regular. Lorem ipsum dolor sit amet consectetur adipiscing elit.
      </p>
      <p
        className="text-sm text-[var(--color-text-secondary)]"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        Body small secondary — DM Sans 14px.
      </p>
      <p className="text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
        console.log('JetBrains Mono monospace');
      </p>
    </div>
  );
}
