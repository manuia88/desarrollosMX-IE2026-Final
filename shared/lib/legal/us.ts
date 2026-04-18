export const LEGAL_CONFIG_US = {
  country_code: 'US',
  esign: {
    provider: 'docusign',
    fallback: 'hellosign',
    regulation: 'ESIGN Act + UETA',
    cert_authorities: [],
  },
  contracts: {
    purchase_agreement: {
      template_id: 'us.purchase_v1',
      required_fields: ['ssn_last4_buyer', 'ssn_last4_seller', 'apn_parcel'],
    },
    deed: {
      template_id: 'us.deed_v1',
      required_fields: ['county_recorder', 'grantor', 'grantee'],
    },
    lease: {
      template_id: 'us.lease_v1',
      required_fields: ['tenant_id', 'landlord_id', 'lead_disclosure'],
    },
  },
  privacy: {
    regulation: 'state_varies',
    cookie_banner_required: false,
    state_laws: ['CCPA/CPRA', 'VCDPA', 'CPA', 'CTDPA', 'UCPA'],
    dpa_template: 'us_dpa_v1',
    retention_years: 7,
  },
  disclosures: {
    fair_housing_required: true,
    lead_paint_disclosure_required: true,
    agency_disclosure_required: true,
    fincen_threshold_usd: 10000,
  },
} as const;
