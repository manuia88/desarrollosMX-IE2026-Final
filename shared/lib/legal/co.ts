export const LEGAL_CONFIG_CO = {
  country_code: 'CO',
  esign: {
    provider: 'certicamara',
    fallback: 'docusign',
    regulation: 'Ley 527/1999',
    cert_authorities: ['certicamara', 'gse'],
  },
  contracts: {
    promesa_compraventa: {
      template_id: 'co.promesa_v1',
      required_fields: ['cedula_comprador', 'cedula_vendedor', 'matricula_inmobiliaria'],
    },
    escrituracion: {
      template_id: 'co.escritura_v1',
      required_fields: ['notaria_numero', 'escritura_numero', 'matricula_inmobiliaria'],
    },
    contrato_arrendamiento: {
      template_id: 'co.arrendamiento_v1',
      required_fields: ['cedula_arrendador', 'cedula_arrendatario'],
    },
  },
  privacy: {
    regulation: 'Ley 1581/2012',
    cookie_banner_required: true,
    dpa_template: 'co_dpa_v1',
    retention_years: 10,
    sic_registration_required: true,
  },
  disclosures: {
    tratamiento_datos_required: true,
    uiaf_threshold_cop: 450000000,
  },
} as const;
