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
      ai_memory_store: {
        Row: {
          created_at: string
          embedding: string | null
          expires_at: string | null
          id: string
          importance_score: number
          key: string
          namespace: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          created_at?: string
          embedding?: string | null
          expires_at?: string | null
          id?: string
          importance_score?: number
          key: string
          namespace: string
          updated_at?: string
          user_id: string
          value: Json
        }
        Update: {
          created_at?: string
          embedding?: string | null
          expires_at?: string | null
          id?: string
          importance_score?: number
          key?: string
          namespace?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_memory_store_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_memory_store_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      airroi_spend_ledger: {
        Row: {
          actual_cost_usd: number | null
          airroi_request_id: string | null
          country_code: string | null
          created_at: string
          duration_ms: number | null
          endpoint_key: string
          endpoint_path: string
          error: string | null
          estimated_cost_usd: number
          http_status: number | null
          id: number
          market_ref: string | null
          meta: Json
          method: string
          ok: boolean
          run_id: string | null
        }
        Insert: {
          actual_cost_usd?: number | null
          airroi_request_id?: string | null
          country_code?: string | null
          created_at?: string
          duration_ms?: number | null
          endpoint_key: string
          endpoint_path: string
          error?: string | null
          estimated_cost_usd: number
          http_status?: number | null
          id?: never
          market_ref?: string | null
          meta?: Json
          method: string
          ok?: boolean
          run_id?: string | null
        }
        Update: {
          actual_cost_usd?: number | null
          airroi_request_id?: string | null
          country_code?: string | null
          created_at?: string
          duration_ms?: number | null
          endpoint_key?: string
          endpoint_path?: string
          error?: string | null
          estimated_cost_usd?: number
          http_status?: number | null
          id?: never
          market_ref?: string | null
          meta?: Json
          method?: string
          ok?: boolean
          run_id?: string | null
        }
        Relationships: []
      }
      api_budgets: {
        Row: {
          alert_threshold_pct: number
          hard_limit_pct: number
          is_paused: boolean
          last_reset_at: string
          meta: Json
          monthly_budget_usd: number
          reset_day_of_month: number
          source: string
          spent_mtd_usd: number
        }
        Insert: {
          alert_threshold_pct?: number
          hard_limit_pct?: number
          is_paused?: boolean
          last_reset_at?: string
          meta?: Json
          monthly_budget_usd: number
          reset_day_of_month?: number
          source: string
          spent_mtd_usd?: number
        }
        Update: {
          alert_threshold_pct?: number
          hard_limit_pct?: number
          is_paused?: boolean
          last_reset_at?: string
          meta?: Json
          monthly_budget_usd?: number
          reset_day_of_month?: number
          source?: string
          spent_mtd_usd?: number
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          profile_id: string
          revoked_at: string | null
          scopes: string[]
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          profile_id: string
          revoked_at?: string | null
          scopes?: string[]
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          profile_id?: string
          revoked_at?: string | null
          scopes?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limits: {
        Row: {
          count: number
          endpoint: string
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint: string
          key: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      api_rate_limits_default: {
        Row: {
          count: number
          endpoint: string
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint: string
          key: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      api_rate_limits_p20260414: {
        Row: {
          count: number
          endpoint: string
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint: string
          key: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      api_rate_limits_p20260415: {
        Row: {
          count: number
          endpoint: string
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint: string
          key: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      api_rate_limits_p20260416: {
        Row: {
          count: number
          endpoint: string
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint: string
          key: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      api_rate_limits_p20260417: {
        Row: {
          count: number
          endpoint: string
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint: string
          key: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      api_rate_limits_p20260418: {
        Row: {
          count: number
          endpoint: string
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint: string
          key: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      api_rate_limits_p20260419: {
        Row: {
          count: number
          endpoint: string
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint: string
          key: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      api_rate_limits_p20260420: {
        Row: {
          count: number
          endpoint: string
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint: string
          key: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      api_rate_limits_p20260421: {
        Row: {
          count: number
          endpoint: string
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint: string
          key: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      api_rate_limits_p20260422: {
        Row: {
          count: number
          endpoint: string
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint: string
          key: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          key?: string
          window_start?: string
        }
        Relationships: []
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
      auth_sessions_log: {
        Row: {
          aal: string | null
          action: string
          created_at: string
          id: string
          ip: unknown
          meta: Json
          profile_id: string
          user_agent: string | null
        }
        Insert: {
          aal?: string | null
          action: string
          created_at?: string
          id?: string
          ip?: unknown
          meta?: Json
          profile_id: string
          user_agent?: string | null
        }
        Update: {
          aal?: string | null
          action?: string
          created_at?: string
          id?: string
          ip?: unknown
          meta?: Json
          profile_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auth_sessions_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auth_sessions_log_profile_id_fkey"
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
      confidence_thresholds: {
        Row: {
          metric: string
          min_sample_high: number
          min_sample_low: number
          min_sample_medium: number
          notes: string | null
          source: string
        }
        Insert: {
          metric: string
          min_sample_high: number
          min_sample_low: number
          min_sample_medium: number
          notes?: string | null
          source: string
        }
        Update: {
          metric?: string
          min_sample_high?: number
          min_sample_low?: number
          min_sample_medium?: number
          notes?: string | null
          source?: string
        }
        Relationships: []
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
      data_lineage: {
        Row: {
          confidence: number | null
          destination_pk: string | null
          destination_table: string
          id: string
          recorded_at: string
          run_id: string
          source: string
          source_span: Json | null
          transformation: string | null
          upstream_hash: string | null
          upstream_url: string | null
        }
        Insert: {
          confidence?: number | null
          destination_pk?: string | null
          destination_table: string
          id?: string
          recorded_at?: string
          run_id: string
          source: string
          source_span?: Json | null
          transformation?: string | null
          upstream_hash?: string | null
          upstream_url?: string | null
        }
        Update: {
          confidence?: number | null
          destination_pk?: string | null
          destination_table?: string
          id?: string
          recorded_at?: string
          run_id?: string
          source?: string
          source_span?: Json | null
          transformation?: string | null
          upstream_hash?: string | null
          upstream_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_lineage_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ingest_runs"
            referencedColumns: ["id"]
          },
        ]
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
      embeddings: {
        Row: {
          chunk_index: number
          content: string
          country_code: string | null
          created_at: string
          embedding: string
          id: string
          meta: Json
          source_id: string
          source_type: string
        }
        Insert: {
          chunk_index?: number
          content: string
          country_code?: string | null
          created_at?: string
          embedding: string
          id?: string
          meta?: Json
          source_id: string
          source_type: string
        }
        Update: {
          chunk_index?: number
          content?: string
          country_code?: string | null
          created_at?: string
          embedding?: string
          id?: string
          meta?: Json
          source_id?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "embeddings_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
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
      fiscal_docs: {
        Row: {
          cancel_reason: string | null
          canceled_at: string | null
          country_code: string
          created_at: string
          currency: string
          desarrolladora_id: string | null
          doc_type: string
          folio: string | null
          id: string
          issued_at: string | null
          meta: Json
          operacion_id: string | null
          pdf_url: string | null
          series: string | null
          status: string
          total_minor: number
          uuid_extern: string | null
          xml_url: string | null
        }
        Insert: {
          cancel_reason?: string | null
          canceled_at?: string | null
          country_code: string
          created_at?: string
          currency: string
          desarrolladora_id?: string | null
          doc_type: string
          folio?: string | null
          id?: string
          issued_at?: string | null
          meta?: Json
          operacion_id?: string | null
          pdf_url?: string | null
          series?: string | null
          status?: string
          total_minor: number
          uuid_extern?: string | null
          xml_url?: string | null
        }
        Update: {
          cancel_reason?: string | null
          canceled_at?: string | null
          country_code?: string
          created_at?: string
          currency?: string
          desarrolladora_id?: string | null
          doc_type?: string
          folio?: string | null
          id?: string
          issued_at?: string | null
          meta?: Json
          operacion_id?: string | null
          pdf_url?: string | null
          series?: string | null
          status?: string
          total_minor?: number
          uuid_extern?: string | null
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_docs_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "fiscal_docs_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "fiscal_docs_desarrolladora_id_fkey"
            columns: ["desarrolladora_id"]
            isOneToOne: false
            referencedRelation: "desarrolladoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_docs_desarrolladora_id_fkey"
            columns: ["desarrolladora_id"]
            isOneToOne: false
            referencedRelation: "public_desarrolladoras"
            referencedColumns: ["id"]
          },
        ]
      }
      fx_rates: {
        Row: {
          base: string
          fetched_at: string
          quote: string
          rate: number
          source: string
        }
        Insert: {
          base: string
          fetched_at?: string
          quote: string
          rate: number
          source?: string
        }
        Update: {
          base?: string
          fetched_at?: string
          quote?: string
          rate?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "fx_rates_base_fkey"
            columns: ["base"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "fx_rates_quote_fkey"
            columns: ["quote"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      geo_data_points: {
        Row: {
          country_code: string
          entity_type: string
          fetched_at: string
          geom: unknown
          h3_r8: string | null
          id: string
          meta: Json
          name: string | null
          run_id: string | null
          scian_code: string | null
          source: string
          source_id: string | null
          valid_from: string
          valid_to: string | null
          zone_id: string | null
        }
        Insert: {
          country_code: string
          entity_type: string
          fetched_at?: string
          geom?: unknown
          h3_r8?: string | null
          id?: string
          meta?: Json
          name?: string | null
          run_id?: string | null
          scian_code?: string | null
          source: string
          source_id?: string | null
          valid_from: string
          valid_to?: string | null
          zone_id?: string | null
        }
        Update: {
          country_code?: string
          entity_type?: string
          fetched_at?: string
          geom?: unknown
          h3_r8?: string | null
          id?: string
          meta?: Json
          name?: string | null
          run_id?: string | null
          scian_code?: string | null
          source?: string
          source_id?: string | null
          valid_from?: string
          valid_to?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "geo_data_points_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      geo_snapshots: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric: string
          period_end: string
          period_start: string
          run_id: string | null
          source: string
          value: number
          zone_id: string
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric: string
          period_end: string
          period_start: string
          run_id?: string | null
          source: string
          value: number
          zone_id: string
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric?: string
          period_end?: string
          period_start?: string
          run_id?: string | null
          source?: string
          value?: number
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "geo_snapshots_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      geo_snapshots_default: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric: string
          period_end: string
          period_start: string
          run_id: string | null
          source: string
          value: number
          zone_id: string
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric: string
          period_end: string
          period_start: string
          run_id?: string | null
          source: string
          value: number
          zone_id: string
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric?: string
          period_end?: string
          period_start?: string
          run_id?: string | null
          source?: string
          value?: number
          zone_id?: string
        }
        Relationships: []
      }
      geo_snapshots_p20220101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric: string
          period_end: string
          period_start: string
          run_id: string | null
          source: string
          value: number
          zone_id: string
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric: string
          period_end: string
          period_start: string
          run_id?: string | null
          source: string
          value: number
          zone_id: string
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric?: string
          period_end?: string
          period_start?: string
          run_id?: string | null
          source?: string
          value?: number
          zone_id?: string
        }
        Relationships: []
      }
      geo_snapshots_p20230101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric: string
          period_end: string
          period_start: string
          run_id: string | null
          source: string
          value: number
          zone_id: string
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric: string
          period_end: string
          period_start: string
          run_id?: string | null
          source: string
          value: number
          zone_id: string
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric?: string
          period_end?: string
          period_start?: string
          run_id?: string | null
          source?: string
          value?: number
          zone_id?: string
        }
        Relationships: []
      }
      geo_snapshots_p20240101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric: string
          period_end: string
          period_start: string
          run_id: string | null
          source: string
          value: number
          zone_id: string
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric: string
          period_end: string
          period_start: string
          run_id?: string | null
          source: string
          value: number
          zone_id: string
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric?: string
          period_end?: string
          period_start?: string
          run_id?: string | null
          source?: string
          value?: number
          zone_id?: string
        }
        Relationships: []
      }
      geo_snapshots_p20250101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric: string
          period_end: string
          period_start: string
          run_id: string | null
          source: string
          value: number
          zone_id: string
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric: string
          period_end: string
          period_start: string
          run_id?: string | null
          source: string
          value: number
          zone_id: string
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric?: string
          period_end?: string
          period_start?: string
          run_id?: string | null
          source?: string
          value?: number
          zone_id?: string
        }
        Relationships: []
      }
      geo_snapshots_p20260101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric: string
          period_end: string
          period_start: string
          run_id: string | null
          source: string
          value: number
          zone_id: string
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric: string
          period_end: string
          period_start: string
          run_id?: string | null
          source: string
          value: number
          zone_id: string
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric?: string
          period_end?: string
          period_start?: string
          run_id?: string | null
          source?: string
          value?: number
          zone_id?: string
        }
        Relationships: []
      }
      geo_snapshots_p20270101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric: string
          period_end: string
          period_start: string
          run_id: string | null
          source: string
          value: number
          zone_id: string
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric: string
          period_end: string
          period_start: string
          run_id?: string | null
          source: string
          value: number
          zone_id: string
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric?: string
          period_end?: string
          period_start?: string
          run_id?: string | null
          source?: string
          value?: number
          zone_id?: string
        }
        Relationships: []
      }
      geo_snapshots_p20280101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric: string
          period_end: string
          period_start: string
          run_id: string | null
          source: string
          value: number
          zone_id: string
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric: string
          period_end: string
          period_start: string
          run_id?: string | null
          source: string
          value: number
          zone_id: string
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric?: string
          period_end?: string
          period_start?: string
          run_id?: string | null
          source?: string
          value?: number
          zone_id?: string
        }
        Relationships: []
      }
      geo_snapshots_p20290101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric: string
          period_end: string
          period_start: string
          run_id: string | null
          source: string
          value: number
          zone_id: string
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric: string
          period_end: string
          period_start: string
          run_id?: string | null
          source: string
          value: number
          zone_id: string
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric?: string
          period_end?: string
          period_start?: string
          run_id?: string | null
          source?: string
          value?: number
          zone_id?: string
        }
        Relationships: []
      }
      geo_snapshots_p20300101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric: string
          period_end: string
          period_start: string
          run_id: string | null
          source: string
          value: number
          zone_id: string
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric: string
          period_end: string
          period_start: string
          run_id?: string | null
          source: string
          value: number
          zone_id: string
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric?: string
          period_end?: string
          period_start?: string
          run_id?: string | null
          source?: string
          value?: number
          zone_id?: string
        }
        Relationships: []
      }
      ingest_allowed_sources: {
        Row: {
          added_at: string
          category: string
          is_active: boolean
          legal_basis: string | null
          meta: Json
          source: string
        }
        Insert: {
          added_at?: string
          category: string
          is_active?: boolean
          legal_basis?: string | null
          meta?: Json
          source: string
        }
        Update: {
          added_at?: string
          category?: string
          is_active?: boolean
          legal_basis?: string | null
          meta?: Json
          source?: string
        }
        Relationships: []
      }
      ingest_dlq: {
        Row: {
          failed_at: string
          id: string
          payload: Json
          reason: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by_user_id: string | null
          retry_count: number
          run_id: string | null
          source: string
        }
        Insert: {
          failed_at?: string
          id?: string
          payload: Json
          reason: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          retry_count?: number
          run_id?: string | null
          source: string
        }
        Update: {
          failed_at?: string
          id?: string
          payload?: Json
          reason?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          retry_count?: number
          run_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingest_dlq_resolved_by_user_id_fkey"
            columns: ["resolved_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingest_dlq_resolved_by_user_id_fkey"
            columns: ["resolved_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingest_dlq_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ingest_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ingest_runs: {
        Row: {
          completed_at: string | null
          cost_estimated_usd: number | null
          country_code: string
          duration_ms: number | null
          error: string | null
          id: string
          meta: Json
          raw_payload_url: string | null
          rows_dlq: number
          rows_inserted: number
          rows_skipped: number
          rows_updated: number
          sample_percentage: number | null
          source: string
          started_at: string
          status: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          cost_estimated_usd?: number | null
          country_code: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          meta?: Json
          raw_payload_url?: string | null
          rows_dlq?: number
          rows_inserted?: number
          rows_skipped?: number
          rows_updated?: number
          sample_percentage?: number | null
          source: string
          started_at?: string
          status: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          cost_estimated_usd?: number | null
          country_code?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          meta?: Json
          raw_payload_url?: string | null
          rows_dlq?: number
          rows_inserted?: number
          rows_skipped?: number
          rows_updated?: number
          sample_percentage?: number | null
          source?: string
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingest_runs_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      ingest_watermarks: {
        Row: {
          alert_after_hours: number | null
          country_code: string
          expected_periodicity: string | null
          last_successful_at: string | null
          last_successful_period_end: string | null
          last_successful_run_id: string | null
          meta: Json
          source: string
        }
        Insert: {
          alert_after_hours?: number | null
          country_code: string
          expected_periodicity?: string | null
          last_successful_at?: string | null
          last_successful_period_end?: string | null
          last_successful_run_id?: string | null
          meta?: Json
          source: string
        }
        Update: {
          alert_after_hours?: number | null
          country_code?: string
          expected_periodicity?: string | null
          last_successful_at?: string | null
          last_successful_period_end?: string | null
          last_successful_run_id?: string | null
          meta?: Json
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingest_watermarks_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "ingest_watermarks_last_successful_run_id_fkey"
            columns: ["last_successful_run_id"]
            isOneToOne: false
            referencedRelation: "ingest_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_documents_template: {
        Row: {
          body_md: string
          code: string
          country_code: string
          created_at: string
          id: string
          is_active: boolean
          locale: string
          name: string
          required_fields: Json
          version: string
        }
        Insert: {
          body_md: string
          code: string
          country_code: string
          created_at?: string
          id?: string
          is_active?: boolean
          locale: string
          name: string
          required_fields?: Json
          version: string
        }
        Update: {
          body_md?: string
          code?: string
          country_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          locale?: string
          name?: string
          required_fields?: Json
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_documents_template_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "legal_documents_template_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "locales"
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
      macro_series: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric_name: string
          period_end: string
          period_start: string
          periodicity: string
          run_id: string | null
          series_id: string
          source: string
          unit: string
          value: number
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric_name: string
          period_end: string
          period_start: string
          periodicity: string
          run_id?: string | null
          series_id: string
          source: string
          unit: string
          value: number
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric_name?: string
          period_end?: string
          period_start?: string
          periodicity?: string
          run_id?: string | null
          series_id?: string
          source?: string
          unit?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "macro_series_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      macro_series_default: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric_name: string
          period_end: string
          period_start: string
          periodicity: string
          run_id: string | null
          series_id: string
          source: string
          unit: string
          value: number
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric_name: string
          period_end: string
          period_start: string
          periodicity: string
          run_id?: string | null
          series_id: string
          source: string
          unit: string
          value: number
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric_name?: string
          period_end?: string
          period_start?: string
          periodicity?: string
          run_id?: string | null
          series_id?: string
          source?: string
          unit?: string
          value?: number
        }
        Relationships: []
      }
      macro_series_p20220101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric_name: string
          period_end: string
          period_start: string
          periodicity: string
          run_id: string | null
          series_id: string
          source: string
          unit: string
          value: number
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric_name: string
          period_end: string
          period_start: string
          periodicity: string
          run_id?: string | null
          series_id: string
          source: string
          unit: string
          value: number
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric_name?: string
          period_end?: string
          period_start?: string
          periodicity?: string
          run_id?: string | null
          series_id?: string
          source?: string
          unit?: string
          value?: number
        }
        Relationships: []
      }
      macro_series_p20230101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric_name: string
          period_end: string
          period_start: string
          periodicity: string
          run_id: string | null
          series_id: string
          source: string
          unit: string
          value: number
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric_name: string
          period_end: string
          period_start: string
          periodicity: string
          run_id?: string | null
          series_id: string
          source: string
          unit: string
          value: number
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric_name?: string
          period_end?: string
          period_start?: string
          periodicity?: string
          run_id?: string | null
          series_id?: string
          source?: string
          unit?: string
          value?: number
        }
        Relationships: []
      }
      macro_series_p20240101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric_name: string
          period_end: string
          period_start: string
          periodicity: string
          run_id: string | null
          series_id: string
          source: string
          unit: string
          value: number
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric_name: string
          period_end: string
          period_start: string
          periodicity: string
          run_id?: string | null
          series_id: string
          source: string
          unit: string
          value: number
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric_name?: string
          period_end?: string
          period_start?: string
          periodicity?: string
          run_id?: string | null
          series_id?: string
          source?: string
          unit?: string
          value?: number
        }
        Relationships: []
      }
      macro_series_p20250101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric_name: string
          period_end: string
          period_start: string
          periodicity: string
          run_id: string | null
          series_id: string
          source: string
          unit: string
          value: number
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric_name: string
          period_end: string
          period_start: string
          periodicity: string
          run_id?: string | null
          series_id: string
          source: string
          unit: string
          value: number
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric_name?: string
          period_end?: string
          period_start?: string
          periodicity?: string
          run_id?: string | null
          series_id?: string
          source?: string
          unit?: string
          value?: number
        }
        Relationships: []
      }
      macro_series_p20260101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric_name: string
          period_end: string
          period_start: string
          periodicity: string
          run_id: string | null
          series_id: string
          source: string
          unit: string
          value: number
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric_name: string
          period_end: string
          period_start: string
          periodicity: string
          run_id?: string | null
          series_id: string
          source: string
          unit: string
          value: number
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric_name?: string
          period_end?: string
          period_start?: string
          periodicity?: string
          run_id?: string | null
          series_id?: string
          source?: string
          unit?: string
          value?: number
        }
        Relationships: []
      }
      macro_series_p20270101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric_name: string
          period_end: string
          period_start: string
          periodicity: string
          run_id: string | null
          series_id: string
          source: string
          unit: string
          value: number
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric_name: string
          period_end: string
          period_start: string
          periodicity: string
          run_id?: string | null
          series_id: string
          source: string
          unit: string
          value: number
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric_name?: string
          period_end?: string
          period_start?: string
          periodicity?: string
          run_id?: string | null
          series_id?: string
          source?: string
          unit?: string
          value?: number
        }
        Relationships: []
      }
      macro_series_p20280101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric_name: string
          period_end: string
          period_start: string
          periodicity: string
          run_id: string | null
          series_id: string
          source: string
          unit: string
          value: number
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric_name: string
          period_end: string
          period_start: string
          periodicity: string
          run_id?: string | null
          series_id: string
          source: string
          unit: string
          value: number
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric_name?: string
          period_end?: string
          period_start?: string
          periodicity?: string
          run_id?: string | null
          series_id?: string
          source?: string
          unit?: string
          value?: number
        }
        Relationships: []
      }
      macro_series_p20290101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric_name: string
          period_end: string
          period_start: string
          periodicity: string
          run_id: string | null
          series_id: string
          source: string
          unit: string
          value: number
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric_name: string
          period_end: string
          period_start: string
          periodicity: string
          run_id?: string | null
          series_id: string
          source: string
          unit: string
          value: number
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric_name?: string
          period_end?: string
          period_start?: string
          periodicity?: string
          run_id?: string | null
          series_id?: string
          source?: string
          unit?: string
          value?: number
        }
        Relationships: []
      }
      macro_series_p20300101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric_name: string
          period_end: string
          period_start: string
          periodicity: string
          run_id: string | null
          series_id: string
          source: string
          unit: string
          value: number
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric_name: string
          period_end: string
          period_start: string
          periodicity: string
          run_id?: string | null
          series_id: string
          source: string
          unit: string
          value: number
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric_name?: string
          period_end?: string
          period_start?: string
          periodicity?: string
          run_id?: string | null
          series_id?: string
          source?: string
          unit?: string
          value?: number
        }
        Relationships: []
      }
      market_prices_secondary: {
        Row: {
          address_raw: string | null
          amenities: Json | null
          area_built_m2: number | null
          area_terrain_m2: number | null
          bathrooms: number | null
          bedrooms: number | null
          captured_by_user_id: string | null
          captured_via: Database["public"]["Enums"]["market_capture_source"]
          country_code: string
          currency: string
          days_on_market: number | null
          fetched_at: string
          geom: unknown
          h3_r8: string | null
          id: number
          listing_id: string
          meta: Json
          operation: string
          parking: number | null
          posted_at: string
          price_minor: number
          property_type: string | null
          raw_html_hash: string | null
          run_id: string | null
          seller_type: string | null
          source: string
          zone_id: string | null
        }
        Insert: {
          address_raw?: string | null
          amenities?: Json | null
          area_built_m2?: number | null
          area_terrain_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captured_by_user_id?: string | null
          captured_via?: Database["public"]["Enums"]["market_capture_source"]
          country_code: string
          currency: string
          days_on_market?: number | null
          fetched_at?: string
          geom?: unknown
          h3_r8?: string | null
          id?: never
          listing_id: string
          meta?: Json
          operation: string
          parking?: number | null
          posted_at: string
          price_minor: number
          property_type?: string | null
          raw_html_hash?: string | null
          run_id?: string | null
          seller_type?: string | null
          source: string
          zone_id?: string | null
        }
        Update: {
          address_raw?: string | null
          amenities?: Json | null
          area_built_m2?: number | null
          area_terrain_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captured_by_user_id?: string | null
          captured_via?: Database["public"]["Enums"]["market_capture_source"]
          country_code?: string
          currency?: string
          days_on_market?: number | null
          fetched_at?: string
          geom?: unknown
          h3_r8?: string | null
          id?: never
          listing_id?: string
          meta?: Json
          operation?: string
          parking?: number | null
          posted_at?: string
          price_minor?: number
          property_type?: string | null
          raw_html_hash?: string | null
          run_id?: string | null
          seller_type?: string | null
          source?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_prices_secondary_captured_by_user_id_fkey"
            columns: ["captured_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_prices_secondary_captured_by_user_id_fkey"
            columns: ["captured_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_prices_secondary_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "market_prices_secondary_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      market_prices_secondary_default: {
        Row: {
          address_raw: string | null
          amenities: Json | null
          area_built_m2: number | null
          area_terrain_m2: number | null
          bathrooms: number | null
          bedrooms: number | null
          captured_by_user_id: string | null
          captured_via: Database["public"]["Enums"]["market_capture_source"]
          country_code: string
          currency: string
          days_on_market: number | null
          fetched_at: string
          geom: unknown
          h3_r8: string | null
          id: number
          listing_id: string
          meta: Json
          operation: string
          parking: number | null
          posted_at: string
          price_minor: number
          property_type: string | null
          raw_html_hash: string | null
          run_id: string | null
          seller_type: string | null
          source: string
          zone_id: string | null
        }
        Insert: {
          address_raw?: string | null
          amenities?: Json | null
          area_built_m2?: number | null
          area_terrain_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captured_by_user_id?: string | null
          captured_via?: Database["public"]["Enums"]["market_capture_source"]
          country_code: string
          currency: string
          days_on_market?: number | null
          fetched_at?: string
          geom?: unknown
          h3_r8?: string | null
          id?: never
          listing_id: string
          meta?: Json
          operation: string
          parking?: number | null
          posted_at: string
          price_minor: number
          property_type?: string | null
          raw_html_hash?: string | null
          run_id?: string | null
          seller_type?: string | null
          source: string
          zone_id?: string | null
        }
        Update: {
          address_raw?: string | null
          amenities?: Json | null
          area_built_m2?: number | null
          area_terrain_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captured_by_user_id?: string | null
          captured_via?: Database["public"]["Enums"]["market_capture_source"]
          country_code?: string
          currency?: string
          days_on_market?: number | null
          fetched_at?: string
          geom?: unknown
          h3_r8?: string | null
          id?: never
          listing_id?: string
          meta?: Json
          operation?: string
          parking?: number | null
          posted_at?: string
          price_minor?: number
          property_type?: string | null
          raw_html_hash?: string | null
          run_id?: string | null
          seller_type?: string | null
          source?: string
          zone_id?: string | null
        }
        Relationships: []
      }
      market_prices_secondary_p20251201: {
        Row: {
          address_raw: string | null
          amenities: Json | null
          area_built_m2: number | null
          area_terrain_m2: number | null
          bathrooms: number | null
          bedrooms: number | null
          captured_by_user_id: string | null
          captured_via: Database["public"]["Enums"]["market_capture_source"]
          country_code: string
          currency: string
          days_on_market: number | null
          fetched_at: string
          geom: unknown
          h3_r8: string | null
          id: number
          listing_id: string
          meta: Json
          operation: string
          parking: number | null
          posted_at: string
          price_minor: number
          property_type: string | null
          raw_html_hash: string | null
          run_id: string | null
          seller_type: string | null
          source: string
          zone_id: string | null
        }
        Insert: {
          address_raw?: string | null
          amenities?: Json | null
          area_built_m2?: number | null
          area_terrain_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captured_by_user_id?: string | null
          captured_via?: Database["public"]["Enums"]["market_capture_source"]
          country_code: string
          currency: string
          days_on_market?: number | null
          fetched_at?: string
          geom?: unknown
          h3_r8?: string | null
          id?: never
          listing_id: string
          meta?: Json
          operation: string
          parking?: number | null
          posted_at: string
          price_minor: number
          property_type?: string | null
          raw_html_hash?: string | null
          run_id?: string | null
          seller_type?: string | null
          source: string
          zone_id?: string | null
        }
        Update: {
          address_raw?: string | null
          amenities?: Json | null
          area_built_m2?: number | null
          area_terrain_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captured_by_user_id?: string | null
          captured_via?: Database["public"]["Enums"]["market_capture_source"]
          country_code?: string
          currency?: string
          days_on_market?: number | null
          fetched_at?: string
          geom?: unknown
          h3_r8?: string | null
          id?: never
          listing_id?: string
          meta?: Json
          operation?: string
          parking?: number | null
          posted_at?: string
          price_minor?: number
          property_type?: string | null
          raw_html_hash?: string | null
          run_id?: string | null
          seller_type?: string | null
          source?: string
          zone_id?: string | null
        }
        Relationships: []
      }
      market_prices_secondary_p20260101: {
        Row: {
          address_raw: string | null
          amenities: Json | null
          area_built_m2: number | null
          area_terrain_m2: number | null
          bathrooms: number | null
          bedrooms: number | null
          captured_by_user_id: string | null
          captured_via: Database["public"]["Enums"]["market_capture_source"]
          country_code: string
          currency: string
          days_on_market: number | null
          fetched_at: string
          geom: unknown
          h3_r8: string | null
          id: number
          listing_id: string
          meta: Json
          operation: string
          parking: number | null
          posted_at: string
          price_minor: number
          property_type: string | null
          raw_html_hash: string | null
          run_id: string | null
          seller_type: string | null
          source: string
          zone_id: string | null
        }
        Insert: {
          address_raw?: string | null
          amenities?: Json | null
          area_built_m2?: number | null
          area_terrain_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captured_by_user_id?: string | null
          captured_via?: Database["public"]["Enums"]["market_capture_source"]
          country_code: string
          currency: string
          days_on_market?: number | null
          fetched_at?: string
          geom?: unknown
          h3_r8?: string | null
          id?: never
          listing_id: string
          meta?: Json
          operation: string
          parking?: number | null
          posted_at: string
          price_minor: number
          property_type?: string | null
          raw_html_hash?: string | null
          run_id?: string | null
          seller_type?: string | null
          source: string
          zone_id?: string | null
        }
        Update: {
          address_raw?: string | null
          amenities?: Json | null
          area_built_m2?: number | null
          area_terrain_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captured_by_user_id?: string | null
          captured_via?: Database["public"]["Enums"]["market_capture_source"]
          country_code?: string
          currency?: string
          days_on_market?: number | null
          fetched_at?: string
          geom?: unknown
          h3_r8?: string | null
          id?: never
          listing_id?: string
          meta?: Json
          operation?: string
          parking?: number | null
          posted_at?: string
          price_minor?: number
          property_type?: string | null
          raw_html_hash?: string | null
          run_id?: string | null
          seller_type?: string | null
          source?: string
          zone_id?: string | null
        }
        Relationships: []
      }
      market_prices_secondary_p20260201: {
        Row: {
          address_raw: string | null
          amenities: Json | null
          area_built_m2: number | null
          area_terrain_m2: number | null
          bathrooms: number | null
          bedrooms: number | null
          captured_by_user_id: string | null
          captured_via: Database["public"]["Enums"]["market_capture_source"]
          country_code: string
          currency: string
          days_on_market: number | null
          fetched_at: string
          geom: unknown
          h3_r8: string | null
          id: number
          listing_id: string
          meta: Json
          operation: string
          parking: number | null
          posted_at: string
          price_minor: number
          property_type: string | null
          raw_html_hash: string | null
          run_id: string | null
          seller_type: string | null
          source: string
          zone_id: string | null
        }
        Insert: {
          address_raw?: string | null
          amenities?: Json | null
          area_built_m2?: number | null
          area_terrain_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captured_by_user_id?: string | null
          captured_via?: Database["public"]["Enums"]["market_capture_source"]
          country_code: string
          currency: string
          days_on_market?: number | null
          fetched_at?: string
          geom?: unknown
          h3_r8?: string | null
          id?: never
          listing_id: string
          meta?: Json
          operation: string
          parking?: number | null
          posted_at: string
          price_minor: number
          property_type?: string | null
          raw_html_hash?: string | null
          run_id?: string | null
          seller_type?: string | null
          source: string
          zone_id?: string | null
        }
        Update: {
          address_raw?: string | null
          amenities?: Json | null
          area_built_m2?: number | null
          area_terrain_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captured_by_user_id?: string | null
          captured_via?: Database["public"]["Enums"]["market_capture_source"]
          country_code?: string
          currency?: string
          days_on_market?: number | null
          fetched_at?: string
          geom?: unknown
          h3_r8?: string | null
          id?: never
          listing_id?: string
          meta?: Json
          operation?: string
          parking?: number | null
          posted_at?: string
          price_minor?: number
          property_type?: string | null
          raw_html_hash?: string | null
          run_id?: string | null
          seller_type?: string | null
          source?: string
          zone_id?: string | null
        }
        Relationships: []
      }
      market_prices_secondary_p20260301: {
        Row: {
          address_raw: string | null
          amenities: Json | null
          area_built_m2: number | null
          area_terrain_m2: number | null
          bathrooms: number | null
          bedrooms: number | null
          captured_by_user_id: string | null
          captured_via: Database["public"]["Enums"]["market_capture_source"]
          country_code: string
          currency: string
          days_on_market: number | null
          fetched_at: string
          geom: unknown
          h3_r8: string | null
          id: number
          listing_id: string
          meta: Json
          operation: string
          parking: number | null
          posted_at: string
          price_minor: number
          property_type: string | null
          raw_html_hash: string | null
          run_id: string | null
          seller_type: string | null
          source: string
          zone_id: string | null
        }
        Insert: {
          address_raw?: string | null
          amenities?: Json | null
          area_built_m2?: number | null
          area_terrain_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captured_by_user_id?: string | null
          captured_via?: Database["public"]["Enums"]["market_capture_source"]
          country_code: string
          currency: string
          days_on_market?: number | null
          fetched_at?: string
          geom?: unknown
          h3_r8?: string | null
          id?: never
          listing_id: string
          meta?: Json
          operation: string
          parking?: number | null
          posted_at: string
          price_minor: number
          property_type?: string | null
          raw_html_hash?: string | null
          run_id?: string | null
          seller_type?: string | null
          source: string
          zone_id?: string | null
        }
        Update: {
          address_raw?: string | null
          amenities?: Json | null
          area_built_m2?: number | null
          area_terrain_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captured_by_user_id?: string | null
          captured_via?: Database["public"]["Enums"]["market_capture_source"]
          country_code?: string
          currency?: string
          days_on_market?: number | null
          fetched_at?: string
          geom?: unknown
          h3_r8?: string | null
          id?: never
          listing_id?: string
          meta?: Json
          operation?: string
          parking?: number | null
          posted_at?: string
          price_minor?: number
          property_type?: string | null
          raw_html_hash?: string | null
          run_id?: string | null
          seller_type?: string | null
          source?: string
          zone_id?: string | null
        }
        Relationships: []
      }
      market_prices_secondary_p20260401: {
        Row: {
          address_raw: string | null
          amenities: Json | null
          area_built_m2: number | null
          area_terrain_m2: number | null
          bathrooms: number | null
          bedrooms: number | null
          captured_by_user_id: string | null
          captured_via: Database["public"]["Enums"]["market_capture_source"]
          country_code: string
          currency: string
          days_on_market: number | null
          fetched_at: string
          geom: unknown
          h3_r8: string | null
          id: number
          listing_id: string
          meta: Json
          operation: string
          parking: number | null
          posted_at: string
          price_minor: number
          property_type: string | null
          raw_html_hash: string | null
          run_id: string | null
          seller_type: string | null
          source: string
          zone_id: string | null
        }
        Insert: {
          address_raw?: string | null
          amenities?: Json | null
          area_built_m2?: number | null
          area_terrain_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captured_by_user_id?: string | null
          captured_via?: Database["public"]["Enums"]["market_capture_source"]
          country_code: string
          currency: string
          days_on_market?: number | null
          fetched_at?: string
          geom?: unknown
          h3_r8?: string | null
          id?: never
          listing_id: string
          meta?: Json
          operation: string
          parking?: number | null
          posted_at: string
          price_minor: number
          property_type?: string | null
          raw_html_hash?: string | null
          run_id?: string | null
          seller_type?: string | null
          source: string
          zone_id?: string | null
        }
        Update: {
          address_raw?: string | null
          amenities?: Json | null
          area_built_m2?: number | null
          area_terrain_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captured_by_user_id?: string | null
          captured_via?: Database["public"]["Enums"]["market_capture_source"]
          country_code?: string
          currency?: string
          days_on_market?: number | null
          fetched_at?: string
          geom?: unknown
          h3_r8?: string | null
          id?: never
          listing_id?: string
          meta?: Json
          operation?: string
          parking?: number | null
          posted_at?: string
          price_minor?: number
          property_type?: string | null
          raw_html_hash?: string | null
          run_id?: string | null
          seller_type?: string | null
          source?: string
          zone_id?: string | null
        }
        Relationships: []
      }
      market_prices_secondary_p20260501: {
        Row: {
          address_raw: string | null
          amenities: Json | null
          area_built_m2: number | null
          area_terrain_m2: number | null
          bathrooms: number | null
          bedrooms: number | null
          captured_by_user_id: string | null
          captured_via: Database["public"]["Enums"]["market_capture_source"]
          country_code: string
          currency: string
          days_on_market: number | null
          fetched_at: string
          geom: unknown
          h3_r8: string | null
          id: number
          listing_id: string
          meta: Json
          operation: string
          parking: number | null
          posted_at: string
          price_minor: number
          property_type: string | null
          raw_html_hash: string | null
          run_id: string | null
          seller_type: string | null
          source: string
          zone_id: string | null
        }
        Insert: {
          address_raw?: string | null
          amenities?: Json | null
          area_built_m2?: number | null
          area_terrain_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captured_by_user_id?: string | null
          captured_via?: Database["public"]["Enums"]["market_capture_source"]
          country_code: string
          currency: string
          days_on_market?: number | null
          fetched_at?: string
          geom?: unknown
          h3_r8?: string | null
          id?: never
          listing_id: string
          meta?: Json
          operation: string
          parking?: number | null
          posted_at: string
          price_minor: number
          property_type?: string | null
          raw_html_hash?: string | null
          run_id?: string | null
          seller_type?: string | null
          source: string
          zone_id?: string | null
        }
        Update: {
          address_raw?: string | null
          amenities?: Json | null
          area_built_m2?: number | null
          area_terrain_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captured_by_user_id?: string | null
          captured_via?: Database["public"]["Enums"]["market_capture_source"]
          country_code?: string
          currency?: string
          days_on_market?: number | null
          fetched_at?: string
          geom?: unknown
          h3_r8?: string | null
          id?: never
          listing_id?: string
          meta?: Json
          operation?: string
          parking?: number | null
          posted_at?: string
          price_minor?: number
          property_type?: string | null
          raw_html_hash?: string | null
          run_id?: string | null
          seller_type?: string | null
          source?: string
          zone_id?: string | null
        }
        Relationships: []
      }
      market_prices_secondary_p20260601: {
        Row: {
          address_raw: string | null
          amenities: Json | null
          area_built_m2: number | null
          area_terrain_m2: number | null
          bathrooms: number | null
          bedrooms: number | null
          captured_by_user_id: string | null
          captured_via: Database["public"]["Enums"]["market_capture_source"]
          country_code: string
          currency: string
          days_on_market: number | null
          fetched_at: string
          geom: unknown
          h3_r8: string | null
          id: number
          listing_id: string
          meta: Json
          operation: string
          parking: number | null
          posted_at: string
          price_minor: number
          property_type: string | null
          raw_html_hash: string | null
          run_id: string | null
          seller_type: string | null
          source: string
          zone_id: string | null
        }
        Insert: {
          address_raw?: string | null
          amenities?: Json | null
          area_built_m2?: number | null
          area_terrain_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captured_by_user_id?: string | null
          captured_via?: Database["public"]["Enums"]["market_capture_source"]
          country_code: string
          currency: string
          days_on_market?: number | null
          fetched_at?: string
          geom?: unknown
          h3_r8?: string | null
          id?: never
          listing_id: string
          meta?: Json
          operation: string
          parking?: number | null
          posted_at: string
          price_minor: number
          property_type?: string | null
          raw_html_hash?: string | null
          run_id?: string | null
          seller_type?: string | null
          source: string
          zone_id?: string | null
        }
        Update: {
          address_raw?: string | null
          amenities?: Json | null
          area_built_m2?: number | null
          area_terrain_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captured_by_user_id?: string | null
          captured_via?: Database["public"]["Enums"]["market_capture_source"]
          country_code?: string
          currency?: string
          days_on_market?: number | null
          fetched_at?: string
          geom?: unknown
          h3_r8?: string | null
          id?: never
          listing_id?: string
          meta?: Json
          operation?: string
          parking?: number | null
          posted_at?: string
          price_minor?: number
          property_type?: string | null
          raw_html_hash?: string | null
          run_id?: string | null
          seller_type?: string | null
          source?: string
          zone_id?: string | null
        }
        Relationships: []
      }
      market_prices_secondary_p20260701: {
        Row: {
          address_raw: string | null
          amenities: Json | null
          area_built_m2: number | null
          area_terrain_m2: number | null
          bathrooms: number | null
          bedrooms: number | null
          captured_by_user_id: string | null
          captured_via: Database["public"]["Enums"]["market_capture_source"]
          country_code: string
          currency: string
          days_on_market: number | null
          fetched_at: string
          geom: unknown
          h3_r8: string | null
          id: number
          listing_id: string
          meta: Json
          operation: string
          parking: number | null
          posted_at: string
          price_minor: number
          property_type: string | null
          raw_html_hash: string | null
          run_id: string | null
          seller_type: string | null
          source: string
          zone_id: string | null
        }
        Insert: {
          address_raw?: string | null
          amenities?: Json | null
          area_built_m2?: number | null
          area_terrain_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captured_by_user_id?: string | null
          captured_via?: Database["public"]["Enums"]["market_capture_source"]
          country_code: string
          currency: string
          days_on_market?: number | null
          fetched_at?: string
          geom?: unknown
          h3_r8?: string | null
          id?: never
          listing_id: string
          meta?: Json
          operation: string
          parking?: number | null
          posted_at: string
          price_minor: number
          property_type?: string | null
          raw_html_hash?: string | null
          run_id?: string | null
          seller_type?: string | null
          source: string
          zone_id?: string | null
        }
        Update: {
          address_raw?: string | null
          amenities?: Json | null
          area_built_m2?: number | null
          area_terrain_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captured_by_user_id?: string | null
          captured_via?: Database["public"]["Enums"]["market_capture_source"]
          country_code?: string
          currency?: string
          days_on_market?: number | null
          fetched_at?: string
          geom?: unknown
          h3_r8?: string | null
          id?: never
          listing_id?: string
          meta?: Json
          operation?: string
          parking?: number | null
          posted_at?: string
          price_minor?: number
          property_type?: string | null
          raw_html_hash?: string | null
          run_id?: string | null
          seller_type?: string | null
          source?: string
          zone_id?: string | null
        }
        Relationships: []
      }
      market_prices_secondary_p20260801: {
        Row: {
          address_raw: string | null
          amenities: Json | null
          area_built_m2: number | null
          area_terrain_m2: number | null
          bathrooms: number | null
          bedrooms: number | null
          captured_by_user_id: string | null
          captured_via: Database["public"]["Enums"]["market_capture_source"]
          country_code: string
          currency: string
          days_on_market: number | null
          fetched_at: string
          geom: unknown
          h3_r8: string | null
          id: number
          listing_id: string
          meta: Json
          operation: string
          parking: number | null
          posted_at: string
          price_minor: number
          property_type: string | null
          raw_html_hash: string | null
          run_id: string | null
          seller_type: string | null
          source: string
          zone_id: string | null
        }
        Insert: {
          address_raw?: string | null
          amenities?: Json | null
          area_built_m2?: number | null
          area_terrain_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captured_by_user_id?: string | null
          captured_via?: Database["public"]["Enums"]["market_capture_source"]
          country_code: string
          currency: string
          days_on_market?: number | null
          fetched_at?: string
          geom?: unknown
          h3_r8?: string | null
          id?: never
          listing_id: string
          meta?: Json
          operation: string
          parking?: number | null
          posted_at: string
          price_minor: number
          property_type?: string | null
          raw_html_hash?: string | null
          run_id?: string | null
          seller_type?: string | null
          source: string
          zone_id?: string | null
        }
        Update: {
          address_raw?: string | null
          amenities?: Json | null
          area_built_m2?: number | null
          area_terrain_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captured_by_user_id?: string | null
          captured_via?: Database["public"]["Enums"]["market_capture_source"]
          country_code?: string
          currency?: string
          days_on_market?: number | null
          fetched_at?: string
          geom?: unknown
          h3_r8?: string | null
          id?: never
          listing_id?: string
          meta?: Json
          operation?: string
          parking?: number | null
          posted_at?: string
          price_minor?: number
          property_type?: string | null
          raw_html_hash?: string | null
          run_id?: string | null
          seller_type?: string | null
          source?: string
          zone_id?: string | null
        }
        Relationships: []
      }
      market_pulse: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric: string
          period_end: string
          period_start: string
          run_id: string | null
          source: string
          value: number
          zone_id: string | null
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric: string
          period_end: string
          period_start: string
          run_id?: string | null
          source: string
          value: number
          zone_id?: string | null
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric?: string
          period_end?: string
          period_start?: string
          run_id?: string | null
          source?: string
          value?: number
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_pulse_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      market_pulse_default: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric: string
          period_end: string
          period_start: string
          run_id: string | null
          source: string
          value: number
          zone_id: string | null
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric: string
          period_end: string
          period_start: string
          run_id?: string | null
          source: string
          value: number
          zone_id?: string | null
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric?: string
          period_end?: string
          period_start?: string
          run_id?: string | null
          source?: string
          value?: number
          zone_id?: string | null
        }
        Relationships: []
      }
      market_pulse_p20220101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric: string
          period_end: string
          period_start: string
          run_id: string | null
          source: string
          value: number
          zone_id: string | null
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric: string
          period_end: string
          period_start: string
          run_id?: string | null
          source: string
          value: number
          zone_id?: string | null
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric?: string
          period_end?: string
          period_start?: string
          run_id?: string | null
          source?: string
          value?: number
          zone_id?: string | null
        }
        Relationships: []
      }
      market_pulse_p20230101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric: string
          period_end: string
          period_start: string
          run_id: string | null
          source: string
          value: number
          zone_id: string | null
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric: string
          period_end: string
          period_start: string
          run_id?: string | null
          source: string
          value: number
          zone_id?: string | null
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric?: string
          period_end?: string
          period_start?: string
          run_id?: string | null
          source?: string
          value?: number
          zone_id?: string | null
        }
        Relationships: []
      }
      market_pulse_p20240101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric: string
          period_end: string
          period_start: string
          run_id: string | null
          source: string
          value: number
          zone_id: string | null
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric: string
          period_end: string
          period_start: string
          run_id?: string | null
          source: string
          value: number
          zone_id?: string | null
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric?: string
          period_end?: string
          period_start?: string
          run_id?: string | null
          source?: string
          value?: number
          zone_id?: string | null
        }
        Relationships: []
      }
      market_pulse_p20250101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric: string
          period_end: string
          period_start: string
          run_id: string | null
          source: string
          value: number
          zone_id: string | null
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric: string
          period_end: string
          period_start: string
          run_id?: string | null
          source: string
          value: number
          zone_id?: string | null
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric?: string
          period_end?: string
          period_start?: string
          run_id?: string | null
          source?: string
          value?: number
          zone_id?: string | null
        }
        Relationships: []
      }
      market_pulse_p20260101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric: string
          period_end: string
          period_start: string
          run_id: string | null
          source: string
          value: number
          zone_id: string | null
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric: string
          period_end: string
          period_start: string
          run_id?: string | null
          source: string
          value: number
          zone_id?: string | null
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric?: string
          period_end?: string
          period_start?: string
          run_id?: string | null
          source?: string
          value?: number
          zone_id?: string | null
        }
        Relationships: []
      }
      market_pulse_p20270101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric: string
          period_end: string
          period_start: string
          run_id: string | null
          source: string
          value: number
          zone_id: string | null
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric: string
          period_end: string
          period_start: string
          run_id?: string | null
          source: string
          value: number
          zone_id?: string | null
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric?: string
          period_end?: string
          period_start?: string
          run_id?: string | null
          source?: string
          value?: number
          zone_id?: string | null
        }
        Relationships: []
      }
      market_pulse_p20280101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric: string
          period_end: string
          period_start: string
          run_id: string | null
          source: string
          value: number
          zone_id: string | null
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric: string
          period_end: string
          period_start: string
          run_id?: string | null
          source: string
          value: number
          zone_id?: string | null
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric?: string
          period_end?: string
          period_start?: string
          run_id?: string | null
          source?: string
          value?: number
          zone_id?: string | null
        }
        Relationships: []
      }
      market_pulse_p20290101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric: string
          period_end: string
          period_start: string
          run_id: string | null
          source: string
          value: number
          zone_id: string | null
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric: string
          period_end: string
          period_start: string
          run_id?: string | null
          source: string
          value: number
          zone_id?: string | null
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric?: string
          period_end?: string
          period_start?: string
          run_id?: string | null
          source?: string
          value?: number
          zone_id?: string | null
        }
        Relationships: []
      }
      market_pulse_p20300101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric: string
          period_end: string
          period_start: string
          run_id: string | null
          source: string
          value: number
          zone_id: string | null
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric: string
          period_end: string
          period_start: string
          run_id?: string | null
          source: string
          value: number
          zone_id?: string | null
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          meta?: Json
          metric?: string
          period_end?: string
          period_start?: string
          run_id?: string | null
          source?: string
          value?: number
          zone_id?: string | null
        }
        Relationships: []
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
      privacy_exports: {
        Row: {
          completed_at: string | null
          download_count: number
          expires_at: string | null
          id: string
          meta: Json
          profile_id: string
          requested_at: string
          storage_path: string | null
        }
        Insert: {
          completed_at?: string | null
          download_count?: number
          expires_at?: string | null
          id?: string
          meta?: Json
          profile_id: string
          requested_at?: string
          storage_path?: string | null
        }
        Update: {
          completed_at?: string | null
          download_count?: number
          expires_at?: string | null
          id?: string
          meta?: Json
          profile_id?: string
          requested_at?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "privacy_exports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privacy_exports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
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
          anonymized_at: string | null
          avatar_url: string | null
          broker_company_id: string | null
          country_code: string
          created_at: string
          deleted_at: string | null
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
          pending_deletion_at: string | null
          phone: string | null
          preferred_currency: string | null
          preferred_locale: string | null
          preferred_timezone: string
          razon_social: string | null
          regimen_fiscal: string | null
          rfc: string | null
          rfc_encrypted: string | null
          rol: Database["public"]["Enums"]["user_role"]
          slug: string | null
          tax_id: string | null
          tax_id_encrypted: string | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          anonymized_at?: string | null
          avatar_url?: string | null
          broker_company_id?: string | null
          country_code: string
          created_at?: string
          deleted_at?: string | null
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
          pending_deletion_at?: string | null
          phone?: string | null
          preferred_currency?: string | null
          preferred_locale?: string | null
          preferred_timezone?: string
          razon_social?: string | null
          regimen_fiscal?: string | null
          rfc?: string | null
          rfc_encrypted?: string | null
          rol?: Database["public"]["Enums"]["user_role"]
          slug?: string | null
          tax_id?: string | null
          tax_id_encrypted?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          anonymized_at?: string | null
          avatar_url?: string | null
          broker_company_id?: string | null
          country_code?: string
          created_at?: string
          deleted_at?: string | null
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
          pending_deletion_at?: string | null
          phone?: string | null
          preferred_currency?: string | null
          preferred_locale?: string | null
          preferred_timezone?: string
          razon_social?: string | null
          regimen_fiscal?: string | null
          rfc?: string | null
          rfc_encrypted?: string | null
          rol?: Database["public"]["Enums"]["user_role"]
          slug?: string | null
          tax_id?: string | null
          tax_id_encrypted?: string | null
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
      rate_limit_policies: {
        Row: {
          created_at: string
          description: string | null
          endpoint: string
          key_type: string
          max_calls: number
          updated_at: string
          window_sec: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          endpoint: string
          key_type: string
          max_calls: number
          updated_at?: string
          window_sec: number
        }
        Update: {
          created_at?: string
          description?: string | null
          endpoint?: string
          key_type?: string
          max_calls?: number
          updated_at?: string
          window_sec?: number
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
      search_trends: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          interest_score: number
          keyword: string
          meta: Json
          period_end: string
          period_start: string
          run_id: string | null
          zone_id: string | null
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          interest_score: number
          keyword: string
          meta?: Json
          period_end: string
          period_start: string
          run_id?: string | null
          zone_id?: string | null
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          interest_score?: number
          keyword?: string
          meta?: Json
          period_end?: string
          period_start?: string
          run_id?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_trends_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      search_trends_default: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          interest_score: number
          keyword: string
          meta: Json
          period_end: string
          period_start: string
          run_id: string | null
          zone_id: string | null
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          interest_score: number
          keyword: string
          meta?: Json
          period_end: string
          period_start: string
          run_id?: string | null
          zone_id?: string | null
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          interest_score?: number
          keyword?: string
          meta?: Json
          period_end?: string
          period_start?: string
          run_id?: string | null
          zone_id?: string | null
        }
        Relationships: []
      }
      search_trends_p20220101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          interest_score: number
          keyword: string
          meta: Json
          period_end: string
          period_start: string
          run_id: string | null
          zone_id: string | null
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          interest_score: number
          keyword: string
          meta?: Json
          period_end: string
          period_start: string
          run_id?: string | null
          zone_id?: string | null
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          interest_score?: number
          keyword?: string
          meta?: Json
          period_end?: string
          period_start?: string
          run_id?: string | null
          zone_id?: string | null
        }
        Relationships: []
      }
      search_trends_p20230101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          interest_score: number
          keyword: string
          meta: Json
          period_end: string
          period_start: string
          run_id: string | null
          zone_id: string | null
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          interest_score: number
          keyword: string
          meta?: Json
          period_end: string
          period_start: string
          run_id?: string | null
          zone_id?: string | null
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          interest_score?: number
          keyword?: string
          meta?: Json
          period_end?: string
          period_start?: string
          run_id?: string | null
          zone_id?: string | null
        }
        Relationships: []
      }
      search_trends_p20240101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          interest_score: number
          keyword: string
          meta: Json
          period_end: string
          period_start: string
          run_id: string | null
          zone_id: string | null
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          interest_score: number
          keyword: string
          meta?: Json
          period_end: string
          period_start: string
          run_id?: string | null
          zone_id?: string | null
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          interest_score?: number
          keyword?: string
          meta?: Json
          period_end?: string
          period_start?: string
          run_id?: string | null
          zone_id?: string | null
        }
        Relationships: []
      }
      search_trends_p20250101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          interest_score: number
          keyword: string
          meta: Json
          period_end: string
          period_start: string
          run_id: string | null
          zone_id: string | null
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          interest_score: number
          keyword: string
          meta?: Json
          period_end: string
          period_start: string
          run_id?: string | null
          zone_id?: string | null
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          interest_score?: number
          keyword?: string
          meta?: Json
          period_end?: string
          period_start?: string
          run_id?: string | null
          zone_id?: string | null
        }
        Relationships: []
      }
      search_trends_p20260101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          interest_score: number
          keyword: string
          meta: Json
          period_end: string
          period_start: string
          run_id: string | null
          zone_id: string | null
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          interest_score: number
          keyword: string
          meta?: Json
          period_end: string
          period_start: string
          run_id?: string | null
          zone_id?: string | null
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          interest_score?: number
          keyword?: string
          meta?: Json
          period_end?: string
          period_start?: string
          run_id?: string | null
          zone_id?: string | null
        }
        Relationships: []
      }
      search_trends_p20270101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          interest_score: number
          keyword: string
          meta: Json
          period_end: string
          period_start: string
          run_id: string | null
          zone_id: string | null
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          interest_score: number
          keyword: string
          meta?: Json
          period_end: string
          period_start: string
          run_id?: string | null
          zone_id?: string | null
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          interest_score?: number
          keyword?: string
          meta?: Json
          period_end?: string
          period_start?: string
          run_id?: string | null
          zone_id?: string | null
        }
        Relationships: []
      }
      search_trends_p20280101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          interest_score: number
          keyword: string
          meta: Json
          period_end: string
          period_start: string
          run_id: string | null
          zone_id: string | null
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          interest_score: number
          keyword: string
          meta?: Json
          period_end: string
          period_start: string
          run_id?: string | null
          zone_id?: string | null
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          interest_score?: number
          keyword?: string
          meta?: Json
          period_end?: string
          period_start?: string
          run_id?: string | null
          zone_id?: string | null
        }
        Relationships: []
      }
      search_trends_p20290101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          interest_score: number
          keyword: string
          meta: Json
          period_end: string
          period_start: string
          run_id: string | null
          zone_id: string | null
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          interest_score: number
          keyword: string
          meta?: Json
          period_end: string
          period_start: string
          run_id?: string | null
          zone_id?: string | null
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          interest_score?: number
          keyword?: string
          meta?: Json
          period_end?: string
          period_start?: string
          run_id?: string | null
          zone_id?: string | null
        }
        Relationships: []
      }
      search_trends_p20300101: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          interest_score: number
          keyword: string
          meta: Json
          period_end: string
          period_start: string
          run_id: string | null
          zone_id: string | null
        }
        Insert: {
          country_code: string
          fetched_at?: string
          id?: never
          interest_score: number
          keyword: string
          meta?: Json
          period_end: string
          period_start: string
          run_id?: string | null
          zone_id?: string | null
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: never
          interest_score?: number
          keyword?: string
          meta?: Json
          period_end?: string
          period_start?: string
          run_id?: string | null
          zone_id?: string | null
        }
        Relationships: []
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
      str_listings: {
        Row: {
          bathrooms: number | null
          bedrooms: number | null
          capacity: number | null
          country_code: string
          fetched_at: string
          first_seen_at: string
          geom: unknown
          h3_r8: string | null
          host_id: string | null
          last_seen_at: string
          listing_id: string
          listing_name: string | null
          listing_url: string | null
          market_id: string | null
          meta: Json
          platform: string
          professional_management: boolean | null
          property_type: string | null
          room_type: string | null
          run_id: string | null
          status: string
          superhost: boolean | null
          zone_id: string | null
        }
        Insert: {
          bathrooms?: number | null
          bedrooms?: number | null
          capacity?: number | null
          country_code: string
          fetched_at?: string
          first_seen_at?: string
          geom?: unknown
          h3_r8?: string | null
          host_id?: string | null
          last_seen_at?: string
          listing_id: string
          listing_name?: string | null
          listing_url?: string | null
          market_id?: string | null
          meta?: Json
          platform: string
          professional_management?: boolean | null
          property_type?: string | null
          room_type?: string | null
          run_id?: string | null
          status?: string
          superhost?: boolean | null
          zone_id?: string | null
        }
        Update: {
          bathrooms?: number | null
          bedrooms?: number | null
          capacity?: number | null
          country_code?: string
          fetched_at?: string
          first_seen_at?: string
          geom?: unknown
          h3_r8?: string | null
          host_id?: string | null
          last_seen_at?: string
          listing_id?: string
          listing_name?: string | null
          listing_url?: string | null
          market_id?: string | null
          meta?: Json
          platform?: string
          professional_management?: boolean | null
          property_type?: string | null
          room_type?: string | null
          run_id?: string | null
          status?: string
          superhost?: boolean | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "str_listings_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "str_listings_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "str_markets"
            referencedColumns: ["id"]
          },
        ]
      }
      str_markets: {
        Row: {
          active_listings_count: number | null
          airroi_country: string
          airroi_district: string | null
          airroi_locality: string
          airroi_region: string
          country_code: string
          display_name: string
          first_seen_at: string
          id: string
          last_refreshed_at: string | null
          meta: Json
          native_currency: string
          zone_id: string | null
        }
        Insert: {
          active_listings_count?: number | null
          airroi_country: string
          airroi_district?: string | null
          airroi_locality: string
          airroi_region: string
          country_code: string
          display_name: string
          first_seen_at?: string
          id?: string
          last_refreshed_at?: string | null
          meta?: Json
          native_currency: string
          zone_id?: string | null
        }
        Update: {
          active_listings_count?: number | null
          airroi_country?: string
          airroi_district?: string | null
          airroi_locality?: string
          airroi_region?: string
          country_code?: string
          display_name?: string
          first_seen_at?: string
          id?: string
          last_refreshed_at?: string | null
          meta?: Json
          native_currency?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "str_markets_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "str_markets_native_currency_fkey"
            columns: ["native_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      str_monthly_snapshots: {
        Row: {
          adr_minor: number | null
          avg_length_of_stay: number | null
          country_code: string
          currency: string
          fetched_at: string
          id: number
          listing_id: string
          market_id: string | null
          meta: Json
          nights_available: number | null
          nights_booked: number | null
          occupancy_rate: number | null
          period: string
          platform: string
          revenue_minor: number | null
          revpar_minor: number | null
          run_id: string | null
        }
        Insert: {
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          country_code: string
          currency: string
          fetched_at?: string
          id?: never
          listing_id: string
          market_id?: string | null
          meta?: Json
          nights_available?: number | null
          nights_booked?: number | null
          occupancy_rate?: number | null
          period: string
          platform: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Update: {
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          country_code?: string
          currency?: string
          fetched_at?: string
          id?: never
          listing_id?: string
          market_id?: string | null
          meta?: Json
          nights_available?: number | null
          nights_booked?: number | null
          occupancy_rate?: number | null
          period?: string
          platform?: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "str_monthly_snapshots_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "str_monthly_snapshots_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "str_monthly_snapshots_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "str_markets"
            referencedColumns: ["id"]
          },
        ]
      }
      str_monthly_snapshots_default: {
        Row: {
          adr_minor: number | null
          avg_length_of_stay: number | null
          country_code: string
          currency: string
          fetched_at: string
          id: number
          listing_id: string
          market_id: string | null
          meta: Json
          nights_available: number | null
          nights_booked: number | null
          occupancy_rate: number | null
          period: string
          platform: string
          revenue_minor: number | null
          revpar_minor: number | null
          run_id: string | null
        }
        Insert: {
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          country_code: string
          currency: string
          fetched_at?: string
          id?: never
          listing_id: string
          market_id?: string | null
          meta?: Json
          nights_available?: number | null
          nights_booked?: number | null
          occupancy_rate?: number | null
          period: string
          platform: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Update: {
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          country_code?: string
          currency?: string
          fetched_at?: string
          id?: never
          listing_id?: string
          market_id?: string | null
          meta?: Json
          nights_available?: number | null
          nights_booked?: number | null
          occupancy_rate?: number | null
          period?: string
          platform?: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Relationships: []
      }
      str_monthly_snapshots_p20220101: {
        Row: {
          adr_minor: number | null
          avg_length_of_stay: number | null
          country_code: string
          currency: string
          fetched_at: string
          id: number
          listing_id: string
          market_id: string | null
          meta: Json
          nights_available: number | null
          nights_booked: number | null
          occupancy_rate: number | null
          period: string
          platform: string
          revenue_minor: number | null
          revpar_minor: number | null
          run_id: string | null
        }
        Insert: {
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          country_code: string
          currency: string
          fetched_at?: string
          id?: never
          listing_id: string
          market_id?: string | null
          meta?: Json
          nights_available?: number | null
          nights_booked?: number | null
          occupancy_rate?: number | null
          period: string
          platform: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Update: {
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          country_code?: string
          currency?: string
          fetched_at?: string
          id?: never
          listing_id?: string
          market_id?: string | null
          meta?: Json
          nights_available?: number | null
          nights_booked?: number | null
          occupancy_rate?: number | null
          period?: string
          platform?: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Relationships: []
      }
      str_monthly_snapshots_p20230101: {
        Row: {
          adr_minor: number | null
          avg_length_of_stay: number | null
          country_code: string
          currency: string
          fetched_at: string
          id: number
          listing_id: string
          market_id: string | null
          meta: Json
          nights_available: number | null
          nights_booked: number | null
          occupancy_rate: number | null
          period: string
          platform: string
          revenue_minor: number | null
          revpar_minor: number | null
          run_id: string | null
        }
        Insert: {
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          country_code: string
          currency: string
          fetched_at?: string
          id?: never
          listing_id: string
          market_id?: string | null
          meta?: Json
          nights_available?: number | null
          nights_booked?: number | null
          occupancy_rate?: number | null
          period: string
          platform: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Update: {
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          country_code?: string
          currency?: string
          fetched_at?: string
          id?: never
          listing_id?: string
          market_id?: string | null
          meta?: Json
          nights_available?: number | null
          nights_booked?: number | null
          occupancy_rate?: number | null
          period?: string
          platform?: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Relationships: []
      }
      str_monthly_snapshots_p20240101: {
        Row: {
          adr_minor: number | null
          avg_length_of_stay: number | null
          country_code: string
          currency: string
          fetched_at: string
          id: number
          listing_id: string
          market_id: string | null
          meta: Json
          nights_available: number | null
          nights_booked: number | null
          occupancy_rate: number | null
          period: string
          platform: string
          revenue_minor: number | null
          revpar_minor: number | null
          run_id: string | null
        }
        Insert: {
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          country_code: string
          currency: string
          fetched_at?: string
          id?: never
          listing_id: string
          market_id?: string | null
          meta?: Json
          nights_available?: number | null
          nights_booked?: number | null
          occupancy_rate?: number | null
          period: string
          platform: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Update: {
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          country_code?: string
          currency?: string
          fetched_at?: string
          id?: never
          listing_id?: string
          market_id?: string | null
          meta?: Json
          nights_available?: number | null
          nights_booked?: number | null
          occupancy_rate?: number | null
          period?: string
          platform?: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Relationships: []
      }
      str_monthly_snapshots_p20250101: {
        Row: {
          adr_minor: number | null
          avg_length_of_stay: number | null
          country_code: string
          currency: string
          fetched_at: string
          id: number
          listing_id: string
          market_id: string | null
          meta: Json
          nights_available: number | null
          nights_booked: number | null
          occupancy_rate: number | null
          period: string
          platform: string
          revenue_minor: number | null
          revpar_minor: number | null
          run_id: string | null
        }
        Insert: {
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          country_code: string
          currency: string
          fetched_at?: string
          id?: never
          listing_id: string
          market_id?: string | null
          meta?: Json
          nights_available?: number | null
          nights_booked?: number | null
          occupancy_rate?: number | null
          period: string
          platform: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Update: {
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          country_code?: string
          currency?: string
          fetched_at?: string
          id?: never
          listing_id?: string
          market_id?: string | null
          meta?: Json
          nights_available?: number | null
          nights_booked?: number | null
          occupancy_rate?: number | null
          period?: string
          platform?: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Relationships: []
      }
      str_monthly_snapshots_p20260101: {
        Row: {
          adr_minor: number | null
          avg_length_of_stay: number | null
          country_code: string
          currency: string
          fetched_at: string
          id: number
          listing_id: string
          market_id: string | null
          meta: Json
          nights_available: number | null
          nights_booked: number | null
          occupancy_rate: number | null
          period: string
          platform: string
          revenue_minor: number | null
          revpar_minor: number | null
          run_id: string | null
        }
        Insert: {
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          country_code: string
          currency: string
          fetched_at?: string
          id?: never
          listing_id: string
          market_id?: string | null
          meta?: Json
          nights_available?: number | null
          nights_booked?: number | null
          occupancy_rate?: number | null
          period: string
          platform: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Update: {
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          country_code?: string
          currency?: string
          fetched_at?: string
          id?: never
          listing_id?: string
          market_id?: string | null
          meta?: Json
          nights_available?: number | null
          nights_booked?: number | null
          occupancy_rate?: number | null
          period?: string
          platform?: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Relationships: []
      }
      str_monthly_snapshots_p20270101: {
        Row: {
          adr_minor: number | null
          avg_length_of_stay: number | null
          country_code: string
          currency: string
          fetched_at: string
          id: number
          listing_id: string
          market_id: string | null
          meta: Json
          nights_available: number | null
          nights_booked: number | null
          occupancy_rate: number | null
          period: string
          platform: string
          revenue_minor: number | null
          revpar_minor: number | null
          run_id: string | null
        }
        Insert: {
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          country_code: string
          currency: string
          fetched_at?: string
          id?: never
          listing_id: string
          market_id?: string | null
          meta?: Json
          nights_available?: number | null
          nights_booked?: number | null
          occupancy_rate?: number | null
          period: string
          platform: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Update: {
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          country_code?: string
          currency?: string
          fetched_at?: string
          id?: never
          listing_id?: string
          market_id?: string | null
          meta?: Json
          nights_available?: number | null
          nights_booked?: number | null
          occupancy_rate?: number | null
          period?: string
          platform?: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Relationships: []
      }
      str_monthly_snapshots_p20280101: {
        Row: {
          adr_minor: number | null
          avg_length_of_stay: number | null
          country_code: string
          currency: string
          fetched_at: string
          id: number
          listing_id: string
          market_id: string | null
          meta: Json
          nights_available: number | null
          nights_booked: number | null
          occupancy_rate: number | null
          period: string
          platform: string
          revenue_minor: number | null
          revpar_minor: number | null
          run_id: string | null
        }
        Insert: {
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          country_code: string
          currency: string
          fetched_at?: string
          id?: never
          listing_id: string
          market_id?: string | null
          meta?: Json
          nights_available?: number | null
          nights_booked?: number | null
          occupancy_rate?: number | null
          period: string
          platform: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Update: {
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          country_code?: string
          currency?: string
          fetched_at?: string
          id?: never
          listing_id?: string
          market_id?: string | null
          meta?: Json
          nights_available?: number | null
          nights_booked?: number | null
          occupancy_rate?: number | null
          period?: string
          platform?: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Relationships: []
      }
      str_monthly_snapshots_p20290101: {
        Row: {
          adr_minor: number | null
          avg_length_of_stay: number | null
          country_code: string
          currency: string
          fetched_at: string
          id: number
          listing_id: string
          market_id: string | null
          meta: Json
          nights_available: number | null
          nights_booked: number | null
          occupancy_rate: number | null
          period: string
          platform: string
          revenue_minor: number | null
          revpar_minor: number | null
          run_id: string | null
        }
        Insert: {
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          country_code: string
          currency: string
          fetched_at?: string
          id?: never
          listing_id: string
          market_id?: string | null
          meta?: Json
          nights_available?: number | null
          nights_booked?: number | null
          occupancy_rate?: number | null
          period: string
          platform: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Update: {
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          country_code?: string
          currency?: string
          fetched_at?: string
          id?: never
          listing_id?: string
          market_id?: string | null
          meta?: Json
          nights_available?: number | null
          nights_booked?: number | null
          occupancy_rate?: number | null
          period?: string
          platform?: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Relationships: []
      }
      str_monthly_snapshots_p20300101: {
        Row: {
          adr_minor: number | null
          avg_length_of_stay: number | null
          country_code: string
          currency: string
          fetched_at: string
          id: number
          listing_id: string
          market_id: string | null
          meta: Json
          nights_available: number | null
          nights_booked: number | null
          occupancy_rate: number | null
          period: string
          platform: string
          revenue_minor: number | null
          revpar_minor: number | null
          run_id: string | null
        }
        Insert: {
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          country_code: string
          currency: string
          fetched_at?: string
          id?: never
          listing_id: string
          market_id?: string | null
          meta?: Json
          nights_available?: number | null
          nights_booked?: number | null
          occupancy_rate?: number | null
          period: string
          platform: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Update: {
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          country_code?: string
          currency?: string
          fetched_at?: string
          id?: never
          listing_id?: string
          market_id?: string | null
          meta?: Json
          nights_available?: number | null
          nights_booked?: number | null
          occupancy_rate?: number | null
          period?: string
          platform?: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Relationships: []
      }
      str_photos_metadata: {
        Row: {
          cv_labels: Json | null
          cv_processed_at: string | null
          cv_quality_score: number | null
          fetched_at: string
          height: number | null
          id: number
          listing_id: string
          meta: Json
          order_index: number
          photo_url: string
          platform: string
          run_id: string | null
          width: number | null
        }
        Insert: {
          cv_labels?: Json | null
          cv_processed_at?: string | null
          cv_quality_score?: number | null
          fetched_at?: string
          height?: number | null
          id?: never
          listing_id: string
          meta?: Json
          order_index?: number
          photo_url: string
          platform: string
          run_id?: string | null
          width?: number | null
        }
        Update: {
          cv_labels?: Json | null
          cv_processed_at?: string | null
          cv_quality_score?: number | null
          fetched_at?: string
          height?: number | null
          id?: never
          listing_id?: string
          meta?: Json
          order_index?: number
          photo_url?: string
          platform?: string
          run_id?: string | null
          width?: number | null
        }
        Relationships: []
      }
      str_reviews: {
        Row: {
          fetched_at: string
          id: number
          language: string | null
          listing_id: string
          meta: Json
          platform: string
          posted_at: string
          rating: number | null
          review_id: string
          review_text: string | null
          reviewer_first_name: string | null
          reviewer_id: string | null
          run_id: string | null
          sentiment_confidence: number | null
          sentiment_score: number | null
          sentiment_source_span: string | null
          topics: Json | null
        }
        Insert: {
          fetched_at?: string
          id?: never
          language?: string | null
          listing_id: string
          meta?: Json
          platform: string
          posted_at: string
          rating?: number | null
          review_id: string
          review_text?: string | null
          reviewer_first_name?: string | null
          reviewer_id?: string | null
          run_id?: string | null
          sentiment_confidence?: number | null
          sentiment_score?: number | null
          sentiment_source_span?: string | null
          topics?: Json | null
        }
        Update: {
          fetched_at?: string
          id?: never
          language?: string | null
          listing_id?: string
          meta?: Json
          platform?: string
          posted_at?: string
          rating?: number | null
          review_id?: string
          review_text?: string | null
          reviewer_first_name?: string | null
          reviewer_id?: string | null
          run_id?: string | null
          sentiment_confidence?: number | null
          sentiment_score?: number | null
          sentiment_source_span?: string | null
          topics?: Json | null
        }
        Relationships: []
      }
      str_reviews_default: {
        Row: {
          fetched_at: string
          id: number
          language: string | null
          listing_id: string
          meta: Json
          platform: string
          posted_at: string
          rating: number | null
          review_id: string
          review_text: string | null
          reviewer_first_name: string | null
          reviewer_id: string | null
          run_id: string | null
          sentiment_confidence: number | null
          sentiment_score: number | null
          sentiment_source_span: string | null
          topics: Json | null
        }
        Insert: {
          fetched_at?: string
          id?: never
          language?: string | null
          listing_id: string
          meta?: Json
          platform: string
          posted_at: string
          rating?: number | null
          review_id: string
          review_text?: string | null
          reviewer_first_name?: string | null
          reviewer_id?: string | null
          run_id?: string | null
          sentiment_confidence?: number | null
          sentiment_score?: number | null
          sentiment_source_span?: string | null
          topics?: Json | null
        }
        Update: {
          fetched_at?: string
          id?: never
          language?: string | null
          listing_id?: string
          meta?: Json
          platform?: string
          posted_at?: string
          rating?: number | null
          review_id?: string
          review_text?: string | null
          reviewer_first_name?: string | null
          reviewer_id?: string | null
          run_id?: string | null
          sentiment_confidence?: number | null
          sentiment_score?: number | null
          sentiment_source_span?: string | null
          topics?: Json | null
        }
        Relationships: []
      }
      str_reviews_p20251201: {
        Row: {
          fetched_at: string
          id: number
          language: string | null
          listing_id: string
          meta: Json
          platform: string
          posted_at: string
          rating: number | null
          review_id: string
          review_text: string | null
          reviewer_first_name: string | null
          reviewer_id: string | null
          run_id: string | null
          sentiment_confidence: number | null
          sentiment_score: number | null
          sentiment_source_span: string | null
          topics: Json | null
        }
        Insert: {
          fetched_at?: string
          id?: never
          language?: string | null
          listing_id: string
          meta?: Json
          platform: string
          posted_at: string
          rating?: number | null
          review_id: string
          review_text?: string | null
          reviewer_first_name?: string | null
          reviewer_id?: string | null
          run_id?: string | null
          sentiment_confidence?: number | null
          sentiment_score?: number | null
          sentiment_source_span?: string | null
          topics?: Json | null
        }
        Update: {
          fetched_at?: string
          id?: never
          language?: string | null
          listing_id?: string
          meta?: Json
          platform?: string
          posted_at?: string
          rating?: number | null
          review_id?: string
          review_text?: string | null
          reviewer_first_name?: string | null
          reviewer_id?: string | null
          run_id?: string | null
          sentiment_confidence?: number | null
          sentiment_score?: number | null
          sentiment_source_span?: string | null
          topics?: Json | null
        }
        Relationships: []
      }
      str_reviews_p20260101: {
        Row: {
          fetched_at: string
          id: number
          language: string | null
          listing_id: string
          meta: Json
          platform: string
          posted_at: string
          rating: number | null
          review_id: string
          review_text: string | null
          reviewer_first_name: string | null
          reviewer_id: string | null
          run_id: string | null
          sentiment_confidence: number | null
          sentiment_score: number | null
          sentiment_source_span: string | null
          topics: Json | null
        }
        Insert: {
          fetched_at?: string
          id?: never
          language?: string | null
          listing_id: string
          meta?: Json
          platform: string
          posted_at: string
          rating?: number | null
          review_id: string
          review_text?: string | null
          reviewer_first_name?: string | null
          reviewer_id?: string | null
          run_id?: string | null
          sentiment_confidence?: number | null
          sentiment_score?: number | null
          sentiment_source_span?: string | null
          topics?: Json | null
        }
        Update: {
          fetched_at?: string
          id?: never
          language?: string | null
          listing_id?: string
          meta?: Json
          platform?: string
          posted_at?: string
          rating?: number | null
          review_id?: string
          review_text?: string | null
          reviewer_first_name?: string | null
          reviewer_id?: string | null
          run_id?: string | null
          sentiment_confidence?: number | null
          sentiment_score?: number | null
          sentiment_source_span?: string | null
          topics?: Json | null
        }
        Relationships: []
      }
      str_reviews_p20260201: {
        Row: {
          fetched_at: string
          id: number
          language: string | null
          listing_id: string
          meta: Json
          platform: string
          posted_at: string
          rating: number | null
          review_id: string
          review_text: string | null
          reviewer_first_name: string | null
          reviewer_id: string | null
          run_id: string | null
          sentiment_confidence: number | null
          sentiment_score: number | null
          sentiment_source_span: string | null
          topics: Json | null
        }
        Insert: {
          fetched_at?: string
          id?: never
          language?: string | null
          listing_id: string
          meta?: Json
          platform: string
          posted_at: string
          rating?: number | null
          review_id: string
          review_text?: string | null
          reviewer_first_name?: string | null
          reviewer_id?: string | null
          run_id?: string | null
          sentiment_confidence?: number | null
          sentiment_score?: number | null
          sentiment_source_span?: string | null
          topics?: Json | null
        }
        Update: {
          fetched_at?: string
          id?: never
          language?: string | null
          listing_id?: string
          meta?: Json
          platform?: string
          posted_at?: string
          rating?: number | null
          review_id?: string
          review_text?: string | null
          reviewer_first_name?: string | null
          reviewer_id?: string | null
          run_id?: string | null
          sentiment_confidence?: number | null
          sentiment_score?: number | null
          sentiment_source_span?: string | null
          topics?: Json | null
        }
        Relationships: []
      }
      str_reviews_p20260301: {
        Row: {
          fetched_at: string
          id: number
          language: string | null
          listing_id: string
          meta: Json
          platform: string
          posted_at: string
          rating: number | null
          review_id: string
          review_text: string | null
          reviewer_first_name: string | null
          reviewer_id: string | null
          run_id: string | null
          sentiment_confidence: number | null
          sentiment_score: number | null
          sentiment_source_span: string | null
          topics: Json | null
        }
        Insert: {
          fetched_at?: string
          id?: never
          language?: string | null
          listing_id: string
          meta?: Json
          platform: string
          posted_at: string
          rating?: number | null
          review_id: string
          review_text?: string | null
          reviewer_first_name?: string | null
          reviewer_id?: string | null
          run_id?: string | null
          sentiment_confidence?: number | null
          sentiment_score?: number | null
          sentiment_source_span?: string | null
          topics?: Json | null
        }
        Update: {
          fetched_at?: string
          id?: never
          language?: string | null
          listing_id?: string
          meta?: Json
          platform?: string
          posted_at?: string
          rating?: number | null
          review_id?: string
          review_text?: string | null
          reviewer_first_name?: string | null
          reviewer_id?: string | null
          run_id?: string | null
          sentiment_confidence?: number | null
          sentiment_score?: number | null
          sentiment_source_span?: string | null
          topics?: Json | null
        }
        Relationships: []
      }
      str_reviews_p20260401: {
        Row: {
          fetched_at: string
          id: number
          language: string | null
          listing_id: string
          meta: Json
          platform: string
          posted_at: string
          rating: number | null
          review_id: string
          review_text: string | null
          reviewer_first_name: string | null
          reviewer_id: string | null
          run_id: string | null
          sentiment_confidence: number | null
          sentiment_score: number | null
          sentiment_source_span: string | null
          topics: Json | null
        }
        Insert: {
          fetched_at?: string
          id?: never
          language?: string | null
          listing_id: string
          meta?: Json
          platform: string
          posted_at: string
          rating?: number | null
          review_id: string
          review_text?: string | null
          reviewer_first_name?: string | null
          reviewer_id?: string | null
          run_id?: string | null
          sentiment_confidence?: number | null
          sentiment_score?: number | null
          sentiment_source_span?: string | null
          topics?: Json | null
        }
        Update: {
          fetched_at?: string
          id?: never
          language?: string | null
          listing_id?: string
          meta?: Json
          platform?: string
          posted_at?: string
          rating?: number | null
          review_id?: string
          review_text?: string | null
          reviewer_first_name?: string | null
          reviewer_id?: string | null
          run_id?: string | null
          sentiment_confidence?: number | null
          sentiment_score?: number | null
          sentiment_source_span?: string | null
          topics?: Json | null
        }
        Relationships: []
      }
      str_reviews_p20260501: {
        Row: {
          fetched_at: string
          id: number
          language: string | null
          listing_id: string
          meta: Json
          platform: string
          posted_at: string
          rating: number | null
          review_id: string
          review_text: string | null
          reviewer_first_name: string | null
          reviewer_id: string | null
          run_id: string | null
          sentiment_confidence: number | null
          sentiment_score: number | null
          sentiment_source_span: string | null
          topics: Json | null
        }
        Insert: {
          fetched_at?: string
          id?: never
          language?: string | null
          listing_id: string
          meta?: Json
          platform: string
          posted_at: string
          rating?: number | null
          review_id: string
          review_text?: string | null
          reviewer_first_name?: string | null
          reviewer_id?: string | null
          run_id?: string | null
          sentiment_confidence?: number | null
          sentiment_score?: number | null
          sentiment_source_span?: string | null
          topics?: Json | null
        }
        Update: {
          fetched_at?: string
          id?: never
          language?: string | null
          listing_id?: string
          meta?: Json
          platform?: string
          posted_at?: string
          rating?: number | null
          review_id?: string
          review_text?: string | null
          reviewer_first_name?: string | null
          reviewer_id?: string | null
          run_id?: string | null
          sentiment_confidence?: number | null
          sentiment_score?: number | null
          sentiment_source_span?: string | null
          topics?: Json | null
        }
        Relationships: []
      }
      str_reviews_p20260601: {
        Row: {
          fetched_at: string
          id: number
          language: string | null
          listing_id: string
          meta: Json
          platform: string
          posted_at: string
          rating: number | null
          review_id: string
          review_text: string | null
          reviewer_first_name: string | null
          reviewer_id: string | null
          run_id: string | null
          sentiment_confidence: number | null
          sentiment_score: number | null
          sentiment_source_span: string | null
          topics: Json | null
        }
        Insert: {
          fetched_at?: string
          id?: never
          language?: string | null
          listing_id: string
          meta?: Json
          platform: string
          posted_at: string
          rating?: number | null
          review_id: string
          review_text?: string | null
          reviewer_first_name?: string | null
          reviewer_id?: string | null
          run_id?: string | null
          sentiment_confidence?: number | null
          sentiment_score?: number | null
          sentiment_source_span?: string | null
          topics?: Json | null
        }
        Update: {
          fetched_at?: string
          id?: never
          language?: string | null
          listing_id?: string
          meta?: Json
          platform?: string
          posted_at?: string
          rating?: number | null
          review_id?: string
          review_text?: string | null
          reviewer_first_name?: string | null
          reviewer_id?: string | null
          run_id?: string | null
          sentiment_confidence?: number | null
          sentiment_score?: number | null
          sentiment_source_span?: string | null
          topics?: Json | null
        }
        Relationships: []
      }
      str_reviews_p20260701: {
        Row: {
          fetched_at: string
          id: number
          language: string | null
          listing_id: string
          meta: Json
          platform: string
          posted_at: string
          rating: number | null
          review_id: string
          review_text: string | null
          reviewer_first_name: string | null
          reviewer_id: string | null
          run_id: string | null
          sentiment_confidence: number | null
          sentiment_score: number | null
          sentiment_source_span: string | null
          topics: Json | null
        }
        Insert: {
          fetched_at?: string
          id?: never
          language?: string | null
          listing_id: string
          meta?: Json
          platform: string
          posted_at: string
          rating?: number | null
          review_id: string
          review_text?: string | null
          reviewer_first_name?: string | null
          reviewer_id?: string | null
          run_id?: string | null
          sentiment_confidence?: number | null
          sentiment_score?: number | null
          sentiment_source_span?: string | null
          topics?: Json | null
        }
        Update: {
          fetched_at?: string
          id?: never
          language?: string | null
          listing_id?: string
          meta?: Json
          platform?: string
          posted_at?: string
          rating?: number | null
          review_id?: string
          review_text?: string | null
          reviewer_first_name?: string | null
          reviewer_id?: string | null
          run_id?: string | null
          sentiment_confidence?: number | null
          sentiment_score?: number | null
          sentiment_source_span?: string | null
          topics?: Json | null
        }
        Relationships: []
      }
      str_reviews_p20260801: {
        Row: {
          fetched_at: string
          id: number
          language: string | null
          listing_id: string
          meta: Json
          platform: string
          posted_at: string
          rating: number | null
          review_id: string
          review_text: string | null
          reviewer_first_name: string | null
          reviewer_id: string | null
          run_id: string | null
          sentiment_confidence: number | null
          sentiment_score: number | null
          sentiment_source_span: string | null
          topics: Json | null
        }
        Insert: {
          fetched_at?: string
          id?: never
          language?: string | null
          listing_id: string
          meta?: Json
          platform: string
          posted_at: string
          rating?: number | null
          review_id: string
          review_text?: string | null
          reviewer_first_name?: string | null
          reviewer_id?: string | null
          run_id?: string | null
          sentiment_confidence?: number | null
          sentiment_score?: number | null
          sentiment_source_span?: string | null
          topics?: Json | null
        }
        Update: {
          fetched_at?: string
          id?: never
          language?: string | null
          listing_id?: string
          meta?: Json
          platform?: string
          posted_at?: string
          rating?: number | null
          review_id?: string
          review_text?: string | null
          reviewer_first_name?: string | null
          reviewer_id?: string | null
          run_id?: string | null
          sentiment_confidence?: number | null
          sentiment_score?: number | null
          sentiment_source_span?: string | null
          topics?: Json | null
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
      tax_rules: {
        Row: {
          applies_from: string
          applies_to: string | null
          country_code: string
          created_at: string
          id: string
          meta: Json
          rate: number
          scope: string
          scope_id: string | null
          tax_type: string
        }
        Insert: {
          applies_from?: string
          applies_to?: string | null
          country_code: string
          created_at?: string
          id?: string
          meta?: Json
          rate: number
          scope: string
          scope_id?: string | null
          tax_type: string
        }
        Update: {
          applies_from?: string
          applies_to?: string | null
          country_code?: string
          created_at?: string
          id?: string
          meta?: Json
          rate?: number
          scope?: string
          scope_id?: string | null
          tax_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_rules_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      template_public_api_rate_limits: {
        Row: {
          count: number
          endpoint: string
          key: string
          window_start: string
        }
        Insert: {
          count: number
          endpoint: string
          key: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          key?: string
          window_start?: string
        }
        Relationships: []
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
      template_public_geo_snapshots: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric: string
          period_end: string
          period_start: string
          run_id: string | null
          source: string
          value: number
          zone_id: string
        }
        Insert: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric: string
          period_end: string
          period_start: string
          run_id?: string | null
          source: string
          value: number
          zone_id: string
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: number
          meta?: Json
          metric?: string
          period_end?: string
          period_start?: string
          run_id?: string | null
          source?: string
          value?: number
          zone_id?: string
        }
        Relationships: []
      }
      template_public_macro_series: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric_name: string
          period_end: string
          period_start: string
          periodicity: string
          run_id: string | null
          series_id: string
          source: string
          unit: string
          value: number
        }
        Insert: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric_name: string
          period_end: string
          period_start: string
          periodicity: string
          run_id?: string | null
          series_id: string
          source: string
          unit: string
          value: number
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: number
          meta?: Json
          metric_name?: string
          period_end?: string
          period_start?: string
          periodicity?: string
          run_id?: string | null
          series_id?: string
          source?: string
          unit?: string
          value?: number
        }
        Relationships: []
      }
      template_public_market_prices_secondary: {
        Row: {
          address_raw: string | null
          amenities: Json | null
          area_built_m2: number | null
          area_terrain_m2: number | null
          bathrooms: number | null
          bedrooms: number | null
          captured_by_user_id: string | null
          captured_via: Database["public"]["Enums"]["market_capture_source"]
          country_code: string
          currency: string
          days_on_market: number | null
          fetched_at: string
          geom: unknown
          h3_r8: string | null
          id: number
          listing_id: string
          meta: Json
          operation: string
          parking: number | null
          posted_at: string
          price_minor: number
          property_type: string | null
          raw_html_hash: string | null
          run_id: string | null
          seller_type: string | null
          source: string
          zone_id: string | null
        }
        Insert: {
          address_raw?: string | null
          amenities?: Json | null
          area_built_m2?: number | null
          area_terrain_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captured_by_user_id?: string | null
          captured_via: Database["public"]["Enums"]["market_capture_source"]
          country_code: string
          currency: string
          days_on_market?: number | null
          fetched_at: string
          geom?: unknown
          h3_r8?: string | null
          id: number
          listing_id: string
          meta: Json
          operation: string
          parking?: number | null
          posted_at: string
          price_minor: number
          property_type?: string | null
          raw_html_hash?: string | null
          run_id?: string | null
          seller_type?: string | null
          source: string
          zone_id?: string | null
        }
        Update: {
          address_raw?: string | null
          amenities?: Json | null
          area_built_m2?: number | null
          area_terrain_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captured_by_user_id?: string | null
          captured_via?: Database["public"]["Enums"]["market_capture_source"]
          country_code?: string
          currency?: string
          days_on_market?: number | null
          fetched_at?: string
          geom?: unknown
          h3_r8?: string | null
          id?: number
          listing_id?: string
          meta?: Json
          operation?: string
          parking?: number | null
          posted_at?: string
          price_minor?: number
          property_type?: string | null
          raw_html_hash?: string | null
          run_id?: string | null
          seller_type?: string | null
          source?: string
          zone_id?: string | null
        }
        Relationships: []
      }
      template_public_market_pulse: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric: string
          period_end: string
          period_start: string
          run_id: string | null
          source: string
          value: number
          zone_id: string | null
        }
        Insert: {
          country_code: string
          fetched_at: string
          id: number
          meta: Json
          metric: string
          period_end: string
          period_start: string
          run_id?: string | null
          source: string
          value: number
          zone_id?: string | null
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: number
          meta?: Json
          metric?: string
          period_end?: string
          period_start?: string
          run_id?: string | null
          source?: string
          value?: number
          zone_id?: string | null
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
      template_public_search_trends: {
        Row: {
          country_code: string
          fetched_at: string
          id: number
          interest_score: number
          keyword: string
          meta: Json
          period_end: string
          period_start: string
          run_id: string | null
          zone_id: string | null
        }
        Insert: {
          country_code: string
          fetched_at: string
          id: number
          interest_score: number
          keyword: string
          meta: Json
          period_end: string
          period_start: string
          run_id?: string | null
          zone_id?: string | null
        }
        Update: {
          country_code?: string
          fetched_at?: string
          id?: number
          interest_score?: number
          keyword?: string
          meta?: Json
          period_end?: string
          period_start?: string
          run_id?: string | null
          zone_id?: string | null
        }
        Relationships: []
      }
      template_public_str_monthly_snapshots: {
        Row: {
          adr_minor: number | null
          avg_length_of_stay: number | null
          country_code: string
          currency: string
          fetched_at: string
          id: number
          listing_id: string
          market_id: string | null
          meta: Json
          nights_available: number | null
          nights_booked: number | null
          occupancy_rate: number | null
          period: string
          platform: string
          revenue_minor: number | null
          revpar_minor: number | null
          run_id: string | null
        }
        Insert: {
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          country_code: string
          currency: string
          fetched_at: string
          id: number
          listing_id: string
          market_id?: string | null
          meta: Json
          nights_available?: number | null
          nights_booked?: number | null
          occupancy_rate?: number | null
          period: string
          platform: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Update: {
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          country_code?: string
          currency?: string
          fetched_at?: string
          id?: number
          listing_id?: string
          market_id?: string | null
          meta?: Json
          nights_available?: number | null
          nights_booked?: number | null
          occupancy_rate?: number | null
          period?: string
          platform?: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Relationships: []
      }
      template_public_str_reviews: {
        Row: {
          fetched_at: string
          id: number
          language: string | null
          listing_id: string
          meta: Json
          platform: string
          posted_at: string
          rating: number | null
          review_id: string
          review_text: string | null
          reviewer_first_name: string | null
          reviewer_id: string | null
          run_id: string | null
          sentiment_confidence: number | null
          sentiment_score: number | null
          sentiment_source_span: string | null
          topics: Json | null
        }
        Insert: {
          fetched_at: string
          id: number
          language?: string | null
          listing_id: string
          meta: Json
          platform: string
          posted_at: string
          rating?: number | null
          review_id: string
          review_text?: string | null
          reviewer_first_name?: string | null
          reviewer_id?: string | null
          run_id?: string | null
          sentiment_confidence?: number | null
          sentiment_score?: number | null
          sentiment_source_span?: string | null
          topics?: Json | null
        }
        Update: {
          fetched_at?: string
          id?: number
          language?: string | null
          listing_id?: string
          meta?: Json
          platform?: string
          posted_at?: string
          rating?: number | null
          review_id?: string
          review_text?: string | null
          reviewer_first_name?: string | null
          reviewer_id?: string | null
          run_id?: string | null
          sentiment_confidence?: number | null
          sentiment_score?: number | null
          sentiment_source_span?: string | null
          topics?: Json | null
        }
        Relationships: []
      }
      template_public_zone_price_index: {
        Row: {
          computed_at: string
          confidence: string
          country_code: string
          currency: string
          id: number
          meta: Json
          mom_pct: number | null
          operation: string
          period_end: string
          period_start: string
          price_per_m2_minor: number
          property_type: string | null
          run_id: string | null
          sample_size: number
          yoy_pct: number | null
          zone_id: string
        }
        Insert: {
          computed_at: string
          confidence: string
          country_code: string
          currency: string
          id: number
          meta: Json
          mom_pct?: number | null
          operation: string
          period_end: string
          period_start: string
          price_per_m2_minor: number
          property_type?: string | null
          run_id?: string | null
          sample_size: number
          yoy_pct?: number | null
          zone_id: string
        }
        Update: {
          computed_at?: string
          confidence?: string
          country_code?: string
          currency?: string
          id?: number
          meta?: Json
          mom_pct?: number | null
          operation?: string
          period_end?: string
          period_start?: string
          price_per_m2_minor?: number
          property_type?: string | null
          run_id?: string | null
          sample_size?: number
          yoy_pct?: number | null
          zone_id?: string
        }
        Relationships: []
      }
      view_dedup: {
        Row: {
          dedup_key: string
          entity_id: string
          entity_type: string
          viewed_at: string
        }
        Insert: {
          dedup_key: string
          entity_id: string
          entity_type: string
          viewed_at?: string
        }
        Update: {
          dedup_key?: string
          entity_id?: string
          entity_type?: string
          viewed_at?: string
        }
        Relationships: []
      }
      zona_snapshots: {
        Row: {
          computed_at: string
          country_code: string
          id: string
          payload: Json
          period: string
          run_id: string | null
          zone_id: string
        }
        Insert: {
          computed_at?: string
          country_code: string
          id?: string
          payload: Json
          period: string
          run_id?: string | null
          zone_id: string
        }
        Update: {
          computed_at?: string
          country_code?: string
          id?: string
          payload?: Json
          period?: string
          run_id?: string | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zona_snapshots_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      zone_price_index: {
        Row: {
          computed_at: string
          confidence: string
          country_code: string
          currency: string
          id: number
          meta: Json
          mom_pct: number | null
          operation: string
          period_end: string
          period_start: string
          price_per_m2_minor: number
          property_type: string | null
          run_id: string | null
          sample_size: number
          yoy_pct: number | null
          zone_id: string
        }
        Insert: {
          computed_at?: string
          confidence?: string
          country_code: string
          currency: string
          id?: never
          meta?: Json
          mom_pct?: number | null
          operation: string
          period_end: string
          period_start: string
          price_per_m2_minor: number
          property_type?: string | null
          run_id?: string | null
          sample_size: number
          yoy_pct?: number | null
          zone_id: string
        }
        Update: {
          computed_at?: string
          confidence?: string
          country_code?: string
          currency?: string
          id?: never
          meta?: Json
          mom_pct?: number | null
          operation?: string
          period_end?: string
          period_start?: string
          price_per_m2_minor?: number
          property_type?: string | null
          run_id?: string | null
          sample_size?: number
          yoy_pct?: number | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_price_index_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "zone_price_index_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      zone_price_index_default: {
        Row: {
          computed_at: string
          confidence: string
          country_code: string
          currency: string
          id: number
          meta: Json
          mom_pct: number | null
          operation: string
          period_end: string
          period_start: string
          price_per_m2_minor: number
          property_type: string | null
          run_id: string | null
          sample_size: number
          yoy_pct: number | null
          zone_id: string
        }
        Insert: {
          computed_at?: string
          confidence?: string
          country_code: string
          currency: string
          id?: never
          meta?: Json
          mom_pct?: number | null
          operation: string
          period_end: string
          period_start: string
          price_per_m2_minor: number
          property_type?: string | null
          run_id?: string | null
          sample_size: number
          yoy_pct?: number | null
          zone_id: string
        }
        Update: {
          computed_at?: string
          confidence?: string
          country_code?: string
          currency?: string
          id?: never
          meta?: Json
          mom_pct?: number | null
          operation?: string
          period_end?: string
          period_start?: string
          price_per_m2_minor?: number
          property_type?: string | null
          run_id?: string | null
          sample_size?: number
          yoy_pct?: number | null
          zone_id?: string
        }
        Relationships: []
      }
      zone_price_index_p20220101: {
        Row: {
          computed_at: string
          confidence: string
          country_code: string
          currency: string
          id: number
          meta: Json
          mom_pct: number | null
          operation: string
          period_end: string
          period_start: string
          price_per_m2_minor: number
          property_type: string | null
          run_id: string | null
          sample_size: number
          yoy_pct: number | null
          zone_id: string
        }
        Insert: {
          computed_at?: string
          confidence?: string
          country_code: string
          currency: string
          id?: never
          meta?: Json
          mom_pct?: number | null
          operation: string
          period_end: string
          period_start: string
          price_per_m2_minor: number
          property_type?: string | null
          run_id?: string | null
          sample_size: number
          yoy_pct?: number | null
          zone_id: string
        }
        Update: {
          computed_at?: string
          confidence?: string
          country_code?: string
          currency?: string
          id?: never
          meta?: Json
          mom_pct?: number | null
          operation?: string
          period_end?: string
          period_start?: string
          price_per_m2_minor?: number
          property_type?: string | null
          run_id?: string | null
          sample_size?: number
          yoy_pct?: number | null
          zone_id?: string
        }
        Relationships: []
      }
      zone_price_index_p20230101: {
        Row: {
          computed_at: string
          confidence: string
          country_code: string
          currency: string
          id: number
          meta: Json
          mom_pct: number | null
          operation: string
          period_end: string
          period_start: string
          price_per_m2_minor: number
          property_type: string | null
          run_id: string | null
          sample_size: number
          yoy_pct: number | null
          zone_id: string
        }
        Insert: {
          computed_at?: string
          confidence?: string
          country_code: string
          currency: string
          id?: never
          meta?: Json
          mom_pct?: number | null
          operation: string
          period_end: string
          period_start: string
          price_per_m2_minor: number
          property_type?: string | null
          run_id?: string | null
          sample_size: number
          yoy_pct?: number | null
          zone_id: string
        }
        Update: {
          computed_at?: string
          confidence?: string
          country_code?: string
          currency?: string
          id?: never
          meta?: Json
          mom_pct?: number | null
          operation?: string
          period_end?: string
          period_start?: string
          price_per_m2_minor?: number
          property_type?: string | null
          run_id?: string | null
          sample_size?: number
          yoy_pct?: number | null
          zone_id?: string
        }
        Relationships: []
      }
      zone_price_index_p20240101: {
        Row: {
          computed_at: string
          confidence: string
          country_code: string
          currency: string
          id: number
          meta: Json
          mom_pct: number | null
          operation: string
          period_end: string
          period_start: string
          price_per_m2_minor: number
          property_type: string | null
          run_id: string | null
          sample_size: number
          yoy_pct: number | null
          zone_id: string
        }
        Insert: {
          computed_at?: string
          confidence?: string
          country_code: string
          currency: string
          id?: never
          meta?: Json
          mom_pct?: number | null
          operation: string
          period_end: string
          period_start: string
          price_per_m2_minor: number
          property_type?: string | null
          run_id?: string | null
          sample_size: number
          yoy_pct?: number | null
          zone_id: string
        }
        Update: {
          computed_at?: string
          confidence?: string
          country_code?: string
          currency?: string
          id?: never
          meta?: Json
          mom_pct?: number | null
          operation?: string
          period_end?: string
          period_start?: string
          price_per_m2_minor?: number
          property_type?: string | null
          run_id?: string | null
          sample_size?: number
          yoy_pct?: number | null
          zone_id?: string
        }
        Relationships: []
      }
      zone_price_index_p20250101: {
        Row: {
          computed_at: string
          confidence: string
          country_code: string
          currency: string
          id: number
          meta: Json
          mom_pct: number | null
          operation: string
          period_end: string
          period_start: string
          price_per_m2_minor: number
          property_type: string | null
          run_id: string | null
          sample_size: number
          yoy_pct: number | null
          zone_id: string
        }
        Insert: {
          computed_at?: string
          confidence?: string
          country_code: string
          currency: string
          id?: never
          meta?: Json
          mom_pct?: number | null
          operation: string
          period_end: string
          period_start: string
          price_per_m2_minor: number
          property_type?: string | null
          run_id?: string | null
          sample_size: number
          yoy_pct?: number | null
          zone_id: string
        }
        Update: {
          computed_at?: string
          confidence?: string
          country_code?: string
          currency?: string
          id?: never
          meta?: Json
          mom_pct?: number | null
          operation?: string
          period_end?: string
          period_start?: string
          price_per_m2_minor?: number
          property_type?: string | null
          run_id?: string | null
          sample_size?: number
          yoy_pct?: number | null
          zone_id?: string
        }
        Relationships: []
      }
      zone_price_index_p20260101: {
        Row: {
          computed_at: string
          confidence: string
          country_code: string
          currency: string
          id: number
          meta: Json
          mom_pct: number | null
          operation: string
          period_end: string
          period_start: string
          price_per_m2_minor: number
          property_type: string | null
          run_id: string | null
          sample_size: number
          yoy_pct: number | null
          zone_id: string
        }
        Insert: {
          computed_at?: string
          confidence?: string
          country_code: string
          currency: string
          id?: never
          meta?: Json
          mom_pct?: number | null
          operation: string
          period_end: string
          period_start: string
          price_per_m2_minor: number
          property_type?: string | null
          run_id?: string | null
          sample_size: number
          yoy_pct?: number | null
          zone_id: string
        }
        Update: {
          computed_at?: string
          confidence?: string
          country_code?: string
          currency?: string
          id?: never
          meta?: Json
          mom_pct?: number | null
          operation?: string
          period_end?: string
          period_start?: string
          price_per_m2_minor?: number
          property_type?: string | null
          run_id?: string | null
          sample_size?: number
          yoy_pct?: number | null
          zone_id?: string
        }
        Relationships: []
      }
      zone_price_index_p20270101: {
        Row: {
          computed_at: string
          confidence: string
          country_code: string
          currency: string
          id: number
          meta: Json
          mom_pct: number | null
          operation: string
          period_end: string
          period_start: string
          price_per_m2_minor: number
          property_type: string | null
          run_id: string | null
          sample_size: number
          yoy_pct: number | null
          zone_id: string
        }
        Insert: {
          computed_at?: string
          confidence?: string
          country_code: string
          currency: string
          id?: never
          meta?: Json
          mom_pct?: number | null
          operation: string
          period_end: string
          period_start: string
          price_per_m2_minor: number
          property_type?: string | null
          run_id?: string | null
          sample_size: number
          yoy_pct?: number | null
          zone_id: string
        }
        Update: {
          computed_at?: string
          confidence?: string
          country_code?: string
          currency?: string
          id?: never
          meta?: Json
          mom_pct?: number | null
          operation?: string
          period_end?: string
          period_start?: string
          price_per_m2_minor?: number
          property_type?: string | null
          run_id?: string | null
          sample_size?: number
          yoy_pct?: number | null
          zone_id?: string
        }
        Relationships: []
      }
      zone_price_index_p20280101: {
        Row: {
          computed_at: string
          confidence: string
          country_code: string
          currency: string
          id: number
          meta: Json
          mom_pct: number | null
          operation: string
          period_end: string
          period_start: string
          price_per_m2_minor: number
          property_type: string | null
          run_id: string | null
          sample_size: number
          yoy_pct: number | null
          zone_id: string
        }
        Insert: {
          computed_at?: string
          confidence?: string
          country_code: string
          currency: string
          id?: never
          meta?: Json
          mom_pct?: number | null
          operation: string
          period_end: string
          period_start: string
          price_per_m2_minor: number
          property_type?: string | null
          run_id?: string | null
          sample_size: number
          yoy_pct?: number | null
          zone_id: string
        }
        Update: {
          computed_at?: string
          confidence?: string
          country_code?: string
          currency?: string
          id?: never
          meta?: Json
          mom_pct?: number | null
          operation?: string
          period_end?: string
          period_start?: string
          price_per_m2_minor?: number
          property_type?: string | null
          run_id?: string | null
          sample_size?: number
          yoy_pct?: number | null
          zone_id?: string
        }
        Relationships: []
      }
      zone_price_index_p20290101: {
        Row: {
          computed_at: string
          confidence: string
          country_code: string
          currency: string
          id: number
          meta: Json
          mom_pct: number | null
          operation: string
          period_end: string
          period_start: string
          price_per_m2_minor: number
          property_type: string | null
          run_id: string | null
          sample_size: number
          yoy_pct: number | null
          zone_id: string
        }
        Insert: {
          computed_at?: string
          confidence?: string
          country_code: string
          currency: string
          id?: never
          meta?: Json
          mom_pct?: number | null
          operation: string
          period_end: string
          period_start: string
          price_per_m2_minor: number
          property_type?: string | null
          run_id?: string | null
          sample_size: number
          yoy_pct?: number | null
          zone_id: string
        }
        Update: {
          computed_at?: string
          confidence?: string
          country_code?: string
          currency?: string
          id?: never
          meta?: Json
          mom_pct?: number | null
          operation?: string
          period_end?: string
          period_start?: string
          price_per_m2_minor?: number
          property_type?: string | null
          run_id?: string | null
          sample_size?: number
          yoy_pct?: number | null
          zone_id?: string
        }
        Relationships: []
      }
      zone_price_index_p20300101: {
        Row: {
          computed_at: string
          confidence: string
          country_code: string
          currency: string
          id: number
          meta: Json
          mom_pct: number | null
          operation: string
          period_end: string
          period_start: string
          price_per_m2_minor: number
          property_type: string | null
          run_id: string | null
          sample_size: number
          yoy_pct: number | null
          zone_id: string
        }
        Insert: {
          computed_at?: string
          confidence?: string
          country_code: string
          currency: string
          id?: never
          meta?: Json
          mom_pct?: number | null
          operation: string
          period_end: string
          period_start: string
          price_per_m2_minor: number
          property_type?: string | null
          run_id?: string | null
          sample_size: number
          yoy_pct?: number | null
          zone_id: string
        }
        Update: {
          computed_at?: string
          confidence?: string
          country_code?: string
          currency?: string
          id?: never
          meta?: Json
          mom_pct?: number | null
          operation?: string
          period_end?: string
          period_start?: string
          price_per_m2_minor?: number
          property_type?: string | null
          run_id?: string | null
          sample_size?: number
          yoy_pct?: number | null
          zone_id?: string
        }
        Relationships: []
      }
      zone_tiers: {
        Row: {
          country_code: string
          last_recomputed_at: string
          meta: Json
          months_tracked: number
          projects_count: number
          sales_count: number
          tier: number
          zone_id: string
        }
        Insert: {
          country_code: string
          last_recomputed_at?: string
          meta?: Json
          months_tracked?: number
          projects_count?: number
          sales_count?: number
          tier: number
          zone_id: string
        }
        Update: {
          country_code?: string
          last_recomputed_at?: string
          meta?: Json
          months_tracked?: number
          projects_count?: number
          sales_count?: number
          tier?: number
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_tiers_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
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
      v_str_zone_monthly: {
        Row: {
          adr_median_minor: number | null
          airroi_district: string | null
          airroi_locality: string | null
          country_code: string | null
          currency: string | null
          market_id: string | null
          occupancy_rate_avg: number | null
          period: string | null
          revenue_median_minor: number | null
          revpar_median_minor: number | null
          snapshots_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "str_markets_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "str_monthly_snapshots_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "str_monthly_snapshots_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "str_markets"
            referencedColumns: ["id"]
          },
        ]
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
      anonymize_profile: { Args: { p_profile_id: string }; Returns: undefined }
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
      audit_rls_violations: {
        Args: never
        Returns: {
          category: string
          detail: string
          object_name: string
        }[]
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
      cancel_account_deletion: { Args: never; Returns: undefined }
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
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_key: string
          p_max_calls: number
          p_window_sec: number
        }
        Returns: boolean
      }
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
      confidence_level_for: {
        Args: { p_metric: string; p_sample_size: number; p_source: string }
        Returns: string
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
      decrypt_secret: { Args: { p_ciphertext: string }; Returns: string }
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
      encrypt_secret: { Args: { p_plaintext: string }; Returns: string }
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
      increment_api_budget_spend: {
        Args: { p_amount: number; p_source: string }
        Returns: undefined
      }
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
      is_operation_participant: {
        Args: { p_operation_id: string }
        Returns: boolean
      }
      is_superadmin: { Args: never; Returns: boolean }
      issue_api_key: {
        Args: { p_expires_at?: string; p_name: string; p_scopes?: string[] }
        Returns: {
          api_key_id: string
          raw_key: string
        }[]
      }
      issue_extension_token: {
        Args: { p_label?: string }
        Returns: {
          api_key_id: string
          raw_key: string
        }[]
      }
      jsonb_diff: { Args: { a: Json; b: Json }; Returns: Json }
      longtransactionsenabled: { Args: never; Returns: boolean }
      match_ai_memory: {
        Args: {
          p_embedding: string
          p_match_count?: number
          p_min_similarity?: number
          p_namespace: string
        }
        Returns: {
          id: string
          importance_score: number
          key: string
          similarity: number
          updated_at: string
          value: Json
        }[]
      }
      match_embeddings: {
        Args: {
          p_country_code?: string
          p_embedding: string
          p_match_count?: number
          p_min_similarity?: number
          p_source_types?: string[]
        }
        Returns: {
          content: string
          id: string
          meta: Json
          similarity: number
          source_id: string
          source_type: string
        }[]
      }
      mfa_consume_backup_code: { Args: { p_code: string }; Returns: boolean }
      mfa_mark_enabled: { Args: never; Returns: undefined }
      mfa_regenerate_backup_codes: { Args: never; Returns: string[] }
      mfa_reminders_tick: { Args: never; Returns: number }
      monthly_airroi_spend_by_endpoint: {
        Args: { p_month?: string }
        Returns: {
          actual_cost_usd: number
          calls: number
          endpoint_key: string
          estimated_cost_usd: number
        }[]
      }
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
      recompute_all_zone_tiers: { Args: never; Returns: number }
      recompute_zone_tier: {
        Args: {
          p_country_code: string
          p_months_tracked: number
          p_projects_count: number
          p_sales_count: number
          p_zone_id: string
        }
        Returns: number
      }
      recompute_zone_tiers: { Args: never; Returns: number }
      record_extension_capture: {
        Args: {
          p_address_raw: string
          p_amenities?: Json
          p_area_built_m2?: number
          p_bathrooms?: number
          p_bedrooms?: number
          p_country_code: string
          p_currency: string
          p_listing_id: string
          p_meta?: Json
          p_operation: string
          p_parking?: number
          p_posted_at: string
          p_price_minor: number
          p_profile_id: string
          p_property_type: string
          p_raw_html_hash: string
          p_seller_type?: string
          p_source: string
        }
        Returns: number
      }
      register_view: {
        Args: {
          p_dedup_key: string
          p_entity_id: string
          p_entity_type: string
        }
        Returns: boolean
      }
      reject_role_request: {
        Args: { p_reason?: string; p_request_id: string }
        Returns: undefined
      }
      request_account_deletion: { Args: never; Returns: string }
      reset_api_budgets_monthly: { Args: never; Returns: number }
      resolve_features: { Args: { p_user_id?: string }; Returns: string[] }
      run_maintenance: {
        Args: {
          p_analyze?: boolean
          p_jobmon?: boolean
          p_parent_table?: string
        }
        Returns: undefined
      }
      run_scheduled_deletions: { Args: never; Returns: number }
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
      verify_api_key: { Args: { p_raw_key: string }; Returns: string }
      verify_extension_api_key: { Args: { p_raw_key: string }; Returns: string }
    }
    Enums: {
      market_capture_source:
        | "chrome_extension"
        | "admin_upload"
        | "partnership_feed"
        | "api_official"
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
      market_capture_source: [
        "chrome_extension",
        "admin_upload",
        "partnership_feed",
        "api_official",
      ],
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
