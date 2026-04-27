'use client';

// FASE 14.F.3 Sprint 2 — Brand Kit form (Tarea 2.1 BIBLIA).
// react-hook-form + Zod (upsertStudioBrandKitInput). tRPC studio.brandKit.{get, upsert,
// uploadLogo, setLogoUrl}. ADR-050 canon: pill buttons, brand gradient firma, motion ≤ 850ms,
// transforms hover SOLO translateY, prefers-reduced-motion respect (vía tokens.css).

import { useTranslations } from 'next-intl';
import { type CSSProperties, useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  Controller,
  type SubmitHandler,
  type UseFormRegisterReturn,
  useForm,
} from 'react-hook-form';
import {
  STUDIO_BRAND_FONTS,
  type StudioBrandFont,
  type UpsertStudioBrandKitInput,
  upsertStudioBrandKitInput,
} from '@/features/dmx-studio/schemas';
import { trpc } from '@/shared/lib/trpc/client';
import { Button } from '@/shared/ui/primitives/canon';
import { toast } from '@/shared/ui/primitives/toast';
import { BrandKitDeleteLogoButton } from './BrandKitDeleteLogoButton';

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

const TONE_KEYS = [
  'professional',
  'luxury',
  'friendly',
  'energetic',
  'minimal',
  'editorial',
] as const;
type ToneKey = (typeof TONE_KEYS)[number];

const FONT_LABEL_KEY: Record<StudioBrandFont, string> = {
  outfit: 'fontOutfit',
  dm_sans: 'fontDmSans',
  inter: 'fontInter',
  playfair: 'fontPlayfair',
};

const TONE_LABEL_KEY: Record<ToneKey, string> = {
  professional: 'toneProfessional',
  luxury: 'toneLuxury',
  friendly: 'toneFriendly',
  energetic: 'toneEnergetic',
  minimal: 'toneMinimal',
  editorial: 'toneEditorial',
};

interface FormValues {
  readonly displayName: string;
  readonly tagline: string;
  readonly primaryColor: string;
  readonly secondaryColor: string;
  readonly accentColor: string;
  readonly fontPreference: StudioBrandFont;
  readonly tone: ToneKey;
  readonly zonesText: string;
  readonly citiesText: string;
  readonly contactPhone: string;
  readonly contactEmail: string;
  readonly introText: string;
  readonly outroText: string;
}

const DEFAULT_VALUES: FormValues = {
  displayName: '',
  tagline: '',
  primaryColor: '',
  secondaryColor: '',
  accentColor: '',
  fontPreference: 'outfit',
  tone: 'professional',
  zonesText: '',
  citiesText: '',
  contactPhone: '',
  contactEmail: '',
  introText: '',
  outroText: '',
};

const MAX_LOGO_BYTES = 2_000_000;
const ACCEPTED_LOGO_MIME = ['image/svg+xml', 'image/png', 'image/webp', 'image/jpeg'] as const;
type AcceptedLogoMime = (typeof ACCEPTED_LOGO_MIME)[number];

function isAcceptedMime(value: string): value is AcceptedLogoMime {
  return (ACCEPTED_LOGO_MIME as ReadonlyArray<string>).includes(value);
}

function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// Returns true when value is empty or matches HEX_REGEX. Returns false otherwise; the form
// surfaces a localized message via `errors.<field>?.type === 'validate'`.
function isHexOrEmpty(value: string): boolean {
  if (!value || value.trim() === '') return true;
  return HEX_REGEX.test(value.trim());
}

function joinList(list: ReadonlyArray<string> | null | undefined): string {
  if (!list || list.length === 0) return '';
  return list.join(', ');
}

const inputStyle: CSSProperties = {
  width: '100%',
  height: '42px',
  padding: '0 14px',
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-pill)',
  color: 'var(--canon-cream)',
  fontSize: '14px',
  fontFamily: 'inherit',
  outline: 'none',
};

const textareaStyle: CSSProperties = {
  width: '100%',
  minHeight: '70px',
  padding: '12px 14px',
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-inner)',
  color: 'var(--canon-cream)',
  fontSize: '14px',
  fontFamily: 'inherit',
  outline: 'none',
  resize: 'vertical',
};

