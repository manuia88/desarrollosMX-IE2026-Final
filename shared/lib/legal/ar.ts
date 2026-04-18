export const LEGAL_CONFIG_AR = {
  country_code: 'AR',
  esign: {
    provider: 'docusign_ar',
    fallback: 'docusign',
    regulation: 'Ley 25.506',
    cert_authorities: ['afip', 'onti'],
  },
  contracts: {
    boleto_compraventa: {
      template_id: 'ar.boleto_v1',
      required_fields: ['cuit_comprador', 'cuit_vendedor', 'matricula'],
    },
    escrituracion: {
      template_id: 'ar.escritura_v1',
      required_fields: ['escribano_matricula', 'colegio_escribanos'],
    },
    contrato_locacion: {
      template_id: 'ar.locacion_v1',
      required_fields: ['cuit_locador', 'cuit_locatario', 'garantia'],
      regulation: 'Ley 25.028 (Corretaje) + Ley 27.551 (Alquileres)',
    },
  },
  privacy: {
    regulation: 'Ley 25.326',
    cookie_banner_required: true,
    dpa_template: 'ar_dpa_v1',
    retention_years: 5,
    aaip_registration_required: true,
  },
  disclosures: {
    aviso_privacidad_required: true,
    uif_threshold_ars: 1500000,
  },
} as const;
