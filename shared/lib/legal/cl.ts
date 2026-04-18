export const LEGAL_CONFIG_CL = {
  country_code: 'CL',
  esign: {
    provider: 'docusign_cl',
    fallback: 'docusign',
    regulation: 'Ley 19.799',
    cert_authorities: ['e-cert', 'acepta'],
  },
  contracts: {
    promesa_compraventa: {
      template_id: 'cl.promesa_v1',
      required_fields: ['rut_comprador', 'rut_vendedor', 'rol_propiedad'],
    },
    escritura: {
      template_id: 'cl.escritura_v1',
      required_fields: ['notaria', 'repertorio'],
    },
    contrato_arriendo: {
      template_id: 'cl.arriendo_v1',
      required_fields: ['rut_arrendador', 'rut_arrendatario'],
    },
  },
  privacy: {
    regulation: 'Ley 19.628',
    cookie_banner_required: true,
    dpa_template: 'cl_dpa_v1',
    retention_years: 5,
  },
  disclosures: {
    aviso_privacidad_required: true,
    uaf_threshold_clp: 450,
  },
} as const;