const selectStyle: CSSProperties = {
  ...inputStyle,
  appearance: 'none',
  cursor: 'pointer',
};

const labelStyle: CSSProperties = {
  fontSize: '12.5px',
  fontWeight: 600,
  color: 'var(--canon-cream-2)',
  letterSpacing: '0.01em',
};

const errorStyle: CSSProperties = {
  margin: 0,
  padding: '10px 14px',
  background: 'rgba(244,63,94,0.10)',
  border: '1px solid rgba(244,63,94,0.30)',
  borderRadius: 'var(--canon-radius-pill)',
  fontSize: '13px',
  color: '#FCA5A5',
};

const fieldErrorStyle: CSSProperties = {
  margin: 0,
  fontSize: '12px',
  color: '#FCA5A5',
};

const swatchStyle = (color?: string): CSSProperties => ({
  width: '28px',
  height: '28px',
  borderRadius: 'var(--canon-radius-card)',
  border: '1px solid var(--canon-border)',
  background: color && HEX_REGEX.test(color) ? color : 'var(--surface-recessed)',
  flexShrink: 0,
});

export interface BrandKitFormProps {
  readonly onValuesChange: (values: BrandKitFormPreviewValues) => void;
}

export interface BrandKitFormPreviewValues {
  readonly displayName?: string;
  readonly tagline?: string;
  readonly primaryColor?: string;
  readonly secondaryColor?: string;
  readonly accentColor?: string;
  readonly fontPreference?: StudioBrandFont;
  readonly contactPhone?: string;
  readonly introText?: string;
  readonly outroText?: string;
  readonly logoUrl?: string | null;
}

interface BrandKitFromServer {
  readonly display_name: string | null;
  readonly tagline: string | null;
  readonly primary_color: string | null;
  readonly secondary_color: string | null;
  readonly accent_color: string | null;
  readonly font_preference: string | null;
  readonly tone: string | null;
  readonly zones: ReadonlyArray<string> | null;
  readonly cities: ReadonlyArray<string> | null;
  readonly contact_phone: string | null;
  readonly contact_email: string | null;
  readonly intro_text: string | null;
  readonly outro_text: string | null;
  readonly logo_url: string | null;
}

function isStudioBrandFont(value: string): value is StudioBrandFont {
  return (STUDIO_BRAND_FONTS as ReadonlyArray<string>).includes(value);
}

function isToneKey(value: string): value is ToneKey {
  return (TONE_KEYS as ReadonlyArray<string>).includes(value);
}

function fromServer(kit: BrandKitFromServer | null | undefined): FormValues {
  if (!kit) return DEFAULT_VALUES;
  const fontRaw = kit.font_preference ?? 'outfit';
  const toneRaw = kit.tone ?? 'professional';
  return {
    displayName: kit.display_name ?? '',
    tagline: kit.tagline ?? '',
    primaryColor: kit.primary_color ?? '',
    secondaryColor: kit.secondary_color ?? '',
    accentColor: kit.accent_color ?? '',
    fontPreference: isStudioBrandFont(fontRaw) ? fontRaw : 'outfit',
    tone: isToneKey(toneRaw) ? toneRaw : 'professional',
    zonesText: joinList(kit.zones),
    citiesText: joinList(kit.cities),
    contactPhone: kit.contact_phone ?? '',
    contactEmail: kit.contact_email ?? '',
    introText: kit.intro_text ?? '',
    outroText: kit.outro_text ?? '',
  };
}

function toUpsertInput(values: FormValues): UpsertStudioBrandKitInput {
  return {
    displayName: values.displayName.trim() || undefined,
    tagline: values.tagline.trim() || undefined,
    primaryColor: values.primaryColor.trim() || undefined,
    secondaryColor: values.secondaryColor.trim() || undefined,
    accentColor: values.accentColor.trim() || undefined,
    fontPreference: values.fontPreference,
    tone: values.tone,
    zones: splitCsv(values.zonesText),
    cities: splitCsv(values.citiesText),
    contactPhone: values.contactPhone.trim() || undefined,
    contactEmail: values.contactEmail.trim() || undefined,
    introText: values.introText.trim() || undefined,
    outroText: values.outroText.trim() || undefined,
  };
}

