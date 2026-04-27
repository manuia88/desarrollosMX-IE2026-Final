'use client';

// FASE 14.F.2 Sprint 1 — Create project orchestrator.
// 3-step internal flow: tab cross-function/upload → property + style → smart order + create.
// Final create: trpc.studio.projects.create + generateDirectorBrief in one click.
// On success → router.push(`/${locale}/studio/projects/${id}`).

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import type { StudioStyleTemplateKey } from '@/features/dmx-studio/schemas';
import { trpc } from '@/shared/lib/trpc/client';
import { FadeUp } from '@/shared/ui/motion';
import { Button, Card } from '@/shared/ui/primitives/canon';
import { type CrossFunctionImportTab, CrossFunctionImportTabs } from './CrossFunctionImportTabs';
import { PhotoUploader, type PhotoUploaderItem } from './PhotoUploader';
import {
  PROPERTY_DATA_DEFAULTS,
  PropertyDataForm,
  type PropertyDataValues,
} from './PropertyDataForm';
import { SmartOrderSuggestion, type SmartOrderSuggestionAsset } from './SmartOrderSuggestion';
import { StyleTemplateSelector } from './StyleTemplateSelector';

export interface CreateProjectFlowProps {
  readonly locale: string;
}

type FlowStep = 'upload' | 'data' | 'review';

const FLOW_STEPS: readonly FlowStep[] = ['upload', 'data', 'review'];

