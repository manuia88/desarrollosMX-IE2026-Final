#!/usr/bin/env node
// FASE 15 v3 — seed dev.crm + dev.crm.journey i18n keys across 5 locales.
// Inserts namespace into messages/<locale>.json under existing `dev.*` parent.
// Tier 1 H1 active: es-MX (canonical) + en-US.
// Tier 2 H2 fallback: es-AR/es-CO/pt-BR clone es-MX strings (memoria scope_multipais_h1_opcion_b).

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MESSAGES_DIR = resolve(__dirname, '..', 'messages');

const ES_MX = {
  page: {
    title: 'CRM',
    subtitle: '{total} leads · {hot} 🔥 hot',
    metaTitle: 'CRM · Desarrolladora',
    metaDescription: 'Pipeline propio: lead → interés → visita → oferta → cierre.',
    createLead: '+ Nuevo lead',
    openJourneys: 'Journeys',
    loading: 'Cargando leads...',
  },
  empty: {
    title: 'Aún no tienes leads en tu pipeline',
    description:
      'Conecta landings, QR codes o portales externos para empezar a capturar leads automáticamente. También puedes crear uno manualmente.',
    cta: '+ Crear lead manual',
  },
  stage: {
    lead: 'Lead',
    interes: 'Interés',
    visita: 'Visita',
    oferta: 'Oferta',
    cierre: 'Cierre',
  },
  source: {
    landing: 'Landing',
    inmuebles24: 'Inmuebles24',
    mercadolibre: 'MercadoLibre',
    facebook: 'Facebook',
    whatsapp: 'WhatsApp',
    walk_in: 'Walk-in',
    referido: 'Referido',
    evento: 'Evento',
    otro: 'Otro',
  },
  card: {
    aria: '{name} — {days} días en etapa',
    daysInStage: '{days}d en etapa',
    assigned: 'Asignado',
    unassigned: 'Sin asignar',
    noContact: 'Sin contacto',
  },
  kanban: {
    aria: 'Pipeline kanban CRM Dev',
    emptyColumn: 'Vacío',
    moveBack: 'Mover etapa anterior',
    moveForward: 'Mover etapa siguiente',
    movedTo: 'Movido a {stage}',
    serverError: 'Error del servidor: {detail}',
    dragStart: 'Arrastrando lead — suelta sobre una columna',
  },
  score: {
    badge: {
      unscored: 'Sin score',
      aria: 'Lead score {score} ({tier})',
    },
    tier: {
      hot: 'hot',
      warm: 'warm',
      cold: 'cold',
    },
    breakdown: {
      title: 'Lead score breakdown',
      engagement: 'Engagement',
      intent: 'Intent',
      demographics: 'Demografía',
      recency: 'Recencia',
    },
  },
  form: {
    title: 'Nuevo lead',
    save: 'Guardar lead',
    saving: 'Guardando...',
    cancel: 'Cancelar',
    closeAria: 'Cerrar formulario',
    contactName: { label: 'Nombre completo', required: 'Nombre requerido' },
    contactEmail: { label: 'Email' },
    contactPhone: { label: 'Teléfono' },
    source: {
      label: 'Origen',
      options: {
        landing: 'Landing',
        inmuebles24: 'Inmuebles24',
        mercadolibre: 'MercadoLibre',
        facebook: 'Facebook',
        whatsapp: 'WhatsApp',
        walk_in: 'Walk-in',
        referido: 'Referido',
        evento: 'Evento',
        otro: 'Otro',
      },
    },
    budgetMin: { label: 'Presupuesto mínimo' },
    budgetMax: { label: 'Presupuesto máximo' },
    notes: { label: 'Notas iniciales' },
  },
  drawer: {
    title: 'Detalle del lead',
    closeAria: 'Cerrar drawer',
    loading: 'Cargando lead...',
    actions: {
      assignAsesor: 'Asignar asesor',
      recompute: 'Recalcular score',
      recomputing: 'Recalculando...',
    },
    tabs: {
      aria: 'Secciones del lead',
      timeline: 'Timeline',
      score: 'Score',
      inbox: 'Inbox',
      tareas: 'Tareas',
    },
    timeline: {
      empty: 'Sin actividad registrada todavía.',
      loading: 'Cargando timeline...',
      partialNotice: 'Timeline parcial. Faltan fuentes: {sources}.',
      type: {
        lead_created: 'Lead creado',
        lead_updated: 'Lead actualizado',
        score_computed: 'Score calculado',
        journey_event: 'Evento journey',
      },
    },
    score: {
      empty: 'Sin score aún. Recalcula para generar uno.',
      model: 'Modelo {version}',
      computedAt: 'Calculado {date}',
      factor: {
        engagement: 'Engagement (touchpoints)',
        intent: 'Intent (forms, visitas, ofertas)',
        demographics: 'Demografía (presupuesto, zona)',
        recency: 'Recencia (días desde update)',
      },
    },
    inbox: {
      comingSoon: 'Inbox unificado próximamente',
      description: 'WhatsApp Business + Resend inbound + eventos CRM. Disponible en FASE 15 ola 2.',
    },
    tareas: {
      comingSoon: 'Tareas del equipo dev próximamente',
      description: 'Follow-ups, prepare proposal, send docs. Disponible en FASE 15 ola 2.',
    },
  },
  assign: {
    title: 'Asignar asesor',
    description:
      'Pega el ID del asesor aliado al proyecto. El asesor recibirá una notificación al asignarlo.',
    inputLabel: 'ID del asesor',
    placeholder: 'uuid del asesor (vacío = sin asignar)',
    cancel: 'Cancelar',
    assign: 'Asignar',
  },
  journey: {
    page: {
      metaTitle: 'Journey Builder — CRM Dev',
      metaDescription: 'Automatiza secuencias multi-canal: WhatsApp + email + condicionales.',
      title: 'Journey Builder',
      subtitle: 'Automatiza follow-ups multi-canal (WA + email) con condicionales por score.',
      backToCRM: '← CRM',
      openBuilder: '+ Crear journey',
      cancelBuilder: 'Cancelar',
      activeList: 'Mis journeys',
      empty: 'Aún no tienes journeys. Empieza con un template.',
      loading: 'Cargando journeys...',
      stepsCount: '{count} pasos',
      active: 'Activo',
      paused: 'Pausado',
      pause: 'Pausar',
      templatesTitle: 'Templates',
      useTemplate: 'Usar template',
    },
    triggerEvent: {
      lead_created: 'Lead nuevo',
      lead_score_changed: 'Score cambió',
      visit_scheduled: 'Visita agendada',
      offer_sent: 'Oferta enviada',
      days_no_activity: 'Sin actividad N días',
      aniversary_apartado: 'Aniversario apartado',
    },
    step: {
      type: {
        send_email: 'Enviar email',
        send_wa: 'Enviar WhatsApp',
        wait: 'Esperar',
        conditional: 'Condicional',
      },
      moveUp: 'Subir paso',
      moveDown: 'Bajar paso',
      remove: 'Eliminar paso',
    },
    builder: {
      aria: 'Constructor de journey',
      title: 'Nuevo journey',
      nameLabel: 'Nombre',
      triggerLabel: 'Disparador',
      noSteps: 'Agrega pasos para empezar.',
      save: 'Guardar journey',
      saving: 'Guardando...',
      addStep: {
        send_email: 'Email',
        send_wa: 'WhatsApp',
        wait: 'Esperar',
        conditional: 'Condicional',
      },
      trigger: {
        lead_created: 'Lead creado',
        lead_score_changed: 'Score cambió',
        visit_scheduled: 'Visita agendada',
        offer_sent: 'Oferta enviada',
        days_no_activity: 'Sin actividad',
        aniversary_apartado: 'Aniversario apartado',
      },
    },
    templates: {
      bienvenida_lead_nuevo: {
        name: 'Bienvenida lead nuevo',
        description: 'WA + email instantáneo + follow-up 24h.',
      },
      follow_up_post_visita: {
        name: 'Follow-up post-visita',
        description: 'Recap + invite oferta condicional al score (3-7d).',
      },
      reactivacion_frio_60d: {
        name: 'Reactivación lead frío 60d',
        description: 'Email + WA tras 60d sin actividad.',
      },
      aniversario_apartado: {
        name: 'Aniversario apartado',
        description: 'Email + WA al cumplir 1 año post-deposit.',
      },
      drip_tour_proyecto: {
        name: 'Drip tour proyecto (5 emails)',
        description: '5 emails escalonados nurturing del proyecto.',
      },
    },
  },
};

