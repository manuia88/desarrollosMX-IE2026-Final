#!/usr/bin/env node
// One-shot script: inject FASE 13.F PR-C i18n keys into 5 locales.
// Idempotent — re-running is safe.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const LOCALES = ['es-MX', 'es-CO', 'es-AR', 'pt-BR', 'en-US'];

// =====================================================================================
// PAYLOAD per locale.
// =====================================================================================
const ADDITIONS = {
  'es-MX': {
    AsesorBusquedas: {
      kanban: {
        ariaLabel: 'Pipeline de búsquedas por estado',
        emptyColumn: 'Sin búsquedas en este estado.',
        stage: { activa: 'Activas', pausada: 'Pausadas', cerrada: 'Cerradas' },
      },
      view: {
        ariaToggle: 'Modo de vista',
        mode: { list: 'Lista', grid: 'Cuadrícula', kanban: 'Kanban' },
        ariaSelect: {
          list: 'Cambiar a vista lista',
          grid: 'Cambiar a vista cuadrícula',
          kanban: 'Cambiar a vista kanban',
        },
      },
    },
    AsesorContactos: {
      drawer: {
        tabs: { aria: 'Pestañas del detalle de contacto', overview: 'Resumen', notes: 'Notas' },
      },
      notes: {
        level: {
          personal: 'Personal',
          colaborativo: 'Colaborativo',
          sistema: 'Sistema',
        },
        edited: 'editada',
        actions: {
          edit: 'Editar',
          editAria: 'Editar nota',
          delete: 'Eliminar',
          deleteAria: 'Eliminar nota',
          confirmDelete: 'Confirmar',
          confirmDeleteAria: 'Confirmar eliminación de nota',
          cancel: 'Cancelar',
        },
        editor: {
          ariaCreate: 'Crear nueva nota',
          ariaEdit: 'Editar nota existente',
          contentLabel: 'Contenido de la nota',
          levelLabel: 'Visibilidad',
          placeholder: 'Escribe una nota en Markdown…',
          create: 'Guardar nota',
          save: 'Guardar cambios',
          saving: 'Guardando…',
          cancel: 'Cancelar',
        },
        list: {
          loading: 'Cargando notas…',
          empty: 'Sin notas registradas para este contacto.',
          errorLoading: 'No se pudieron cargar las notas: {detail}',
        },
        errors: {
          createFailed: 'No se pudo crear la nota: {detail}',
          updateFailed: 'No se pudo actualizar la nota: {detail}',
          deleteFailed: 'No se pudo eliminar la nota: {detail}',
        },
      },
      copilot: {
        button: {
          label: 'Pregunta a Copilot',
          ariaOpen: 'Abrir Copilot para {name}',
        },
        dialog: {
          title: 'Sugerencias Copilot',
          aria: 'Sugerencias Copilot para {name}',
          contextSummary:
            '{name} — estado {status}, DISC {disc}, último contacto hace {days} días.',
          listAria: 'Top 3 sugerencias',
          close: 'Cerrar',
          closeAria: 'Cerrar Copilot',
          disclosureDeterministic:
            'Sugerencias deterministic — upgrade LLM en FASE 16+. Cero costo H1.',
        },
        priority: { high: 'Alta', med: 'Media', low: 'Baja' },
        leadStatus: {
          new: 'nuevo',
          qualified: 'calificado',
          nurturing: 'en seguimiento',
          converted: 'convertido',
          lost: 'perdido',
        },
        actions: {
          reEngagementTemplate: 'Plantilla de reactivación',
          discDDirectMessage: 'Mensaje directo y propuesta concreta',
          discICall: 'Llamada con calor humano y aspiraciones',
          discSReassure: 'Reasegurar sin presionar, dar tiempo',
          discCData: 'Enviar data, comparables y métricas',
          familyAmenitiesAndSchools: 'Mostrar amenities familiares y escuelas',
          scheduleVisitPriority: 'Agendar visita prioritaria',
          sendPersonalizedListing: 'Enviar listing personalizado por DISC y presupuesto',
        },
        reasons: {
          reasonInactiveLead: 'Han pasado más de 14 días sin contacto.',
          reasonDiscD: 'Perfil D responde mejor a directness y propuestas concretas.',
          reasonDiscI: 'Perfil I responde mejor a calor humano y conexión personal.',
          reasonDiscS: 'Perfil S necesita tiempo y reaseguramiento, no presión.',
          reasonDiscC: 'Perfil C decide con datos, comparables y métricas.',
          reasonLargeFamily: 'Familia grande prioriza amenities familiares y escuelas cercanas.',
          reasonQualifiedLead: 'Lead calificado — momentum alto para visita.',
          reasonDefaultFollowUp: 'Mantener cadencia con un listing alineado al perfil.',
        },
      },
    },
  },

  'es-CO': {
    AsesorBusquedas: {
      kanban: {
        ariaLabel: 'Pipeline de búsquedas por estado',
        emptyColumn: 'Sin búsquedas en este estado.',
        stage: { activa: 'Activas', pausada: 'Pausadas', cerrada: 'Cerradas' },
      },
      view: {
        ariaToggle: 'Modo de vista',
        mode: { list: 'Lista', grid: 'Cuadrícula', kanban: 'Kanban' },
        ariaSelect: {
          list: 'Cambiar a vista lista',
          grid: 'Cambiar a vista cuadrícula',
          kanban: 'Cambiar a vista kanban',
        },
      },
    },
    AsesorContactos: {
      drawer: {
        tabs: { aria: 'Pestañas del detalle de contacto', overview: 'Resumen', notes: 'Notas' },
      },
      notes: {
        level: { personal: 'Personal', colaborativo: 'Colaborativo', sistema: 'Sistema' },
        edited: 'editada',
        actions: {
          edit: 'Editar',
          editAria: 'Editar nota',
          delete: 'Eliminar',
          deleteAria: 'Eliminar nota',
          confirmDelete: 'Confirmar',
          confirmDeleteAria: 'Confirmar eliminación de nota',
          cancel: 'Cancelar',
        },
        editor: {
          ariaCreate: 'Crear nueva nota',
          ariaEdit: 'Editar nota existente',
          contentLabel: 'Contenido de la nota',
          levelLabel: 'Visibilidad',
          placeholder: 'Escriba una nota en Markdown…',
          create: 'Guardar nota',
          save: 'Guardar cambios',
          saving: 'Guardando…',
          cancel: 'Cancelar',
        },
        list: {
          loading: 'Cargando notas…',
          empty: 'Sin notas registradas para este contacto.',
          errorLoading: 'No se pudieron cargar las notas: {detail}',
        },
        errors: {
          createFailed: 'No se pudo crear la nota: {detail}',
          updateFailed: 'No se pudo actualizar la nota: {detail}',
          deleteFailed: 'No se pudo eliminar la nota: {detail}',
        },
      },
      copilot: {
        button: { label: 'Pregunte a Copilot', ariaOpen: 'Abrir Copilot para {name}' },
        dialog: {
          title: 'Sugerencias Copilot',
          aria: 'Sugerencias Copilot para {name}',
          contextSummary:
            '{name} — estado {status}, DISC {disc}, último contacto hace {days} días.',
          listAria: 'Top 3 sugerencias',
          close: 'Cerrar',
          closeAria: 'Cerrar Copilot',
          disclosureDeterministic:
            'Sugerencias deterministic — upgrade LLM en FASE 16+. Cero costo H1.',
        },
        priority: { high: 'Alta', med: 'Media', low: 'Baja' },
        leadStatus: {
          new: 'nuevo',
          qualified: 'calificado',
          nurturing: 'en seguimiento',
          converted: 'convertido',
          lost: 'perdido',
        },
        actions: {
          reEngagementTemplate: 'Plantilla de reactivación',
          discDDirectMessage: 'Mensaje directo y propuesta concreta',
          discICall: 'Llamada con calor humano y aspiraciones',
          discSReassure: 'Reasegurar sin presionar, dar tiempo',
          discCData: 'Enviar data, comparables y métricas',
          familyAmenitiesAndSchools: 'Mostrar amenities familiares y colegios',
          scheduleVisitPriority: 'Agendar visita prioritaria',
          sendPersonalizedListing: 'Enviar listing personalizado por DISC y presupuesto',
        },
        reasons: {
          reasonInactiveLead: 'Han pasado más de 14 días sin contacto.',
          reasonDiscD: 'Perfil D responde mejor a directness y propuestas concretas.',
          reasonDiscI: 'Perfil I responde mejor a calor humano y conexión personal.',
          reasonDiscS: 'Perfil S necesita tiempo y reaseguramiento, no presión.',
          reasonDiscC: 'Perfil C decide con datos, comparables y métricas.',
          reasonLargeFamily: 'Familia grande prioriza amenities familiares y colegios cercanos.',
          reasonQualifiedLead: 'Lead calificado — momentum alto para visita.',
          reasonDefaultFollowUp: 'Mantener cadencia con un listing alineado al perfil.',
        },
      },
    },
  },

  'es-AR': {
    AsesorBusquedas: {
      kanban: {
        ariaLabel: 'Pipeline de búsquedas por estado',
        emptyColumn: 'Sin búsquedas en este estado.',
        stage: { activa: 'Activas', pausada: 'Pausadas', cerrada: 'Cerradas' },
      },
      view: {
        ariaToggle: 'Modo de vista',
        mode: { list: 'Lista', grid: 'Grilla', kanban: 'Kanban' },
        ariaSelect: {
          list: 'Cambiar a vista lista',
          grid: 'Cambiar a vista grilla',
          kanban: 'Cambiar a vista kanban',
        },
      },
    },
    AsesorContactos: {
      drawer: {
        tabs: { aria: 'Pestañas del detalle de contacto', overview: 'Resumen', notes: 'Notas' },
      },
      notes: {
        level: { personal: 'Personal', colaborativo: 'Colaborativo', sistema: 'Sistema' },
        edited: 'editada',
        actions: {
          edit: 'Editar',
          editAria: 'Editar nota',
          delete: 'Eliminar',
          deleteAria: 'Eliminar nota',
          confirmDelete: 'Confirmar',
          confirmDeleteAria: 'Confirmar eliminación de nota',
          cancel: 'Cancelar',
        },
        editor: {
          ariaCreate: 'Crear nueva nota',
          ariaEdit: 'Editar nota existente',
          contentLabel: 'Contenido de la nota',
          levelLabel: 'Visibilidad',
          placeholder: 'Escribí una nota en Markdown…',
          create: 'Guardar nota',
          save: 'Guardar cambios',
          saving: 'Guardando…',
          cancel: 'Cancelar',
        },
        list: {
          loading: 'Cargando notas…',
          empty: 'Sin notas registradas para este contacto.',
          errorLoading: 'No se pudieron cargar las notas: {detail}',
        },
        errors: {
          createFailed: 'No se pudo crear la nota: {detail}',
          updateFailed: 'No se pudo actualizar la nota: {detail}',
          deleteFailed: 'No se pudo eliminar la nota: {detail}',
        },
      },
      copilot: {
        button: { label: 'Preguntale a Copilot', ariaOpen: 'Abrir Copilot para {name}' },
        dialog: {
          title: 'Sugerencias Copilot',
          aria: 'Sugerencias Copilot para {name}',
          contextSummary:
            '{name} — estado {status}, DISC {disc}, último contacto hace {days} días.',
          listAria: 'Top 3 sugerencias',
          close: 'Cerrar',
          closeAria: 'Cerrar Copilot',
          disclosureDeterministic:
            'Sugerencias deterministic — upgrade LLM en FASE 16+. Cero costo H1.',
        },
        priority: { high: 'Alta', med: 'Media', low: 'Baja' },
        leadStatus: {
          new: 'nuevo',
          qualified: 'calificado',
          nurturing: 'en seguimiento',
          converted: 'convertido',
          lost: 'perdido',
        },
        actions: {
          reEngagementTemplate: 'Plantilla de reactivación',
          discDDirectMessage: 'Mensaje directo y propuesta concreta',
          discICall: 'Llamada con calor humano y aspiraciones',
          discSReassure: 'Reasegurar sin presionar, dar tiempo',
          discCData: 'Enviar data, comparables y métricas',
          familyAmenitiesAndSchools: 'Mostrar amenities familiares y escuelas',
          scheduleVisitPriority: 'Agendar visita prioritaria',
          sendPersonalizedListing: 'Enviar listing personalizado por DISC y presupuesto',
        },
        reasons: {
          reasonInactiveLead: 'Pasaron más de 14 días sin contacto.',
          reasonDiscD: 'Perfil D responde mejor a directness y propuestas concretas.',
          reasonDiscI: 'Perfil I responde mejor a calor humano y conexión personal.',
          reasonDiscS: 'Perfil S necesita tiempo y reaseguramiento, no presión.',
          reasonDiscC: 'Perfil C decide con datos, comparables y métricas.',
          reasonLargeFamily: 'Familia grande prioriza amenities familiares y escuelas cercanas.',
          reasonQualifiedLead: 'Lead calificado — momentum alto para visita.',
          reasonDefaultFollowUp: 'Mantener cadencia con un listing alineado al perfil.',
        },
      },
    },
  },

  'pt-BR': {
    AsesorBusquedas: {
      kanban: {
        ariaLabel: 'Pipeline de buscas por status',
        emptyColumn: 'Sem buscas neste status.',
        stage: { activa: 'Ativas', pausada: 'Pausadas', cerrada: 'Encerradas' },
      },
      view: {
        ariaToggle: 'Modo de visualização',
        mode: { list: 'Lista', grid: 'Grade', kanban: 'Kanban' },
        ariaSelect: {
          list: 'Mudar para visualização lista',
          grid: 'Mudar para visualização grade',
          kanban: 'Mudar para visualização kanban',
        },
      },
    },
    AsesorContactos: {
      drawer: {
        tabs: { aria: 'Abas de detalhe do contato', overview: 'Resumo', notes: 'Notas' },
      },
      notes: {
        level: { personal: 'Pessoal', colaborativo: 'Colaborativo', sistema: 'Sistema' },
        edited: 'editada',
        actions: {
          edit: 'Editar',
          editAria: 'Editar nota',
          delete: 'Excluir',
          deleteAria: 'Excluir nota',
          confirmDelete: 'Confirmar',
          confirmDeleteAria: 'Confirmar exclusão da nota',
          cancel: 'Cancelar',
        },
        editor: {
          ariaCreate: 'Criar nova nota',
          ariaEdit: 'Editar nota existente',
          contentLabel: 'Conteúdo da nota',
          levelLabel: 'Visibilidade',
          placeholder: 'Escreva uma nota em Markdown…',
          create: 'Salvar nota',
          save: 'Salvar alterações',
          saving: 'Salvando…',
          cancel: 'Cancelar',
        },
        list: {
          loading: 'Carregando notas…',
          empty: 'Sem notas registradas para este contato.',
          errorLoading: 'Não foi possível carregar as notas: {detail}',
        },
        errors: {
          createFailed: 'Não foi possível criar a nota: {detail}',
          updateFailed: 'Não foi possível atualizar a nota: {detail}',
          deleteFailed: 'Não foi possível excluir a nota: {detail}',
        },
      },
      copilot: {
        button: { label: 'Pergunte ao Copilot', ariaOpen: 'Abrir Copilot para {name}' },
        dialog: {
          title: 'Sugestões Copilot',
          aria: 'Sugestões Copilot para {name}',
          contextSummary: '{name} — status {status}, DISC {disc}, último contato há {days} dias.',
          listAria: 'Top 3 sugestões',
          close: 'Fechar',
          closeAria: 'Fechar Copilot',
          disclosureDeterministic:
            'Sugestões determinísticas — upgrade LLM na FASE 16+. Custo zero H1.',
        },
        priority: { high: 'Alta', med: 'Média', low: 'Baixa' },
        leadStatus: {
          new: 'novo',
          qualified: 'qualificado',
          nurturing: 'em acompanhamento',
          converted: 'convertido',
          lost: 'perdido',
        },
        actions: {
          reEngagementTemplate: 'Modelo de reengajamento',
          discDDirectMessage: 'Mensagem direta e proposta concreta',
          discICall: 'Ligação com calor humano e aspirações',
          discSReassure: 'Reassegurar sem pressionar, dar tempo',
          discCData: 'Enviar dados, comparáveis e métricas',
          familyAmenitiesAndSchools: 'Mostrar amenidades familiares e escolas',
          scheduleVisitPriority: 'Agendar visita prioritária',
          sendPersonalizedListing: 'Enviar listing personalizado por DISC e orçamento',
        },
        reasons: {
          reasonInactiveLead: 'Mais de 14 dias sem contato.',
          reasonDiscD: 'Perfil D responde melhor a diretividade e propostas concretas.',
          reasonDiscI: 'Perfil I responde melhor a calor humano e conexão pessoal.',
          reasonDiscS: 'Perfil S precisa de tempo e reasseguramento, não pressão.',
          reasonDiscC: 'Perfil C decide com dados, comparáveis e métricas.',
          reasonLargeFamily: 'Família grande prioriza amenidades familiares e escolas próximas.',
          reasonQualifiedLead: 'Lead qualificado — momentum alto para visita.',
          reasonDefaultFollowUp: 'Manter cadência com um listing alinhado ao perfil.',
        },
      },
    },
  },

  'en-US': {
    AsesorBusquedas: {
      kanban: {
        ariaLabel: 'Searches pipeline by status',
        emptyColumn: 'No searches in this status.',
        stage: { activa: 'Active', pausada: 'Paused', cerrada: 'Closed' },
      },
      view: {
        ariaToggle: 'View mode',
        mode: { list: 'List', grid: 'Grid', kanban: 'Kanban' },
        ariaSelect: {
          list: 'Switch to list view',
          grid: 'Switch to grid view',
          kanban: 'Switch to kanban view',
        },
      },
    },
    AsesorContactos: {
      drawer: {
        tabs: { aria: 'Contact detail tabs', overview: 'Overview', notes: 'Notes' },
      },
      notes: {
        level: { personal: 'Personal', colaborativo: 'Collaborative', sistema: 'System' },
        edited: 'edited',
        actions: {
          edit: 'Edit',
          editAria: 'Edit note',
          delete: 'Delete',
          deleteAria: 'Delete note',
          confirmDelete: 'Confirm',
          confirmDeleteAria: 'Confirm note deletion',
          cancel: 'Cancel',
        },
        editor: {
          ariaCreate: 'Create new note',
          ariaEdit: 'Edit existing note',
          contentLabel: 'Note content',
          levelLabel: 'Visibility',
          placeholder: 'Write a note in Markdown…',
          create: 'Save note',
          save: 'Save changes',
          saving: 'Saving…',
          cancel: 'Cancel',
        },
        list: {
          loading: 'Loading notes…',
          empty: 'No notes recorded for this contact.',
          errorLoading: 'Could not load notes: {detail}',
        },
        errors: {
          createFailed: 'Could not create note: {detail}',
          updateFailed: 'Could not update note: {detail}',
          deleteFailed: 'Could not delete note: {detail}',
        },
      },
      copilot: {
        button: { label: 'Ask Copilot', ariaOpen: 'Open Copilot for {name}' },
        dialog: {
          title: 'Copilot suggestions',
          aria: 'Copilot suggestions for {name}',
          contextSummary: '{name} — status {status}, DISC {disc}, last contact {days} days ago.',
          listAria: 'Top 3 suggestions',
          close: 'Close',
          closeAria: 'Close Copilot',
          disclosureDeterministic:
            'Deterministic suggestions — LLM upgrade in PHASE 16+. Zero H1 cost.',
        },
        priority: { high: 'High', med: 'Medium', low: 'Low' },
        leadStatus: {
          new: 'new',
          qualified: 'qualified',
          nurturing: 'nurturing',
          converted: 'converted',
          lost: 'lost',
        },
        actions: {
          reEngagementTemplate: 'Re-engagement template',
          discDDirectMessage: 'Direct message with concrete proposal',
          discICall: 'Warm call connecting on aspirations',
          discSReassure: 'Reassure without pressuring, give time',
          discCData: 'Send data, comparables and metrics',
          familyAmenitiesAndSchools: 'Show family amenities and schools',
          scheduleVisitPriority: 'Schedule priority visit',
          sendPersonalizedListing: 'Send personalized listing by DISC and budget',
        },
        reasons: {
          reasonInactiveLead: 'More than 14 days without contact.',
          reasonDiscD: 'D profile responds best to directness and concrete proposals.',
          reasonDiscI: 'I profile responds best to warmth and personal connection.',
          reasonDiscS: 'S profile needs time and reassurance, not pressure.',
          reasonDiscC: 'C profile decides with data, comparables and metrics.',
          reasonLargeFamily: 'Large family prioritizes family amenities and nearby schools.',
          reasonQualifiedLead: 'Qualified lead — high momentum for visit.',
          reasonDefaultFollowUp: 'Keep cadence with a listing aligned to the profile.',
        },
      },
    },
  },
};

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    const sv = source[key];
    if (sv !== null && typeof sv === 'object' && !Array.isArray(sv)) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      deepMerge(target[key], sv);
    } else {
      target[key] = sv;
    }
  }
  return target;
}

let totalKeys = 0;
function countLeaves(obj) {
  let n = 0;
  for (const v of Object.values(obj)) {
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) n += countLeaves(v);
    else n += 1;
  }
  return n;
}

for (const locale of LOCALES) {
  const path = resolve(ROOT, 'messages', `${locale}.json`);
  const raw = readFileSync(path, 'utf8');
  const obj = JSON.parse(raw);
  const before = JSON.stringify(obj);
  deepMerge(obj, ADDITIONS[locale]);
  const after = JSON.stringify(obj);
  if (before === after) {
    console.log(`= ${locale}: no changes`);
    continue;
  }
  writeFileSync(path, `${JSON.stringify(obj, null, 2)}\n`, 'utf8');
  const k = countLeaves(ADDITIONS[locale]);
  if (locale === 'es-MX') totalKeys = k;
  console.log(`+ ${locale}: injected ${k} leaf keys`);
}

console.log(`\nTotal new leaf keys per locale: ${totalKeys}`);
console.log('Done.');
