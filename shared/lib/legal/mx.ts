export const LEGAL_CONFIG_MX = {
  country_code: 'MX',
  esign: {
    provider: 'mifiel',
    fallback: 'docusign',
    regulation: 'NOM-151-SCFI-2017',
    cert_authorities: ['fiel_sat'],
  },
  contracts: {
    promesa_compraventa: {
      template_id: 'mx.promesa_v1',
      required_fields: ['rfc_comprador', 'rfc_vendedor', 'testigos:2'],
    },
    escrituracion: {
      template_id: 'mx.escritura_v1',
      required_fields: ['notario_numero', 'rfc_notario', 'cp_inmueble'],
    },
    contrato_arrendamiento: {
      template_id: 'mx.arrendamiento_v1',
      required_fields: ['rfc_arrendador', 'rfc_arrendatario', 'aval'],
    },
  },
  privacy: {
    regulation: 'LFPDPPP',
    cookie_banner_required: true,
    dpa_template: 'mx_dpa_v1',
    retention_years: 10,
  },
  disclosures: {
    aviso_privacidad_required: true,
    pld_threshold_mxn: 645000,
  },
} as const;
