-- Seed feature_registry + role_features
-- FASE 01 / MÓDULO 1.H.1
-- Ref: docs/02_PLAN_MAESTRO/FASE_01_BD_FUNDACION.md §1.H.1
-- Ref: docs/03_CATALOGOS/03.10_CATALOGO_FEATURES_REGISTRY.md
--
-- Poblamos 120 features distribuidos en 6 categorías:
--   asesor=35, dev=30, admin=15, comprador=15, public=10, shared=15
--
-- NOTA: public.plans aún no tiene seed (FASE 23 lo hace), por eso min_plan
-- queda NULL en todas las filas. El tier premium se marca vía is_premium;
-- el binding al plan code ocurre en la fase de billing.
--
-- Convención de code: {category}.{module}.{feature} en snake_case.
-- Todos con is_enabled=true (gate runtime va por rol + override, no por este flag).
-- Idempotente: ON CONFLICT DO NOTHING en todos los INSERTs.

-- ============================================================
-- Categoría: asesor (35 features)
-- ============================================================
insert into public.feature_registry
  (code, category, module, name_en, name_es, description_es, is_premium, min_plan, is_beta, is_enabled, h_phase)
values
  ('asesor.dashboard.overview',            'asesor', 'dashboard',    'Advisor Dashboard Overview',       'Resumen del dashboard asesor',         'Panel principal con KPIs, tareas y pipeline del asesor.',                   false, null, false, true, 1),
  ('asesor.dashboard.leaderboard',         'asesor', 'dashboard',    'Team Leaderboard',                 'Leaderboard del equipo',               'Ranking del asesor vs. su equipo y zona.',                                  false, null, false, true, 1),
  ('asesor.dashboard.gamification',        'asesor', 'dashboard',    'Gamification Panel',               'Panel de gamification',                'Badges, streaks y XP del asesor.',                                          false, null, false, true, 1),
  ('asesor.dashboard.ingresos',            'asesor', 'dashboard',    'Income Dashboard',                 'Dashboard de ingresos',                'Vista consolidada de comisiones cobradas y por cobrar.',                    true,  null, false, true, 1),
  ('asesor.busquedas.basic',               'asesor', 'busquedas',    'Basic Search',                     'Búsqueda básica',                      'Búsquedas por zona, precio, tipo.',                                         false, null, false, true, 1),
  ('asesor.busquedas.advanced_filters',    'asesor', 'busquedas',    'Advanced Filters',                 'Filtros avanzados',                    'Filtros por amenities, scoring IE, ROI.',                                   true,  null, false, true, 1),
  ('asesor.busquedas.save',                'asesor', 'busquedas',    'Save Search',                      'Guardar búsqueda',                     'Persistir búsquedas para reutilizar.',                                      false, null, false, true, 1),
  ('asesor.busquedas.alerts',              'asesor', 'busquedas',    'Search Alerts',                    'Alertas de búsqueda',                  'Alertas por email/WA cuando aparecen nuevas coincidencias.',                true,  null, false, true, 1),
  ('asesor.captaciones.create',            'asesor', 'captaciones',  'Create Listing',                   'Crear captación',                      'Alta de captación con fotos, precio y ACM.',                                false, null, false, true, 1),
  ('asesor.captaciones.match',             'asesor', 'captaciones',  'Listing Match',                    'Match de captaciones',                 'Match automático de captaciones con clientes activos.',                     true,  null, false, true, 1),
  ('asesor.captaciones.acm',               'asesor', 'captaciones',  'Comparative Market Analysis',      'Análisis comparativo de mercado',      'Generar ACM con comparables.',                                              true,  null, false, true, 1),
  ('asesor.tareas.create',                 'asesor', 'tareas',       'Create Task',                      'Crear tarea',                          'Alta de tareas con due date y asignado.',                                   false, null, false, true, 1),
  ('asesor.tareas.recurring',              'asesor', 'tareas',       'Recurring Tasks',                  'Tareas recurrentes',                   'Tareas que se repiten con cadencia configurable.',                          true,  null, false, true, 1),
  ('asesor.tareas.agenda',                 'asesor', 'tareas',       'Agenda View',                      'Agenda',                               'Vista calendario con tareas y visitas.',                                    false, null, false, true, 1),
  ('asesor.operaciones.pipeline',          'asesor', 'operaciones',  'Operations Pipeline',              'Pipeline de operaciones',              'Pipeline Kanban con etapas de la operación.',                               false, null, false, true, 1),
  ('asesor.operaciones.commission_split',  'asesor', 'operaciones',  'Commission Split',                 'Split de comisiones',                  'Reparto de comisión entre asesor, broker y aliados.',                       true,  null, false, true, 1),
  ('asesor.operaciones.visitas',           'asesor', 'operaciones',  'Visits Scheduling',                'Agenda de visitas',                    'Agendar y confirmar visitas con cliente y propiedad.',                      false, null, false, true, 1),
  ('asesor.operaciones.documentos',        'asesor', 'operaciones',  'Operation Documents',              'Documentos de operación',              'Subir y firmar documentos asociados a la operación.',                       false, null, false, true, 1),
  ('asesor.contactos.crm',                 'asesor', 'contactos',    'Contacts CRM',                     'CRM de contactos',                     'Gestión básica de contactos, notas y timeline.',                            false, null, false, true, 1),
  ('asesor.contactos.import',              'asesor', 'contactos',    'Bulk Contact Import',              'Importar contactos',                   'Importación CSV masiva de contactos.',                                      true,  null, false, true, 1),
  ('asesor.contactos.portal_comprador',    'asesor', 'contactos',    'Buyer Portal Invite',              'Portal del comprador',                 'Invitar al contacto al portal privado.',                                    false, null, false, true, 1),
  ('asesor.contactos.referrals',           'asesor', 'contactos',    'Referrals Program',                'Programa de referidos',                'Registrar y trackear referidos de contactos.',                              false, null, false, true, 1),
  ('asesor.marketing.posts',               'asesor', 'marketing',    'Social Posts',                     'Publicaciones sociales',               'Crear posts para redes desde el inventario.',                               false, null, false, true, 1),
  ('asesor.marketing.campaigns',           'asesor', 'marketing',    'Marketing Campaigns',              'Campañas de marketing',                'Campañas email/WA con segmentación.',                                       true,  null, false, true, 1),
  ('asesor.marketing.whatsapp_business',   'asesor', 'marketing',    'WhatsApp Business',                'WhatsApp Business',                    'Integración WA Business para mensajes y templates.',                        true,  null, false, true, 1),
  ('asesor.estadisticas.personal',         'asesor', 'estadisticas', 'Personal Stats',                   'Estadísticas personales',              'Métricas individuales del asesor.',                                         false, null, false, true, 1),
  ('asesor.estadisticas.compare_team',     'asesor', 'estadisticas', 'Compare vs Team',                  'Comparar vs. equipo',                  'Benchmark del asesor contra su equipo.',                                    false, null, false, true, 1),
  ('asesor.ai.copilot',                    'asesor', 'ai',           'AI Copilot Sidebar',               'Copiloto IA',                          'Copilot persistente en toda la app.',                                       true,  null, true,  true, 1),
  ('asesor.ai.command_palette',            'asesor', 'ai',           'AI Command Palette',               'Paleta de comandos IA',                'Command palette (Cmd+K) con acciones IA.',                                  false, null, false, true, 1),
  ('asesor.ai.voice',                      'asesor', 'ai',           'Voice Interaction',                'Interacción por voz',                  'Comandos de voz web speech.',                                               true,  null, true,  true, 2),
  ('asesor.ai.dossiers',                   'asesor', 'ai',           'AI Dossiers Generator',            'Generador de dossiers IA',             'Generar dossiers PDF automáticos por propiedad.',                           true,  null, false, true, 1),
  ('asesor.ia.match_recommendations',      'asesor', 'ia',           'Match Recommendations',            'Recomendaciones de match',             'IA que sugiere matches entre clientes y propiedades.',                      true,  null, false, true, 1),
  ('asesor.ia.analisis_zona',              'asesor', 'ia',           'Zone Analysis',                    'Análisis de zona',                     'Resumen IA de la zona con indicadores económicos.',                         true,  null, false, true, 1),
  ('asesor.onboarding.wizard',             'asesor', 'onboarding',   'Onboarding Wizard',                'Asistente de onboarding',              'Wizard guiado al alta del asesor.',                                         false, null, false, true, 1),
  ('asesor.certificaciones.badges',        'asesor', 'certificaciones','Certification Badges',           'Insignias de certificación',           'Mostrar certificaciones validadas del asesor.',                             false, null, false, true, 2)
