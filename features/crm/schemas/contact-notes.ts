// Re-export shared schema (canonical source: shared/schemas/contact-notes.ts).
// UI components import desde shared/ directamente. CRM router también puede consumir
// desde shared/, pero mantenemos este re-export para retrocompat de features/crm/schemas/index.ts.
export * from '@/shared/schemas/contact-notes';
