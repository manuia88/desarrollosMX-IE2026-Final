// FASE 15 v3 — B.7 5 journey templates seed (in-code, NOT BD migration).
// Reference: ADR-060 + M13 APPEND v3.
//
// Templates are defined in TS (no BD seed) because RLS on marketing_journeys
// requires created_by = auth.uid() OR dev's desarrolladora — global templates
// would not be visible. UI offers "Use template" → creates real row owned by dev.

import type { JourneyStep, JourneyTriggerEvent } from '../schemas';

export interface JourneyTemplate {
  readonly slug: string;
  readonly nameKey: string;
  readonly descriptionKey: string;
  readonly triggerEvent: JourneyTriggerEvent;
  readonly steps: readonly JourneyStep[];
  readonly audienceFilter: Readonly<Record<string, unknown>>;
}

export const JOURNEY_TEMPLATES: readonly JourneyTemplate[] = [
  {
    slug: 'bienvenida_lead_nuevo',
    nameKey: 'templates.bienvenida_lead_nuevo.name',
    descriptionKey: 'templates.bienvenida_lead_nuevo.description',
    triggerEvent: 'lead_created',
    audienceFilter: {},
    steps: [
      { type: 'send_wa', waTemplateId: 'wa_welcome_lead_v1' },
      {
        type: 'send_email',
        templateId: 'email_welcome_lead_v1',
        subject: 'Gracias por tu interés',
      },
      { type: 'wait', waitHours: 24 },
      { type: 'send_email', templateId: 'email_followup_24h_v1', subject: '¿Tienes preguntas?' },
    ],
  },
  {
    slug: 'follow_up_post_visita',
    nameKey: 'templates.follow_up_post_visita.name',
    descriptionKey: 'templates.follow_up_post_visita.description',
    triggerEvent: 'visit_scheduled',
    audienceFilter: {},
    steps: [
      { type: 'wait', waitHours: 72 },
      { type: 'send_wa', waTemplateId: 'wa_post_visit_thanks_v1' },
      { type: 'wait', waitHours: 24 },
      { type: 'send_email', templateId: 'email_visit_recap_v1', subject: 'Tu visita en resumen' },
      { type: 'wait', waitHours: 168 },
      {
        type: 'conditional',
        condition: { field: 'lead_score', op: 'gte', value: 70 },
        thenStep: 7,
        elseStep: 8,
      },
      {
        type: 'send_email',
        templateId: 'email_offer_invite_v1',
        subject: 'Reservación preferente',
      },
      { type: 'send_email', templateId: 'email_nurture_v1', subject: 'Sigue conociéndonos' },
    ],
  },
  {
    slug: 'reactivacion_frio_60d',
    nameKey: 'templates.reactivacion_frio_60d.name',
    descriptionKey: 'templates.reactivacion_frio_60d.description',
    triggerEvent: 'days_no_activity',
    audienceFilter: { min_days_inactive: 60 },
    steps: [
      { type: 'send_email', templateId: 'email_reactivation_v1', subject: 'Tenemos novedades' },
      { type: 'wait', waitHours: 72 },
      { type: 'send_wa', waTemplateId: 'wa_reactivation_v1' },
    ],
  },
  {
    slug: 'aniversario_apartado',
    nameKey: 'templates.aniversario_apartado.name',
    descriptionKey: 'templates.aniversario_apartado.description',
    triggerEvent: 'aniversary_apartado',
    audienceFilter: {},
    steps: [
      {
        type: 'send_email',
        templateId: 'email_aniversary_v1',
        subject: '¡Feliz aniversario en tu nueva casa!',
      },
      { type: 'wait', waitHours: 24 },
      { type: 'send_wa', waTemplateId: 'wa_aniversary_v1' },
    ],
  },
  {
    slug: 'drip_tour_proyecto',
    nameKey: 'templates.drip_tour_proyecto.name',
    descriptionKey: 'templates.drip_tour_proyecto.description',
    triggerEvent: 'lead_created',
    audienceFilter: {},
    steps: [
      { type: 'send_email', templateId: 'email_drip_1_intro_v1', subject: 'Conoce el proyecto' },
      { type: 'wait', waitHours: 48 },
      {
        type: 'send_email',
        templateId: 'email_drip_2_amenities_v1',
        subject: 'Amenidades destacadas',
      },
      { type: 'wait', waitHours: 48 },
      {
        type: 'send_email',
        templateId: 'email_drip_3_floorplans_v1',
        subject: 'Planos disponibles',
      },
      { type: 'wait', waitHours: 48 },
      {
        type: 'send_email',
        templateId: 'email_drip_4_financiamiento_v1',
        subject: 'Esquemas de pago',
      },
      { type: 'wait', waitHours: 72 },
      {
        type: 'send_email',
        templateId: 'email_drip_5_invitation_v1',
        subject: 'Reserva tu visita',
      },
    ],
  },
];