export function CreateProjectFlow({ locale }: CreateProjectFlowProps) {
  const t = useTranslations('Studio.projects.new');
  const router = useRouter();

  const [step, setStep] = useState<FlowStep>('upload');
  const [activeTab, setActiveTab] = useState<CrossFunctionImportTab>('upload');
  const [photoItems, setPhotoItems] = useState<readonly PhotoUploaderItem[]>([]);
  const [propertyData, setPropertyData] = useState<PropertyDataValues>(PROPERTY_DATA_DEFAULTS);
  const [styleKey, setStyleKey] = useState<StudioStyleTemplateKey>('modern_cinematic');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'creating' | 'directing' | 'done'>('idle');

  const createProject = trpc.studio.projects.create.useMutation();
  const generateBrief = trpc.studio.projects.generateDirectorBrief.useMutation();

  const photoCount = photoItems.length;
  const titleValid = propertyData.title.trim().length >= 3;
  const photosReady =
    photoCount > 0 && photoItems.every((p) => p.status === 'ready' || p.status === 'failed');

  const canSubmit = titleValid && photosReady && phase === 'idle';

  const stepLabel = useCallback(
    (s: FlowStep) => {
      if (s === 'upload') return t('stepUploadLabel');
      if (s === 'data') return t('stepDataLabel');
      return t('stepReviewLabel');
    },
    [t],
  );

  const handleNext = useCallback(() => {
    setSubmitError(null);
    if (step === 'upload') {
      if (photoCount === 0) {
        setSubmitError(t('errorPhotoRequired'));
        return;
      }
      setStep('data');
      return;
    }
    if (step === 'data') {
      if (!titleValid) {
        setSubmitError(t('errorTitleRequired'));
        return;
      }
      setStep('review');
      return;
    }
  }, [photoCount, step, t, titleValid]);

  const handleBack = useCallback(() => {
    setSubmitError(null);
    if (step === 'data') setStep('upload');
    else if (step === 'review') setStep('data');
  }, [step]);

  const handleCreate = useCallback(async () => {
    if (!titleValid) {
      setSubmitError(t('errorTitleRequired'));
      return;
    }
    if (photoCount === 0) {
      setSubmitError(t('errorPhotoRequired'));
      return;
    }
    setSubmitError(null);
    setPhase('creating');
    try {
      const created = await createProject.mutateAsync({
        title: propertyData.title.trim(),
        projectType: 'standard',
        description: propertyData.description.trim() || undefined,
        styleTemplateKey: styleKey,
        proyectoId: propertyData.proyectoId ?? undefined,
        captacionId: propertyData.captacionId ?? undefined,
        propertyData: {
          ...(propertyData.price !== null ? { price: propertyData.price } : {}),
          currency: propertyData.currency,
          ...(propertyData.areaM2 !== null ? { areaM2: propertyData.areaM2 } : {}),
          ...(propertyData.bedrooms !== null ? { bedrooms: propertyData.bedrooms } : {}),
          ...(propertyData.bathrooms !== null ? { bathrooms: propertyData.bathrooms } : {}),
          ...(propertyData.parking !== null ? { parking: propertyData.parking } : {}),
          ...(propertyData.zone ? { zone: propertyData.zone } : {}),
          amenities: [...propertyData.amenities],
        },
      });

      setProjectId(created.id);
      setPhase('directing');
      await generateBrief.mutateAsync({ projectId: created.id });
      setPhase('done');
      router.push(`/${locale}/studio-app/projects/${created.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      setSubmitError(msg);
      setPhase('idle');
    }
  }, [
    createProject,
    generateBrief,
    locale,
    photoCount,
    propertyData,
    router,
    styleKey,
    t,
    titleValid,
  ]);

  const reviewAssets = useMemo<readonly SmartOrderSuggestionAsset[]>(
    () =>
      photoItems
        .filter((p) => p.assetId)
        .map((p) => ({
          id: p.assetId as string,
          orderIndex: p.orderIndex,
          fileName: p.file.name,
          previewUrl: p.previewUrl,
          spaceType: p.spaceType,
        })),
    [photoItems],
  );

  return (
    <FadeUp delay={0}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h1
            className="font-[var(--font-display)] text-3xl font-extrabold tracking-tight md:text-4xl"
            style={{ color: '#FFFFFF', margin: 0 }}
          >
            {t('title')}
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '15px',
              color: 'var(--canon-cream-2)',
              lineHeight: 1.55,
            }}
          >
            {t('subtitle')}
          </p>
        </header>

        <ol
          aria-label={t('title')}
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            gap: '12px',
          }}
        >
          {FLOW_STEPS.map((s, idx) => {
            const isCurrent = s === step;
            const isComplete = FLOW_STEPS.indexOf(step) > idx;
            return (
              <li
                key={s}
                aria-current={isCurrent ? 'step' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flex: 1,
                }}
              >
                <span
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: 'var(--canon-radius-pill)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background:
                      isComplete || isCurrent ? 'var(--gradient-ai)' : 'var(--surface-recessed)',
                    color: isComplete || isCurrent ? '#FFFFFF' : 'var(--canon-cream-2)',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: '1px solid var(--canon-border)',
                  }}
                >
                  {idx + 1}
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: isCurrent ? 'var(--canon-cream)' : 'var(--canon-cream-2)',
                  }}
                >
                  {stepLabel(s)}
                </span>
              </li>
            );
          })}
        </ol>

        {step === 'upload' && (
          <Card
            variant="elevated"
            style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            <CrossFunctionImportTabs
              activeTab={activeTab}
              onChange={setActiveTab}
              uploadContent={
                <PhotoUploader
                  projectId={projectId}
                  items={photoItems}
                  onChange={setPhotoItems}
                  disabled={phase !== 'idle'}
                />
              }
            />
          </Card>
        )}

        {step === 'data' && (
          <Card
            variant="elevated"
            style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            <PropertyDataForm
              value={propertyData}
              onChange={setPropertyData}
              disabled={phase !== 'idle'}
            />
            <StyleTemplateSelector value={styleKey} onChange={setStyleKey} />
          </Card>
        )}

        {step === 'review' && (
          <Card
            variant="elevated"
            style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            <SmartOrderSuggestion
              projectId={projectId}
              assets={reviewAssets}
              disabled={phase !== 'idle'}
            />
          </Card>
        )}

        {submitError && (
          <p
            role="alert"
            style={{
              margin: 0,
              padding: '12px 16px',
              background: 'rgba(244,63,94,0.10)',
              border: '1px solid rgba(244,63,94,0.30)',
              borderRadius: 'var(--canon-radius-card)',
              fontSize: '13.5px',
              color: '#FCA5A5',
            }}
            data-testid="create-project-error"
          >
            <strong style={{ display: 'block', marginBottom: '4px' }}>{t('errorTitle')}</strong>
            {submitError}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={handleBack}
            disabled={step === 'upload' || phase !== 'idle'}
          >
            {t('backButton')}
          </Button>

          {step !== 'review' ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleNext}
              disabled={phase !== 'idle'}
              data-testid="create-project-next"
            >
              {t('continueButton')}
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleCreate}
              disabled={!canSubmit}
              aria-busy={phase !== 'idle'}
              data-testid="create-project-submit"
            >
              {phase === 'creating' && t('creatingProject')}
              {phase === 'directing' && t('generatingDirector')}
              {(phase === 'idle' || phase === 'done') && t('createButton')}
            </Button>
          )}
        </div>
      </div>
    </FadeUp>
  );
}
