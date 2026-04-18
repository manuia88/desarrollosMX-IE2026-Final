export const LEGAL_CONFIG_BR = {
  country_code: 'BR',
  esign: {
    provider: 'docusign_br',
    fallback: 'clicksign',
    regulation: 'Lei 14.063/2020',
    cert_authorities: ['icp-brasil'],
  },
  contracts: {
    compromisso_compra_venda: {
      template_id: 'br.compromisso_v1',
      required_fields: ['cpf_comprador', 'cpf_vendedor', 'matricula_cartorio'],
    },
    escritura_publica: {
      template_id: 'br.escritura_v1',
      required_fields: ['tabeliao_numero', 'cartorio_registros'],
    },
    contrato_locacao: {
      template_id: 'br.locacao_v1',
      required_fields: ['cpf_locador', 'cpf_locatario', 'fiador_cpf'],
      regulation: 'Lei 8.245/91 (Inquilinato)',
    },
  },
  crec: {
    requires_registro: true,
    regulation: 'Lei 6.530/78 (CRECI)',
  },
  privacy: {
    regulation: 'LGPD',
    cookie_banner_required: true,
    dpa_template: 'br_dpa_v1',
    retention_years: 5,
    anpd_registration_required: true,
  },
  disclosures: {
    politica_privacidade_required: true,
    coaf_threshold_brl: 100000,
  },
} as const;