on conflict (code) do nothing;

-- ============================================================
-- Categoría: dev (30 features) — desarrolladora / broker company
-- ============================================================
insert into public.feature_registry
  (code, category, module, name_en, name_es, description_es, is_premium, min_plan, is_beta, is_enabled, h_phase)
values
  ('dev.inventory.crud',                   'dev', 'inventory',     'Inventory CRUD',                     'Inventario CRUD',                      'Alta, edición y baja de proyectos y unidades.',                             false, null, false, true, 1),
  ('dev.inventory.bulk_import',            'dev', 'inventory',     'Bulk Inventory Import',              'Importación masiva de inventario',     'Importación XLSX/CSV de unidades.',                                         true,  null, false, true, 1),
  ('dev.inventory.bulk_update',            'dev', 'inventory',     'Bulk Unit Update',                   'Actualización masiva de unidades',     'Edición masiva de precios y estatus de unidades.',                          true,  null, false, true, 1),
  ('dev.inventory.avance_obra',            'dev', 'inventory',     'Construction Progress Log',          'Bitácora de avance de obra',           'Registro mensual del avance por etapa.',                                    false, null, false, true, 1),
  ('dev.proyectos.landing',                'dev', 'proyectos',     'Project Landing Page',               'Landing de proyecto',                  'Landing pública por proyecto con galería y media.',                         false, null, false, true, 1),
  ('dev.proyectos.kpis',                   'dev', 'proyectos',     'Project KPIs',                       'KPIs de proyecto',                     'Dashboard de absorción, inventario y velocidad.',                           true,  null, false, true, 1),
  ('dev.proyectos.reportes',               'dev', 'proyectos',     'Project Reports',                    'Reportes de proyecto',                 'Reportes ejecutivos exportables.',                                          false, null, false, true, 1),
  ('dev.contabilidad.cfdi_emit',           'dev', 'contabilidad',  'Issue CFDI',                         'Emitir CFDI',                          'Timbrado de CFDI 4.0 vía PAC.',                                             true,  null, false, true, 1),
  ('dev.contabilidad.cfdi_cancel',         'dev', 'contabilidad',  'Cancel CFDI',                        'Cancelar CFDI',                        'Cancelación de CFDI con motivo.',                                           true,  null, false, true, 1),
  ('dev.contabilidad.bank_reconciliation', 'dev', 'contabilidad',  'Bank Reconciliation',                'Conciliación bancaria',                'Conciliación OFX/CSV con movimientos.',                                     true,  null, false, true, 1),
  ('dev.contabilidad.payout_program',      'dev', 'contabilidad',  'Payout Programs',                    'Programación de payouts',              'Calendarizar payouts de comisiones.',                                       true,  null, false, true, 1),
  ('dev.contabilidad.commission_holdback', 'dev', 'contabilidad',  'Commission Holdback',                'Retención de comisión',                'Retener parte de comisión hasta cierre.',                                   true,  null, false, true, 1),
  ('dev.contabilidad.cuentas_bancarias',   'dev', 'contabilidad',  'Bank Accounts',                      'Cuentas bancarias',                    'Catálogo de cuentas bancarias vinculadas.',                                 false, null, false, true, 1),
  ('dev.contabilidad.reportes_fiscales',   'dev', 'contabilidad',  'Tax Reports',                        'Reportes fiscales',                    'Reportes IVA/ISR exportables para contador.',                               true,  null, false, true, 1),
  ('dev.contabilidad.export_xml',          'dev', 'contabilidad',  'XML Export',                         'Exportar XML',                         'Exportar XMLs CFDI para descarga batch.',                                   false, null, false, true, 1),
  ('dev.pagos.stripe_connect',             'dev', 'pagos',         'Stripe Connect',                     'Stripe Connect',                       'Cobros y splits vía Stripe Connect.',                                       true,  null, false, true, 1),
  ('dev.pagos.mercadopago',                'dev', 'pagos',         'Mercado Pago',                       'Mercado Pago',                         'Cobros MXN vía Mercado Pago.',                                              true,  null, false, true, 1),
  ('dev.analytics.ie_integration',         'dev', 'analytics',     'IE Integration',                     'Integración IE',                       'Scoring IE sincronizado al inventario.',                                    true,  null, false, true, 1),
  ('dev.analytics.scoring',                'dev', 'analytics',     'Project Scoring',                    'Scoring de proyecto',                  'Calcular y visualizar scores del proyecto.',                                true,  null, false, true, 1),
  ('dev.crm.leads',                        'dev', 'crm',           'Leads CRM',                          'CRM de leads',                         'Gestión de leads captados desde landings.',                                 false, null, false, true, 1),
  ('dev.crm.leads_scoring',                'dev', 'crm',           'Leads Scoring',                      'Scoring de leads',                     'Priorización automática de leads.',                                         false, null, false, true, 1),
  ('dev.crm.pipeline_ventas',              'dev', 'crm',           'Sales Pipeline',                     'Pipeline de ventas',                   'Kanban de ventas por etapa.',                                               false, null, false, true, 1),
  ('dev.marketing.campaigns',              'dev', 'marketing',     'Developer Marketing Campaigns',      'Campañas de la desarrolladora',        'Campañas al público desde la desarrolladora.',                              true,  null, false, true, 1),
  ('dev.webhooks.outbound',                'dev', 'webhooks',      'Outbound Webhooks',                  'Webhooks salientes',                   'Webhooks outbound a sistemas externos.',                                    true,  null, false, true, 1),
  ('dev.webhooks.inbound',                 'dev', 'webhooks',      'Inbound Webhooks',                   'Webhooks entrantes',                   'Recibir eventos de ERPs y portales.',                                       true,  null, false, true, 1),
  ('dev.sellers.admin',                    'dev', 'sellers',       'Sellers Admin',                      'Administración de sellers',            'Alta y gestión del equipo interno de ventas.',                              false, null, false, true, 1),
  ('dev.sellers.bonus',                    'dev', 'sellers',       'Sellers Bonus',                      'Bonos de sellers',                     'Reglas y liquidación de bonos para sellers.',                               true,  null, false, true, 1),
  ('dev.sellers.comisiones_approval',      'dev', 'sellers',       'Commission Approval',                'Aprobación de comisiones',             'Flujo de aprobación multi-nivel de comisiones.',                            true,  null, false, true, 1),
  ('dev.obra.tareas',                      'dev', 'obra',          'Construction Tasks',                 'Tareas de obra',                       'Tareas asociadas a etapas de obra.',                                        false, null, false, true, 1),
  ('dev.obra.reportes',                    'dev', 'obra',          'Construction Reports',               'Reportes de obra',                     'Reportes semanales de avance de obra.',                                     false, null, false, true, 1)