export function BrandKitForm({ onValuesChange }: BrandKitFormProps) {
  const t = useTranslations('Studio.brandKit');
  const formId = useId();
  const [serverError, setServerError] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState<boolean>(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const brandKitQuery = trpc.studio.brandKit.get.useQuery();
  const upsertMutation = trpc.studio.brandKit.upsert.useMutation({
    onSuccess() {
      setServerError(null);
      toast.success(t('savedToast'));
      void utils.studio.brandKit.get.invalidate();
    },
    onError(err) {
      setServerError(err.message || t('savingError'));
    },
  });
  const uploadLogoMutation = trpc.studio.brandKit.uploadLogo.useMutation();
  const setLogoUrlMutation = trpc.studio.brandKit.setLogoUrl.useMutation({
    onSuccess() {
      void utils.studio.brandKit.get.invalidate();
    },
  });

  const brandKitData: BrandKitFromServer | null =
    (brandKitQuery.data as unknown as BrandKitFromServer | null | undefined) ?? null;

  const initialValues = useMemo<FormValues>(() => fromServer(brandKitData), [brandKitData]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: DEFAULT_VALUES,
    mode: 'onSubmit',
  });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const watched = watch();
  const logoUrl = brandKitData?.logo_url ?? null;

  useEffect(() => {
    onValuesChange({
      displayName: watched.displayName,
      tagline: watched.tagline,
      primaryColor: watched.primaryColor,
      secondaryColor: watched.secondaryColor,
      accentColor: watched.accentColor,
      fontPreference: watched.fontPreference,
      contactPhone: watched.contactPhone,
      introText: watched.introText,
      outroText: watched.outroText,
      logoUrl,
    });
  }, [
    watched.displayName,
    watched.tagline,
    watched.primaryColor,
    watched.secondaryColor,
    watched.accentColor,
    watched.fontPreference,
    watched.contactPhone,
    watched.introText,
    watched.outroText,
    logoUrl,
    onValuesChange,
  ]);

  const onSubmit: SubmitHandler<FormValues> = useCallback(
    (values) => {
      setServerError(null);
      const payload = toUpsertInput(values);
      const parsed = upsertStudioBrandKitInput.safeParse(payload);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        setServerError(first?.message ?? t('savingError'));
        return;
      }
      upsertMutation.mutate(parsed.data);
    },
    [upsertMutation, t],
  );

  const handleLogoChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      setLogoError(null);
      const contentType = isAcceptedMime(file.type) ? file.type : 'image/png';
      if (file.size > MAX_LOGO_BYTES) {
        setLogoError(t('savingError'));
        return;
      }
      try {
        setLogoBusy(true);
        const signed = await uploadLogoMutation.mutateAsync({
          fileName: file.name,
          contentType,
          sizeBytes: file.size,
        });
        const uploadRes = await fetch(signed.uploadUrl, {
          method: 'PUT',
          headers: { 'content-type': contentType },
          body: file,
        });
        if (!uploadRes.ok) {
          throw new Error('logo-upload-failed');
        }
        await setLogoUrlMutation.mutateAsync({
          fileName: file.name,
          storagePath: signed.path,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown';
        setLogoError(msg);
      } finally {
        setLogoBusy(false);
      }
    },
    [uploadLogoMutation, setLogoUrlMutation, t],
  );

  const handleLogoDeleted = useCallback(() => {
    void utils.studio.brandKit.get.invalidate();
  }, [utils]);

  const isBusy = isSubmitting || upsertMutation.isPending;

  return (
    <form
      id={formId}
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-label={t('formSection')}
      style={{ display: 'grid', gap: '18px' }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '18px',
            color: '#FFFFFF',
            margin: 0,
          }}
        >
          {t('formSection')}
        </h2>
      </header>

      <FieldRow>
        <Field id={`${formId}-displayName`} label={t('displayNameLabel')}>
          <input
            id={`${formId}-displayName`}
            type="text"
            autoComplete="name"
            placeholder={t('displayNamePlaceholder')}
            aria-invalid={Boolean(errors.displayName)}
            style={inputStyle}
            {...register('displayName')}
          />
          {errors.displayName?.message ? (
            <p role="alert" style={fieldErrorStyle}>
              {errors.displayName.message}
            </p>
          ) : null}
        </Field>

        <Field id={`${formId}-tagline`} label={t('taglineLabel')}>
          <input
            id={`${formId}-tagline`}
            type="text"
            placeholder={t('taglinePlaceholder')}
            aria-invalid={Boolean(errors.tagline)}
            style={inputStyle}
            {...register('tagline')}
          />
        </Field>
      </FieldRow>

      <FieldRow columns={3}>
        <ColorField
          id={`${formId}-primaryColor`}
          label={t('primaryColorLabel')}
          value={watched.primaryColor}
          register={register('primaryColor', {
            validate: (v) => isHexOrEmpty(v) || t('savingError'),
          })}
          error={errors.primaryColor?.message}
        />
        <ColorField
          id={`${formId}-secondaryColor`}
          label={t('secondaryColorLabel')}
          value={watched.secondaryColor}
          register={register('secondaryColor', {
            validate: (v) => isHexOrEmpty(v) || t('savingError'),
          })}
          error={errors.secondaryColor?.message}
        />
        <ColorField
          id={`${formId}-accentColor`}
          label={t('accentColorLabel')}
          value={watched.accentColor}
          register={register('accentColor', {
            validate: (v) => isHexOrEmpty(v) || t('savingError'),
          })}
          error={errors.accentColor?.message}
        />
      </FieldRow>

      <FieldRow>
        <Field id={`${formId}-fontPreference`} label={t('fontPreferenceLabel')}>
          <Controller
            control={control}
            name="fontPreference"
            render={({ field }) => (
              <select
                id={`${formId}-fontPreference`}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                style={selectStyle}
              >
                {STUDIO_BRAND_FONTS.map((font) => (
                  <option key={font} value={font}>
                    {t(FONT_LABEL_KEY[font])}
                  </option>
                ))}
              </select>
            )}
          />
        </Field>

        <Field id={`${formId}-tone`} label={t('toneLabel')}>
          <Controller
            control={control}
            name="tone"
            render={({ field }) => (
              <select
                id={`${formId}-tone`}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                style={selectStyle}
              >
                {TONE_KEYS.map((tone) => (
                  <option key={tone} value={tone}>
                    {t(TONE_LABEL_KEY[tone])}
                  </option>
                ))}
              </select>
            )}
          />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field id={`${formId}-zones`} label={t('zonesLabel')}>
          <textarea
            id={`${formId}-zones`}
            placeholder={t('zonesPlaceholder')}
            style={textareaStyle}
            {...register('zonesText')}
          />
        </Field>

        <Field id={`${formId}-cities`} label={t('citiesLabel')}>
          <textarea
            id={`${formId}-cities`}
            placeholder={t('citiesPlaceholder')}
            style={textareaStyle}
            {...register('citiesText')}
          />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field id={`${formId}-contactPhone`} label={t('contactPhoneLabel')}>
          <input
            id={`${formId}-contactPhone`}
            type="tel"
            autoComplete="tel"
            style={inputStyle}
            {...register('contactPhone')}
          />
        </Field>

        <Field id={`${formId}-contactEmail`} label={t('contactEmailLabel')}>
          <input
            id={`${formId}-contactEmail`}
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.contactEmail)}
            style={inputStyle}
            {...register('contactEmail')}
          />
          {errors.contactEmail?.message ? (
            <p role="alert" style={fieldErrorStyle}>
              {errors.contactEmail.message}
            </p>
          ) : null}
        </Field>
      </FieldRow>

      <FieldRow>
        <Field id={`${formId}-introText`} label={t('introTextLabel')}>
          <input
            id={`${formId}-introText`}
            type="text"
            maxLength={120}
            style={inputStyle}
            {...register('introText')}
          />
        </Field>

        <Field id={`${formId}-outroText`} label={t('outroTextLabel')}>
          <input
            id={`${formId}-outroText`}
            type="text"
            maxLength={120}
            style={inputStyle}
            {...register('outroText')}
          />
        </Field>
      </FieldRow>

      <fieldset
        style={{
          border: '1px solid var(--canon-border)',
          borderRadius: 'var(--canon-radius-card)',
          padding: '16px',
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          background: 'var(--surface-recessed)',
        }}
      >
        <legend style={{ ...labelStyle, padding: '0 6px' }}>{t('logoLabel')}</legend>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div
            data-testid="brand-kit-logo-thumb"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--canon-radius-inner)',
              background: 'var(--canon-bg)',
              border: '1px solid var(--canon-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {logoUrl ? (
              // biome-ignore lint/performance/noImgElement: signed storage URL preview, intentional
              <img
                src={logoUrl}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <span style={{ fontSize: '10px', color: 'var(--canon-cream-2)' }}>
                {t('logoLabel')}
              </span>
            )}
          </div>

          <label
            htmlFor={`${formId}-logo-input`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              height: '34px',
              padding: '0 14px',
              fontSize: '12.5px',
              fontWeight: 600,
              borderRadius: 'var(--canon-radius-pill)',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--canon-border-2)',
              color: 'var(--canon-cream)',
              cursor: logoBusy ? 'not-allowed' : 'pointer',
              opacity: logoBusy ? 0.6 : 1,
            }}
            aria-busy={logoBusy}
          >
            {logoBusy ? `${t('logoUploadCta')}…` : t('logoUploadCta')}
          </label>
          <input
            id={`${formId}-logo-input`}
            type="file"
            accept={ACCEPTED_LOGO_MIME.join(',')}
            onChange={handleLogoChange}
            disabled={logoBusy}
            style={{ display: 'none' }}
            aria-label={t('logoUploadCta')}
          />

          {logoUrl ? (
            <BrandKitDeleteLogoButton onDeleted={handleLogoDeleted} disabled={logoBusy} />
          ) : null}
        </div>

        {logoError ? (
          <p role="alert" style={fieldErrorStyle}>
            {logoError}
          </p>
        ) : null}
      </fieldset>

      {serverError ? (
        <p role="alert" style={errorStyle}>
          {serverError}
        </p>
      ) : null}

      <div>
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isBusy}
          aria-busy={upsertMutation.isPending}
        >
          {upsertMutation.isPending ? `${t('saveButton')}…` : t('saveButton')}
        </Button>
      </div>
    </form>
  );
}