const EN_US = {
  page: {
    title: 'CRM',
    subtitle: '{total} leads · {hot} 🔥 hot',
    metaTitle: 'CRM · Developer',
    metaDescription: 'Owned pipeline: lead → interest → visit → offer → close.',
    createLead: '+ New lead',
    openJourneys: 'Journeys',
    loading: 'Loading leads...',
  },
  empty: {
    title: 'No leads yet in your pipeline',
    description:
      'Connect landings, QR codes, or external portals to start capturing leads automatically. You can also create one manually.',
    cta: '+ Create lead manually',
  },
  stage: {
    lead: 'Lead',
    interes: 'Interest',
    visita: 'Visit',
    oferta: 'Offer',
    cierre: 'Close',
  },
  source: {
    landing: 'Landing',
    inmuebles24: 'Inmuebles24',
    mercadolibre: 'MercadoLibre',
    facebook: 'Facebook',
    whatsapp: 'WhatsApp',
    walk_in: 'Walk-in',
    referido: 'Referral',
    evento: 'Event',
    otro: 'Other',
  },
  card: {
    aria: '{name} — {days} days in stage',
    daysInStage: '{days}d in stage',
    assigned: 'Assigned',
    unassigned: 'Unassigned',
    noContact: 'No contact',
  },
  kanban: {
    aria: 'Dev CRM kanban pipeline',
    emptyColumn: 'Empty',
    moveBack: 'Move back one stage',
    moveForward: 'Move forward one stage',
    movedTo: 'Moved to {stage}',
    serverError: 'Server error: {detail}',
    dragStart: 'Dragging lead — drop on a column',
  },
  score: {
    badge: {
      unscored: 'No score',
      aria: 'Lead score {score} ({tier})',
    },
    tier: {
      hot: 'hot',
      warm: 'warm',
      cold: 'cold',
    },
    breakdown: {
      title: 'Lead score breakdown',
      engagement: 'Engagement',
      intent: 'Intent',
      demographics: 'Demographics',
      recency: 'Recency',
    },
  },
  form: {
    title: 'New lead',
    save: 'Save lead',
    saving: 'Saving...',
    cancel: 'Cancel',
    closeAria: 'Close form',
    contactName: { label: 'Full name', required: 'Name required' },
    contactEmail: { label: 'Email' },
    contactPhone: { label: 'Phone' },
    source: {
      label: 'Source',
      options: {
        landing: 'Landing',
        inmuebles24: 'Inmuebles24',
        mercadolibre: 'MercadoLibre',
        facebook: 'Facebook',
        whatsapp: 'WhatsApp',
        walk_in: 'Walk-in',
        referido: 'Referral',
        evento: 'Event',
        otro: 'Other',
      },
    },
    budgetMin: { label: 'Min budget' },
    budgetMax: { label: 'Max budget' },
    notes: { label: 'Initial notes' },
  },
  drawer: {
    title: 'Lead detail',
    closeAria: 'Close drawer',
    loading: 'Loading lead...',
    actions: {
      assignAsesor: 'Assign agent',
      recompute: 'Recompute score',
      recomputing: 'Recomputing...',
    },
    tabs: {
      aria: 'Lead sections',
      timeline: 'Timeline',
      score: 'Score',
      inbox: 'Inbox',
      tareas: 'Tasks',
    },
    timeline: {
      empty: 'No activity yet.',
      loading: 'Loading timeline...',
      partialNotice: 'Partial timeline. Missing sources: {sources}.',
      type: {
        lead_created: 'Lead created',
        lead_updated: 'Lead updated',
        score_computed: 'Score computed',
        journey_event: 'Journey event',
      },
    },
    score: {
      empty: 'No score yet. Recompute to generate one.',
      model: 'Model {version}',
      computedAt: 'Computed {date}',
      factor: {
        engagement: 'Engagement (touchpoints)',
        intent: 'Intent (forms, visits, offers)',
        demographics: 'Demographics (budget, zone)',
        recency: 'Recency (days since update)',
      },
    },
    inbox: {
      comingSoon: 'Unified inbox coming soon',
      description: 'WhatsApp Business + Resend inbound + CRM events. Available FASE 15 wave 2.',
    },
    tareas: {
      comingSoon: 'Dev team tasks coming soon',
      description: 'Follow-ups, prepare proposal, send docs. Available FASE 15 wave 2.',
    },
  },
  assign: {
    title: 'Assign agent',
    description:
      'Paste the ID of the agent allied with the project. The agent receives a notification on assignment.',
    inputLabel: 'Agent ID',
    placeholder: 'agent uuid (empty = unassign)',
    cancel: 'Cancel',
    assign: 'Assign',
  },
  journey: {
    page: {
      metaTitle: 'Journey Builder — Dev CRM',
      metaDescription: 'Automate multi-channel sequences: WhatsApp + email + conditionals.',
      title: 'Journey Builder',
      subtitle: 'Automate multi-channel follow-ups (WA + email) with score-based conditionals.',
      backToCRM: '← CRM',
      openBuilder: '+ Create journey',
      cancelBuilder: 'Cancel',
      activeList: 'My journeys',
      empty: "You don't have journeys yet. Start with a template.",
      loading: 'Loading journeys...',
      stepsCount: '{count} steps',
      active: 'Active',
      paused: 'Paused',
      pause: 'Pause',
      templatesTitle: 'Templates',
      useTemplate: 'Use template',
    },
    triggerEvent: {
      lead_created: 'New lead',
      lead_score_changed: 'Score changed',
      visit_scheduled: 'Visit scheduled',
      offer_sent: 'Offer sent',
      days_no_activity: 'No activity N days',
      aniversary_apartado: 'Deposit anniversary',
    },
    step: {
      type: {
        send_email: 'Send email',
        send_wa: 'Send WhatsApp',
        wait: 'Wait',
        conditional: 'Conditional',
      },
      moveUp: 'Move up',
      moveDown: 'Move down',
      remove: 'Remove step',
    },
    builder: {
      aria: 'Journey builder',
      title: 'New journey',
      nameLabel: 'Name',
      triggerLabel: 'Trigger',
      noSteps: 'Add steps to start.',
      save: 'Save journey',
      saving: 'Saving...',
      addStep: {
        send_email: 'Email',
        send_wa: 'WhatsApp',
        wait: 'Wait',
        conditional: 'Conditional',
      },
      trigger: {
        lead_created: 'Lead created',
        lead_score_changed: 'Score changed',
        visit_scheduled: 'Visit scheduled',
        offer_sent: 'Offer sent',
        days_no_activity: 'No activity',
        aniversary_apartado: 'Deposit anniversary',
      },
    },
    templates: {
      bienvenida_lead_nuevo: {
        name: 'New lead welcome',
        description: 'Instant WA + email + 24h follow-up.',
      },
      follow_up_post_visita: {
        name: 'Post-visit follow-up',
        description: 'Recap + score-conditional offer invite (3-7d).',
      },
      reactivacion_frio_60d: {
        name: 'Cold lead 60d reactivation',
        description: 'Email + WA after 60d of no activity.',
      },
      aniversario_apartado: {
        name: 'Deposit anniversary',
        description: 'Email + WA on 1-year post-deposit.',
      },
      drip_tour_proyecto: {
        name: 'Project drip tour (5 emails)',
        description: '5 staggered nurturing emails about the project.',
      },
    },
  },
};

async function loadJSON(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function writeJSON(path, data) {
  const text = `${JSON.stringify(data, null, 2)}\n`;
  await writeFile(path, text, 'utf8');
}

async function injectLocale(localeFile, namespace) {
  const path = resolve(MESSAGES_DIR, localeFile);
  const data = await loadJSON(path);
  if (!data.dev) data.dev = {};
  data.dev.crm = namespace;
  await writeJSON(path, data);
}

async function main() {
  // Tier 1 H1 active: es-MX canonical + en-US localized.
  await injectLocale('es-MX.json', ES_MX);
  await injectLocale('en-US.json', EN_US);

  // Tier 2 H2 fallback: es-AR / es-CO / pt-BR clone es-MX (memoria scope_multipais_h1_opcion_b).
  await injectLocale('es-AR.json', ES_MX);
  await injectLocale('es-CO.json', ES_MX);
  await injectLocale('pt-BR.json', ES_MX);

  console.log('✓ injected dev.crm namespace into 5 locales (Tier 1 active + Tier 2 fallback)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