on conflict (code) do nothing;

-- ============================================================
-- Categoría: admin (15 features) — mb_admin / superadmin
-- ============================================================
insert into public.feature_registry
  (code, category, module, name_en, name_es, description_es, is_premium, min_plan, is_beta, is_enabled, h_phase)
values
  ('admin.users.manage',                   'admin', 'users',          'Manage Users',                    'Gestión de usuarios',                  'Alta, edición y suspensión de usuarios.',                                   false, null, false, true, 1),
  ('admin.desarrolladoras.approve',        'admin', 'desarrolladoras','Approve Developers',              'Aprobar desarrolladoras',              'Workflow de aprobación de desarrolladoras nuevas.',                         false, null, false, true, 1),
  ('admin.organizations.approve',          'admin', 'organizations',  'Approve Organizations',           'Aprobar organizaciones',               'Aprobar agencias y brokers.',                                               false, null, false, true, 1),
  ('admin.market_observatory',             'admin', 'observatorio',   'Market Observatory',              'Observatorio de mercado',              'Observatorio 7-capas con métricas globales.',                               true,  null, false, true, 1),
  ('admin.audit_log.view',                 'admin', 'audit_log',      'View Audit Log',                  'Ver log de auditoría',                 'Consulta del audit log con filtros.',                                       false, null, false, true, 1),
  ('admin.feature_flags.edit',             'admin', 'feature_flags',  'Edit Feature Flags',              'Editar feature flags',                 'Edición runtime de feature flags.',                                         false, null, false, true, 1),
  ('admin.reports.export',                 'admin', 'reports',        'Export Reports',                  'Exportar reportes',                    'Exportar reportes ejecutivos CSV/XLSX.',                                    false, null, false, true, 1),
  ('admin.plans.manage',                   'admin', 'plans',          'Manage Plans',                    'Gestión de planes',                    'Alta y edición de planes y pricing.',                                       false, null, false, true, 1),
  ('admin.scores.manual_override',         'admin', 'scores',         'Manual Score Override',           'Override manual de scores',            'Override manual de scores IE.',                                             true,  null, false, true, 1),
  ('admin.integrations.manage',            'admin', 'integrations',   'Manage Integrations',             'Gestión de integraciones',             'Configurar PAC, Stripe, portales y otros.',                                 true,  null, false, true, 1),
  ('admin.system_status',                  'admin', 'system',         'System Status',                   'Estado del sistema',                   'Panel de salud y uptime.',                                                  false, null, false, true, 1),
  ('admin.backup_restore',                 'admin', 'backup',         'Backup and Restore',              'Respaldo y restauración',              'Respaldos on-demand y restauración.',                                       true,  null, false, true, 1),
  ('admin.compliance.reports',             'admin', 'compliance',     'Compliance Reports',              'Reportes de cumplimiento',             'Reportes AML/KYC y PLD.',                                                   true,  null, false, true, 2),
  ('admin.localization.translate',         'admin', 'localization',   'Manage Translations',             'Gestión de traducciones',              'Editar mensajes i18n desde la UI.',                                         false, null, false, true, 2),
  ('admin.impersonation',                  'admin', 'impersonation',  'User Impersonation',              'Impersonación de usuario',             'Login como usuario para soporte (con audit).',                              true,  null, false, true, 1)