interface FieldProps {
  readonly id: string;
  readonly label: string;
  readonly children: React.ReactNode;
}

function Field({ id, label, children }: FieldProps) {
  return (
    <div style={{ display: 'grid', gap: '6px' }}>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      {children}
    </div>
  );
}

interface FieldRowProps {
  readonly children: React.ReactNode;
  readonly columns?: 2 | 3;
}

function FieldRow({ children, columns = 2 }: FieldRowProps) {
  return (
    <div
      style={{
        display: 'grid',
        gap: '14px',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {children}
    </div>
  );
}

interface ColorFieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly register: UseFormRegisterReturn;
  readonly error: string | undefined;
}

function ColorField({ id, label, value, register, error }: ColorFieldProps) {
  return (
    <div style={{ display: 'grid', gap: '6px' }}>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span aria-hidden="true" style={swatchStyle(value)} data-testid={`${id}-swatch`} />
        <input
          {...register}
          id={id}
          type="text"
          inputMode="text"
          placeholder="#6366F1"
          aria-invalid={Boolean(error)}
          maxLength={7}
          style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace' }}
        />
        <input
          {...register}
          id={`${id}-picker`}
          type="color"
          aria-label={label}
          style={{
            width: '42px',
            height: '42px',
            padding: 0,
            background: 'transparent',
            border: '1px solid var(--canon-border)',
            borderRadius: 'var(--canon-radius-pill)',
            cursor: 'pointer',
          }}
        />
      </div>
      {error ? (
        <p role="alert" style={fieldErrorStyle}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
