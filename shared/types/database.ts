export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          country_code: string
          country_sub_divisions: Json
          created_at: string
          geom: unknown
          id: string
          is_fiscal: boolean
          is_primary: boolean
          label: string | null
          lat: number | null
          line1: string
          line2: string | null
          lng: number | null
          municipality: string | null
          neighborhood: string | null
          owner_id: string
          owner_type: string
          postal_code: string
          state: string
          updated_at: string
        }
        Insert: {
          country_code: string
          country_sub_divisions?: Json
          created_at?: string
          geom?: unknown
          id?: string
          is_fiscal?: boolean
          is_primary?: boolean
          label?: string | null
          lat?: number | null
          line1: string
          line2?: string | null
          lng?: number | null
          municipality?: string | null
          neighborhood?: string | null
          owner_id: string
          owner_type: string
          postal_code: string
          state: string
          updated_at?: string
        }
        Update: {
          country_code?: string
          country_sub_divisions?: Json
          created_at?: string
          geom?: unknown
          id?: string
          is_fiscal?: boolean
          is_primary?: boolean
          label?: string | null
          lat?: number | null
          line1?: string
          line2?: string | null
          lng?: number | null
          municipality?: string | null
          neighborhood?: string | null
          owner_id?: string
          owner_type?: string
          postal_code?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      agencies: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          country_code: string
          created_at: string
          id: string
          is_active: boolean
          is_verified: boolean
          legal_name: string | null
          logo_url: string | null
          meta: Json
          name: string
          slug: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          country_code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          legal_name?: string | null
          logo_url?: string | null
          meta?: Json
          name: string
          slug?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          country_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          legal_name?: string | null
          logo_url?: string | null
          meta?: Json
          name?: string
          slug?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agencies_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["user_role"] | null
          after: Json | null
          before: Json | null
          country_code: string | null
          created_at: string
          diff: Json | null
          id: number
          ip: unknown
          meta: Json
          record_id: string | null
          request_id: string | null
          table_name: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          country_code?: string | null
          created_at?: string
          diff?: Json | null
          id?: never
          ip?: unknown
          meta?: Json
          record_id?: string | null
          request_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          country_code?: string | null
          created_at?: string
          diff?: Json | null
          id?: never
          ip?: unknown
          meta?: Json
          record_id?: string | null
          request_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_log_default: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["user_role"] | null
          after: Json | null
          before: Json | null
          country_code: string | null
          created_at: string
          diff: Json | null
          id: number
          ip: unknown
          meta: Json
          record_id: string | null
          request_id: string | null
          table_name: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          country_code?: string | null
          created_at?: string
          diff?: Json | null
          id?: never
          ip?: unknown
          meta?: Json
          record_id?: string | null
          request_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          country_code?: string | null
          created_at?: string
          diff?: Json | null
          id?: never
          ip?: unknown
          meta?: Json
          record_id?: string | null
          request_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_log_p20251201: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["user_role"] | null
          after: Json | null
          before: Json | null
          country_code: string | null
          created_at: string
          diff: Json | null
          id: number
          ip: unknown
          meta: Json
          record_id: string | null
          request_id: string | null
          table_name: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          country_code?: string | null
          created_at?: string
          diff?: Json | null
          id?: never
          ip?: unknown
          meta?: Json
          record_id?: string | null
          request_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          country_code?: string | null
          created_at?: string
          diff?: Json | null
          id?: never
          ip?: unknown
          meta?: Json
          record_id?: string | null
          request_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_log_p20260101: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["user_role"] | null
          after: Json | null
          before: Json | null
          country_code: string | null
          created_at: string
          diff: Json | null
          id: number
          ip: unknown
          meta: Json
          record_id: string | null
          request_id: string | null
          table_name: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          country_code?: string | null
          created_at?: string
          diff?: Json | null
          id?: never
          ip?: unknown
          meta?: Json
          record_id?: string | null
          request_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          country_code?: string | null
          created_at?: string
          diff?: Json | null
          id?: never
          ip?: unknown
          meta?: Json
          record_id?: string | null
          request_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_log_p20260201: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["user_role"] | null
          after: Json | null
          before: Json | null
          country_code: string | null
          created_at: string
          diff: Json | null
          id: number
          ip: unknown
          meta: Json
          record_id: string | null
          request_id: string | null
          table_name: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          country_code?: string | null
          created_at?: string
          diff?: Json | null
          id?: never
          ip?: unknown
          meta?: Json
          record_id?: string | null
          request_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          country_code?: string | null
          created_at?: string
          diff?: Json | null
          id?: never
          ip?: unknown
          meta?: Json
          record_id?: string | null
          request_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_log_p20260301: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["user_role"] | null
          after: Json | null
          before: Json | null
          country_code: string | null
          created_at: string
          diff: Json | null
          id: number
          ip: unknown
          meta: Json
          record_id: string | null
          request_id: string | null
          table_name: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          country_code?: string | null
          created_at?: string
          diff?: Json | null
          id?: never
          ip?: unknown
          meta?: Json
          record_id?: string | null
          request_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          country_code?: string | null
          created_at?: string
          diff?: Json | null
          id?: never
          ip?: unknown
          meta?: Json
          record_id?: string | null
          request_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_log_p20260401: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["user_role"] | null
          after: Json | null
          before: Json | null
          country_code: string | null
          created_at: string
          diff: Json | null
          id: number
          ip: unknown
          meta: Json
          record_id: string | null
          request_id: string | null
          table_name: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          country_code?: string | null
          created_at?: string
          diff?: Json | null
          id?: never
          ip?: unknown
          meta?: Json
          record_id?: string | null
          request_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          country_code?: string | null
          created_at?: string
          diff?: Json | null
          id?: never
          ip?: unknown
          meta?: Json
          record_id?: string | null
          request_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_log_p20260501: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["user_role"] | null
          after: Json | null
          before: Json | null
          country_code: string | null
          created_at: string
          diff: Json | null
          id: number
          ip: unknown
          meta: Json
          record_id: string | null
          request_id: string | null
          table_name: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          country_code?: string | null
          created_at?: string
          diff?: Json | null
          id?: never
          ip?: unknown
          meta?: Json
          record_id?: string | null
          request_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          country_code?: string | null
          created_at?: string
          diff?: Json | null
          id?: never
          ip?: unknown
          meta?: Json
          record_id?: string | null
          request_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_log_p20260601: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["user_role"] | null
          after: Json | null
          before: Json | null
          country_code: string | null
          created_at: string
          diff: Json | null
          id: number
          ip: unknown
          meta: Json
          record_id: string | null
          request_id: string | null
          table_name: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          country_code?: string | null
          created_at?: string
          diff?: Json | null
          id?: never
          ip?: unknown
          meta?: Json
          record_id?: string | null
          request_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          country_code?: string | null
          created_at?: string
          diff?: Json | null
          id?: never
          ip?: unknown
          meta?: Json
          record_id?: string | null
          request_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_log_p20260701: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["user_role"] | null
          after: Json | null
          before: Json | null
          country_code: string | null
          created_at: string
          diff: Json | null
          id: number
          ip: unknown
          meta: Json
          record_id: string | null
          request_id: string | null
          table_name: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          country_code?: string | null
          created_at?: string
          diff?: Json | null
          id?: never
          ip?: unknown
          meta?: Json
          record_id?: string | null
          request_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          country_code?: string | null
          created_at?: string
          diff?: Json | null
          id?: never
          ip?: unknown
          meta?: Json
          record_id?: string | null
          request_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_log_p20260801: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["user_role"] | null
          after: Json | null
          before: Json | null
          country_code: string | null
          created_at: string
          diff: Json | null
          id: number
          ip: unknown
          meta: Json
          record_id: string | null
          request_id: string | null
          table_name: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          country_code?: string | null
          created_at?: string
          diff?: Json | null
          id?: never
          ip?: unknown
          meta?: Json
          record_id?: string | null
          request_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          country_code?: string | null
          created_at?: string
          diff?: Json | null
          id?: never
          ip?: unknown
          meta?: Json
          record_id?: string | null
          request_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      auth_backup_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          profile_id: string
          used_at: string | null
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          profile_id: string
          used_at?: string | null
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          profile_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auth_backup_codes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auth_backup_codes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_companies: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          country_code: string
          created_at: string
          id: string
          is_active: boolean
          is_authorized_broker: boolean
          legal_name: string | null
          logo_url: string | null
          meta: Json
          name: string
          slug: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          country_code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_authorized_broker?: boolean
          legal_name?: string | null
          logo_url?: string | null
          meta?: Json
          name: string
          slug?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          country_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_authorized_broker?: boolean
          legal_name?: string | null
          logo_url?: string | null
          meta?: Json
          name?: string
          slug?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "broker_companies_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      countries: {
        Row: {
          address_format: Json
          code: string
          created_at: string
          default_currency: string
          default_locale: string
          default_timezone: string
          fiscal_regime_config: Json
          is_active: boolean
          name_en: string
          name_es: string
          name_pt: string | null
          phone_prefix: string
        }
        Insert: {
          address_format?: Json
          code: string
          created_at?: string
          default_currency: string
          default_locale: string
          default_timezone: string
          fiscal_regime_config?: Json
          is_active?: boolean
          name_en: string
          name_es: string
          name_pt?: string | null
          phone_prefix: string
        }
        Update: {
          address_format?: Json
          code?: string
          created_at?: string
          default_currency?: string
          default_locale?: string
          default_timezone?: string
          fiscal_regime_config?: Json
          is_active?: boolean
          name_en?: string
          name_es?: string
          name_pt?: string | null
          phone_prefix?: string
        }
        Relationships: [
          {
            foreignKeyName: "countries_default_currency_fkey"
            columns: ["default_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          decimals: number
          is_active: boolean
          is_crypto: boolean
          name_en: string
          name_es: string
          symbol: string
        }
        Insert: {
          code: string
          decimals?: number
          is_active?: boolean
          is_crypto?: boolean
          name_en: string
          name_es: string
          symbol: string
        }
        Update: {
          code?: string
          decimals?: number
          is_active?: boolean
          is_crypto?: boolean
          name_en?: string
          name_es?: string
          symbol?: string
        }
        Relationships: []
      }
      desarrolladoras: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          country_code: string
          created_at: string
          holding_parent_id: string | null
          id: string
          is_active: boolean
          is_verified: boolean
          legal_name: string
          logo_url: string | null
          meta: Json
          name: string
          slug: string | null
          tax_id: string
          tax_id_encrypted: string | null
          updated_at: string
          verification_docs_urls: Json | null
          website: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          country_code: string
          created_at?: string
          holding_parent_id?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          legal_name: string
          logo_url?: string | null
          meta?: Json
          name: string
          slug?: string | null
          tax_id: string
          tax_id_encrypted?: string | null
          updated_at?: string
          verification_docs_urls?: Json | null
          website?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          country_code?: string
          created_at?: string
          holding_parent_id?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          legal_name?: string
          logo_url?: string | null
          meta?: Json
          name?: string
          slug?: string | null
          tax_id?: string
          tax_id_encrypted?: string | null
          updated_at?: string
          verification_docs_urls?: Json | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "desarrolladoras_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "desarrolladoras_holding_parent_id_fkey"
            columns: ["holding_parent_id"]
            isOneToOne: false
            referencedRelation: "desarrolladoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desarrolladoras_holding_parent_id_fkey"
            columns: ["holding_parent_id"]
            isOneToOne: false
            referencedRelation: "public_desarrolladoras"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_registry: {
        Row: {
          category: string
          code: string
          created_at: string
          description_es: string | null
          h_phase: number
          is_beta: boolean
          is_enabled: boolean
          is_premium: boolean
          min_plan: string | null
          module: string
          name_en: string
          name_es: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          description_es?: string | null
          h_phase?: number
          is_beta?: boolean
          is_enabled?: boolean
          is_premium?: boolean
          min_plan?: string | null
          module: string
          name_en: string
          name_es: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description_es?: string | null
          h_phase?: number
          is_beta?: boolean
          is_enabled?: boolean
          is_premium?: boolean
          min_plan?: string | null
          module?: string
          name_en?: string
          name_es?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_registry_min_plan_fkey"
            columns: ["min_plan"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["code"]
          },
        ]
      }
      locales: {
        Row: {
          code: string
          country_code: string
          is_active: boolean
          is_rtl: boolean
          language: string
          name_native: string
          script: string | null
        }
        Insert: {
          code: string
          country_code: string
          is_active?: boolean
          is_rtl?: boolean
          language: string
          name_native: string
          script?: string | null
        }
        Update: {
          code?: string
          country_code?: string
          is_active?: boolean
          is_rtl?: boolean
          language?: string
          name_native?: string
          script?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locales_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      part_config: {
        Row: {
          async_partitioning_in_progress: string | null
          automatic_maintenance: string
          constraint_cols: string[] | null
          constraint_valid: boolean
          control: string
          date_trunc_interval: string | null
          datetime_string: string | null
          epoch: string
          ignore_default_data: boolean
          infinite_time_partitions: boolean
          inherit_privileges: boolean | null
          jobmon: boolean
          maintenance_last_run: string | null
          maintenance_order: number | null
          optimize_constraint: number
          parent_table: string
          partition_interval: string
          partition_type: string
          premake: number
          retention: string | null
          retention_keep_index: boolean
          retention_keep_publication: boolean
          retention_keep_table: boolean
          retention_schema: string | null
          sub_partition_set_full: boolean
          template_table: string | null
          time_decoder: string | null
          time_encoder: string | null
          undo_in_progress: boolean
        }
        Insert: {
          async_partitioning_in_progress?: string | null
          automatic_maintenance?: string
          constraint_cols?: string[] | null
          constraint_valid?: boolean
          control: string
          date_trunc_interval?: string | null
          datetime_string?: string | null
          epoch?: string
          ignore_default_data?: boolean
          infinite_time_partitions?: boolean
          inherit_privileges?: boolean | null
          jobmon?: boolean
          maintenance_last_run?: string | null
          maintenance_order?: number | null
          optimize_constraint?: number
          parent_table: string
          partition_interval: string
          partition_type: string
          premake?: number
          retention?: string | null
          retention_keep_index?: boolean
          retention_keep_publication?: boolean
          retention_keep_table?: boolean
          retention_schema?: string | null
          sub_partition_set_full?: boolean
          template_table?: string | null
          time_decoder?: string | null
          time_encoder?: string | null
          undo_in_progress?: boolean
        }
        Update: {
          async_partitioning_in_progress?: string | null
          automatic_maintenance?: string
          constraint_cols?: string[] | null
          constraint_valid?: boolean
          control?: string
          date_trunc_interval?: string | null
          datetime_string?: string | null
          epoch?: string
          ignore_default_data?: boolean
          infinite_time_partitions?: boolean
          inherit_privileges?: boolean | null
          jobmon?: boolean
          maintenance_last_run?: string | null
          maintenance_order?: number | null
          optimize_constraint?: number
          parent_table?: string
          partition_interval?: string
          partition_type?: string
          premake?: number
          retention?: string | null
          retention_keep_index?: boolean
          retention_keep_publication?: boolean
          retention_keep_table?: boolean
          retention_schema?: string | null
          sub_partition_set_full?: boolean
          template_table?: string | null
          time_decoder?: string | null
          time_encoder?: string | null
          undo_in_progress?: boolean
        }
        Relationships: []
      }
      part_config_sub: {
        Row: {
          sub_automatic_maintenance: string
          sub_constraint_cols: string[] | null
          sub_constraint_valid: boolean
          sub_control: string
          sub_control_not_null: boolean | null
          sub_date_trunc_interval: string | null
          sub_default_table: boolean | null
          sub_epoch: string
          sub_ignore_default_data: boolean
          sub_infinite_time_partitions: boolean
          sub_inherit_privileges: boolean | null
          sub_jobmon: boolean
          sub_maintenance_order: number | null
          sub_optimize_constraint: number
          sub_parent: string
          sub_partition_interval: string
          sub_partition_type: string
          sub_premake: number
          sub_retention: string | null
          sub_retention_keep_index: boolean
          sub_retention_keep_publication: boolean
          sub_retention_keep_table: boolean
          sub_retention_schema: string | null
          sub_template_table: string | null
          sub_time_decoder: string | null
          sub_time_encoder: string | null
        }
        Insert: {
          sub_automatic_maintenance?: string
          sub_constraint_cols?: string[] | null
          sub_constraint_valid?: boolean
          sub_control: string
          sub_control_not_null?: boolean | null
          sub_date_trunc_interval?: string | null
          sub_default_table?: boolean | null
          sub_epoch?: string
          sub_ignore_default_data?: boolean
          sub_infinite_time_partitions?: boolean
          sub_inherit_privileges?: boolean | null
          sub_jobmon?: boolean
          sub_maintenance_order?: number | null
          sub_optimize_constraint?: number
          sub_parent: string
          sub_partition_interval: string
          sub_partition_type: string
          sub_premake?: number
          sub_retention?: string | null
          sub_retention_keep_index?: boolean
          sub_retention_keep_publication?: boolean
          sub_retention_keep_table?: boolean
          sub_retention_schema?: string | null
          sub_template_table?: string | null
          sub_time_decoder?: string | null
          sub_time_encoder?: string | null
        }
        Update: {
          sub_automatic_maintenance?: string
          sub_constraint_cols?: string[] | null
          sub_constraint_valid?: boolean
          sub_control?: string
          sub_control_not_null?: boolean | null
          sub_date_trunc_interval?: string | null
          sub_default_table?: boolean | null
          sub_epoch?: string
          sub_ignore_default_data?: boolean
          sub_infinite_time_partitions?: boolean
          sub_inherit_privileges?: boolean | null
          sub_jobmon?: boolean
          sub_maintenance_order?: number | null
          sub_optimize_constraint?: number
          sub_parent?: string
          sub_partition_interval?: string
          sub_partition_type?: string
          sub_premake?: number
          sub_retention?: string | null
          sub_retention_keep_index?: boolean
          sub_retention_keep_publication?: boolean
          sub_retention_keep_table?: boolean
          sub_retention_schema?: string | null
          sub_template_table?: string | null
          sub_time_decoder?: string | null
          sub_time_encoder?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "part_config_sub_sub_parent_fkey"
            columns: ["sub_parent"]
            isOneToOne: true
            referencedRelation: "part_config"
            referencedColumns: ["parent_table"]
          },
        ]
      }
      plans: {
        Row: {
          audience: string
          code: string
          country_code: string
          created_at: string
          currency: string
          features_summary: Json
          id: string
          is_active: boolean
          monthly_price_minor: number
          name: string
          sort_order: number
          trial_days: number
          updated_at: string
          yearly_price_minor: number | null
        }
        Insert: {
          audience: string
          code: string
          country_code: string
          created_at?: string
          currency: string
          features_summary?: Json
          id?: string
          is_active?: boolean
          monthly_price_minor: number
          name: string
          sort_order?: number
          trial_days?: number
          updated_at?: string
          yearly_price_minor?: number | null
        }
        Update: {
          audience?: string
          code?: string
          country_code?: string
          created_at?: string
          currency?: string
          features_summary?: Json
          id?: string
          is_active?: boolean
          monthly_price_minor?: number
          name?: string
          sort_order?: number
          trial_days?: number
          updated_at?: string
          yearly_price_minor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plans_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "plans_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      profile_feature_overrides: {
        Row: {
          expires_at: string | null
          feature_code: string
          granted_at: string
          granted_by: string | null
          is_enabled: boolean
          profile_id: string
          reason: string | null
        }
        Insert: {
          expires_at?: string | null
          feature_code: string
          granted_at?: string
          granted_by?: string | null
          is_enabled: boolean
          profile_id: string
          reason?: string | null
        }
        Update: {
          expires_at?: string | null
          feature_code?: string
          granted_at?: string
          granted_by?: string | null
          is_enabled?: boolean
          profile_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_feature_overrides_feature_code_fkey"
            columns: ["feature_code"]
            isOneToOne: false
            referencedRelation: "feature_registry"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "profile_feature_overrides_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_feature_overrides_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_feature_overrides_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_feature_overrides_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          agency_id: string | null
          avatar_url: string | null
          broker_company_id: string | null
          country_code: string
          created_at: string
          desarrolladora_id: string | null
          docs_verificacion_urls: Json | null
          email: string
          first_name: string
          full_name: string | null
          id: string
          is_active: boolean
          is_approved: boolean
          last_name: string
          meta: Json
          phone: string | null
          preferred_currency: string | null
          preferred_locale: string | null
          preferred_timezone: string
          razon_social: string | null
          regimen_fiscal: string | null
          rfc: string | null
          rol: Database["public"]["Enums"]["user_role"]
          slug: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          avatar_url?: string | null
          broker_company_id?: string | null
          country_code: string
          created_at?: string
          desarrolladora_id?: string | null
          docs_verificacion_urls?: Json | null
          email: string
          first_name: string
          full_name?: string | null
          id: string
          is_active?: boolean
          is_approved?: boolean
          last_name: string
          meta?: Json
          phone?: string | null
          preferred_currency?: string | null
          preferred_locale?: string | null
          preferred_timezone?: string
          razon_social?: string | null
          regimen_fiscal?: string | null
          rfc?: string | null
          rol?: Database["public"]["Enums"]["user_role"]
          slug?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          avatar_url?: string | null
          broker_company_id?: string | null
          country_code?: string
          created_at?: string
          desarrolladora_id?: string | null
          docs_verificacion_urls?: Json | null
          email?: string
          first_name?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          is_approved?: boolean
          last_name?: string
          meta?: Json
          phone?: string | null
          preferred_currency?: string | null
          preferred_locale?: string | null
          preferred_timezone?: string
          razon_social?: string | null
          regimen_fiscal?: string | null
          rfc?: string | null
          rol?: Database["public"]["Enums"]["user_role"]
          slug?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_agency"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_agency"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "public_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_broker"
            columns: ["broker_company_id"]
            isOneToOne: false
            referencedRelation: "broker_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_broker"
            columns: ["broker_company_id"]
            isOneToOne: false
            referencedRelation: "public_broker_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_desarrolladora"
            columns: ["desarrolladora_id"]
            isOneToOne: false
            referencedRelation: "desarrolladoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_desarrolladora"
            columns: ["desarrolladora_id"]
            isOneToOne: false
            referencedRelation: "public_desarrolladoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "profiles_preferred_currency_fkey"
            columns: ["preferred_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "profiles_preferred_locale_fkey"
            columns: ["preferred_locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
        ]
      }
      rate_limit_log: {
        Row: {
          count: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      rate_limit_log_default: {
        Row: {
          count: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      rate_limit_log_p20260414: {
        Row: {
          count: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      rate_limit_log_p20260415: {
        Row: {
          count: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      rate_limit_log_p20260416: {
        Row: {
          count: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      rate_limit_log_p20260417: {
        Row: {
          count: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      rate_limit_log_p20260418: {
        Row: {
          count: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      rate_limit_log_p20260419: {
        Row: {
          count: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      rate_limit_log_p20260420: {
        Row: {
          count: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      rate_limit_log_p20260421: {
        Row: {
          count: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      rate_limit_log_p20260422: {
        Row: {
          count: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      role_features: {
        Row: {
          feature_code: string
          is_enabled: boolean
          rol: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          feature_code: string
          is_enabled?: boolean
          rol: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          feature_code?: string
          is_enabled?: boolean
          rol?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_features_feature_code_fkey"
            columns: ["feature_code"]
            isOneToOne: false
            referencedRelation: "feature_registry"
            referencedColumns: ["code"]
          },
        ]
      }
      role_requests: {
        Row: {
          approver_id: string | null
          country_code: string
          created_at: string
          decided_at: string | null
          id: string
          meta: Json
          profile_id: string
          reason: string | null
          requested_role: Database["public"]["Enums"]["user_role"]
          status: string
        }
        Insert: {
          approver_id?: string | null
          country_code: string
          created_at?: string
          decided_at?: string | null
          id?: string
          meta?: Json
          profile_id: string
          reason?: string | null
          requested_role: Database["public"]["Enums"]["user_role"]
          status?: string
        }
        Update: {
          approver_id?: string | null
          country_code?: string
          created_at?: string
          decided_at?: string | null
          id?: string
          meta?: Json
          profile_id?: string
          reason?: string | null
          requested_role?: Database["public"]["Enums"]["user_role"]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_requests_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_requests_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_requests_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "role_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_cycle: string
          cancel_at: string | null
          canceled_at: string | null
          country_code: string
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          mercadopago_subscription_id: string | null
          meta: Json
          plan_id: string
          status: string
          stripe_subscription_id: string | null
          subject_id: string
          subject_type: string
          updated_at: string
        }
        Insert: {
          billing_cycle: string
          cancel_at?: string | null
          canceled_at?: string | null
          country_code: string
          created_at?: string
          current_period_end: string
          current_period_start: string
          id?: string
          mercadopago_subscription_id?: string | null
          meta?: Json
          plan_id: string
          status: string
          stripe_subscription_id?: string | null
          subject_id: string
          subject_type: string
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          cancel_at?: string | null
          canceled_at?: string | null
          country_code?: string
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          mercadopago_subscription_id?: string | null
          meta?: Json
          plan_id?: string
          status?: string
          stripe_subscription_id?: string | null
          subject_id?: string
          subject_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      template_public_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["user_role"] | null
          after: Json | null
          before: Json | null
          country_code: string | null
          created_at: string
          diff: Json | null
          id: number
          ip: unknown
          meta: Json
          record_id: string | null
          request_id: string | null
          table_name: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          country_code?: string | null
          created_at: string
          diff?: Json | null
          id: number
          ip?: unknown
          meta: Json
          record_id?: string | null
          request_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          country_code?: string | null
          created_at?: string
          diff?: Json | null
          id?: number
          ip?: unknown
          meta?: Json
          record_id?: string | null
          request_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      template_public_rate_limit_log: {
        Row: {
          count: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Insert: {
          count: number
          endpoint: string
          user_id: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      public_agencies: {
        Row: {
          country_code: string | null
          created_at: string | null
          id: string | null
          is_verified: boolean | null
          logo_url: string | null
          name: string | null
          slug: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string | null
          id?: string | null
          is_verified?: boolean | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string | null
          id?: string | null
          is_verified?: boolean | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agencies_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      public_broker_companies: {
        Row: {
          country_code: string | null
          created_at: string | null
          id: string | null
          is_authorized_broker: boolean | null
          logo_url: string | null
          name: string | null
          slug: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string | null
          id?: string | null
          is_authorized_broker?: boolean | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string | null
          id?: string | null
          is_authorized_broker?: boolean | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broker_companies_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      public_desarrolladoras: {
        Row: {
          country_code: string | null
          created_at: string | null
          id: string | null
          is_verified: boolean | null
          logo_url: string | null
          name: string | null
          slug: string | null
          website: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string | null
          id?: string | null
          is_verified?: boolean | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
          website?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string | null
          id?: string | null
          is_verified?: boolean | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "desarrolladoras_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country_code: string | null
          created_at: string | null
          first_name: string | null
          full_name: string | null
          id: string | null
          last_name: string | null
          public_portfolio_url: string | null
          rol: Database["public"]["Enums"]["user_role"] | null
          slug: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: never
          country_code?: string | null
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string | null
          last_name?: string | null
          public_portfolio_url?: never
          rol?: Database["public"]["Enums"]["user_role"] | null
          slug?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: never
          country_code?: string | null
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string | null
          last_name?: string | null
          public_portfolio_url?: never
          rol?: Database["public"]["Enums"]["user_role"] | null
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      table_privs: {
        Row: {
          grantee: unknown
          grantor: unknown
          privilege_type: string | null
          table_name: unknown
          table_schema: unknown
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      apply_cluster: {
        Args: {
          p_child_schema: string
          p_child_tablename: string
          p_parent_schema: string
          p_parent_tablename: string
        }
        Returns: undefined
      }
      apply_constraints: {
        Args: {
          p_analyze?: boolean
          p_child_table?: string
          p_job_id?: number
          p_parent_table: string
        }
        Returns: undefined
      }
      apply_privileges: {
        Args: {
          p_child_schema: string
          p_child_tablename: string
          p_job_id?: number
          p_parent_schema: string
          p_parent_tablename: string
        }
        Returns: undefined
      }
      approve_role_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      autovacuum_off: {
        Args: {
          p_parent_schema: string
          p_parent_tablename: string
          p_source_schema?: string
          p_source_tablename?: string
        }
        Returns: boolean
      }
      autovacuum_reset: {
        Args: {
          p_parent_schema: string
          p_parent_tablename: string
          p_source_schema?: string
          p_source_tablename?: string
        }
        Returns: boolean
      }
      calculate_time_partition_info: {
        Args: {
          p_date_trunc_interval?: string
          p_start_time: string
          p_time_interval: string
        }
        Returns: Record<string, unknown>
      }
      check_automatic_maintenance_value: {
        Args: { p_automatic_maintenance: string }
        Returns: boolean
      }
      check_control_type: {
        Args: {
          p_control: string
          p_parent_schema: string
          p_parent_tablename: string
        }
        Returns: {
          exact_type: string
          general_type: string
        }[]
      }
      check_default: {
        Args: { p_exact_count?: boolean }
        Returns: Database["public"]["CompositeTypes"]["check_default_table"][]
        SetofOptions: {
          from: "*"
          to: "check_default_table"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      check_epoch_type: { Args: { p_type: string }; Returns: boolean }
      check_name_length: {
        Args: {
          p_object_name: string
          p_suffix?: string
          p_table_partition?: boolean
        }
        Returns: string
      }
      check_partition_type: { Args: { p_type: string }; Returns: boolean }
      check_rate_limit_db: {
        Args: {
          p_endpoint: string
          p_max_calls: number
          p_user_id: string
          p_window_sec: number
        }
        Returns: boolean
      }
      check_subpart_sameconfig: {
        Args: { p_parent_table: string }
        Returns: {
          sub_automatic_maintenance: string
          sub_constraint_cols: string[]
          sub_constraint_valid: boolean
          sub_control: string
          sub_control_not_null: boolean
          sub_date_trunc_interval: string
          sub_default_table: boolean
          sub_epoch: string
          sub_ignore_default_data: boolean
          sub_infinite_time_partitions: boolean
          sub_inherit_privileges: boolean
          sub_jobmon: boolean
          sub_maintenance_order: number
          sub_optimize_constraint: number
          sub_partition_interval: string
          sub_partition_type: string
          sub_premake: number
          sub_retention: string
          sub_retention_keep_index: boolean
          sub_retention_keep_publication: boolean
          sub_retention_keep_table: boolean
          sub_retention_schema: string
          sub_template_table: string
        }[]
      }
      check_subpartition_limits: {
        Args: { p_parent_table: string; p_type: string }
        Returns: Record<string, unknown>
      }
      create_parent: {
        Args: {
          p_automatic_maintenance?: string
          p_constraint_cols?: string[]
          p_control: string
          p_control_not_null?: boolean
          p_date_trunc_interval?: string
          p_default_table?: boolean
          p_epoch?: string
          p_interval: string
          p_jobmon?: boolean
          p_offset_id?: number
          p_parent_table: string
          p_premake?: number
          p_start_partition?: string
          p_template_table?: string
          p_time_decoder?: string
          p_time_encoder?: string
          p_type?: string
        }
        Returns: boolean
      }
      create_partition_id: {
        Args: {
          p_parent_table: string
          p_partition_ids: number[]
          p_start_partition?: string
        }
        Returns: boolean
      }
      create_partition_time: {
        Args: {
          p_parent_table: string
          p_partition_times: string[]
          p_start_partition?: string
        }
        Returns: boolean
      }
      create_sub_parent: {
        Args: {
          p_constraint_cols?: string[]
          p_control: string
          p_control_not_null?: boolean
          p_date_trunc_interval?: string
          p_declarative_check?: string
          p_default_table?: boolean
          p_epoch?: string
          p_interval: string
          p_jobmon?: boolean
          p_premake?: number
          p_start_partition?: string
          p_time_decoder?: string
          p_time_encoder?: string
          p_top_parent: string
          p_type?: string
        }
        Returns: boolean
      }
      disablelongtransactions: { Args: never; Returns: string }
      drop_constraints: {
        Args: {
          p_child_table: string
          p_debug?: boolean
          p_parent_table: string
        }
        Returns: undefined
      }
      drop_partition_id: {
        Args: {
          p_keep_index?: boolean
          p_keep_table?: boolean
          p_parent_table: string
          p_retention?: number
          p_retention_schema?: string
        }
        Returns: number
      }
      drop_partition_time: {
        Args: {
          p_keep_index?: boolean
          p_keep_table?: boolean
          p_parent_table: string
          p_reference_timestamp?: string
          p_retention?: string
          p_retention_schema?: string
        }
        Returns: number
      }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      dump_partitioned_table_definition: {
        Args: { p_ignore_template_table?: boolean; p_parent_table: string }
        Returns: string
      }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_visible_asesor_ids: { Args: never; Returns: string[] }
      gettransactionid: { Args: never; Returns: unknown }
      inherit_replica_identity: {
        Args: {
          p_child_tablename: string
          p_parent_schemaname: string
          p_parent_tablename: string
        }
        Returns: undefined
      }
      inherit_template_properties: {
        Args: {
          p_child_schema: string
          p_child_tablename: string
          p_parent_table: string
        }
        Returns: boolean
      }
      is_superadmin: { Args: never; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      mfa_consume_backup_code: { Args: { p_code: string }; Returns: boolean }
      mfa_mark_enabled: { Args: never; Returns: undefined }
      mfa_regenerate_backup_codes: { Args: never; Returns: string[] }
      partition_data_id: {
        Args: {
          p_analyze?: boolean
          p_batch_count?: number
          p_batch_interval?: number
          p_ignored_columns?: string[]
          p_lock_wait?: number
          p_order?: string
          p_override_system_value?: boolean
          p_parent_table: string
          p_source_table?: string
        }
        Returns: number
      }
      partition_data_time: {
        Args: {
          p_analyze?: boolean
          p_batch_count?: number
          p_batch_interval?: string
          p_ignored_columns?: string[]
          p_lock_wait?: number
          p_order?: string
          p_override_system_value?: boolean
          p_parent_table: string
          p_source_table?: string
        }
        Returns: number
      }
      partition_gap_fill: { Args: { p_parent_table: string }; Returns: number }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      reapply_privileges: {
        Args: { p_parent_table: string }
        Returns: undefined
      }
      reject_role_request: {
        Args: { p_reason?: string; p_request_id: string }
        Returns: undefined
      }
      resolve_features: { Args: { p_user_id?: string }; Returns: string[] }
      run_maintenance: {
        Args: {
          p_analyze?: boolean
          p_jobmon?: boolean
          p_parent_table?: string
        }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_partition_info: {
        Args: {
          p_child_table: string
          p_parent_table?: string
          p_partition_interval?: string
          p_table_exists?: boolean
        }
        Returns: Record<string, unknown>
      }
      show_partition_name: {
        Args: { p_parent_table: string; p_value: string }
        Returns: Record<string, unknown>
      }
      show_partitions: {
        Args: {
          p_include_default?: boolean
          p_order?: string
          p_parent_table: string
        }
        Returns: {
          partition_schemaname: string
          partition_tablename: string
        }[]
      }
      show_trgm: { Args: { "": string }; Returns: string[] }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      stop_sub_partition: {
        Args: { p_jobmon?: boolean; p_parent_table: string }
        Returns: boolean
      }
      unaccent: { Args: { "": string }; Returns: string }
      undo_partition: {
        Args: {
          p_batch_interval?: string
          p_drop_cascade?: boolean
          p_ignored_columns?: string[]
          p_keep_table?: boolean
          p_lock_wait?: number
          p_loop_count?: number
          p_parent_table: string
          p_target_table: string
        }
        Returns: Record<string, unknown>
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      uuid7_time_decoder: { Args: { uuidv7: string }; Returns: string }
      uuid7_time_encoder: { Args: { ts: string }; Returns: string }
      validate_postal_code: {
        Args: { p_country_code: string; p_postal_code: string }
        Returns: boolean
      }
    }
    Enums: {
      user_role:
        | "superadmin"
        | "admin_desarrolladora"
        | "asesor"
        | "broker_manager"
        | "mb_admin"
        | "mb_coordinator"
        | "comprador"
        | "vendedor_publico"
    }
    CompositeTypes: {
      check_default_table: {
        default_table: string | null
        count: number | null
      }
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: [
        "superadmin",
        "admin_desarrolladora",
        "asesor",
        "broker_manager",
        "mb_admin",
        "mb_coordinator",
        "comprador",
        "vendedor_publico",
      ],
    },
  },
} as const