on conflict (code) do nothing;

-- ============================================================
-- Categoría: comprador (15 features)
-- ============================================================
insert into public.feature_registry
  (code, category, module, name_en, name_es, description_es, is_premium, min_plan, is_beta, is_enabled, h_phase)
values
  ('comprador.wishlist',                   'comprador', 'wishlist',        'Wishlist',                   'Favoritos',                            'Lista de favoritos del comprador.',                                         false, null, false, true, 1),
  ('comprador.family_account',             'comprador', 'family',          'Family Account',             'Cuenta familiar',                      'Cuenta compartida con hasta 3 perfiles.',                                   true,  null, false, true, 1),
  ('comprador.preapproval_integrations',   'comprador', 'preaprobacion',   'Pre-Approval Integrations',  'Integraciones de preaprobación',       'Preaprobación crediticia con partners.',                                    true,  null, false, true, 1),
  ('comprador.voice_search',               'comprador', 'search',          'Voice Search',               'Búsqueda por voz',                     'Búsqueda de inmuebles por voz.',                                            true,  null, true,  true, 2),
  ('comprador.apartado_escrow',            'comprador', 'apartado',        'Escrow Reservation',         'Apartado en escrow',                   'Apartar inmueble con escrow Stripe.',                                       true,  null, true,  true, 1),
  ('comprador.dossier.download',           'comprador', 'dossier',         'Download Dossier',           'Descargar dossier',                    'Descargar dossier PDF del inmueble.',                                       false, null, false, true, 1),
  ('comprador.financing.simulator',        'comprador', 'financiamiento',  'Financing Simulator',        'Simulador de financiamiento',          'Simular mensualidades y escenarios.',                                       false, null, false, true, 1),
  ('comprador.chat.whatsapp',              'comprador', 'chat',            'WhatsApp Chat',              'Chat por WhatsApp',                    'Contactar al asesor por WA.',                                               false, null, false, true, 1),
  ('comprador.compare.projects',           'comprador', 'comparar',        'Compare Projects',           'Comparar proyectos',                   'Comparador lado a lado.',                                                   false, null, false, true, 1),
  ('comprador.virtual_tour',               'comprador', 'tour',            'Virtual Tour',               'Tour virtual',                         'Tour 360 del inmueble.',                                                    true,  null, false, true, 1),
  ('comprador.similares',                  'comprador', 'similares',       'Similar Properties',         'Propiedades similares',                'Recomendaciones IA de similares.',                                          false, null, false, true, 1),
  ('comprador.history',                    'comprador', 'historial',       'Browsing History',           'Historial de navegación',              'Historial de propiedades vistas.',                                          false, null, false, true, 1),
  ('comprador.alerts',                     'comprador', 'alerts',          'Price & Match Alerts',       'Alertas de precio y match',            'Alertas por cambios y nuevos matches.',                                     false, null, false, true, 1),
  ('comprador.share',                      'comprador', 'share',           'Share Property',             'Compartir inmueble',                   'Compartir por WA, email y link.',                                           false, null, false, true, 1),
  ('comprador.rfc_upload',                 'comprador', 'documentos',      'Upload RFC',                 'Subir RFC',                            'Subir constancia de situación fiscal.',                                     false, null, false, true, 1)
on conflict (code) do nothing;

-- ============================================================
-- Categoría: public (10 features) — portal público / vendedor_publico
-- ============================================================
insert into public.feature_registry
  (code, category, module, name_en, name_es, description_es, is_premium, min_plan, is_beta, is_enabled, h_phase)
values
  ('public.marketplace.browse',            'public', 'marketplace',   'Browse Marketplace',              'Explorar marketplace',                 'Exploración pública del marketplace.',                                      false, null, false, true, 1),
  ('public.indices.view',                  'public', 'indices',       'View Indices',                    'Ver índices',                          'Ver índices IE publicados.',                                                false, null, false, true, 1),
  ('public.indices.global',                'public', 'indices',       'Global Index View',               'Índice global',                        'Índice nacional publicado.',                                                false, null, false, true, 1),
  ('public.indices.zona',                  'public', 'indices',       'Zone Index View',                 'Índice por zona',                      'Índice por zona publicado.',                                                false, null, false, true, 1),
  ('public.metodologia.view',              'public', 'metodologia',   'Methodology',                     'Metodología',                          'Documento de metodología IE.',                                              false, null, false, true, 1),
  ('public.blog',                          'public', 'blog',          'Blog',                            'Blog',                                 'Blog público del sitio.',                                                   false, null, false, true, 1),
  ('public.blog.categoria',                'public', 'blog',          'Blog Category',                   'Categoría del blog',                   'Listado del blog filtrado por categoría.',                                  false, null, false, true, 1),
  ('public.blog.autor',                    'public', 'blog',          'Blog Author',                     'Autor del blog',                       'Perfil público del autor.',                                                 false, null, false, true, 1),
  ('public.newsletter.signup',             'public', 'newsletter',    'Newsletter Signup',               'Alta en newsletter',                   'Alta pública al newsletter.',                                               false, null, false, true, 1),
  ('public.contact.form',                  'public', 'contact',       'Contact Form',                    'Formulario de contacto',               'Formulario de contacto público.',                                           false, null, false, true, 1)
on conflict (code) do nothing;

-- ============================================================
-- Categoría: shared (15 features) — cross-rol
-- ============================================================
insert into public.feature_registry
  (code, category, module, name_en, name_es, description_es, is_premium, min_plan, is_beta, is_enabled, h_phase)
values
  ('shared.i18n.switch_locale',            'shared', 'i18n',          'Switch Locale',                   'Cambiar idioma',                       'Selector de idioma (es-MX, es-CO, es-AR, pt-BR, en-US).',                   false, null, false, true, 1),
  ('shared.currency.switch',               'shared', 'currency',      'Switch Currency',                 'Cambiar moneda',                       'Selector de moneda por país.',                                              false, null, false, true, 1),
  ('shared.notifications.inapp',           'shared', 'notifications', 'In-App Notifications',            'Notificaciones in-app',                'Centro de notificaciones in-app.',                                          false, null, false, true, 1),
  ('shared.notifications.whatsapp',        'shared', 'notifications', 'WhatsApp Notifications',          'Notificaciones por WhatsApp',          'Notificaciones vía WhatsApp.',                                              true,  null, false, true, 1),
  ('shared.notifications.email',           'shared', 'notifications', 'Email Notifications',             'Notificaciones por email',             'Notificaciones vía email.',                                                 false, null, false, true, 1),
  ('shared.notifications.push',            'shared', 'notifications', 'Push Notifications',              'Notificaciones push',                  'Notificaciones push mobile.',                                               false, null, false, true, 2),
  ('shared.mfa.totp',                      'shared', 'mfa',           'TOTP MFA',                        'MFA TOTP',                             'Segundo factor con app autenticadora.',                                     false, null, false, true, 1),
  ('shared.mfa.sms_backup',                'shared', 'mfa',           'SMS Backup Code',                 'Respaldo SMS',                         'Respaldo MFA vía SMS.',                                                     false, null, false, true, 1),
  ('shared.mfa.recovery',                  'shared', 'mfa',           'MFA Recovery',                    'Recuperación MFA',                     'Recuperación de MFA con códigos.',                                          false, null, false, true, 1),
  ('shared.profile.edit',                  'shared', 'profile',       'Edit Profile',                    'Editar perfil',                        'Edición de datos de perfil.',                                               false, null, false, true, 1),
  ('shared.profile.avatar',                'shared', 'profile',       'Profile Avatar',                  'Avatar de perfil',                     'Subir y gestionar avatar.',                                                 false, null, false, true, 1),
  ('shared.auth.password_reset',           'shared', 'auth',          'Password Reset',                  'Reseteo de contraseña',                'Flujo de recuperación de contraseña.',                                      false, null, false, true, 1),
  ('shared.i18n.language_autodetect',      'shared', 'i18n',          'Language Autodetect',             'Detección automática de idioma',       'Detectar el idioma del navegador.',                                         false, null, false, true, 1),
  ('shared.theme.dark',                    'shared', 'theme',         'Dark Theme',                      'Tema oscuro',                          'Modo oscuro de la interfaz.',                                               false, null, false, true, 1),
  ('shared.accessibility',                 'shared', 'accessibility', 'Accessibility Preferences',       'Preferencias de accesibilidad',        'Preferencias A11y (reduced motion, contraste).',                            false, null, false, true, 1)
on conflict (code) do nothing;

-- ============================================================
-- role_features: defaults por rol
-- ============================================================

-- asesor: todas las features category='asesor' no-premium + todas las shared
insert into public.role_features (rol, feature_code)
select 'asesor'::public.user_role, code
from public.feature_registry
where category = 'asesor' and is_premium = false
on conflict (rol, feature_code) do nothing;

insert into public.role_features (rol, feature_code)
select 'asesor'::public.user_role, code
from public.feature_registry
where category = 'shared'
on conflict (rol, feature_code) do nothing;

-- broker_manager: todas las features category='asesor' (incluye premium) + todas las shared
insert into public.role_features (rol, feature_code)
select 'broker_manager'::public.user_role, code
from public.feature_registry
where category = 'asesor'
on conflict (rol, feature_code) do nothing;

insert into public.role_features (rol, feature_code)
select 'broker_manager'::public.user_role, code
from public.feature_registry
where category = 'shared'
on conflict (rol, feature_code) do nothing;

-- admin_desarrolladora: todas las features category='dev' + todas las shared
insert into public.role_features (rol, feature_code)
select 'admin_desarrolladora'::public.user_role, code
from public.feature_registry
where category = 'dev'
on conflict (rol, feature_code) do nothing;

insert into public.role_features (rol, feature_code)
select 'admin_desarrolladora'::public.user_role, code
from public.feature_registry
where category = 'shared'
on conflict (rol, feature_code) do nothing;

-- mb_admin: admin + dev + asesor + shared
insert into public.role_features (rol, feature_code)
select 'mb_admin'::public.user_role, code
from public.feature_registry
where category in ('admin', 'dev', 'asesor', 'shared')
on conflict (rol, feature_code) do nothing;

-- mb_coordinator: asesor no-premium + shared
insert into public.role_features (rol, feature_code)
select 'mb_coordinator'::public.user_role, code
from public.feature_registry
where category = 'asesor' and is_premium = false
on conflict (rol, feature_code) do nothing;

insert into public.role_features (rol, feature_code)
select 'mb_coordinator'::public.user_role, code
from public.feature_registry
where category = 'shared'
on conflict (rol, feature_code) do nothing;

-- comprador: comprador + public + shared no-premium
insert into public.role_features (rol, feature_code)
select 'comprador'::public.user_role, code
from public.feature_registry
where category = 'comprador'
on conflict (rol, feature_code) do nothing;

insert into public.role_features (rol, feature_code)
select 'comprador'::public.user_role, code
from public.feature_registry
where category = 'public'
on conflict (rol, feature_code) do nothing;

insert into public.role_features (rol, feature_code)
select 'comprador'::public.user_role, code
from public.feature_registry
where category = 'shared' and is_premium = false
on conflict (rol, feature_code) do nothing;

-- vendedor_publico: todas las public + shared específicas (mfa.totp, notifications.inapp, profile.edit)
insert into public.role_features (rol, feature_code)
select 'vendedor_publico'::public.user_role, code
from public.feature_registry
where category = 'public'
on conflict (rol, feature_code) do nothing;

insert into public.role_features (rol, feature_code)
select 'vendedor_publico'::public.user_role, code
from public.feature_registry
where code in ('shared.mfa.totp', 'shared.notifications.inapp', 'shared.profile.edit')
on conflict (rol, feature_code) do nothing;

-- superadmin: todas las features del registro
insert into public.role_features (rol, feature_code)
select 'superadmin'::public.user_role, code
from public.feature_registry
on conflict (rol, feature_code) do nothing;
