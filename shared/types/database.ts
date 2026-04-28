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
      ai_generated_content: {
        Row: {
          content: string
          content_type: string
          cost_usd: number | null
          desarrolladora_id: string | null
          generated_at: string
          id: string
          input_tokens: number | null
          meta: Json | null
          model: string
          output_tokens: number | null
          prompt_used: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          content_type: string
          cost_usd?: number | null
          desarrolladora_id?: string | null
          generated_at?: string
          id?: string
          input_tokens?: number | null
          meta?: Json | null
          model?: string
          output_tokens?: number | null
          prompt_used?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          content_type?: string
          cost_usd?: number | null
          desarrolladora_id?: string | null
          generated_at?: string
          id?: string
          input_tokens?: number | null
          meta?: Json | null
          model?: string
          output_tokens?: number | null
          prompt_used?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_generated_content_desarrolladora_id_fkey"
            columns: ["desarrolladora_id"]
            isOneToOne: false
            referencedRelation: "desarrolladoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generated_content_desarrolladora_id_fkey"
            columns: ["desarrolladora_id"]
            isOneToOne: false
            referencedRelation: "public_desarrolladoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generated_content_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generated_content_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
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
      asesor_gamification: {
        Row: {
          asesor_id: string
          badge_unlocked: string[] | null
          close_rate_pct: number | null
          created_at: string
          id: string
          month: string
          opt_in_public_ranking: boolean
          rank_close_rate: number | null
          rank_overall: number | null
          rank_response_time: number | null
          rank_revenue: number | null
          rank_visits: number | null
          response_time_avg_min: number | null
          revenue_mxn: number | null
          updated_at: string
          visits_count: number | null
        }
        Insert: {
          asesor_id: string
          badge_unlocked?: string[] | null
          close_rate_pct?: number | null
          created_at?: string
          id?: string
          month: string
          opt_in_public_ranking?: boolean
          rank_close_rate?: number | null
          rank_overall?: number | null
          rank_response_time?: number | null
          rank_revenue?: number | null
          rank_visits?: number | null
          response_time_avg_min?: number | null
          revenue_mxn?: number | null
          updated_at?: string
          visits_count?: number | null
        }
        Update: {
          asesor_id?: string
          badge_unlocked?: string[] | null
          close_rate_pct?: number | null
          created_at?: string
          id?: string
          month?: string
          opt_in_public_ranking?: boolean
          rank_close_rate?: number | null
          rank_overall?: number | null
          rank_response_time?: number | null
          rank_revenue?: number | null
          rank_visits?: number | null
          response_time_avg_min?: number | null
          revenue_mxn?: number | null
          updated_at?: string
          visits_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "asesor_gamification_asesor_id_fkey"
            columns: ["asesor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asesor_gamification_asesor_id_fkey"
            columns: ["asesor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_crm_log: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          changes: Json
          country_code: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          occurred_at: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          changes?: Json
          country_code?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          occurred_at?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          changes?: Json
          country_code?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          occurred_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_crm_log_default: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          changes: Json
          country_code: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          occurred_at: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          changes?: Json
          country_code?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          occurred_at?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          changes?: Json
          country_code?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          occurred_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_crm_log_p20251201: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          changes: Json
          country_code: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          occurred_at: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          changes?: Json
          country_code?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          occurred_at?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          changes?: Json
          country_code?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          occurred_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_crm_log_p20260101: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          changes: Json
          country_code: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          occurred_at: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          changes?: Json
          country_code?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          occurred_at?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          changes?: Json
          country_code?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          occurred_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_crm_log_p20260201: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          changes: Json
          country_code: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          occurred_at: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          changes?: Json
          country_code?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          occurred_at?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          changes?: Json
          country_code?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          occurred_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_crm_log_p20260301: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          changes: Json
          country_code: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          occurred_at: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          changes?: Json
          country_code?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          occurred_at?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          changes?: Json
          country_code?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          occurred_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_crm_log_p20260401: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          changes: Json
          country_code: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          occurred_at: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          changes?: Json
          country_code?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          occurred_at?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          changes?: Json
          country_code?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          occurred_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_crm_log_p20260501: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          changes: Json
          country_code: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          occurred_at: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          changes?: Json
          country_code?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          occurred_at?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          changes?: Json
          country_code?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          occurred_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_crm_log_p20260601: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          changes: Json
          country_code: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          occurred_at: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          changes?: Json
          country_code?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          occurred_at?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          changes?: Json
          country_code?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          occurred_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_crm_log_p20260701: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          changes: Json
          country_code: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          occurred_at: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          changes?: Json
          country_code?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          occurred_at?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          changes?: Json
          country_code?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          occurred_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_crm_log_p20260801: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          changes: Json
          country_code: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          occurred_at: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          changes?: Json
          country_code?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          occurred_at?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          changes?: Json
          country_code?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          occurred_at?: string
          user_agent?: string | null
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
      avm_estimates: {
        Row: {
          adjustments: Json
          api_key_id: string | null
          ci_high: number | null
          ci_low: number | null
          comparables: Json
          confidence_score: number | null
          created_at: string
          estimate: number
          estimate_alternative: number | null
          fingerprint: string
          flag_corroborated: boolean
          flag_uncertain: boolean
          id: string
          mae_estimated_pct: number | null
          market_context: Json
          provenance: Json
          request_input: Json
          spread_pct: number | null
          user_id: string | null
          valid_until: string
        }
        Insert: {
          adjustments?: Json
          api_key_id?: string | null
          ci_high?: number | null
          ci_low?: number | null
          comparables?: Json
          confidence_score?: number | null
          created_at?: string
          estimate: number
          estimate_alternative?: number | null
          fingerprint: string
          flag_corroborated?: boolean
          flag_uncertain?: boolean
          id?: string
          mae_estimated_pct?: number | null
          market_context?: Json
          provenance?: Json
          request_input: Json
          spread_pct?: number | null
          user_id?: string | null
          valid_until?: string
        }
        Update: {
          adjustments?: Json
          api_key_id?: string | null
          ci_high?: number | null
          ci_low?: number | null
          comparables?: Json
          confidence_score?: number | null
          created_at?: string
          estimate?: number
          estimate_alternative?: number | null
          fingerprint?: string
          flag_corroborated?: boolean
          flag_uncertain?: boolean
          id?: string
          mae_estimated_pct?: number | null
          market_context?: Json
          provenance?: Json
          request_input?: Json
          spread_pct?: number | null
          user_id?: string | null
          valid_until?: string
        }
        Relationships: []
      }
      behavioral_signals: {
        Row: {
          buyer_twin_id: string
          id: string
          occurred_at: string
          signal_data: Json
          signal_type: string
        }
        Insert: {
          buyer_twin_id: string
          id?: string
          occurred_at?: string
          signal_data?: Json
          signal_type: string
        }
        Update: {
          buyer_twin_id?: string
          id?: string
          occurred_at?: string
          signal_data?: Json
          signal_type?: string
        }
        Relationships: []
      }
      behavioral_signals_default: {
        Row: {
          buyer_twin_id: string
          id: string
          occurred_at: string
          signal_data: Json
          signal_type: string
        }
        Insert: {
          buyer_twin_id: string
          id?: string
          occurred_at?: string
          signal_data?: Json
          signal_type: string
        }
        Update: {
          buyer_twin_id?: string
          id?: string
          occurred_at?: string
          signal_data?: Json
          signal_type?: string
        }
        Relationships: []
      }
      behavioral_signals_p20251201: {
        Row: {
          buyer_twin_id: string
          id: string
          occurred_at: string
          signal_data: Json
          signal_type: string
        }
        Insert: {
          buyer_twin_id: string
          id?: string
          occurred_at?: string
          signal_data?: Json
          signal_type: string
        }
        Update: {
          buyer_twin_id?: string
          id?: string
          occurred_at?: string
          signal_data?: Json
          signal_type?: string
        }
        Relationships: []
      }
      behavioral_signals_p20260101: {
        Row: {
          buyer_twin_id: string
          id: string
          occurred_at: string
          signal_data: Json
          signal_type: string
        }
        Insert: {
          buyer_twin_id: string
          id?: string
          occurred_at?: string
          signal_data?: Json
          signal_type: string
        }
        Update: {
          buyer_twin_id?: string
          id?: string
          occurred_at?: string
          signal_data?: Json
          signal_type?: string
        }
        Relationships: []
      }
      behavioral_signals_p20260201: {
        Row: {
          buyer_twin_id: string
          id: string
          occurred_at: string
          signal_data: Json
          signal_type: string
        }
        Insert: {
          buyer_twin_id: string
          id?: string
          occurred_at?: string
          signal_data?: Json
          signal_type: string
        }
        Update: {
          buyer_twin_id?: string
          id?: string
          occurred_at?: string
          signal_data?: Json
          signal_type?: string
        }
        Relationships: []
      }
      behavioral_signals_p20260301: {
        Row: {
          buyer_twin_id: string
          id: string
          occurred_at: string
          signal_data: Json
          signal_type: string
        }
        Insert: {
          buyer_twin_id: string
          id?: string
          occurred_at?: string
          signal_data?: Json
          signal_type: string
        }
        Update: {
          buyer_twin_id?: string
          id?: string
          occurred_at?: string
          signal_data?: Json
          signal_type?: string
        }
        Relationships: []
      }
      behavioral_signals_p20260401: {
        Row: {
          buyer_twin_id: string
          id: string
          occurred_at: string
          signal_data: Json
          signal_type: string
        }
        Insert: {
          buyer_twin_id: string
          id?: string
          occurred_at?: string
          signal_data?: Json
          signal_type: string
        }
        Update: {
          buyer_twin_id?: string
          id?: string
          occurred_at?: string
          signal_data?: Json
          signal_type?: string
        }
        Relationships: []
      }
      behavioral_signals_p20260501: {
        Row: {
          buyer_twin_id: string
          id: string
          occurred_at: string
          signal_data: Json
          signal_type: string
        }
        Insert: {
          buyer_twin_id: string
          id?: string
          occurred_at?: string
          signal_data?: Json
          signal_type: string
        }
        Update: {
          buyer_twin_id?: string
          id?: string
          occurred_at?: string
          signal_data?: Json
          signal_type?: string
        }
        Relationships: []
      }
      behavioral_signals_p20260601: {
        Row: {
          buyer_twin_id: string
          id: string
          occurred_at: string
          signal_data: Json
          signal_type: string
        }
        Insert: {
          buyer_twin_id: string
          id?: string
          occurred_at?: string
          signal_data?: Json
          signal_type: string
        }
        Update: {
          buyer_twin_id?: string
          id?: string
          occurred_at?: string
          signal_data?: Json
          signal_type?: string
        }
        Relationships: []
      }
      behavioral_signals_p20260701: {
        Row: {
          buyer_twin_id: string
          id: string
          occurred_at: string
          signal_data: Json
          signal_type: string
        }
        Insert: {
          buyer_twin_id: string
          id?: string
          occurred_at?: string
          signal_data?: Json
          signal_type: string
        }
        Update: {
          buyer_twin_id?: string
          id?: string
          occurred_at?: string
          signal_data?: Json
          signal_type?: string
        }
        Relationships: []
      }
      behavioral_signals_p20260801: {
        Row: {
          buyer_twin_id: string
          id: string
          occurred_at: string
          signal_data: Json
          signal_type: string
        }
        Insert: {
          buyer_twin_id: string
          id?: string
          occurred_at?: string
          signal_data?: Json
          signal_type: string
        }
        Update: {
          buyer_twin_id?: string
          id?: string
          occurred_at?: string
          signal_data?: Json
          signal_type?: string
        }
        Relationships: []
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
      busquedas: {
        Row: {
          asesor_id: string | null
          brokerage_id: string | null
          country_code: string
          created_at: string
          created_by: string | null
          criteria: Json
          id: string
          last_run_at: string | null
          lead_id: string
          matched_count: number
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          asesor_id?: string | null
          brokerage_id?: string | null
          country_code: string
          created_at?: string
          created_by?: string | null
          criteria?: Json
          id?: string
          last_run_at?: string | null
          lead_id: string
          matched_count?: number
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          asesor_id?: string | null
          brokerage_id?: string | null
          country_code?: string
          created_at?: string
          created_by?: string | null
          criteria?: Json
          id?: string
          last_run_at?: string | null
          lead_id?: string
          matched_count?: number
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "busquedas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_twin_traits: {
        Row: {
          buyer_twin_id: string
          computed_at: string
          confidence: number
          id: string
          trait_code: string
          trait_system: string
          trait_value: number
        }
        Insert: {
          buyer_twin_id: string
          computed_at?: string
          confidence?: number
          id?: string
          trait_code: string
          trait_system: string
          trait_value: number
        }
        Update: {
          buyer_twin_id?: string
          computed_at?: string
          confidence?: number
          id?: string
          trait_code?: string
          trait_system?: string
          trait_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "buyer_twin_traits_buyer_twin_id_fkey"
            columns: ["buyer_twin_id"]
            isOneToOne: false
            referencedRelation: "buyer_twins"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_twins: {
        Row: {
          behavioral_embedding: string | null
          big_five_profile: Json
          country_code: string
          created_at: string
          disc_profile: Json
          embedding_updated_at: string | null
          id: string
          last_signal_at: string | null
          persona_type_id: string
          price_range_currency: string | null
          price_range_max: number | null
          price_range_min: number | null
          updated_at: string
          user_id: string | null
          zone_focus_ids: string[]
        }
        Insert: {
          behavioral_embedding?: string | null
          big_five_profile?: Json
          country_code: string
          created_at?: string
          disc_profile?: Json
          embedding_updated_at?: string | null
          id?: string
          last_signal_at?: string | null
          persona_type_id: string
          price_range_currency?: string | null
          price_range_max?: number | null
          price_range_min?: number | null
          updated_at?: string
          user_id?: string | null
          zone_focus_ids?: string[]
        }
        Update: {
          behavioral_embedding?: string | null
          big_five_profile?: Json
          country_code?: string
          created_at?: string
          disc_profile?: Json
          embedding_updated_at?: string | null
          id?: string
          last_signal_at?: string | null
          persona_type_id?: string
          price_range_currency?: string | null
          price_range_max?: number | null
          price_range_min?: number | null
          updated_at?: string
          user_id?: string | null
          zone_focus_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "buyer_twins_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "buyer_twins_persona_type_id_fkey"
            columns: ["persona_type_id"]
            isOneToOne: false
            referencedRelation: "persona_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_twins_price_range_currency_fkey"
            columns: ["price_range_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      captaciones: {
        Row: {
          acm_computed_at: string | null
          acm_result: Json | null
          asesor_id: string
          brokerage_id: string | null
          ciudad: string | null
          closed_at: string | null
          closed_motivo: string | null
          closed_notes: string | null
          colonia: string | null
          country_code: string
          created_at: string
          created_by: string | null
          currency: string
          direccion: string
          features: Json
          id: string
          lead_id: string | null
          notes: string | null
          precio_solicitado: number
          propietario_email: string | null
          propietario_nombre: string
          propietario_telefono: string | null
          status: Database["public"]["Enums"]["captacion_status"]
          status_changed_at: string
          tipo_operacion: Database["public"]["Enums"]["captacion_operacion"]
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          acm_computed_at?: string | null
          acm_result?: Json | null
          asesor_id: string
          brokerage_id?: string | null
          ciudad?: string | null
          closed_at?: string | null
          closed_motivo?: string | null
          closed_notes?: string | null
          colonia?: string | null
          country_code: string
          created_at?: string
          created_by?: string | null
          currency?: string
          direccion: string
          features?: Json
          id?: string
          lead_id?: string | null
          notes?: string | null
          precio_solicitado: number
          propietario_email?: string | null
          propietario_nombre: string
          propietario_telefono?: string | null
          status?: Database["public"]["Enums"]["captacion_status"]
          status_changed_at?: string
          tipo_operacion: Database["public"]["Enums"]["captacion_operacion"]
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          acm_computed_at?: string | null
          acm_result?: Json | null
          asesor_id?: string
          brokerage_id?: string | null
          ciudad?: string | null
          closed_at?: string | null
          closed_motivo?: string | null
          closed_notes?: string | null
          colonia?: string | null
          country_code?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          direccion?: string
          features?: Json
          id?: string
          lead_id?: string | null
          notes?: string | null
          precio_solicitado?: number
          propietario_email?: string | null
          propietario_nombre?: string
          propietario_telefono?: string | null
          status?: Database["public"]["Enums"]["captacion_status"]
          status_changed_at?: string
          tipo_operacion?: Database["public"]["Enums"]["captacion_operacion"]
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "captaciones_brokerage_id_fkey"
            columns: ["brokerage_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "captaciones_brokerage_id_fkey"
            columns: ["brokerage_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "captaciones_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "captaciones_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      cascade_replay_log: {
        Row: {
          cascade_event: string
          completed_at: string | null
          dry_run: boolean
          error: string | null
          id: string
          jobs_enqueued: number
          period_from: string | null
          period_to: string | null
          started_at: string
          status: string
          target_filter: Json
          triggered_by: string | null
        }
        Insert: {
          cascade_event: string
          completed_at?: string | null
          dry_run?: boolean
          error?: string | null
          id?: string
          jobs_enqueued?: number
          period_from?: string | null
          period_to?: string | null
          started_at?: string
          status?: string
          target_filter?: Json
          triggered_by?: string | null
        }
        Update: {
          cascade_event?: string
          completed_at?: string | null
          dry_run?: boolean
          error?: string | null
          id?: string
          jobs_enqueued?: number
          period_from?: string | null
          period_to?: string | null
          started_at?: string
          status?: string
          target_filter?: Json
          triggered_by?: string | null
        }
        Relationships: []
      }
      causal_explanations: {
        Row: {
          cache_hit_count: number
          citations: Json
          explanation_md: string
          generated_at: string
          id: string
          model: string
          period_date: string
          prompt_version: string
          scope_id: string
          scope_type: string
          score_id: string
          ttl_days: number
        }
        Insert: {
          cache_hit_count?: number
          citations?: Json
          explanation_md: string
          generated_at?: string
          id?: string
          model: string
          period_date: string
          prompt_version: string
          scope_id: string
          scope_type: string
          score_id: string
          ttl_days?: number
        }
        Update: {
          cache_hit_count?: number
          citations?: Json
          explanation_md?: string
          generated_at?: string
          id?: string
          model?: string
          period_date?: string
          prompt_version?: string
          scope_id?: string
          scope_type?: string
          score_id?: string
          ttl_days?: number
        }
        Relationships: []
      }
      client_folders: {
        Row: {
          cliente_contacto_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          slug: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cliente_contacto_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          slug: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cliente_contacto_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          slug?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      climate_annual_summaries: {
        Row: {
          climate_type: string | null
          composite_climate_signature: string
          computed_at: string
          summary: Json
          year: number
          zone_id: string
        }
        Insert: {
          climate_type?: string | null
          composite_climate_signature: string
          computed_at?: string
          summary?: Json
          year: number
          zone_id: string
        }
        Update: {
          climate_type?: string | null
          composite_climate_signature?: string
          computed_at?: string
          summary?: Json
          year?: number
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "climate_annual_summaries_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      climate_future_projections: {
        Row: {
          air_quality_index: number | null
          calculated_at: string
          colonia_id: string
          confidence: number | null
          id: string
          methodology_version: string
          projection_year: number
          sources: Json
          temp_celsius: number | null
          water_availability_pct: number | null
        }
        Insert: {
          air_quality_index?: number | null
          calculated_at?: string
          colonia_id: string
          confidence?: number | null
          id?: string
          methodology_version?: string
          projection_year: number
          sources?: Json
          temp_celsius?: number | null
          water_availability_pct?: number | null
        }
        Update: {
          air_quality_index?: number | null
          calculated_at?: string
          colonia_id?: string
          confidence?: number | null
          id?: string
          methodology_version?: string
          projection_year?: number
          sources?: Json
          temp_celsius?: number | null
          water_availability_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "climate_future_projections_colonia_id_fkey"
            columns: ["colonia_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      climate_monthly_aggregates: {
        Row: {
          computed_at: string
          cross_validation_status: string
          extreme_events_count: Json
          humidity_avg: number | null
          rainfall_mm: number | null
          source: string
          temp_avg: number | null
          temp_max: number | null
          temp_min: number | null
          year_month: string
          zone_id: string
        }
        Insert: {
          computed_at?: string
          cross_validation_status?: string
          extreme_events_count?: Json
          humidity_avg?: number | null
          rainfall_mm?: number | null
          source?: string
          temp_avg?: number | null
          temp_max?: number | null
          temp_min?: number | null
          year_month: string
          zone_id: string
        }
        Update: {
          computed_at?: string
          cross_validation_status?: string
          extreme_events_count?: Json
          humidity_avg?: number | null
          rainfall_mm?: number | null
          source?: string
          temp_avg?: number | null
          temp_max?: number | null
          temp_min?: number | null
          year_month?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "climate_monthly_aggregates_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      climate_source_observations: {
        Row: {
          extreme_events_count: Json
          humidity_avg: number | null
          id: string
          ingested_at: string
          rainfall_mm: number | null
          source: string
          station_id: string
          temp_avg: number | null
          temp_max: number | null
          temp_min: number | null
          year_month: string
          zone_id: string
        }
        Insert: {
          extreme_events_count?: Json
          humidity_avg?: number | null
          id?: string
          ingested_at?: string
          rainfall_mm?: number | null
          source: string
          station_id: string
          temp_avg?: number | null
          temp_max?: number | null
          temp_min?: number | null
          year_month: string
          zone_id: string
        }
        Update: {
          extreme_events_count?: Json
          humidity_avg?: number | null
          id?: string
          ingested_at?: string
          rainfall_mm?: number | null
          source?: string
          station_id?: string
          temp_avg?: number | null
          temp_max?: number | null
          temp_min?: number | null
          year_month?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "climate_source_observations_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      climate_twin_matches: {
        Row: {
          computed_at: string
          methodology: string
          shared_patterns: Json
          similarity: number
          twin_zone_id: string
          zone_id: string
        }
        Insert: {
          computed_at?: string
          methodology?: string
          shared_patterns?: Json
          similarity: number
          twin_zone_id: string
          zone_id: string
        }
        Update: {
          computed_at?: string
          methodology?: string
          shared_patterns?: Json
          similarity?: number
          twin_zone_id?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "climate_twin_matches_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      climate_zone_signatures: {
        Row: {
          computed_at: string
          methodology: string
          signature: string
          years_observed: number
          zone_id: string
        }
        Insert: {
          computed_at?: string
          methodology?: string
          signature: string
          years_observed?: number
          zone_id: string
        }
        Update: {
          computed_at?: string
          methodology?: string
          signature?: string
          years_observed?: number
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "climate_zone_signatures_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: true
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      colonia_dna_vectors: {
        Row: {
          colonia_id: string
          components: Json
          computed_at: string
          country_code: string
          methodology_version: string
          vector: string
        }
        Insert: {
          colonia_id: string
          components: Json
          computed_at?: string
          country_code?: string
          methodology_version?: string
          vector: string
        }
        Update: {
          colonia_id?: string
          components?: Json
          computed_at?: string
          country_code?: string
          methodology_version?: string
          vector?: string
        }
        Relationships: [
          {
            foreignKeyName: "colonia_dna_vectors_colonia_id_fkey"
            columns: ["colonia_id"]
            isOneToOne: true
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      colonia_vibe_tags: {
        Row: {
          colonia_id: string
          computed_at: string
          source: string
          vibe_tag_id: string
          weight: number
        }
        Insert: {
          colonia_id: string
          computed_at?: string
          source?: string
          vibe_tag_id: string
          weight: number
        }
        Update: {
          colonia_id?: string
          computed_at?: string
          source?: string
          vibe_tag_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "colonia_vibe_tags_colonia_id_fkey"
            columns: ["colonia_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colonia_vibe_tags_vibe_tag_id_fkey"
            columns: ["vibe_tag_id"]
            isOneToOne: false
            referencedRelation: "vibe_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      colonia_wiki_entries: {
        Row: {
          colonia_id: string
          content_md: string
          created_at: string
          edited_at: string
          edited_by: string | null
          id: string
          published: boolean
          reviewed: boolean
          reviewed_by: string | null
          sections: Json
          version: number
        }
        Insert: {
          colonia_id: string
          content_md: string
          created_at?: string
          edited_at?: string
          edited_by?: string | null
          id?: string
          published?: boolean
          reviewed?: boolean
          reviewed_by?: string | null
          sections?: Json
          version?: number
        }
        Update: {
          colonia_id?: string
          content_md?: string
          created_at?: string
          edited_at?: string
          edited_by?: string | null
          id?: string
          published?: boolean
          reviewed?: boolean
          reviewed_by?: string | null
          sections?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "colonia_wiki_entries_colonia_id_fkey"
            columns: ["colonia_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
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
      contact_notes: {
        Row: {
          author_user_id: string
          content_md: string
          created_at: string
          id: string
          lead_id: string
          level: Database["public"]["Enums"]["contact_note_level"]
          updated_at: string
        }
        Insert: {
          author_user_id: string
          content_md: string
          created_at?: string
          id?: string
          lead_id: string
          level?: Database["public"]["Enums"]["contact_note_level"]
          updated_at?: string
        }
        Update: {
          author_user_id?: string
          content_md?: string
          created_at?: string
          id?: string
          lead_id?: string
          level?: Database["public"]["Enums"]["contact_note_level"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_notes_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
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
      deal_stages: {
        Row: {
          created_at: string
          id: string
          is_terminal: boolean
          is_won: boolean
          label_en: string
          label_es: string
          order_index: number
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_terminal?: boolean
          is_won?: boolean
          label_en: string
          label_es: string
          order_index: number
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          is_terminal?: boolean
          is_won?: boolean
          label_en?: string
          label_es?: string
          order_index?: number
          slug?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          actual_close_date: string | null
          amount: number
          amount_currency: string
          asesor_id: string
          country_code: string
          created_at: string
          expected_close_date: string | null
          id: string
          lead_id: string
          notes: string | null
          probability: number
          property_id: string | null
          stage_id: string
          updated_at: string
          zone_id: string
        }
        Insert: {
          actual_close_date?: string | null
          amount: number
          amount_currency: string
          asesor_id: string
          country_code: string
          created_at?: string
          expected_close_date?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          probability?: number
          property_id?: string | null
          stage_id: string
          updated_at?: string
          zone_id: string
        }
        Update: {
          actual_close_date?: string | null
          amount?: number
          amount_currency?: string
          asesor_id?: string
          country_code?: string
          created_at?: string
          expected_close_date?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          probability?: number
          property_id?: string | null
          stage_id?: string
          updated_at?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_amount_currency_fkey"
            columns: ["amount_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "deals_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "deal_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
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
      dev_trust_scores: {
        Row: {
          calculated_at: string
          citations: Json | null
          created_at: string
          desarrolladora_id: string
          id: string
          improvements: Json | null
          is_placeholder: boolean
          level: string
          score_doc_transparency: number | null
          score_financial_health: number | null
          score_on_time_delivery: number | null
          score_overall: number
          score_post_venta: number | null
          score_reviews: number | null
          updated_at: string
        }
        Insert: {
          calculated_at?: string
          citations?: Json | null
          created_at?: string
          desarrolladora_id: string
          id?: string
          improvements?: Json | null
          is_placeholder?: boolean
          level: string
          score_doc_transparency?: number | null
          score_financial_health?: number | null
          score_on_time_delivery?: number | null
          score_overall: number
          score_post_venta?: number | null
          score_reviews?: number | null
          updated_at?: string
        }
        Update: {
          calculated_at?: string
          citations?: Json | null
          created_at?: string
          desarrolladora_id?: string
          id?: string
          improvements?: Json | null
          is_placeholder?: boolean
          level?: string
          score_doc_transparency?: number | null
          score_financial_health?: number | null
          score_on_time_delivery?: number | null
          score_overall?: number
          score_post_venta?: number | null
          score_reviews?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dev_trust_scores_desarrolladora_id_fkey"
            columns: ["desarrolladora_id"]
            isOneToOne: true
            referencedRelation: "desarrolladoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dev_trust_scores_desarrolladora_id_fkey"
            columns: ["desarrolladora_id"]
            isOneToOne: true
            referencedRelation: "public_desarrolladoras"
            referencedColumns: ["id"]
          },
        ]
      }
      dmx_indices: {
        Row: {
          calculated_at: string
          circuit_breaker_triggered: boolean
          components: Json
          confidence: string
          confidence_breakdown: Json | null
          confidence_score: number | null
          country_code: string
          created_at: string
          id: string
          index_code: string
          inputs_used: Json
          is_shadow: boolean
          methodology_version: string
          percentile: number | null
          period_date: string
          period_type: string
          ranking_in_scope: number | null
          scope_id: string
          scope_type: string
          score_band: string | null
          trend_direction: string | null
          trend_vs_previous: number | null
          valid_until: string | null
          value: number
        }
        Insert: {
          calculated_at?: string
          circuit_breaker_triggered?: boolean
          components: Json
          confidence: string
          confidence_breakdown?: Json | null
          confidence_score?: number | null
          country_code?: string
          created_at?: string
          id?: string
          index_code: string
          inputs_used: Json
          is_shadow?: boolean
          methodology_version?: string
          percentile?: number | null
          period_date: string
          period_type: string
          ranking_in_scope?: number | null
          scope_id: string
          scope_type: string
          score_band?: string | null
          trend_direction?: string | null
          trend_vs_previous?: number | null
          valid_until?: string | null
          value: number
        }
        Update: {
          calculated_at?: string
          circuit_breaker_triggered?: boolean
          components?: Json
          confidence?: string
          confidence_breakdown?: Json | null
          confidence_score?: number | null
          country_code?: string
          created_at?: string
          id?: string
          index_code?: string
          inputs_used?: Json
          is_shadow?: boolean
          methodology_version?: string
          percentile?: number | null
          period_date?: string
          period_type?: string
          ranking_in_scope?: number | null
          scope_id?: string
          scope_type?: string
          score_band?: string | null
          trend_direction?: string | null
          trend_vs_previous?: number | null
          valid_until?: string | null
          value?: number
        }
        Relationships: []
      }
      dmx_indices_audit_log: {
        Row: {
          calculator_version: string
          id: string
          index_id: string
          input_snapshot: Json
          model: string | null
          output_snapshot: Json
          run_id: string
          triggered_at: string
          triggered_by: string
        }
        Insert: {
          calculator_version: string
          id?: string
          index_id: string
          input_snapshot: Json
          model?: string | null
          output_snapshot: Json
          run_id: string
          triggered_at?: string
          triggered_by: string
        }
        Update: {
          calculator_version?: string
          id?: string
          index_id?: string
          input_snapshot?: Json
          model?: string | null
          output_snapshot?: Json
          run_id?: string
          triggered_at?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "dmx_indices_audit_log_index_id_fkey"
            columns: ["index_id"]
            isOneToOne: false
            referencedRelation: "dmx_indices"
            referencedColumns: ["id"]
          },
        ]
      }
      dmx_indices_methodology_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          changelog_notes: string | null
          created_at: string
          effective_from: string
          effective_to: string | null
          formula_md: string
          id: string
          index_code: string
          version: string
          weights_jsonb: Json
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          changelog_notes?: string | null
          created_at?: string
          effective_from: string
          effective_to?: string | null
          formula_md: string
          id?: string
          index_code: string
          version: string
          weights_jsonb: Json
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          changelog_notes?: string | null
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          formula_md?: string
          id?: string
          index_code?: string
          version?: string
          weights_jsonb?: Json
        }
        Relationships: []
      }
      dmx_wrapped_snapshots: {
        Row: {
          cards: Json
          country_code: string
          generated_at: string
          id: string
          share_url: string | null
          user_id: string | null
          year: number
        }
        Insert: {
          cards?: Json
          country_code?: string
          generated_at?: string
          id?: string
          share_url?: string | null
          user_id?: string | null
          year: number
        }
        Update: {
          cards?: Json
          country_code?: string
          generated_at?: string
          id?: string
          share_url?: string | null
          user_id?: string | null
          year?: number
        }
        Relationships: []
      }
      dna_migration_matches: {
        Row: {
          calculated_at: string
          combined_score: number
          dest_colonia_id: string
          id: string
          migration_volume: number
          origin_colonia_id: string
          period_date: string
          similarity_score: number
        }
        Insert: {
          calculated_at?: string
          combined_score: number
          dest_colonia_id: string
          id?: string
          migration_volume?: number
          origin_colonia_id: string
          period_date: string
          similarity_score: number
        }
        Update: {
          calculated_at?: string
          combined_score?: number
          dest_colonia_id?: string
          id?: string
          migration_volume?: number
          origin_colonia_id?: string
          period_date?: string
          similarity_score?: number
        }
        Relationships: []
      }
      documents: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          desarrolladora_id: string
          expires_at: string | null
          id: string
          meta: Json | null
          nombre: string
          proyecto_id: string | null
          rejection_reason: string | null
          status: string
          storage_path: string
          tipo: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          desarrolladora_id: string
          expires_at?: string | null
          id?: string
          meta?: Json | null
          nombre: string
          proyecto_id?: string | null
          rejection_reason?: string | null
          status?: string
          storage_path: string
          tipo: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          desarrolladora_id?: string
          expires_at?: string | null
          id?: string
          meta?: Json | null
          nombre?: string
          proyecto_id?: string | null
          rejection_reason?: string | null
          status?: string
          storage_path?: string
          tipo?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_desarrolladora_id_fkey"
            columns: ["desarrolladora_id"]
            isOneToOne: false
            referencedRelation: "desarrolladoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_desarrolladora_id_fkey"
            columns: ["desarrolladora_id"]
            isOneToOne: false
            referencedRelation: "public_desarrolladoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
      enigh_zone_income: {
        Row: {
          data_origin: string
          downscale_proxy_ratio: number | null
          id: string
          median_salary_mxn: number | null
          salary_range_distribution: Json
          snapshot_date: string
          zone_id: string
        }
        Insert: {
          data_origin?: string
          downscale_proxy_ratio?: number | null
          id?: string
          median_salary_mxn?: number | null
          salary_range_distribution?: Json
          snapshot_date: string
          zone_id: string
        }
        Update: {
          data_origin?: string
          downscale_proxy_ratio?: number | null
          id?: string
          median_salary_mxn?: number | null
          salary_range_distribution?: Json
          snapshot_date?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enigh_zone_income_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      exclusividad_acuerdos: {
        Row: {
          active: boolean
          asesor_id: string | null
          brokerage_id: string | null
          comision_pct: number
          created_at: string
          end_date: string | null
          id: string
          meses_contrato: number
          meses_exclusividad: number
          meta: Json
          proyecto_id: string
          scope: Database["public"]["Enums"]["exclusividad_scope"]
          signed_url: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          asesor_id?: string | null
          brokerage_id?: string | null
          comision_pct: number
          created_at?: string
          end_date?: string | null
          id?: string
          meses_contrato: number
          meses_exclusividad: number
          meta?: Json
          proyecto_id: string
          scope?: Database["public"]["Enums"]["exclusividad_scope"]
          signed_url?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          asesor_id?: string | null
          brokerage_id?: string | null
          comision_pct?: number
          created_at?: string
          end_date?: string | null
          id?: string
          meses_contrato?: number
          meses_exclusividad?: number
          meta?: Json
          proyecto_id?: string
          scope?: Database["public"]["Enums"]["exclusividad_scope"]
          signed_url?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exclusividad_acuerdos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      family_unit_members: {
        Row: {
          buyer_twin_id: string
          created_at: string
          family_unit_id: string
          id: string
          is_primary: boolean
          relationship: string
        }
        Insert: {
          buyer_twin_id: string
          created_at?: string
          family_unit_id: string
          id?: string
          is_primary?: boolean
          relationship: string
        }
        Update: {
          buyer_twin_id?: string
          created_at?: string
          family_unit_id?: string
          id?: string
          is_primary?: boolean
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_unit_members_buyer_twin_fk"
            columns: ["buyer_twin_id"]
            isOneToOne: false
            referencedRelation: "buyer_twins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_unit_members_family_unit_id_fkey"
            columns: ["family_unit_id"]
            isOneToOne: false
            referencedRelation: "family_units"
            referencedColumns: ["id"]
          },
        ]
      }
      family_units: {
        Row: {
          combined_budget_currency: string | null
          combined_budget_max: number | null
          combined_budget_min: number | null
          country_code: string
          created_at: string
          id: string
          members_count: number
          primary_buyer_twin_id: string
          unit_type: string
          updated_at: string
        }
        Insert: {
          combined_budget_currency?: string | null
          combined_budget_max?: number | null
          combined_budget_min?: number | null
          country_code: string
          created_at?: string
          id?: string
          members_count?: number
          primary_buyer_twin_id: string
          unit_type: string
          updated_at?: string
        }
        Update: {
          combined_budget_currency?: string | null
          combined_budget_max?: number | null
          combined_budget_min?: number | null
          country_code?: string
          created_at?: string
          id?: string
          members_count?: number
          primary_buyer_twin_id?: string
          unit_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_units_combined_budget_currency_fkey"
            columns: ["combined_budget_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "family_units_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "family_units_primary_buyer_twin_fk"
            columns: ["primary_buyer_twin_id"]
            isOneToOne: false
            referencedRelation: "buyer_twins"
            referencedColumns: ["id"]
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
      folder_projects: {
        Row: {
          created_at: string
          folder_id: string
          project_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          folder_id: string
          project_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          folder_id?: string
          project_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "folder_projects_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "client_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folder_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      futures_curve_projections: {
        Row: {
          base_period_date: string
          calculated_at: string
          confidence: number | null
          country_code: string
          forward_12m: number | null
          forward_12m_lower: number | null
          forward_12m_upper: number | null
          forward_24m: number | null
          forward_24m_lower: number | null
          forward_24m_upper: number | null
          forward_3m: number | null
          forward_3m_lower: number | null
          forward_3m_upper: number | null
          forward_6m: number | null
          forward_6m_lower: number | null
          forward_6m_upper: number | null
          id: string
          index_code: string
          methodology: string
          scope_id: string
          scope_type: string
        }
        Insert: {
          base_period_date: string
          calculated_at?: string
          confidence?: number | null
          country_code?: string
          forward_12m?: number | null
          forward_12m_lower?: number | null
          forward_12m_upper?: number | null
          forward_24m?: number | null
          forward_24m_lower?: number | null
          forward_24m_upper?: number | null
          forward_3m?: number | null
          forward_3m_lower?: number | null
          forward_3m_upper?: number | null
          forward_6m?: number | null
          forward_6m_lower?: number | null
          forward_6m_upper?: number | null
          id?: string
          index_code: string
          methodology?: string
          scope_id: string
          scope_type: string
        }
        Update: {
          base_period_date?: string
          calculated_at?: string
          confidence?: number | null
          country_code?: string
          forward_12m?: number | null
          forward_12m_lower?: number | null
          forward_12m_upper?: number | null
          forward_24m?: number | null
          forward_24m_lower?: number | null
          forward_24m_upper?: number | null
          forward_3m?: number | null
          forward_3m_lower?: number | null
          forward_3m_upper?: number | null
          forward_6m?: number | null
          forward_6m_lower?: number | null
          forward_6m_upper?: number | null
          id?: string
          index_code?: string
          methodology?: string
          scope_id?: string
          scope_type?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "geo_data_points_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
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
          {
            foreignKeyName: "geo_snapshots_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
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
      ghost_zones_ranking: {
        Row: {
          calculated_at: string
          colonia_id: string
          country_code: string
          ghost_score: number
          id: string
          period_date: string
          press_mentions: number
          rank: number | null
          score_total: number | null
          search_volume: number
          transition_probability: number | null
        }
        Insert: {
          calculated_at?: string
          colonia_id: string
          country_code?: string
          ghost_score: number
          id?: string
          period_date: string
          press_mentions?: number
          rank?: number | null
          score_total?: number | null
          search_volume?: number
          transition_probability?: number | null
        }
        Update: {
          calculated_at?: string
          colonia_id?: string
          country_code?: string
          ghost_score?: number
          id?: string
          period_date?: string
          press_mentions?: number
          rank?: number | null
          score_total?: number | null
          search_volume?: number
          transition_probability?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ghost_zones_ranking_colonia_id_fkey"
            columns: ["colonia_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      historical_forensics_reports: {
        Row: {
          causal_chain: Json
          colonia_id: string
          events_detected: Json
          generated_at: string
          id: string
          narrative_md: string | null
          pdf_url: string | null
          period_end: string
          period_start: string
        }
        Insert: {
          causal_chain?: Json
          colonia_id: string
          events_detected?: Json
          generated_at?: string
          id?: string
          narrative_md?: string | null
          pdf_url?: string | null
          period_end: string
          period_start: string
        }
        Update: {
          causal_chain?: Json
          colonia_id?: string
          events_detected?: Json
          generated_at?: string
          id?: string
          narrative_md?: string | null
          pdf_url?: string | null
          period_end?: string
          period_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "historical_forensics_reports_colonia_id_fkey"
            columns: ["colonia_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      ie_score_visibility_rules: {
        Row: {
          allowed_fields: Json
          excluded_fields: Json
          score_id: string
          tenant_scope_required: boolean
          updated_at: string
          visibility: string
        }
        Insert: {
          allowed_fields?: Json
          excluded_fields?: Json
          score_id: string
          tenant_scope_required?: boolean
          updated_at?: string
          visibility: string
        }
        Update: {
          allowed_fields?: Json
          excluded_fields?: Json
          score_id?: string
          tenant_scope_required?: boolean
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      inegi_ageb_staging: {
        Row: {
          ageb_total_area_km2: number | null
          cve_ageb: string
          cve_ent: string
          cve_loc: string
          cve_mun: string
          geom_4326: unknown
          graproes: number | null
          imported_at: string
          pea: number | null
          pob_0_14: number | null
          pob_15_64: number | null
          pob_65_mas: number | null
          poblacion_12y: number | null
          pobtot: number | null
          tothog: number | null
          vph_inter: number | null
          vph_pc: number | null
        }
        Insert: {
          ageb_total_area_km2?: number | null
          cve_ageb: string
          cve_ent: string
          cve_loc: string
          cve_mun: string
          geom_4326: unknown
          graproes?: number | null
          imported_at?: string
          pea?: number | null
          pob_0_14?: number | null
          pob_15_64?: number | null
          pob_65_mas?: number | null
          poblacion_12y?: number | null
          pobtot?: number | null
          tothog?: number | null
          vph_inter?: number | null
          vph_pc?: number | null
        }
        Update: {
          ageb_total_area_km2?: number | null
          cve_ageb?: string
          cve_ent?: string
          cve_loc?: string
          cve_mun?: string
          geom_4326?: unknown
          graproes?: number | null
          imported_at?: string
          pea?: number | null
          pob_0_14?: number | null
          pob_15_64?: number | null
          pob_65_mas?: number | null
          poblacion_12y?: number | null
          pobtot?: number | null
          tothog?: number | null
          vph_inter?: number | null
          vph_pc?: number | null
        }
        Relationships: []
      }
      inegi_census_zone_stats: {
        Row: {
          age_distribution: Json
          data_origin: string
          densidad_hab_km2: number | null
          dominant_profession: string | null
          edad_mediana_anios: number | null
          graproes_anios: number | null
          hogares_censales: number | null
          id: string
          pct_pob_0_14: number | null
          pct_pob_15_64: number | null
          pct_pob_65_mas: number | null
          pct_viviendas_internet: number | null
          pct_viviendas_pc: number | null
          pea_ratio: number | null
          per_ageb_aggregations: Json | null
          poblacion_12_y_mas: number | null
          poblacion_total: number | null
          profession_distribution: Json
          snapshot_date: string
          zone_id: string
        }
        Insert: {
          age_distribution?: Json
          data_origin?: string
          densidad_hab_km2?: number | null
          dominant_profession?: string | null
          edad_mediana_anios?: number | null
          graproes_anios?: number | null
          hogares_censales?: number | null
          id?: string
          pct_pob_0_14?: number | null
          pct_pob_15_64?: number | null
          pct_pob_65_mas?: number | null
          pct_viviendas_internet?: number | null
          pct_viviendas_pc?: number | null
          pea_ratio?: number | null
          per_ageb_aggregations?: Json | null
          poblacion_12_y_mas?: number | null
          poblacion_total?: number | null
          profession_distribution?: Json
          snapshot_date: string
          zone_id: string
        }
        Update: {
          age_distribution?: Json
          data_origin?: string
          densidad_hab_km2?: number | null
          dominant_profession?: string | null
          edad_mediana_anios?: number | null
          graproes_anios?: number | null
          hogares_censales?: number | null
          id?: string
          pct_pob_0_14?: number | null
          pct_pob_15_64?: number | null
          pct_pob_65_mas?: number | null
          pct_viviendas_internet?: number | null
          pct_viviendas_pc?: number | null
          pea_ratio?: number | null
          per_ageb_aggregations?: Json | null
          poblacion_12_y_mas?: number | null
          poblacion_total?: number | null
          profession_distribution?: Json
          snapshot_date?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inegi_census_zone_stats_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_heat_zones: {
        Row: {
          calculated_at: string
          chef_count: number
          country_code: string
          creator_count: number
          gallery_count: number
          heat_score: number | null
          id: string
          period_date: string
          scope_type: string
          sources: Json
          specialty_cafe_count: number
          zone_id: string
        }
        Insert: {
          calculated_at?: string
          chef_count?: number
          country_code?: string
          creator_count?: number
          gallery_count?: number
          heat_score?: number | null
          id?: string
          period_date: string
          scope_type?: string
          sources?: Json
          specialty_cafe_count?: number
          zone_id: string
        }
        Update: {
          calculated_at?: string
          chef_count?: number
          country_code?: string
          creator_count?: number
          gallery_count?: number
          heat_score?: number | null
          id?: string
          period_date?: string
          scope_type?: string
          sources?: Json
          specialty_cafe_count?: number
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencer_heat_zones_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
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
      landing_analytics: {
        Row: {
          country_code: string | null
          created_at: string
          event_type: string
          id: string
          ip_hash: string | null
          landing_id: string
          referer: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_hash?: string | null
          landing_id: string
          referer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          landing_id?: string
          referer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      landing_analytics_default: {
        Row: {
          country_code: string | null
          created_at: string
          event_type: string
          id: string
          ip_hash: string | null
          landing_id: string
          referer: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_hash?: string | null
          landing_id: string
          referer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          landing_id?: string
          referer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      landing_analytics_p20251201: {
        Row: {
          country_code: string | null
          created_at: string
          event_type: string
          id: string
          ip_hash: string | null
          landing_id: string
          referer: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_hash?: string | null
          landing_id: string
          referer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          landing_id?: string
          referer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      landing_analytics_p20260101: {
        Row: {
          country_code: string | null
          created_at: string
          event_type: string
          id: string
          ip_hash: string | null
          landing_id: string
          referer: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_hash?: string | null
          landing_id: string
          referer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          landing_id?: string
          referer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      landing_analytics_p20260201: {
        Row: {
          country_code: string | null
          created_at: string
          event_type: string
          id: string
          ip_hash: string | null
          landing_id: string
          referer: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_hash?: string | null
          landing_id: string
          referer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          landing_id?: string
          referer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      landing_analytics_p20260301: {
        Row: {
          country_code: string | null
          created_at: string
          event_type: string
          id: string
          ip_hash: string | null
          landing_id: string
          referer: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_hash?: string | null
          landing_id: string
          referer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          landing_id?: string
          referer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      landing_analytics_p20260401: {
        Row: {
          country_code: string | null
          created_at: string
          event_type: string
          id: string
          ip_hash: string | null
          landing_id: string
          referer: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_hash?: string | null
          landing_id: string
          referer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          landing_id?: string
          referer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      landing_analytics_p20260501: {
        Row: {
          country_code: string | null
          created_at: string
          event_type: string
          id: string
          ip_hash: string | null
          landing_id: string
          referer: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_hash?: string | null
          landing_id: string
          referer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          landing_id?: string
          referer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      landing_analytics_p20260601: {
        Row: {
          country_code: string | null
          created_at: string
          event_type: string
          id: string
          ip_hash: string | null
          landing_id: string
          referer: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_hash?: string | null
          landing_id: string
          referer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          landing_id?: string
          referer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      landing_analytics_p20260701: {
        Row: {
          country_code: string | null
          created_at: string
          event_type: string
          id: string
          ip_hash: string | null
          landing_id: string
          referer: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_hash?: string | null
          landing_id: string
          referer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          landing_id?: string
          referer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      landing_analytics_p20260801: {
        Row: {
          country_code: string | null
          created_at: string
          event_type: string
          id: string
          ip_hash: string | null
          landing_id: string
          referer: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_hash?: string | null
          landing_id: string
          referer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          landing_id?: string
          referer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      landings: {
        Row: {
          brand_colors: Json
          copy: Json
          country_code: string
          created_at: string
          id: string
          is_published: boolean
          project_ids: string[]
          published_at: string | null
          seo_meta: Json | null
          slug: string
          template: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_colors?: Json
          copy?: Json
          country_code: string
          created_at?: string
          id?: string
          is_published?: boolean
          project_ids: string[]
          published_at?: string | null
          seo_meta?: Json | null
          slug: string
          template: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_colors?: Json
          copy?: Json
          country_code?: string
          created_at?: string
          id?: string
          is_published?: boolean
          project_ids?: string[]
          published_at?: string | null
          seo_meta?: Json | null
          slug?: string
          template?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lead_sources: {
        Row: {
          active: boolean
          attribution_weight: number
          created_at: string
          id: string
          label_en: string
          label_es: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          attribution_weight?: number
          created_at?: string
          id?: string
          label_en: string
          label_es: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          attribution_weight?: number
          created_at?: string
          id?: string
          label_en?: string
          label_es?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          assigned_asesor_id: string | null
          brokerage_id: string | null
          contact_email: string | null
          contact_name: string
          contact_phone: string | null
          country_code: string
          created_at: string
          id: string
          metadata: Json
          notes: string | null
          qualification_score: number
          source_id: string
          status: string
          updated_at: string
          user_id: string | null
          zone_id: string
        }
        Insert: {
          assigned_asesor_id?: string | null
          brokerage_id?: string | null
          contact_email?: string | null
          contact_name: string
          contact_phone?: string | null
          country_code: string
          created_at?: string
          id?: string
          metadata?: Json
          notes?: string | null
          qualification_score?: number
          source_id: string
          status?: string
          updated_at?: string
          user_id?: string | null
          zone_id: string
        }
        Update: {
          assigned_asesor_id?: string | null
          brokerage_id?: string | null
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string | null
          country_code?: string
          created_at?: string
          id?: string
          metadata?: Json
          notes?: string | null
          qualification_score?: number
          source_id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "leads_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_dev: {
        Row: {
          assigned_to: string | null
          contacto_email: string | null
          contacto_name: string
          contacto_phone: string | null
          created_at: string
          desarrolladora_id: string
          id: string
          meta: Json | null
          notes: string | null
          proyecto_id: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          contacto_email?: string | null
          contacto_name: string
          contacto_phone?: string | null
          created_at?: string
          desarrolladora_id: string
          id?: string
          meta?: Json | null
          notes?: string | null
          proyecto_id?: string | null
          source: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          contacto_email?: string | null
          contacto_name?: string
          contacto_phone?: string | null
          created_at?: string
          desarrolladora_id?: string
          id?: string
          meta?: Json | null
          notes?: string | null
          proyecto_id?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_dev_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_dev_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_dev_desarrolladora_id_fkey"
            columns: ["desarrolladora_id"]
            isOneToOne: false
            referencedRelation: "desarrolladoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_dev_desarrolladora_id_fkey"
            columns: ["desarrolladora_id"]
            isOneToOne: false
            referencedRelation: "public_desarrolladoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_dev_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
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
      lifepath_user_profiles: {
        Row: {
          answers_version: string
          created_at: string
          family_state: string | null
          income_range: string | null
          matches: Json
          methodology: string
          preferences: Json
          updated_at: string
          user_id: string
          work_mode: string | null
        }
        Insert: {
          answers_version?: string
          created_at?: string
          family_state?: string | null
          income_range?: string | null
          matches?: Json
          methodology?: string
          preferences?: Json
          updated_at?: string
          user_id: string
          work_mode?: string | null
        }
        Update: {
          answers_version?: string
          created_at?: string
          family_state?: string | null
          income_range?: string | null
          matches?: Json
          methodology?: string
          preferences?: Json
          updated_at?: string
          user_id?: string
          work_mode?: string | null
        }
        Relationships: []
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
      market_anomalies: {
        Row: {
          ack: boolean
          ack_at: string | null
          ack_by: string | null
          baseline_samples_count: number
          country_code: string
          detected_at: string
          deviation_sigma: number
          entity_id: string
          entity_type: string
          id: string
          notes: string | null
          period_date: string
          score_id: string
          value_baseline: number
          value_current: number
        }
        Insert: {
          ack?: boolean
          ack_at?: string | null
          ack_by?: string | null
          baseline_samples_count: number
          country_code: string
          detected_at?: string
          deviation_sigma: number
          entity_id: string
          entity_type: string
          id?: string
          notes?: string | null
          period_date: string
          score_id: string
          value_baseline: number
          value_current: number
        }
        Update: {
          ack?: boolean
          ack_at?: string | null
          ack_by?: string | null
          baseline_samples_count?: number
          country_code?: string
          detected_at?: string
          deviation_sigma?: number
          entity_id?: string
          entity_type?: string
          id?: string
          notes?: string | null
          period_date?: string
          score_id?: string
          value_baseline?: number
          value_current?: number
        }
        Relationships: [
          {
            foreignKeyName: "market_anomalies_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
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
          {
            foreignKeyName: "market_prices_secondary_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
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
          {
            foreignKeyName: "market_pulse_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
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
      marketing_assets: {
        Row: {
          asset_type: Database["public"]["Enums"]["marketing_asset_type"]
          created_at: string
          display_order: number
          expires_at: string | null
          format: string | null
          id: string
          locale: string
          meta: Json
          proyecto_id: string
          status: Database["public"]["Enums"]["marketing_asset_status"]
          thumbnail_url: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          asset_type: Database["public"]["Enums"]["marketing_asset_type"]
          created_at?: string
          display_order?: number
          expires_at?: string | null
          format?: string | null
          id?: string
          locale?: string
          meta?: Json
          proyecto_id: string
          status?: Database["public"]["Enums"]["marketing_asset_status"]
          thumbnail_url?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          asset_type?: Database["public"]["Enums"]["marketing_asset_type"]
          created_at?: string
          display_order?: number
          expires_at?: string | null
          format?: string | null
          id?: string
          locale?: string
          meta?: Json
          proyecto_id?: string
          status?: Database["public"]["Enums"]["marketing_asset_status"]
          thumbnail_url?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_assets_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_portales: {
        Row: {
          created_at: string
          credentials_encrypted: string | null
          id: string
          is_active: boolean
          last_sync_at: string | null
          portal: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credentials_encrypted?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          portal: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credentials_encrypted?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          portal?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      marketing_publications: {
        Row: {
          created_at: string
          error_message: string | null
          external_id: string | null
          id: string
          portal: string
          project_id: string
          published_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          portal: string
          project_id: string
          published_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          portal?: string
          project_id?: string
          published_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_publications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_training_snapshots: {
        Row: {
          corpus_name: string
          country_code: string | null
          created_at: string
          created_by: string | null
          format: string
          id: string
          meta: Json
          period_end: string | null
          period_start: string | null
          row_count: number
          schema_hash: string
          split: string | null
          storage_path: string
          version: string
        }
        Insert: {
          corpus_name: string
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          format: string
          id?: string
          meta?: Json
          period_end?: string | null
          period_start?: string | null
          row_count: number
          schema_hash: string
          split?: string | null
          storage_path: string
          version: string
        }
        Update: {
          corpus_name?: string
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          format?: string
          id?: string
          meta?: Json
          period_end?: string | null
          period_start?: string | null
          row_count?: number
          schema_hash?: string
          split?: string | null
          storage_path?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_training_snapshots_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "ml_training_snapshots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_training_snapshots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_ab_tests: {
        Row: {
          computed_at: string | null
          created_at: string
          id: string
          period_date: string
          sample_size: number
          template: string
          variant_a_open_rate: number | null
          variant_a_subject: string
          variant_b_open_rate: number | null
          variant_b_subject: string
          winner_variant: string | null
        }
        Insert: {
          computed_at?: string | null
          created_at?: string
          id?: string
          period_date: string
          sample_size?: number
          template: string
          variant_a_open_rate?: number | null
          variant_a_subject: string
          variant_b_open_rate?: number | null
          variant_b_subject: string
          winner_variant?: string | null
        }
        Update: {
          computed_at?: string | null
          created_at?: string
          id?: string
          period_date?: string
          sample_size?: number
          template?: string
          variant_a_open_rate?: number | null
          variant_a_subject?: string
          variant_b_open_rate?: number | null
          variant_b_subject?: string
          winner_variant?: string | null
        }
        Relationships: []
      }
      newsletter_deliveries: {
        Row: {
          ab_test_id: string | null
          bounced_reason: string | null
          clicked_at: string | null
          created_at: string
          id: string
          opened_at: string | null
          payload_summary: Json
          provider_message_id: string | null
          sent_at: string
          status: string
          subject: string
          subject_variant: string | null
          subscriber_id: string
          template: string
        }
        Insert: {
          ab_test_id?: string | null
          bounced_reason?: string | null
          clicked_at?: string | null
          created_at?: string
          id?: string
          opened_at?: string | null
          payload_summary?: Json
          provider_message_id?: string | null
          sent_at?: string
          status?: string
          subject: string
          subject_variant?: string | null
          subscriber_id: string
          template: string
        }
        Update: {
          ab_test_id?: string | null
          bounced_reason?: string | null
          clicked_at?: string | null
          created_at?: string
          id?: string
          opened_at?: string | null
          payload_summary?: Json
          provider_message_id?: string | null
          sent_at?: string
          status?: string
          subject?: string
          subject_variant?: string | null
          subscriber_id?: string
          template?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_deliveries_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "newsletter_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          confirm_token_hash: string | null
          confirmed_at: string | null
          consent_ip: unknown
          consent_lfpdppp_at: string
          created_at: string
          email: string
          id: string
          locale: string
          preferences: Json
          status: string
          subscribed_at: string
          tags: string[]
          unsubscribe_token_hash: string | null
          unsubscribed_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          confirm_token_hash?: string | null
          confirmed_at?: string | null
          consent_ip?: unknown
          consent_lfpdppp_at?: string
          created_at?: string
          email: string
          id?: string
          locale: string
          preferences?: Json
          status?: string
          subscribed_at?: string
          tags?: string[]
          unsubscribe_token_hash?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          confirm_token_hash?: string | null
          confirmed_at?: string | null
          consent_ip?: unknown
          consent_lfpdppp_at?: string
          created_at?: string
          email?: string
          id?: string
          locale?: string
          preferences?: Json
          status?: string
          subscribed_at?: string
          tags?: string[]
          unsubscribe_token_hash?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      operacion_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          operacion_id: string
          storage_path: string
          tipo: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          operacion_id: string
          storage_path: string
          tipo: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          operacion_id?: string
          storage_path?: string
          tipo?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operacion_attachments_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operacion_commissions: {
        Row: {
          base_amount: number
          comision_amount: number | null
          comision_pct: number
          created_at: string
          currency: string
          declaracion_jurada: boolean
          factura_attachment_id: string | null
          id: string
          iva_amount: number | null
          iva_pct: number
          operacion_id: string
          split_dmx_amount: number | null
          split_dmx_pct: number
          split_inmobiliaria_amount: number | null
          total_with_iva: number | null
        }
        Insert: {
          base_amount: number
          comision_amount?: number | null
          comision_pct: number
          created_at?: string
          currency: string
          declaracion_jurada?: boolean
          factura_attachment_id?: string | null
          id?: string
          iva_amount?: number | null
          iva_pct?: number
          operacion_id: string
          split_dmx_amount?: number | null
          split_dmx_pct?: number
          split_inmobiliaria_amount?: number | null
          total_with_iva?: number | null
        }
        Update: {
          base_amount?: number
          comision_amount?: number | null
          comision_pct?: number
          created_at?: string
          currency?: string
          declaracion_jurada?: boolean
          factura_attachment_id?: string | null
          id?: string
          iva_amount?: number | null
          iva_pct?: number
          operacion_id?: string
          split_dmx_amount?: number | null
          split_dmx_pct?: number
          split_inmobiliaria_amount?: number | null
          total_with_iva?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "operacion_commissions_factura_attachment_fk"
            columns: ["factura_attachment_id"]
            isOneToOne: false
            referencedRelation: "operacion_attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_commissions_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: true
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      operacion_pagos: {
        Row: {
          amount: number
          comprobante_attachment_id: string | null
          created_at: string
          currency: string
          estado_pago: string
          fecha_pago: string
          id: string
          notes: string | null
          operacion_id: string
        }
        Insert: {
          amount: number
          comprobante_attachment_id?: string | null
          created_at?: string
          currency: string
          estado_pago?: string
          fecha_pago: string
          id?: string
          notes?: string | null
          operacion_id: string
        }
        Update: {
          amount?: number
          comprobante_attachment_id?: string | null
          created_at?: string
          currency?: string
          estado_pago?: string
          fecha_pago?: string
          id?: string
          notes?: string | null
          operacion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operacion_pagos_comprobante_attachment_fk"
            columns: ["comprobante_attachment_id"]
            isOneToOne: false
            referencedRelation: "operacion_attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_pagos_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      operacion_parts: {
        Row: {
          asesor_id: string | null
          contacto_id: string | null
          country_code: string | null
          created_at: string
          id: string
          notes: string | null
          operacion_id: string
          role: string
        }
        Insert: {
          asesor_id?: string | null
          contacto_id?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          operacion_id: string
          role: string
        }
        Update: {
          asesor_id?: string | null
          contacto_id?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          operacion_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "operacion_parts_asesor_id_fkey"
            columns: ["asesor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_parts_asesor_id_fkey"
            columns: ["asesor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_parts_contacto_id_fkey"
            columns: ["contacto_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_parts_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "operacion_parts_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      operaciones: {
        Row: {
          amount: number
          amount_currency: string
          asesor_id: string | null
          cancellation_reason: string | null
          cfdi_uuid: string | null
          cierre_amount: number | null
          cierre_currency: string | null
          closed_at: string
          codigo: string | null
          commission_amount: number
          commission_currency: string | null
          completion_pct: number
          country_code: string
          created_at: string
          deal_id: string | null
          fecha_cierre: string | null
          fiscal_status: string
          fx_rate: number | null
          fx_rate_date: string | null
          id: string
          notas: string | null
          operacion_type: string
          promocion_amount: number | null
          promocion_currency: string | null
          propiedad_id: string | null
          propiedad_type: string | null
          reserva_amount: number | null
          reserva_currency: string | null
          side: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          amount_currency: string
          asesor_id?: string | null
          cancellation_reason?: string | null
          cfdi_uuid?: string | null
          cierre_amount?: number | null
          cierre_currency?: string | null
          closed_at?: string
          codigo?: string | null
          commission_amount?: number
          commission_currency?: string | null
          completion_pct?: number
          country_code: string
          created_at?: string
          deal_id?: string | null
          fecha_cierre?: string | null
          fiscal_status?: string
          fx_rate?: number | null
          fx_rate_date?: string | null
          id?: string
          notas?: string | null
          operacion_type: string
          promocion_amount?: number | null
          promocion_currency?: string | null
          propiedad_id?: string | null
          propiedad_type?: string | null
          reserva_amount?: number | null
          reserva_currency?: string | null
          side?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_currency?: string
          asesor_id?: string | null
          cancellation_reason?: string | null
          cfdi_uuid?: string | null
          cierre_amount?: number | null
          cierre_currency?: string | null
          closed_at?: string
          codigo?: string | null
          commission_amount?: number
          commission_currency?: string | null
          completion_pct?: number
          country_code?: string
          created_at?: string
          deal_id?: string | null
          fecha_cierre?: string | null
          fiscal_status?: string
          fx_rate?: number | null
          fx_rate_date?: string | null
          id?: string
          notas?: string | null
          operacion_type?: string
          promocion_amount?: number | null
          promocion_currency?: string | null
          propiedad_id?: string | null
          propiedad_type?: string | null
          reserva_amount?: number | null
          reserva_currency?: string | null
          side?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operaciones_amount_currency_fkey"
            columns: ["amount_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "operaciones_asesor_id_fkey"
            columns: ["asesor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operaciones_asesor_id_fkey"
            columns: ["asesor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operaciones_commission_currency_fkey"
            columns: ["commission_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "operaciones_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "operaciones_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
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
      persona_types: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          label_en: string
          label_es: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          label_en: string
          label_es: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          label_en?: string
          label_es?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      photos: {
        Row: {
          captacion_id: string | null
          category: string | null
          classify_confidence: number | null
          classify_error: string | null
          classify_status: string
          created_at: string
          display_order: number
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          proyecto_id: string | null
          storage_path: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          captacion_id?: string | null
          category?: string | null
          classify_confidence?: number | null
          classify_error?: string | null
          classify_status?: string
          created_at?: string
          display_order?: number
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          proyecto_id?: string | null
          storage_path: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          captacion_id?: string | null
          category?: string | null
          classify_confidence?: number | null
          classify_error?: string | null
          classify_status?: string
          created_at?: string
          display_order?: number
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          proyecto_id?: string | null
          storage_path?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_captacion_id_fkey"
            columns: ["captacion_id"]
            isOneToOne: false
            referencedRelation: "captaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
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
            referencedRelation: "ui_feature_flags"
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
      project_brokers: {
        Row: {
          active: boolean
          assigned_at: string
          broker_user_id: string
          commission_pct: number | null
          created_at: string
          expires_at: string | null
          id: string
          meses_contrato: number | null
          meses_exclusividad: number | null
          meta: Json
          proyecto_id: string
          role: Database["public"]["Enums"]["project_broker_role"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          assigned_at?: string
          broker_user_id: string
          commission_pct?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          meses_contrato?: number | null
          meses_exclusividad?: number | null
          meta?: Json
          proyecto_id: string
          role?: Database["public"]["Enums"]["project_broker_role"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          assigned_at?: string
          broker_user_id?: string
          commission_pct?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          meses_contrato?: number | null
          meses_exclusividad?: number | null
          meta?: Json
          proyecto_id?: string
          role?: Database["public"]["Enums"]["project_broker_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_brokers_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      project_scores: {
        Row: {
          anomaly: Json | null
          citations: Json
          components: Json
          computed_at: string
          confidence: string
          country_code: string
          deltas: Json
          id: string
          inputs_used: Json
          level: number
          ml_explanations: Json
          period_date: string
          project_id: string
          provenance: Json
          ranking: Json
          score_label: string | null
          score_type: string
          score_value: number
          stability_index: number | null
          tenant_id: string | null
          tier: number
          trend_direction: string | null
          trend_vs_previous: number | null
          valid_until: string | null
        }
        Insert: {
          anomaly?: Json | null
          citations?: Json
          components?: Json
          computed_at?: string
          confidence: string
          country_code: string
          deltas?: Json
          id?: string
          inputs_used?: Json
          level: number
          ml_explanations?: Json
          period_date: string
          project_id: string
          provenance?: Json
          ranking?: Json
          score_label?: string | null
          score_type: string
          score_value: number
          stability_index?: number | null
          tenant_id?: string | null
          tier: number
          trend_direction?: string | null
          trend_vs_previous?: number | null
          valid_until?: string | null
        }
        Update: {
          anomaly?: Json | null
          citations?: Json
          components?: Json
          computed_at?: string
          confidence?: string
          country_code?: string
          deltas?: Json
          id?: string
          inputs_used?: Json
          level?: number
          ml_explanations?: Json
          period_date?: string
          project_id?: string
          provenance?: Json
          ranking?: Json
          score_label?: string | null
          score_type?: string
          score_value?: number
          stability_index?: number | null
          tenant_id?: string | null
          tier?: number
          trend_direction?: string | null
          trend_vs_previous?: number | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_scores_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "project_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_scopes"
            referencedColumns: ["id"]
          },
        ]
      }
      property_comparables: {
        Row: {
          comparable_properties: Json
          computed_at: string
          country_code: string
          id: string
          k: number
          period_date: string
          property_id: string
          score_id: string
          valid_until: string | null
        }
        Insert: {
          comparable_properties?: Json
          computed_at?: string
          country_code: string
          id?: string
          k?: number
          period_date: string
          property_id: string
          score_id: string
          valid_until?: string | null
        }
        Update: {
          comparable_properties?: Json
          computed_at?: string
          country_code?: string
          id?: string
          k?: number
          period_date?: string
          property_id?: string
          score_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_comparables_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      proyectos: {
        Row: {
          amenities: Json
          bedrooms_range: number[] | null
          brochure_url: string | null
          ciudad: string | null
          colonia: string | null
          country_code: string
          cover_photo_url: string | null
          created_at: string
          currency: string
          desarrolladora_id: string
          description: string | null
          direccion: string | null
          id: string
          is_active: boolean
          lat: number | null
          lng: number | null
          meta: Json
          nombre: string
          operacion: Database["public"]["Enums"]["proyecto_operacion"]
          price_max_mxn: number | null
          price_min_mxn: number | null
          privacy_level: Database["public"]["Enums"]["proyecto_privacy"]
          slug: string
          status: Database["public"]["Enums"]["proyecto_status"]
          tipo: Database["public"]["Enums"]["proyecto_tipo"]
          units_available: number | null
          units_total: number | null
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          amenities?: Json
          bedrooms_range?: number[] | null
          brochure_url?: string | null
          ciudad?: string | null
          colonia?: string | null
          country_code?: string
          cover_photo_url?: string | null
          created_at?: string
          currency?: string
          desarrolladora_id: string
          description?: string | null
          direccion?: string | null
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          meta?: Json
          nombre: string
          operacion?: Database["public"]["Enums"]["proyecto_operacion"]
          price_max_mxn?: number | null
          price_min_mxn?: number | null
          privacy_level?: Database["public"]["Enums"]["proyecto_privacy"]
          slug: string
          status?: Database["public"]["Enums"]["proyecto_status"]
          tipo?: Database["public"]["Enums"]["proyecto_tipo"]
          units_available?: number | null
          units_total?: number | null
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          amenities?: Json
          bedrooms_range?: number[] | null
          brochure_url?: string | null
          ciudad?: string | null
          colonia?: string | null
          country_code?: string
          cover_photo_url?: string | null
          created_at?: string
          currency?: string
          desarrolladora_id?: string
          description?: string | null
          direccion?: string | null
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          meta?: Json
          nombre?: string
          operacion?: Database["public"]["Enums"]["proyecto_operacion"]
          price_max_mxn?: number | null
          price_min_mxn?: number | null
          privacy_level?: Database["public"]["Enums"]["proyecto_privacy"]
          slug?: string
          status?: Database["public"]["Enums"]["proyecto_status"]
          tipo?: Database["public"]["Enums"]["proyecto_tipo"]
          units_available?: number | null
          units_total?: number | null
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_desarrolladora_id_fkey"
            columns: ["desarrolladora_id"]
            isOneToOne: false
            referencedRelation: "desarrolladoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_desarrolladora_id_fkey"
            columns: ["desarrolladora_id"]
            isOneToOne: false
            referencedRelation: "public_desarrolladoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_forecasts: {
        Row: {
          country_code: string
          forecast_date: string
          generated_at: string
          id: string
          methodology: string
          value: number
          value_lower: number | null
          value_upper: number | null
          zone_id: string
        }
        Insert: {
          country_code?: string
          forecast_date: string
          generated_at?: string
          id?: string
          methodology?: string
          value: number
          value_lower?: number | null
          value_upper?: number | null
          zone_id: string
        }
        Update: {
          country_code?: string
          forecast_date?: string
          generated_at?: string
          id?: string
          methodology?: string
          value?: number
          value_lower?: number | null
          value_upper?: number | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_forecasts_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_codes: {
        Row: {
          color_hex: string | null
          copy: string | null
          created_at: string
          destino_id: string
          destino_type: string
          id: string
          png_storage_path: string | null
          scan_count: number
          short_url: string
          svg_storage_path: string | null
          updated_at: string
          user_id: string
          utm_campaign: string | null
          utm_medium: string
          utm_source: string
        }
        Insert: {
          color_hex?: string | null
          copy?: string | null
          created_at?: string
          destino_id: string
          destino_type: string
          id?: string
          png_storage_path?: string | null
          scan_count?: number
          short_url: string
          svg_storage_path?: string | null
          updated_at?: string
          user_id: string
          utm_campaign?: string | null
          utm_medium?: string
          utm_source?: string
        }
        Update: {
          color_hex?: string | null
          copy?: string | null
          created_at?: string
          destino_id?: string
          destino_type?: string
          id?: string
          png_storage_path?: string | null
          scan_count?: number
          short_url?: string
          svg_storage_path?: string | null
          updated_at?: string
          user_id?: string
          utm_campaign?: string | null
          utm_medium?: string
          utm_source?: string
        }
        Relationships: []
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
      referral_rewards: {
        Row: {
          amount: number
          amount_currency: string
          created_at: string
          id: string
          operacion_id: string | null
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          referral_id: string
          reward_type: string
        }
        Insert: {
          amount: number
          amount_currency: string
          created_at?: string
          id?: string
          operacion_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          referral_id: string
          reward_type: string
        }
        Update: {
          amount?: number
          amount_currency?: string
          created_at?: string
          id?: string
          operacion_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          referral_id?: string
          reward_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_amount_currency_fkey"
            columns: ["amount_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "referral_rewards_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "operaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          attributed_at: string | null
          attribution_chain: Json
          country_code: string
          created_at: string
          expires_at: string | null
          id: string
          persona_type_id: string | null
          reward_amount: number | null
          reward_currency: string | null
          source_id: string
          source_type: string
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          attributed_at?: string | null
          attribution_chain?: Json
          country_code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          persona_type_id?: string | null
          reward_amount?: number | null
          reward_currency?: string | null
          source_id: string
          source_type: string
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          attributed_at?: string | null
          attribution_chain?: Json
          country_code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          persona_type_id?: string | null
          reward_amount?: number | null
          reward_currency?: string | null
          source_id?: string
          source_type?: string
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "referrals_persona_type_id_fkey"
            columns: ["persona_type_id"]
            isOneToOne: false
            referencedRelation: "persona_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_reward_currency_fkey"
            columns: ["reward_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      retention_policies: {
        Row: {
          active: boolean
          country_code: string
          created_at: string
          entity_type: string
          id: string
          jurisdiction_ref: string
          notes: string | null
          retention_years: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          country_code: string
          created_at?: string
          entity_type: string
          id?: string
          jurisdiction_ref: string
          notes?: string | null
          retention_years: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          country_code?: string
          created_at?: string
          entity_type?: string
          id?: string
          jurisdiction_ref?: string
          notes?: string | null
          retention_years?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "retention_policies_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
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
            referencedRelation: "ui_feature_flags"
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
      score_change_deliveries: {
        Row: {
          attempt: number
          country_code: string
          delta_pct: number
          enqueued_at: string
          entity_id: string
          entity_type: string
          id: string
          last_attempt_at: string | null
          new_value: number
          next_attempt_at: string | null
          payload: Json
          period_date: string
          prev_value: number | null
          score_id: string
          status: string
          webhook_id: string
        }
        Insert: {
          attempt?: number
          country_code: string
          delta_pct: number
          enqueued_at?: string
          entity_id: string
          entity_type: string
          id?: string
          last_attempt_at?: string | null
          new_value: number
          next_attempt_at?: string | null
          payload: Json
          period_date: string
          prev_value?: number | null
          score_id: string
          status?: string
          webhook_id: string
        }
        Update: {
          attempt?: number
          country_code?: string
          delta_pct?: number
          enqueued_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          last_attempt_at?: string | null
          new_value?: number
          next_attempt_at?: string | null
          payload?: Json
          period_date?: string
          prev_value?: number | null
          score_id?: string
          status?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_change_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "score_change_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      score_change_webhooks: {
        Row: {
          country_codes: string[]
          created_at: string
          created_by: string | null
          enabled: boolean
          entity_types: string[]
          hmac_secret: string
          id: string
          last_delivery_at: string | null
          last_delivery_status: string | null
          min_delta_pct: number
          score_ids: string[]
          subscription_name: string
          updated_at: string
          url: string
        }
        Insert: {
          country_codes?: string[]
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          entity_types?: string[]
          hmac_secret: string
          id?: string
          last_delivery_at?: string | null
          last_delivery_status?: string | null
          min_delta_pct?: number
          score_ids?: string[]
          subscription_name: string
          updated_at?: string
          url: string
        }
        Update: {
          country_codes?: string[]
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          entity_types?: string[]
          hmac_secret?: string
          id?: string
          last_delivery_at?: string | null
          last_delivery_status?: string | null
          min_delta_pct?: number
          score_ids?: string[]
          subscription_name?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      score_comparison_matrix: {
        Row: {
          cluster_key: string
          col_count: number
          computed_at: string
          country_code: string
          id: string
          matrix: Json
          row_count: number
          score_ids: string[]
          valid_until: string
          zone_ids: string[]
        }
        Insert: {
          cluster_key: string
          col_count: number
          computed_at?: string
          country_code: string
          id?: string
          matrix: Json
          row_count: number
          score_ids: string[]
          valid_until: string
          zone_ids: string[]
        }
        Update: {
          cluster_key?: string
          col_count?: number
          computed_at?: string
          country_code?: string
          id?: string
          matrix?: Json
          row_count?: number
          score_ids?: string[]
          valid_until?: string
          zone_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "score_comparison_matrix_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      score_history: {
        Row: {
          archived_at: string
          citations: Json
          components: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id: number
          inputs_used: Json
          level: number
          period_date: string
          provenance: Json
          score_label: string | null
          score_type: string
          score_value: number
          tenant_id: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Insert: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id?: never
          inputs_used?: Json
          level: number
          period_date: string
          provenance?: Json
          score_label?: string | null
          score_type: string
          score_value: number
          tenant_id?: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Update: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence?: string
          country_code?: string
          entity_id?: string
          entity_type?: string
          id?: never
          inputs_used?: Json
          level?: number
          period_date?: string
          provenance?: Json
          score_label?: string | null
          score_type?: string
          score_value?: number
          tenant_id?: string | null
          tier?: number
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_history_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "score_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_scopes"
            referencedColumns: ["id"]
          },
        ]
      }
      score_history_default: {
        Row: {
          archived_at: string
          citations: Json
          components: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id: number
          inputs_used: Json
          level: number
          period_date: string
          provenance: Json
          score_label: string | null
          score_type: string
          score_value: number
          tenant_id: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Insert: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id?: never
          inputs_used?: Json
          level: number
          period_date: string
          provenance?: Json
          score_label?: string | null
          score_type: string
          score_value: number
          tenant_id?: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Update: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence?: string
          country_code?: string
          entity_id?: string
          entity_type?: string
          id?: never
          inputs_used?: Json
          level?: number
          period_date?: string
          provenance?: Json
          score_label?: string | null
          score_type?: string
          score_value?: number
          tenant_id?: string | null
          tier?: number
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      score_history_p20251201: {
        Row: {
          archived_at: string
          citations: Json
          components: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id: number
          inputs_used: Json
          level: number
          period_date: string
          provenance: Json
          score_label: string | null
          score_type: string
          score_value: number
          tenant_id: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Insert: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id?: never
          inputs_used?: Json
          level: number
          period_date: string
          provenance?: Json
          score_label?: string | null
          score_type: string
          score_value: number
          tenant_id?: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Update: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence?: string
          country_code?: string
          entity_id?: string
          entity_type?: string
          id?: never
          inputs_used?: Json
          level?: number
          period_date?: string
          provenance?: Json
          score_label?: string | null
          score_type?: string
          score_value?: number
          tenant_id?: string | null
          tier?: number
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      score_history_p20260101: {
        Row: {
          archived_at: string
          citations: Json
          components: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id: number
          inputs_used: Json
          level: number
          period_date: string
          provenance: Json
          score_label: string | null
          score_type: string
          score_value: number
          tenant_id: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Insert: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id?: never
          inputs_used?: Json
          level: number
          period_date: string
          provenance?: Json
          score_label?: string | null
          score_type: string
          score_value: number
          tenant_id?: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Update: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence?: string
          country_code?: string
          entity_id?: string
          entity_type?: string
          id?: never
          inputs_used?: Json
          level?: number
          period_date?: string
          provenance?: Json
          score_label?: string | null
          score_type?: string
          score_value?: number
          tenant_id?: string | null
          tier?: number
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      score_history_p20260201: {
        Row: {
          archived_at: string
          citations: Json
          components: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id: number
          inputs_used: Json
          level: number
          period_date: string
          provenance: Json
          score_label: string | null
          score_type: string
          score_value: number
          tenant_id: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Insert: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id?: never
          inputs_used?: Json
          level: number
          period_date: string
          provenance?: Json
          score_label?: string | null
          score_type: string
          score_value: number
          tenant_id?: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Update: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence?: string
          country_code?: string
          entity_id?: string
          entity_type?: string
          id?: never
          inputs_used?: Json
          level?: number
          period_date?: string
          provenance?: Json
          score_label?: string | null
          score_type?: string
          score_value?: number
          tenant_id?: string | null
          tier?: number
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      score_history_p20260301: {
        Row: {
          archived_at: string
          citations: Json
          components: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id: number
          inputs_used: Json
          level: number
          period_date: string
          provenance: Json
          score_label: string | null
          score_type: string
          score_value: number
          tenant_id: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Insert: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id?: never
          inputs_used?: Json
          level: number
          period_date: string
          provenance?: Json
          score_label?: string | null
          score_type: string
          score_value: number
          tenant_id?: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Update: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence?: string
          country_code?: string
          entity_id?: string
          entity_type?: string
          id?: never
          inputs_used?: Json
          level?: number
          period_date?: string
          provenance?: Json
          score_label?: string | null
          score_type?: string
          score_value?: number
          tenant_id?: string | null
          tier?: number
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      score_history_p20260401: {
        Row: {
          archived_at: string
          citations: Json
          components: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id: number
          inputs_used: Json
          level: number
          period_date: string
          provenance: Json
          score_label: string | null
          score_type: string
          score_value: number
          tenant_id: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Insert: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id?: never
          inputs_used?: Json
          level: number
          period_date: string
          provenance?: Json
          score_label?: string | null
          score_type: string
          score_value: number
          tenant_id?: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Update: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence?: string
          country_code?: string
          entity_id?: string
          entity_type?: string
          id?: never
          inputs_used?: Json
          level?: number
          period_date?: string
          provenance?: Json
          score_label?: string | null
          score_type?: string
          score_value?: number
          tenant_id?: string | null
          tier?: number
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      score_history_p20260501: {
        Row: {
          archived_at: string
          citations: Json
          components: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id: number
          inputs_used: Json
          level: number
          period_date: string
          provenance: Json
          score_label: string | null
          score_type: string
          score_value: number
          tenant_id: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Insert: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id?: never
          inputs_used?: Json
          level: number
          period_date: string
          provenance?: Json
          score_label?: string | null
          score_type: string
          score_value: number
          tenant_id?: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Update: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence?: string
          country_code?: string
          entity_id?: string
          entity_type?: string
          id?: never
          inputs_used?: Json
          level?: number
          period_date?: string
          provenance?: Json
          score_label?: string | null
          score_type?: string
          score_value?: number
          tenant_id?: string | null
          tier?: number
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      score_history_p20260601: {
        Row: {
          archived_at: string
          citations: Json
          components: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id: number
          inputs_used: Json
          level: number
          period_date: string
          provenance: Json
          score_label: string | null
          score_type: string
          score_value: number
          tenant_id: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Insert: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id?: never
          inputs_used?: Json
          level: number
          period_date: string
          provenance?: Json
          score_label?: string | null
          score_type: string
          score_value: number
          tenant_id?: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Update: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence?: string
          country_code?: string
          entity_id?: string
          entity_type?: string
          id?: never
          inputs_used?: Json
          level?: number
          period_date?: string
          provenance?: Json
          score_label?: string | null
          score_type?: string
          score_value?: number
          tenant_id?: string | null
          tier?: number
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      score_history_p20260701: {
        Row: {
          archived_at: string
          citations: Json
          components: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id: number
          inputs_used: Json
          level: number
          period_date: string
          provenance: Json
          score_label: string | null
          score_type: string
          score_value: number
          tenant_id: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Insert: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id?: never
          inputs_used?: Json
          level: number
          period_date: string
          provenance?: Json
          score_label?: string | null
          score_type: string
          score_value: number
          tenant_id?: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Update: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence?: string
          country_code?: string
          entity_id?: string
          entity_type?: string
          id?: never
          inputs_used?: Json
          level?: number
          period_date?: string
          provenance?: Json
          score_label?: string | null
          score_type?: string
          score_value?: number
          tenant_id?: string | null
          tier?: number
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      score_history_p20260801: {
        Row: {
          archived_at: string
          citations: Json
          components: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id: number
          inputs_used: Json
          level: number
          period_date: string
          provenance: Json
          score_label: string | null
          score_type: string
          score_value: number
          tenant_id: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Insert: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id?: never
          inputs_used?: Json
          level: number
          period_date: string
          provenance?: Json
          score_label?: string | null
          score_type: string
          score_value: number
          tenant_id?: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Update: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence?: string
          country_code?: string
          entity_id?: string
          entity_type?: string
          id?: never
          inputs_used?: Json
          level?: number
          period_date?: string
          provenance?: Json
          score_label?: string | null
          score_type?: string
          score_value?: number
          tenant_id?: string | null
          tier?: number
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      score_history_p20260901: {
        Row: {
          archived_at: string
          citations: Json
          components: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id: number
          inputs_used: Json
          level: number
          period_date: string
          provenance: Json
          score_label: string | null
          score_type: string
          score_value: number
          tenant_id: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Insert: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id?: never
          inputs_used?: Json
          level: number
          period_date: string
          provenance?: Json
          score_label?: string | null
          score_type: string
          score_value: number
          tenant_id?: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Update: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence?: string
          country_code?: string
          entity_id?: string
          entity_type?: string
          id?: never
          inputs_used?: Json
          level?: number
          period_date?: string
          provenance?: Json
          score_label?: string | null
          score_type?: string
          score_value?: number
          tenant_id?: string | null
          tier?: number
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      score_history_p20261001: {
        Row: {
          archived_at: string
          citations: Json
          components: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id: number
          inputs_used: Json
          level: number
          period_date: string
          provenance: Json
          score_label: string | null
          score_type: string
          score_value: number
          tenant_id: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Insert: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id?: never
          inputs_used?: Json
          level: number
          period_date: string
          provenance?: Json
          score_label?: string | null
          score_type: string
          score_value: number
          tenant_id?: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Update: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence?: string
          country_code?: string
          entity_id?: string
          entity_type?: string
          id?: never
          inputs_used?: Json
          level?: number
          period_date?: string
          provenance?: Json
          score_label?: string | null
          score_type?: string
          score_value?: number
          tenant_id?: string | null
          tier?: number
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      score_history_p20261101: {
        Row: {
          archived_at: string
          citations: Json
          components: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id: number
          inputs_used: Json
          level: number
          period_date: string
          provenance: Json
          score_label: string | null
          score_type: string
          score_value: number
          tenant_id: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Insert: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id?: never
          inputs_used?: Json
          level: number
          period_date: string
          provenance?: Json
          score_label?: string | null
          score_type: string
          score_value: number
          tenant_id?: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Update: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence?: string
          country_code?: string
          entity_id?: string
          entity_type?: string
          id?: never
          inputs_used?: Json
          level?: number
          period_date?: string
          provenance?: Json
          score_label?: string | null
          score_type?: string
          score_value?: number
          tenant_id?: string | null
          tier?: number
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      score_history_p20261201: {
        Row: {
          archived_at: string
          citations: Json
          components: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id: number
          inputs_used: Json
          level: number
          period_date: string
          provenance: Json
          score_label: string | null
          score_type: string
          score_value: number
          tenant_id: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Insert: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id?: never
          inputs_used?: Json
          level: number
          period_date: string
          provenance?: Json
          score_label?: string | null
          score_type: string
          score_value: number
          tenant_id?: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Update: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence?: string
          country_code?: string
          entity_id?: string
          entity_type?: string
          id?: never
          inputs_used?: Json
          level?: number
          period_date?: string
          provenance?: Json
          score_label?: string | null
          score_type?: string
          score_value?: number
          tenant_id?: string | null
          tier?: number
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      score_history_p20270101: {
        Row: {
          archived_at: string
          citations: Json
          components: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id: number
          inputs_used: Json
          level: number
          period_date: string
          provenance: Json
          score_label: string | null
          score_type: string
          score_value: number
          tenant_id: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Insert: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id?: never
          inputs_used?: Json
          level: number
          period_date: string
          provenance?: Json
          score_label?: string | null
          score_type: string
          score_value: number
          tenant_id?: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Update: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence?: string
          country_code?: string
          entity_id?: string
          entity_type?: string
          id?: never
          inputs_used?: Json
          level?: number
          period_date?: string
          provenance?: Json
          score_label?: string | null
          score_type?: string
          score_value?: number
          tenant_id?: string | null
          tier?: number
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      score_history_p20270201: {
        Row: {
          archived_at: string
          citations: Json
          components: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id: number
          inputs_used: Json
          level: number
          period_date: string
          provenance: Json
          score_label: string | null
          score_type: string
          score_value: number
          tenant_id: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Insert: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id?: never
          inputs_used?: Json
          level: number
          period_date: string
          provenance?: Json
          score_label?: string | null
          score_type: string
          score_value: number
          tenant_id?: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Update: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence?: string
          country_code?: string
          entity_id?: string
          entity_type?: string
          id?: never
          inputs_used?: Json
          level?: number
          period_date?: string
          provenance?: Json
          score_label?: string | null
          score_type?: string
          score_value?: number
          tenant_id?: string | null
          tier?: number
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      score_history_p20270301: {
        Row: {
          archived_at: string
          citations: Json
          components: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id: number
          inputs_used: Json
          level: number
          period_date: string
          provenance: Json
          score_label: string | null
          score_type: string
          score_value: number
          tenant_id: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Insert: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id?: never
          inputs_used?: Json
          level: number
          period_date: string
          provenance?: Json
          score_label?: string | null
          score_type: string
          score_value: number
          tenant_id?: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Update: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence?: string
          country_code?: string
          entity_id?: string
          entity_type?: string
          id?: never
          inputs_used?: Json
          level?: number
          period_date?: string
          provenance?: Json
          score_label?: string | null
          score_type?: string
          score_value?: number
          tenant_id?: string | null
          tier?: number
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      score_history_p20270401: {
        Row: {
          archived_at: string
          citations: Json
          components: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id: number
          inputs_used: Json
          level: number
          period_date: string
          provenance: Json
          score_label: string | null
          score_type: string
          score_value: number
          tenant_id: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Insert: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id?: never
          inputs_used?: Json
          level: number
          period_date: string
          provenance?: Json
          score_label?: string | null
          score_type: string
          score_value: number
          tenant_id?: string | null
          tier: number
          valid_from: string
          valid_until: string
        }
        Update: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence?: string
          country_code?: string
          entity_id?: string
          entity_type?: string
          id?: never
          inputs_used?: Json
          level?: number
          period_date?: string
          provenance?: Json
          score_label?: string | null
          score_type?: string
          score_value?: number
          tenant_id?: string | null
          tier?: number
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      score_recalculation_queue: {
        Row: {
          attempts: number
          batch_mode: boolean
          country_code: string
          created_at: string
          entity_id: string
          entity_type: string
          error: string | null
          finished_at: string | null
          id: string
          priority: number
          scheduled_for: string
          score_id: string
          started_at: string | null
          status: string
          triggered_by: string
        }
        Insert: {
          attempts?: number
          batch_mode?: boolean
          country_code: string
          created_at?: string
          entity_id: string
          entity_type: string
          error?: string | null
          finished_at?: string | null
          id?: string
          priority?: number
          scheduled_for?: string
          score_id: string
          started_at?: string | null
          status?: string
          triggered_by: string
        }
        Update: {
          attempts?: number
          batch_mode?: boolean
          country_code?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          priority?: number
          scheduled_for?: string
          score_id?: string
          started_at?: string | null
          status?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_recalculation_queue_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      score_weights: {
        Row: {
          country_code: string
          created_at: string
          created_by: string | null
          dimension_score_id: string
          id: string
          score_id: string
          valid_from: string
          valid_until: string | null
          weight: number
        }
        Insert: {
          country_code: string
          created_at?: string
          created_by?: string | null
          dimension_score_id: string
          id?: string
          score_id: string
          valid_from?: string
          valid_until?: string | null
          weight: number
        }
        Update: {
          country_code?: string
          created_at?: string
          created_by?: string | null
          dimension_score_id?: string
          id?: string
          score_id?: string
          valid_from?: string
          valid_until?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "score_weights_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      scorecard_national_reports: {
        Row: {
          country_code: string
          created_at: string
          data_snapshot: Json
          hero_insights: Json
          id: string
          narrative_md: string | null
          pdf_url: string | null
          period_date: string
          period_type: string
          press_kit_url: string | null
          published_at: string | null
          report_id: string
        }
        Insert: {
          country_code?: string
          created_at?: string
          data_snapshot?: Json
          hero_insights?: Json
          id?: string
          narrative_md?: string | null
          pdf_url?: string | null
          period_date: string
          period_type: string
          press_kit_url?: string | null
          published_at?: string | null
          report_id: string
        }
        Update: {
          country_code?: string
          created_at?: string
          data_snapshot?: Json
          hero_insights?: Json
          id?: string
          narrative_md?: string | null
          pdf_url?: string | null
          period_date?: string
          period_type?: string
          press_kit_url?: string | null
          published_at?: string | null
          report_id?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "search_trends_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
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
      sticker_templates: {
        Row: {
          created_at: string
          customizable_fields: Json
          downloads_count: number
          id: string
          svg_template: string
          template_id: string
          template_type: string
        }
        Insert: {
          created_at?: string
          customizable_fields?: Json
          downloads_count?: number
          id?: string
          svg_template: string
          template_id: string
          template_type: string
        }
        Update: {
          created_at?: string
          customizable_fields?: Json
          downloads_count?: number
          id?: string
          svg_template?: string
          template_id?: string
          template_type?: string
        }
        Relationships: []
      }
      str_cost_assumptions: {
        Row: {
          cleaning_pct: number
          country_code: string
          currency: string
          last_reviewed_at: string
          meta: Json
          notes: string | null
          platform_fee_pct: number
          property_mgmt_pct: number
          property_tax_annual_pct: number
          utilities_monthly_minor: number
          vacancy_buffer_pct: number
          zone_tier: string
        }
        Insert: {
          cleaning_pct: number
          country_code: string
          currency: string
          last_reviewed_at?: string
          meta?: Json
          notes?: string | null
          platform_fee_pct: number
          property_mgmt_pct: number
          property_tax_annual_pct: number
          utilities_monthly_minor: number
          vacancy_buffer_pct: number
          zone_tier: string
        }
        Update: {
          cleaning_pct?: number
          country_code?: string
          currency?: string
          last_reviewed_at?: string
          meta?: Json
          notes?: string | null
          platform_fee_pct?: number
          property_mgmt_pct?: number
          property_tax_annual_pct?: number
          utilities_monthly_minor?: number
          vacancy_buffer_pct?: number
          zone_tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "str_cost_assumptions_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "str_cost_assumptions_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      str_events_calendar: {
        Row: {
          country_code: string
          created_at: string
          date_from: string
          date_to: string
          event_name: string
          id: string
          impact_multiplier: number
          market_id: string | null
          meta: Json
          notes: string | null
          source: string
          zone_id: string | null
        }
        Insert: {
          country_code: string
          created_at?: string
          date_from: string
          date_to: string
          event_name: string
          id?: string
          impact_multiplier: number
          market_id?: string | null
          meta?: Json
          notes?: string | null
          source?: string
          zone_id?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string
          date_from?: string
          date_to?: string
          event_name?: string
          id?: string
          impact_multiplier?: number
          market_id?: string | null
          meta?: Json
          notes?: string | null
          source?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "str_events_calendar_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "str_events_calendar_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "str_markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "str_events_calendar_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "v_str_market_monthly"
            referencedColumns: ["market_id"]
          },
          {
            foreignKeyName: "str_events_calendar_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      str_host_migrations: {
        Row: {
          confidence: number
          first_detected_at: string
          from_host_id: string | null
          from_listing_id: string
          from_platform: string
          id: string
          last_verified_at: string
          market_id: string | null
          match_features: Json
          meta: Json
          signature_hash: string
          to_host_id: string | null
          to_listing_id: string
          to_platform: string
          zone_id: string | null
        }
        Insert: {
          confidence: number
          first_detected_at?: string
          from_host_id?: string | null
          from_listing_id: string
          from_platform: string
          id?: string
          last_verified_at?: string
          market_id?: string | null
          match_features?: Json
          meta?: Json
          signature_hash: string
          to_host_id?: string | null
          to_listing_id: string
          to_platform: string
          zone_id?: string | null
        }
        Update: {
          confidence?: number
          first_detected_at?: string
          from_host_id?: string | null
          from_listing_id?: string
          from_platform?: string
          id?: string
          last_verified_at?: string
          market_id?: string | null
          match_features?: Json
          meta?: Json
          signature_hash?: string
          to_host_id?: string | null
          to_listing_id?: string
          to_platform?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "str_host_migrations_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "str_markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "str_host_migrations_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "v_str_market_monthly"
            referencedColumns: ["market_id"]
          },
          {
            foreignKeyName: "str_host_migrations_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      str_hosts: {
        Row: {
          avg_occupancy_rate: number | null
          avg_rating: number | null
          avg_reviews_count: number | null
          churn_risk: number | null
          country_code: string
          display_name: string | null
          first_seen_at: string
          host_id: string
          last_updated_at: string
          listings_count: number
          meta: Json
          retention_12m_rate: number | null
          super_host_score: number | null
          superhost_flag: boolean
          tier: string | null
        }
        Insert: {
          avg_occupancy_rate?: number | null
          avg_rating?: number | null
          avg_reviews_count?: number | null
          churn_risk?: number | null
          country_code: string
          display_name?: string | null
          first_seen_at?: string
          host_id: string
          last_updated_at?: string
          listings_count?: number
          meta?: Json
          retention_12m_rate?: number | null
          super_host_score?: number | null
          superhost_flag?: boolean
          tier?: string | null
        }
        Update: {
          avg_occupancy_rate?: number | null
          avg_rating?: number | null
          avg_reviews_count?: number | null
          churn_risk?: number | null
          country_code?: string
          display_name?: string | null
          first_seen_at?: string
          host_id?: string
          last_updated_at?: string
          listings_count?: number
          meta?: Json
          retention_12m_rate?: number | null
          super_host_score?: number | null
          superhost_flag?: boolean
          tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "str_hosts_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      str_invisible_hotels: {
        Row: {
          bounding_radius_m: number
          center_geom: unknown
          cluster_id: string
          confidence: number
          country_code: string
          detection_method: string
          first_detected_at: string
          host_id: string
          last_verified_at: string
          listings_count: number
          manual_review_notes: string | null
          manual_review_status: string
          manual_reviewed_at: string | null
          manual_reviewed_by: string | null
          market_id: string | null
          meta: Json
          zone_id: string | null
        }
        Insert: {
          bounding_radius_m: number
          center_geom: unknown
          cluster_id?: string
          confidence: number
          country_code: string
          detection_method: string
          first_detected_at?: string
          host_id: string
          last_verified_at?: string
          listings_count: number
          manual_review_notes?: string | null
          manual_review_status?: string
          manual_reviewed_at?: string | null
          manual_reviewed_by?: string | null
          market_id?: string | null
          meta?: Json
          zone_id?: string | null
        }
        Update: {
          bounding_radius_m?: number
          center_geom?: unknown
          cluster_id?: string
          confidence?: number
          country_code?: string
          detection_method?: string
          first_detected_at?: string
          host_id?: string
          last_verified_at?: string
          listings_count?: number
          manual_review_notes?: string | null
          manual_review_status?: string
          manual_reviewed_at?: string | null
          manual_reviewed_by?: string | null
          market_id?: string | null
          meta?: Json
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "str_invisible_hotels_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "str_invisible_hotels_manual_reviewed_by_fkey"
            columns: ["manual_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "str_invisible_hotels_manual_reviewed_by_fkey"
            columns: ["manual_reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "str_invisible_hotels_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "str_markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "str_invisible_hotels_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "v_str_market_monthly"
            referencedColumns: ["market_id"]
          },
          {
            foreignKeyName: "str_invisible_hotels_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "str_listings_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "v_str_market_monthly"
            referencedColumns: ["market_id"]
          },
          {
            foreignKeyName: "str_listings_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      str_market_monthly_aggregates: {
        Row: {
          active_listings: number | null
          adjusted_occupancy_rate: number | null
          adjusted_revpar_minor: number | null
          adr_minor: number | null
          avg_length_of_stay: number | null
          booking_lead_time_days: number | null
          country_code: string
          currency: string
          fetched_at: string
          id: number
          market_id: string
          meta: Json
          occupancy_rate: number | null
          period: string
          revenue_minor: number | null
          revpar_minor: number | null
          run_id: string | null
        }
        Insert: {
          active_listings?: number | null
          adjusted_occupancy_rate?: number | null
          adjusted_revpar_minor?: number | null
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          booking_lead_time_days?: number | null
          country_code: string
          currency: string
          fetched_at?: string
          id?: never
          market_id: string
          meta?: Json
          occupancy_rate?: number | null
          period: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Update: {
          active_listings?: number | null
          adjusted_occupancy_rate?: number | null
          adjusted_revpar_minor?: number | null
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          booking_lead_time_days?: number | null
          country_code?: string
          currency?: string
          fetched_at?: string
          id?: never
          market_id?: string
          meta?: Json
          occupancy_rate?: number | null
          period?: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "str_market_monthly_aggregates_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "str_market_monthly_aggregates_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "str_market_monthly_aggregates_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "str_markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "str_market_monthly_aggregates_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "v_str_market_monthly"
            referencedColumns: ["market_id"]
          },
        ]
      }
      str_market_monthly_aggregates_default: {
        Row: {
          active_listings: number | null
          adjusted_occupancy_rate: number | null
          adjusted_revpar_minor: number | null
          adr_minor: number | null
          avg_length_of_stay: number | null
          booking_lead_time_days: number | null
          country_code: string
          currency: string
          fetched_at: string
          id: number
          market_id: string
          meta: Json
          occupancy_rate: number | null
          period: string
          revenue_minor: number | null
          revpar_minor: number | null
          run_id: string | null
        }
        Insert: {
          active_listings?: number | null
          adjusted_occupancy_rate?: number | null
          adjusted_revpar_minor?: number | null
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          booking_lead_time_days?: number | null
          country_code: string
          currency: string
          fetched_at?: string
          id?: never
          market_id: string
          meta?: Json
          occupancy_rate?: number | null
          period: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Update: {
          active_listings?: number | null
          adjusted_occupancy_rate?: number | null
          adjusted_revpar_minor?: number | null
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          booking_lead_time_days?: number | null
          country_code?: string
          currency?: string
          fetched_at?: string
          id?: never
          market_id?: string
          meta?: Json
          occupancy_rate?: number | null
          period?: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Relationships: []
      }
      str_market_monthly_aggregates_p20220101: {
        Row: {
          active_listings: number | null
          adjusted_occupancy_rate: number | null
          adjusted_revpar_minor: number | null
          adr_minor: number | null
          avg_length_of_stay: number | null
          booking_lead_time_days: number | null
          country_code: string
          currency: string
          fetched_at: string
          id: number
          market_id: string
          meta: Json
          occupancy_rate: number | null
          period: string
          revenue_minor: number | null
          revpar_minor: number | null
          run_id: string | null
        }
        Insert: {
          active_listings?: number | null
          adjusted_occupancy_rate?: number | null
          adjusted_revpar_minor?: number | null
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          booking_lead_time_days?: number | null
          country_code: string
          currency: string
          fetched_at?: string
          id?: never
          market_id: string
          meta?: Json
          occupancy_rate?: number | null
          period: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Update: {
          active_listings?: number | null
          adjusted_occupancy_rate?: number | null
          adjusted_revpar_minor?: number | null
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          booking_lead_time_days?: number | null
          country_code?: string
          currency?: string
          fetched_at?: string
          id?: never
          market_id?: string
          meta?: Json
          occupancy_rate?: number | null
          period?: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Relationships: []
      }
      str_market_monthly_aggregates_p20230101: {
        Row: {
          active_listings: number | null
          adjusted_occupancy_rate: number | null
          adjusted_revpar_minor: number | null
          adr_minor: number | null
          avg_length_of_stay: number | null
          booking_lead_time_days: number | null
          country_code: string
          currency: string
          fetched_at: string
          id: number
          market_id: string
          meta: Json
          occupancy_rate: number | null
          period: string
          revenue_minor: number | null
          revpar_minor: number | null
          run_id: string | null
        }
        Insert: {
          active_listings?: number | null
          adjusted_occupancy_rate?: number | null
          adjusted_revpar_minor?: number | null
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          booking_lead_time_days?: number | null
          country_code: string
          currency: string
          fetched_at?: string
          id?: never
          market_id: string
          meta?: Json
          occupancy_rate?: number | null
          period: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Update: {
          active_listings?: number | null
          adjusted_occupancy_rate?: number | null
          adjusted_revpar_minor?: number | null
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          booking_lead_time_days?: number | null
          country_code?: string
          currency?: string
          fetched_at?: string
          id?: never
          market_id?: string
          meta?: Json
          occupancy_rate?: number | null
          period?: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Relationships: []
      }
      str_market_monthly_aggregates_p20240101: {
        Row: {
          active_listings: number | null
          adjusted_occupancy_rate: number | null
          adjusted_revpar_minor: number | null
          adr_minor: number | null
          avg_length_of_stay: number | null
          booking_lead_time_days: number | null
          country_code: string
          currency: string
          fetched_at: string
          id: number
          market_id: string
          meta: Json
          occupancy_rate: number | null
          period: string
          revenue_minor: number | null
          revpar_minor: number | null
          run_id: string | null
        }
        Insert: {
          active_listings?: number | null
          adjusted_occupancy_rate?: number | null
          adjusted_revpar_minor?: number | null
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          booking_lead_time_days?: number | null
          country_code: string
          currency: string
          fetched_at?: string
          id?: never
          market_id: string
          meta?: Json
          occupancy_rate?: number | null
          period: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Update: {
          active_listings?: number | null
          adjusted_occupancy_rate?: number | null
          adjusted_revpar_minor?: number | null
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          booking_lead_time_days?: number | null
          country_code?: string
          currency?: string
          fetched_at?: string
          id?: never
          market_id?: string
          meta?: Json
          occupancy_rate?: number | null
          period?: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Relationships: []
      }
      str_market_monthly_aggregates_p20250101: {
        Row: {
          active_listings: number | null
          adjusted_occupancy_rate: number | null
          adjusted_revpar_minor: number | null
          adr_minor: number | null
          avg_length_of_stay: number | null
          booking_lead_time_days: number | null
          country_code: string
          currency: string
          fetched_at: string
          id: number
          market_id: string
          meta: Json
          occupancy_rate: number | null
          period: string
          revenue_minor: number | null
          revpar_minor: number | null
          run_id: string | null
        }
        Insert: {
          active_listings?: number | null
          adjusted_occupancy_rate?: number | null
          adjusted_revpar_minor?: number | null
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          booking_lead_time_days?: number | null
          country_code: string
          currency: string
          fetched_at?: string
          id?: never
          market_id: string
          meta?: Json
          occupancy_rate?: number | null
          period: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Update: {
          active_listings?: number | null
          adjusted_occupancy_rate?: number | null
          adjusted_revpar_minor?: number | null
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          booking_lead_time_days?: number | null
          country_code?: string
          currency?: string
          fetched_at?: string
          id?: never
          market_id?: string
          meta?: Json
          occupancy_rate?: number | null
          period?: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Relationships: []
      }
      str_market_monthly_aggregates_p20260101: {
        Row: {
          active_listings: number | null
          adjusted_occupancy_rate: number | null
          adjusted_revpar_minor: number | null
          adr_minor: number | null
          avg_length_of_stay: number | null
          booking_lead_time_days: number | null
          country_code: string
          currency: string
          fetched_at: string
          id: number
          market_id: string
          meta: Json
          occupancy_rate: number | null
          period: string
          revenue_minor: number | null
          revpar_minor: number | null
          run_id: string | null
        }
        Insert: {
          active_listings?: number | null
          adjusted_occupancy_rate?: number | null
          adjusted_revpar_minor?: number | null
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          booking_lead_time_days?: number | null
          country_code: string
          currency: string
          fetched_at?: string
          id?: never
          market_id: string
          meta?: Json
          occupancy_rate?: number | null
          period: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Update: {
          active_listings?: number | null
          adjusted_occupancy_rate?: number | null
          adjusted_revpar_minor?: number | null
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          booking_lead_time_days?: number | null
          country_code?: string
          currency?: string
          fetched_at?: string
          id?: never
          market_id?: string
          meta?: Json
          occupancy_rate?: number | null
          period?: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Relationships: []
      }
      str_market_monthly_aggregates_p20270101: {
        Row: {
          active_listings: number | null
          adjusted_occupancy_rate: number | null
          adjusted_revpar_minor: number | null
          adr_minor: number | null
          avg_length_of_stay: number | null
          booking_lead_time_days: number | null
          country_code: string
          currency: string
          fetched_at: string
          id: number
          market_id: string
          meta: Json
          occupancy_rate: number | null
          period: string
          revenue_minor: number | null
          revpar_minor: number | null
          run_id: string | null
        }
        Insert: {
          active_listings?: number | null
          adjusted_occupancy_rate?: number | null
          adjusted_revpar_minor?: number | null
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          booking_lead_time_days?: number | null
          country_code: string
          currency: string
          fetched_at?: string
          id?: never
          market_id: string
          meta?: Json
          occupancy_rate?: number | null
          period: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Update: {
          active_listings?: number | null
          adjusted_occupancy_rate?: number | null
          adjusted_revpar_minor?: number | null
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          booking_lead_time_days?: number | null
          country_code?: string
          currency?: string
          fetched_at?: string
          id?: never
          market_id?: string
          meta?: Json
          occupancy_rate?: number | null
          period?: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Relationships: []
      }
      str_market_monthly_aggregates_p20280101: {
        Row: {
          active_listings: number | null
          adjusted_occupancy_rate: number | null
          adjusted_revpar_minor: number | null
          adr_minor: number | null
          avg_length_of_stay: number | null
          booking_lead_time_days: number | null
          country_code: string
          currency: string
          fetched_at: string
          id: number
          market_id: string
          meta: Json
          occupancy_rate: number | null
          period: string
          revenue_minor: number | null
          revpar_minor: number | null
          run_id: string | null
        }
        Insert: {
          active_listings?: number | null
          adjusted_occupancy_rate?: number | null
          adjusted_revpar_minor?: number | null
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          booking_lead_time_days?: number | null
          country_code: string
          currency: string
          fetched_at?: string
          id?: never
          market_id: string
          meta?: Json
          occupancy_rate?: number | null
          period: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Update: {
          active_listings?: number | null
          adjusted_occupancy_rate?: number | null
          adjusted_revpar_minor?: number | null
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          booking_lead_time_days?: number | null
          country_code?: string
          currency?: string
          fetched_at?: string
          id?: never
          market_id?: string
          meta?: Json
          occupancy_rate?: number | null
          period?: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Relationships: []
      }
      str_market_monthly_aggregates_p20290101: {
        Row: {
          active_listings: number | null
          adjusted_occupancy_rate: number | null
          adjusted_revpar_minor: number | null
          adr_minor: number | null
          avg_length_of_stay: number | null
          booking_lead_time_days: number | null
          country_code: string
          currency: string
          fetched_at: string
          id: number
          market_id: string
          meta: Json
          occupancy_rate: number | null
          period: string
          revenue_minor: number | null
          revpar_minor: number | null
          run_id: string | null
        }
        Insert: {
          active_listings?: number | null
          adjusted_occupancy_rate?: number | null
          adjusted_revpar_minor?: number | null
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          booking_lead_time_days?: number | null
          country_code: string
          currency: string
          fetched_at?: string
          id?: never
          market_id: string
          meta?: Json
          occupancy_rate?: number | null
          period: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Update: {
          active_listings?: number | null
          adjusted_occupancy_rate?: number | null
          adjusted_revpar_minor?: number | null
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          booking_lead_time_days?: number | null
          country_code?: string
          currency?: string
          fetched_at?: string
          id?: never
          market_id?: string
          meta?: Json
          occupancy_rate?: number | null
          period?: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Relationships: []
      }
      str_market_monthly_aggregates_p20300101: {
        Row: {
          active_listings: number | null
          adjusted_occupancy_rate: number | null
          adjusted_revpar_minor: number | null
          adr_minor: number | null
          avg_length_of_stay: number | null
          booking_lead_time_days: number | null
          country_code: string
          currency: string
          fetched_at: string
          id: number
          market_id: string
          meta: Json
          occupancy_rate: number | null
          period: string
          revenue_minor: number | null
          revpar_minor: number | null
          run_id: string | null
        }
        Insert: {
          active_listings?: number | null
          adjusted_occupancy_rate?: number | null
          adjusted_revpar_minor?: number | null
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          booking_lead_time_days?: number | null
          country_code: string
          currency: string
          fetched_at?: string
          id?: never
          market_id: string
          meta?: Json
          occupancy_rate?: number | null
          period: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Update: {
          active_listings?: number | null
          adjusted_occupancy_rate?: number | null
          adjusted_revpar_minor?: number | null
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          booking_lead_time_days?: number | null
          country_code?: string
          currency?: string
          fetched_at?: string
          id?: never
          market_id?: string
          meta?: Json
          occupancy_rate?: number | null
          period?: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Relationships: []
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
          {
            foreignKeyName: "str_markets_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
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
          {
            foreignKeyName: "str_monthly_snapshots_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "v_str_market_monthly"
            referencedColumns: ["market_id"]
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
      str_pricing_overrides: {
        Row: {
          created_at: string
          created_by: string
          currency: string
          date: string
          id: string
          listing_id: string
          meta: Json
          override_price_minor: number
          platform: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          currency: string
          date: string
          id?: string
          listing_id: string
          meta?: Json
          override_price_minor: number
          platform: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          currency?: string
          date?: string
          id?: string
          listing_id?: string
          meta?: Json
          override_price_minor?: number
          platform?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "str_pricing_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "str_pricing_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "str_pricing_overrides_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      str_reports: {
        Row: {
          customer_id: string | null
          data_payload: Json | null
          error_message: string | null
          expires_at: string | null
          generated_at: string | null
          id: string
          invoice_ref: string | null
          meta: Json
          pdf_url: string | null
          requested_at: string
          scope: Json
          status: string
          tier: number
        }
        Insert: {
          customer_id?: string | null
          data_payload?: Json | null
          error_message?: string | null
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          invoice_ref?: string | null
          meta?: Json
          pdf_url?: string | null
          requested_at?: string
          scope: Json
          status?: string
          tier: number
        }
        Update: {
          customer_id?: string | null
          data_payload?: Json | null
          error_message?: string | null
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          invoice_ref?: string | null
          meta?: Json
          pdf_url?: string | null
          requested_at?: string
          scope?: Json
          status?: string
          tier?: number
        }
        Relationships: [
          {
            foreignKeyName: "str_reports_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "str_reports_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      str_reviews_labels: {
        Row: {
          id: number
          labeled_at: string
          labeled_by: string
          meta: Json
          notes: string | null
          platform: string
          posted_at: string
          review_id: string
          sentiment_label: number
          topics_label: Json | null
        }
        Insert: {
          id?: never
          labeled_at?: string
          labeled_by: string
          meta?: Json
          notes?: string | null
          platform: string
          posted_at: string
          review_id: string
          sentiment_label: number
          topics_label?: Json | null
        }
        Update: {
          id?: never
          labeled_at?: string
          labeled_by?: string
          meta?: Json
          notes?: string | null
          platform?: string
          posted_at?: string
          review_id?: string
          sentiment_label?: number
          topics_label?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "str_reviews_labels_labeled_by_fkey"
            columns: ["labeled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "str_reviews_labels_labeled_by_fkey"
            columns: ["labeled_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      str_zone_regulations: {
        Row: {
          captured_at: string
          country_code: string
          effective_date: string | null
          id: string
          market_id: string | null
          meta: Json
          notes: string | null
          restriction_type: string
          source_url: string
          zone_id: string | null
        }
        Insert: {
          captured_at?: string
          country_code: string
          effective_date?: string | null
          id?: string
          market_id?: string | null
          meta?: Json
          notes?: string | null
          restriction_type: string
          source_url: string
          zone_id?: string | null
        }
        Update: {
          captured_at?: string
          country_code?: string
          effective_date?: string | null
          id?: string
          market_id?: string | null
          meta?: Json
          notes?: string | null
          restriction_type?: string
          source_url?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "str_zone_regulations_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "str_zone_regulations_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "str_markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "str_zone_regulations_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "v_str_market_monthly"
            referencedColumns: ["market_id"]
          },
          {
            foreignKeyName: "str_zone_regulations_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_ai_coach_sessions: {
        Row: {
          completed: boolean
          created_at: string
          dismissed: boolean
          id: string
          mood_detected: string
          session_date: string
          suggested_action: string
          user_id: string
          user_response: string | null
        }
        Insert: {
          completed?: boolean
          created_at?: string
          dismissed?: boolean
          id?: string
          mood_detected: string
          session_date: string
          suggested_action: string
          user_id: string
          user_response?: string | null
        }
        Update: {
          completed?: boolean
          created_at?: string
          dismissed?: boolean
          id?: string
          mood_detected?: string
          session_date?: string
          suggested_action?: string
          user_id?: string
          user_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_ai_coach_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_ai_coach_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_api_jobs: {
        Row: {
          actual_cost_usd: number | null
          attempt_count: number
          completed_at: string | null
          created_at: string
          error_message: string | null
          estimated_cost_usd: number | null
          external_job_id: string | null
          id: string
          input_payload: Json
          job_type: string
          max_attempts: number
          meta: Json
          output_payload: Json
          project_id: string | null
          provider: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_cost_usd?: number | null
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          estimated_cost_usd?: number | null
          external_job_id?: string | null
          id?: string
          input_payload?: Json
          job_type: string
          max_attempts?: number
          meta?: Json
          output_payload?: Json
          project_id?: string | null
          provider: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_cost_usd?: number | null
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          estimated_cost_usd?: number | null
          external_job_id?: string | null
          id?: string
          input_payload?: Json
          job_type?: string
          max_attempts?: number
          meta?: Json
          output_payload?: Json
          project_id?: string | null
          provider?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_api_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "studio_video_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_api_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_api_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_brand_kits: {
        Row: {
          accent_color: string | null
          cities: string[]
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          display_name: string | null
          font_preference: string | null
          id: string
          intro_text: string | null
          is_default: boolean
          logo_url: string | null
          meta: Json
          organization_id: string | null
          outro_text: string | null
          preview_storage_path: string | null
          primary_color: string | null
          secondary_color: string | null
          social_links: Json
          tagline: string | null
          tone: string
          updated_at: string
          user_id: string
          watermark_url: string | null
          zones: string[]
        }
        Insert: {
          accent_color?: string | null
          cities?: string[]
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          display_name?: string | null
          font_preference?: string | null
          id?: string
          intro_text?: string | null
          is_default?: boolean
          logo_url?: string | null
          meta?: Json
          organization_id?: string | null
          outro_text?: string | null
          preview_storage_path?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          social_links?: Json
          tagline?: string | null
          tone?: string
          updated_at?: string
          user_id: string
          watermark_url?: string | null
          zones?: string[]
        }
        Update: {
          accent_color?: string | null
          cities?: string[]
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          display_name?: string | null
          font_preference?: string | null
          id?: string
          intro_text?: string | null
          is_default?: boolean
          logo_url?: string | null
          meta?: Json
          organization_id?: string | null
          outro_text?: string | null
          preview_storage_path?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          social_links?: Json
          tagline?: string | null
          tone?: string
          updated_at?: string
          user_id?: string
          watermark_url?: string | null
          zones?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "studio_brand_kits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "studio_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_brand_kits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_brand_kits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_challenge_participations: {
        Row: {
          challenge_id: string
          completed_at: string | null
          created_at: string
          id: string
          project_id: string | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          project_id?: string | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_challenge_participations_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "studio_community_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_challenge_participations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "studio_video_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_challenge_participations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_challenge_participations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_community_challenges: {
        Row: {
          challenge_type: string
          completers_count: number
          created_at: string
          description: string
          id: string
          is_active: boolean
          participants_count: number
          reward_xp: number
          target_value: string
          title: string
          week_start: string
        }
        Insert: {
          challenge_type: string
          completers_count?: number
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          participants_count?: number
          reward_xp?: number
          target_value: string
          title: string
          week_start: string
        }
        Update: {
          challenge_type?: string
          completers_count?: number
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          participants_count?: number
          reward_xp?: number
          target_value?: string
          title?: string
          week_start?: string
        }
        Relationships: []
      }
      studio_content_calendar: {
        Row: {
          ai_generated: boolean
          channel: string
          content_type: string
          created_at: string
          id: string
          meta: Json
          notes: string | null
          organization_id: string | null
          project_id: string | null
          scheduled_for: string
          scheduled_time: string | null
          status: string
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_generated?: boolean
          channel: string
          content_type: string
          created_at?: string
          id?: string
          meta?: Json
          notes?: string | null
          organization_id?: string | null
          project_id?: string | null
          scheduled_for: string
          scheduled_time?: string | null
          status?: string
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_generated?: boolean
          channel?: string
          content_type?: string
          created_at?: string
          id?: string
          meta?: Json
          notes?: string | null
          organization_id?: string | null
          project_id?: string | null
          scheduled_for?: string
          scheduled_time?: string | null
          status?: string
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_content_calendar_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "studio_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_content_calendar_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "studio_video_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_content_calendar_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_content_calendar_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_copy_outputs: {
        Row: {
          ai_cost_usd: number | null
          ai_model: string | null
          channel: string
          content: string
          created_at: string
          id: string
          language: string
          meta: Json
          project_id: string
          selected_by_user: boolean
          updated_at: string
          user_id: string
          variants: Json
        }
        Insert: {
          ai_cost_usd?: number | null
          ai_model?: string | null
          channel: string
          content: string
          created_at?: string
          id?: string
          language?: string
          meta?: Json
          project_id: string
          selected_by_user?: boolean
          updated_at?: string
          user_id: string
          variants?: Json
        }
        Update: {
          ai_cost_usd?: number | null
          ai_model?: string | null
          channel?: string
          content?: string
          created_at?: string
          id?: string
          language?: string
          meta?: Json
          project_id?: string
          selected_by_user?: boolean
          updated_at?: string
          user_id?: string
          variants?: Json
        }
        Relationships: [
          {
            foreignKeyName: "studio_copy_outputs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "studio_video_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_copy_outputs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_copy_outputs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_copy_versions: {
        Row: {
          ai_model: string | null
          content: string
          copy_output_id: string
          cost_usd: number | null
          id: string
          is_current: boolean
          meta: Json
          regenerated_at: string
          regenerated_by: string | null
          tone: string
          version_number: number
        }
        Insert: {
          ai_model?: string | null
          content: string
          copy_output_id: string
          cost_usd?: number | null
          id?: string
          is_current?: boolean
          meta?: Json
          regenerated_at?: string
          regenerated_by?: string | null
          tone: string
          version_number: number
        }
        Update: {
          ai_model?: string | null
          content?: string
          copy_output_id?: string
          cost_usd?: number | null
          id?: string
          is_current?: boolean
          meta?: Json
          regenerated_at?: string
          regenerated_by?: string | null
          tone?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "studio_copy_versions_copy_output_id_fkey"
            columns: ["copy_output_id"]
            isOneToOne: false
            referencedRelation: "studio_copy_outputs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_copy_versions_regenerated_by_fkey"
            columns: ["regenerated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_copy_versions_regenerated_by_fkey"
            columns: ["regenerated_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_drone_simulations: {
        Row: {
          altitude_m: number | null
          cost_usd: number | null
          created_at: string
          duration_seconds: number | null
          id: string
          is_stub: boolean
          meta: Json
          output_url: string | null
          project_id: string
          simulation_type: string
          source_lat: number | null
          source_lng: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          altitude_m?: number | null
          cost_usd?: number | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_stub?: boolean
          meta?: Json
          output_url?: string | null
          project_id: string
          simulation_type?: string
          source_lat?: number | null
          source_lng?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          altitude_m?: number | null
          cost_usd?: number | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_stub?: boolean
          meta?: Json
          output_url?: string | null
          project_id?: string
          simulation_type?: string
          source_lat?: number | null
          source_lng?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_drone_simulations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "studio_video_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_drone_simulations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_drone_simulations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_feedback: {
        Row: {
          comments: string | null
          created_at: string
          id: string
          meta: Json
          preferred_format: string | null
          project_id: string
          rating: number | null
          selected_hook: string | null
          selected_output_id: string | null
          user_id: string
          would_recommend: boolean | null
        }
        Insert: {
          comments?: string | null
          created_at?: string
          id?: string
          meta?: Json
          preferred_format?: string | null
          project_id: string
          rating?: number | null
          selected_hook?: string | null
          selected_output_id?: string | null
          user_id: string
          would_recommend?: boolean | null
        }
        Update: {
          comments?: string | null
          created_at?: string
          id?: string
          meta?: Json
          preferred_format?: string | null
          project_id?: string
          rating?: number | null
          selected_hook?: string | null
          selected_output_id?: string | null
          user_id?: string
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_feedback_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "studio_video_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_feedback_selected_output_id_fkey"
            columns: ["selected_output_id"]
            isOneToOne: false
            referencedRelation: "studio_video_outputs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_highlight_reels: {
        Row: {
          clip_index: number
          created_at: string
          end_ms: number
          id: string
          reason: string
          reel_duration_seconds: number | null
          reel_storage_path: string | null
          source_raw_video_id: string
          start_ms: number
          status: string
          user_id: string
        }
        Insert: {
          clip_index: number
          created_at?: string
          end_ms: number
          id?: string
          reason: string
          reel_duration_seconds?: number | null
          reel_storage_path?: string | null
          source_raw_video_id: string
          start_ms: number
          status?: string
          user_id: string
        }
        Update: {
          clip_index?: number
          created_at?: string
          end_ms?: number
          id?: string
          reason?: string
          reel_duration_seconds?: number | null
          reel_storage_path?: string | null
          source_raw_video_id?: string
          start_ms?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_highlight_reels_source_raw_video_id_fkey"
            columns: ["source_raw_video_id"]
            isOneToOne: false
            referencedRelation: "studio_raw_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_highlight_reels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_highlight_reels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_listing_health_scores: {
        Row: {
          calculated_at: string
          id: string
          improvement_suggestions: Json
          missing_fields: Json
          score_description_length: number
          score_metadata_quality: number
          score_missing_fields: number
          score_overall: number
          score_photos_count: number
          url_import_id: string
        }
        Insert: {
          calculated_at?: string
          id?: string
          improvement_suggestions?: Json
          missing_fields?: Json
          score_description_length: number
          score_metadata_quality: number
          score_missing_fields: number
          score_overall: number
          score_photos_count: number
          url_import_id: string
        }
        Update: {
          calculated_at?: string
          id?: string
          improvement_suggestions?: Json
          missing_fields?: Json
          score_description_length?: number
          score_metadata_quality?: number
          score_missing_fields?: number
          score_overall?: number
          score_photos_count?: number
          url_import_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_listing_health_scores_url_import_id_fkey"
            columns: ["url_import_id"]
            isOneToOne: true
            referencedRelation: "studio_portal_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_music_tracks: {
        Row: {
          bpm: number | null
          created_at: string
          duration_seconds: number | null
          external_id: string | null
          full_url: string | null
          genre: string | null
          id: string
          is_active: boolean
          is_premium: boolean
          meta: Json
          mood: string | null
          name: string
          preview_url: string | null
          provider: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          bpm?: number | null
          created_at?: string
          duration_seconds?: number | null
          external_id?: string | null
          full_url?: string | null
          genre?: string | null
          id?: string
          is_active?: boolean
          is_premium?: boolean
          meta?: Json
          mood?: string | null
          name: string
          preview_url?: string | null
          provider?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          bpm?: number | null
          created_at?: string
          duration_seconds?: number | null
          external_id?: string | null
          full_url?: string | null
          genre?: string | null
          id?: string
          is_active?: boolean
          is_premium?: boolean
          meta?: Json
          mood?: string | null
          name?: string
          preview_url?: string | null
          provider?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_music_tracks_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_music_tracks_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_organizations: {
        Row: {
          created_at: string
          id: string
          meta: Json
          name: string
          owner_user_id: string
          plan_key: string
          seats_total: number
          seats_used: number
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          meta?: Json
          name: string
          owner_user_id: string
          plan_key?: string
          seats_total?: number
          seats_used?: number
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          meta?: Json
          name?: string
          owner_user_id?: string
          plan_key?: string
          seats_total?: number
          seats_used?: number
          slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_organizations_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_organizations_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_portal_imports: {
        Row: {
          area_extracted: number | null
          bedrooms_extracted: number | null
          bulk_batch_id: string | null
          created_at: string
          error_message: string | null
          id: string
          is_stub: boolean
          meta: Json
          photos_extracted: number
          price_extracted: number | null
          project_id: string | null
          retry_count: number
          scrape_status: string
          scraped_data: Json
          source_portal: string
          source_url: string
          updated_at: string
          user_id: string
          zone_extracted: string | null
        }
        Insert: {
          area_extracted?: number | null
          bedrooms_extracted?: number | null
          bulk_batch_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          is_stub?: boolean
          meta?: Json
          photos_extracted?: number
          price_extracted?: number | null
          project_id?: string | null
          retry_count?: number
          scrape_status?: string
          scraped_data?: Json
          source_portal: string
          source_url: string
          updated_at?: string
          user_id: string
          zone_extracted?: string | null
        }
        Update: {
          area_extracted?: number | null
          bedrooms_extracted?: number | null
          bulk_batch_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          is_stub?: boolean
          meta?: Json
          photos_extracted?: number
          price_extracted?: number | null
          project_id?: string | null
          retry_count?: number
          scrape_status?: string
          scraped_data?: Json
          source_portal?: string
          source_url?: string
          updated_at?: string
          user_id?: string
          zone_extracted?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_portal_imports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "studio_video_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_portal_imports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_portal_imports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_public_galleries: {
        Row: {
          bio: string | null
          cover_image_url: string | null
          created_at: string
          featured_video_ids: string[]
          id: string
          is_active: boolean
          meta: Json
          organization_id: string | null
          slug: string
          title: string
          updated_at: string
          user_id: string
          view_count: number
        }
        Insert: {
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string
          featured_video_ids?: string[]
          id?: string
          is_active?: boolean
          meta?: Json
          organization_id?: string | null
          slug: string
          title: string
          updated_at?: string
          user_id: string
          view_count?: number
        }
        Update: {
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string
          featured_video_ids?: string[]
          id?: string
          is_active?: boolean
          meta?: Json
          organization_id?: string | null
          slug?: string
          title?: string
          updated_at?: string
          user_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "studio_public_galleries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "studio_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_public_galleries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_public_galleries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_raw_videos: {
        Row: {
          audio_extract_storage_path: string | null
          chapters: Json | null
          cleaned_storage_path: string | null
          created_at: string
          cuts_applied: boolean
          duration_seconds: number | null
          edl: Json | null
          file_size_bytes: number
          id: string
          mime_type: string
          project_id: string | null
          source_storage_path: string
          transcription: Json | null
          transcription_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_extract_storage_path?: string | null
          chapters?: Json | null
          cleaned_storage_path?: string | null
          created_at?: string
          cuts_applied?: boolean
          duration_seconds?: number | null
          edl?: Json | null
          file_size_bytes: number
          id?: string
          mime_type: string
          project_id?: string | null
          source_storage_path: string
          transcription?: Json | null
          transcription_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_extract_storage_path?: string | null
          chapters?: Json | null
          cleaned_storage_path?: string | null
          created_at?: string
          cuts_applied?: boolean
          duration_seconds?: number | null
          edl?: Json | null
          file_size_bytes?: number
          id?: string
          mime_type?: string
          project_id?: string | null
          source_storage_path?: string
          transcription?: Json | null
          transcription_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_raw_videos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "studio_video_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_raw_videos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_raw_videos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_remarketing_jobs: {
        Row: {
          angle: string
          created_at: string
          error_message: string | null
          generated_at: string | null
          id: string
          new_project_id: string | null
          notification_sent_at: string | null
          source_project_id: string
          status: string
          user_id: string
        }
        Insert: {
          angle: string
          created_at?: string
          error_message?: string | null
          generated_at?: string | null
          id?: string
          new_project_id?: string | null
          notification_sent_at?: string | null
          source_project_id: string
          status?: string
          user_id: string
        }
        Update: {
          angle?: string
          created_at?: string
          error_message?: string | null
          generated_at?: string | null
          id?: string
          new_project_id?: string | null
          notification_sent_at?: string | null
          source_project_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_remarketing_jobs_new_project_id_fkey"
            columns: ["new_project_id"]
            isOneToOne: false
            referencedRelation: "studio_video_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_remarketing_jobs_source_project_id_fkey"
            columns: ["source_project_id"]
            isOneToOne: false
            referencedRelation: "studio_video_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_remarketing_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_remarketing_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_series_projects: {
        Row: {
          cover_image_url: string | null
          created_at: string
          episode_project_ids: string[]
          episodes_count: number
          id: string
          meta: Json
          organization_id: string | null
          series_type: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          episode_project_ids?: string[]
          episodes_count?: number
          id?: string
          meta?: Json
          organization_id?: string | null
          series_type?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          episode_project_ids?: string[]
          episodes_count?: number
          id?: string
          meta?: Json
          organization_id?: string | null
          series_type?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_series_projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "studio_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_series_projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_series_projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_speech_analytics: {
        Row: {
          bad_takes_count: number
          calculated_at: string
          clarity_score: number | null
          filler_count: number
          filler_ratio_pct: number | null
          id: string
          raw_video_id: string
          sentiment: string | null
          top_fillers: Json | null
          user_id: string
          words_per_minute: number | null
        }
        Insert: {
          bad_takes_count?: number
          calculated_at?: string
          clarity_score?: number | null
          filler_count?: number
          filler_ratio_pct?: number | null
          id?: string
          raw_video_id: string
          sentiment?: string | null
          top_fillers?: Json | null
          user_id: string
          words_per_minute?: number | null
        }
        Update: {
          bad_takes_count?: number
          calculated_at?: string
          clarity_score?: number | null
          filler_count?: number
          filler_ratio_pct?: number | null
          id?: string
          raw_video_id?: string
          sentiment?: string | null
          top_fillers?: Json | null
          user_id?: string
          words_per_minute?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_speech_analytics_raw_video_id_fkey"
            columns: ["raw_video_id"]
            isOneToOne: true
            referencedRelation: "studio_raw_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_speech_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_speech_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_streaks: {
        Row: {
          badges_unlocked: string[]
          current_streak_days: number
          id: string
          last_activity_date: string | null
          longest_streak_days: number
          total_videos_generated: number
          updated_at: string
          user_id: string
        }
        Insert: {
          badges_unlocked?: string[]
          current_streak_days?: number
          id?: string
          last_activity_date?: string | null
          longest_streak_days?: number
          total_videos_generated?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          badges_unlocked?: string[]
          current_streak_days?: number
          id?: string
          last_activity_date?: string | null
          longest_streak_days?: number
          total_videos_generated?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_style_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_premium: boolean
          key: string
          meta: Json
          music_mood: string | null
          name: string
          pacing: string
          preview_url: string | null
          tone: string
          updated_at: string
          visual_treatment: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_premium?: boolean
          key: string
          meta?: Json
          music_mood?: string | null
          name: string
          pacing?: string
          preview_url?: string | null
          tone: string
          updated_at?: string
          visual_treatment?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_premium?: boolean
          key?: string
          meta?: Json
          music_mood?: string | null
          name?: string
          pacing?: string
          preview_url?: string | null
          tone?: string
          updated_at?: string
          visual_treatment?: Json
        }
        Relationships: []
      }
      studio_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          founders_cohort: boolean
          founders_discount_pct: number
          id: string
          meta: Json
          organization_id: string | null
          plan_key: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
          videos_per_month_limit: number
          videos_used_this_period: number
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          founders_cohort?: boolean
          founders_discount_pct?: number
          id?: string
          meta?: Json
          organization_id?: string | null
          plan_key: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
          videos_per_month_limit?: number
          videos_used_this_period?: number
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          founders_cohort?: boolean
          founders_discount_pct?: number
          id?: string
          meta?: Json
          organization_id?: string | null
          plan_key?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
          videos_per_month_limit?: number
          videos_used_this_period?: number
        }
        Relationships: [
          {
            foreignKeyName: "studio_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "studio_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_usage_logs: {
        Row: {
          api_job_id: string | null
          cost_usd: number
          created_at: string
          id: string
          meta: Json
          metric_amount: number
          metric_type: string
          organization_id: string | null
          period_month: string
          project_id: string | null
          subscription_id: string | null
          threshold_warning_sent: boolean
          user_id: string
        }
        Insert: {
          api_job_id?: string | null
          cost_usd?: number
          created_at?: string
          id?: string
          meta?: Json
          metric_amount?: number
          metric_type: string
          organization_id?: string | null
          period_month: string
          project_id?: string | null
          subscription_id?: string | null
          threshold_warning_sent?: boolean
          user_id: string
        }
        Update: {
          api_job_id?: string | null
          cost_usd?: number
          created_at?: string
          id?: string
          meta?: Json
          metric_amount?: number
          metric_type?: string
          organization_id?: string | null
          period_month?: string
          project_id?: string | null
          subscription_id?: string | null
          threshold_warning_sent?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_usage_logs_api_job_id_fkey"
            columns: ["api_job_id"]
            isOneToOne: false
            referencedRelation: "studio_api_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_usage_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "studio_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_usage_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "studio_video_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_usage_logs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "studio_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_users_extension: {
        Row: {
          brand_kit_completed: boolean
          created_at: string
          first_video_generated_at: string | null
          meta: Json
          onboarding_completed: boolean
          onboarding_step: string | null
          organization_id: string | null
          studio_role: string
          updated_at: string
          user_id: string
          voice_clone_completed: boolean
        }
        Insert: {
          brand_kit_completed?: boolean
          created_at?: string
          first_video_generated_at?: string | null
          meta?: Json
          onboarding_completed?: boolean
          onboarding_step?: string | null
          organization_id?: string | null
          studio_role?: string
          updated_at?: string
          user_id: string
          voice_clone_completed?: boolean
        }
        Update: {
          brand_kit_completed?: boolean
          created_at?: string
          first_video_generated_at?: string | null
          meta?: Json
          onboarding_completed?: boolean
          onboarding_step?: string | null
          organization_id?: string | null
          studio_role?: string
          updated_at?: string
          user_id?: string
          voice_clone_completed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "studio_users_extension_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "studio_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_users_extension_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_users_extension_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_video_assets: {
        Row: {
          ai_classification: Json
          ai_quality_score: number | null
          asset_type: string
          created_at: string
          duration_seconds: number | null
          height: number | null
          id: string
          meta: Json
          mime_type: string | null
          order_index: number
          project_id: string
          size_bytes: number | null
          storage_url: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          width: number | null
        }
        Insert: {
          ai_classification?: Json
          ai_quality_score?: number | null
          asset_type: string
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          meta?: Json
          mime_type?: string | null
          order_index?: number
          project_id: string
          size_bytes?: number | null
          storage_url: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          width?: number | null
        }
        Update: {
          ai_classification?: Json
          ai_quality_score?: number | null
          asset_type?: string
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          meta?: Json
          mime_type?: string | null
          order_index?: number
          project_id?: string
          size_bytes?: number | null
          storage_url?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_video_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "studio_video_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_video_assets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_video_assets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_video_outputs: {
        Row: {
          created_at: string
          duration_seconds: number | null
          format: string
          has_beat_sync: boolean
          has_branding_overlay: boolean
          hook_variant: string
          id: string
          is_branded: boolean
          meta: Json
          project_id: string
          render_cost_usd: number | null
          render_provider: string | null
          render_status: string
          selected_by_user: boolean
          size_bytes: number | null
          storage_url: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          format: string
          has_beat_sync?: boolean
          has_branding_overlay?: boolean
          hook_variant: string
          id?: string
          is_branded?: boolean
          meta?: Json
          project_id: string
          render_cost_usd?: number | null
          render_provider?: string | null
          render_status?: string
          selected_by_user?: boolean
          size_bytes?: number | null
          storage_url: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          format?: string
          has_beat_sync?: boolean
          has_branding_overlay?: boolean
          hook_variant?: string
          id?: string
          is_branded?: boolean
          meta?: Json
          project_id?: string
          render_cost_usd?: number | null
          render_provider?: string | null
          render_status?: string
          selected_by_user?: boolean
          size_bytes?: number | null
          storage_url?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_video_outputs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "studio_video_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_video_outputs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_video_outputs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_video_projects: {
        Row: {
          brand_kit_id: string | null
          captacion_id: string | null
          created_at: string
          director_brief: Json
          enable_ambient_audio: boolean
          enable_avatar: boolean
          enable_drone_sim: boolean
          enable_remarketing: boolean
          enable_virtual_staging: boolean
          format_variants: Json
          hook_variants_count: number
          id: string
          meta: Json
          music_track_id: string | null
          organization_id: string | null
          project_type: string
          proyecto_id: string | null
          published_at: string | null
          rendered_at: string | null
          source_metadata: Json
          status: string
          style_template_id: string | null
          title: string
          unidad_id: string | null
          updated_at: string
          user_id: string
          voice_clone_id: string | null
        }
        Insert: {
          brand_kit_id?: string | null
          captacion_id?: string | null
          created_at?: string
          director_brief?: Json
          enable_ambient_audio?: boolean
          enable_avatar?: boolean
          enable_drone_sim?: boolean
          enable_remarketing?: boolean
          enable_virtual_staging?: boolean
          format_variants?: Json
          hook_variants_count?: number
          id?: string
          meta?: Json
          music_track_id?: string | null
          organization_id?: string | null
          project_type?: string
          proyecto_id?: string | null
          published_at?: string | null
          rendered_at?: string | null
          source_metadata?: Json
          status?: string
          style_template_id?: string | null
          title: string
          unidad_id?: string | null
          updated_at?: string
          user_id: string
          voice_clone_id?: string | null
        }
        Update: {
          brand_kit_id?: string | null
          captacion_id?: string | null
          created_at?: string
          director_brief?: Json
          enable_ambient_audio?: boolean
          enable_avatar?: boolean
          enable_drone_sim?: boolean
          enable_remarketing?: boolean
          enable_virtual_staging?: boolean
          format_variants?: Json
          hook_variants_count?: number
          id?: string
          meta?: Json
          music_track_id?: string | null
          organization_id?: string | null
          project_type?: string
          proyecto_id?: string | null
          published_at?: string | null
          rendered_at?: string | null
          source_metadata?: Json
          status?: string
          style_template_id?: string | null
          title?: string
          unidad_id?: string | null
          updated_at?: string
          user_id?: string
          voice_clone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_video_projects_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "studio_brand_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_video_projects_captacion_id_fkey"
            columns: ["captacion_id"]
            isOneToOne: false
            referencedRelation: "captaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_video_projects_music_track_id_fkey"
            columns: ["music_track_id"]
            isOneToOne: false
            referencedRelation: "studio_music_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_video_projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "studio_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_video_projects_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_video_projects_style_template_id_fkey"
            columns: ["style_template_id"]
            isOneToOne: false
            referencedRelation: "studio_style_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_video_projects_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_video_projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_video_projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_video_projects_voice_clone_id_fkey"
            columns: ["voice_clone_id"]
            isOneToOne: false
            referencedRelation: "studio_voice_clones"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_virtual_staging_jobs: {
        Row: {
          cost_usd: number | null
          created_at: string
          id: string
          is_stub: boolean
          meta: Json
          output_url: string | null
          project_id: string
          room_type: string | null
          source_asset_id: string | null
          staging_style: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string
          id?: string
          is_stub?: boolean
          meta?: Json
          output_url?: string | null
          project_id: string
          room_type?: string | null
          source_asset_id?: string | null
          staging_style?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cost_usd?: number | null
          created_at?: string
          id?: string
          is_stub?: boolean
          meta?: Json
          output_url?: string | null
          project_id?: string
          room_type?: string | null
          source_asset_id?: string | null
          staging_style?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_virtual_staging_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "studio_video_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_virtual_staging_jobs_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "studio_video_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_virtual_staging_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_virtual_staging_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_voice_clones: {
        Row: {
          clone_type: string
          consent_signed: boolean
          consent_signed_at: string | null
          created_at: string
          elevenlabs_voice_id: string | null
          id: string
          language: string
          meta: Json
          name: string
          organization_id: string | null
          preview_url: string | null
          source_audio_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clone_type?: string
          consent_signed?: boolean
          consent_signed_at?: string | null
          created_at?: string
          elevenlabs_voice_id?: string | null
          id?: string
          language?: string
          meta?: Json
          name: string
          organization_id?: string | null
          preview_url?: string | null
          source_audio_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clone_type?: string
          consent_signed?: boolean
          consent_signed_at?: string | null
          created_at?: string
          elevenlabs_voice_id?: string | null
          id?: string
          language?: string
          meta?: Json
          name?: string
          organization_id?: string | null
          preview_url?: string | null
          source_audio_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_voice_clones_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "studio_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_voice_clones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_voice_clones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_waitlist: {
        Row: {
          city: string | null
          converted_at: string | null
          country_code: string | null
          created_at: string
          current_closed_deals_count: number | null
          current_leads_count: number | null
          current_user_id: string | null
          email: string
          founders_cohort_eligible: boolean
          founders_cohort_position: number | null
          id: string
          meta: Json
          name: string | null
          notified_at: string | null
          phone: string | null
          priority_score: number
          role: string
          source: string | null
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          city?: string | null
          converted_at?: string | null
          country_code?: string | null
          created_at?: string
          current_closed_deals_count?: number | null
          current_leads_count?: number | null
          current_user_id?: string | null
          email: string
          founders_cohort_eligible?: boolean
          founders_cohort_position?: number | null
          id?: string
          meta?: Json
          name?: string | null
          notified_at?: string | null
          phone?: string | null
          priority_score?: number
          role?: string
          source?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          city?: string | null
          converted_at?: string | null
          country_code?: string | null
          created_at?: string
          current_closed_deals_count?: number | null
          current_leads_count?: number | null
          current_user_id?: string | null
          email?: string
          founders_cohort_eligible?: boolean
          founders_cohort_position?: number | null
          id?: string
          meta?: Json
          name?: string | null
          notified_at?: string | null
          phone?: string | null
          priority_score?: number
          role?: string
          source?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_waitlist_current_user_id_fkey"
            columns: ["current_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_waitlist_current_user_id_fkey"
            columns: ["current_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      tareas: {
        Row: {
          asesor_id: string
          calendar_event_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          detalle_tipo: string
          due_at: string
          entity_id: string | null
          id: string
          priority: string
          redirect_to: string | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          asesor_id: string
          calendar_event_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          detalle_tipo: string
          due_at: string
          entity_id?: string | null
          id?: string
          priority?: string
          redirect_to?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          asesor_id?: string
          calendar_event_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          detalle_tipo?: string
          due_at?: string
          entity_id?: string | null
          id?: string
          priority?: string
          redirect_to?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
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
      template_public_audit_crm_log: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          changes: Json
          country_code: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          occurred_at: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          changes: Json
          country_code?: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address?: unknown
          occurred_at: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          changes?: Json
          country_code?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          occurred_at?: string
          user_agent?: string | null
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
      template_public_behavioral_signals: {
        Row: {
          buyer_twin_id: string
          id: string
          occurred_at: string
          signal_data: Json
          signal_type: string
        }
        Insert: {
          buyer_twin_id: string
          id: string
          occurred_at: string
          signal_data: Json
          signal_type: string
        }
        Update: {
          buyer_twin_id?: string
          id?: string
          occurred_at?: string
          signal_data?: Json
          signal_type?: string
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
        Relationships: [
          {
            foreignKeyName: "template_public_geo_snapshots_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      template_public_landing_analytics: {
        Row: {
          country_code: string | null
          created_at: string
          event_type: string
          id: string
          ip_hash: string | null
          landing_id: string
          referer: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          country_code?: string | null
          created_at: string
          event_type: string
          id: string
          ip_hash?: string | null
          landing_id: string
          referer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          landing_id?: string
          referer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
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
        Relationships: [
          {
            foreignKeyName: "template_public_market_prices_secondary_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "template_public_market_pulse_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
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
      template_public_score_history: {
        Row: {
          archived_at: string
          citations: Json
          components: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id: number
          inputs_used: Json
          level: number
          period_date: string
          provenance: Json
          score_label: string | null
          score_type: string
          score_value: number
          tier: number
          valid_from: string
          valid_until: string
        }
        Insert: {
          archived_at: string
          citations: Json
          components: Json
          confidence: string
          country_code: string
          entity_id: string
          entity_type: string
          id: number
          inputs_used: Json
          level: number
          period_date: string
          provenance: Json
          score_label?: string | null
          score_type: string
          score_value: number
          tier: number
          valid_from: string
          valid_until: string
        }
        Update: {
          archived_at?: string
          citations?: Json
          components?: Json
          confidence?: string
          country_code?: string
          entity_id?: string
          entity_type?: string
          id?: number
          inputs_used?: Json
          level?: number
          period_date?: string
          provenance?: Json
          score_label?: string | null
          score_type?: string
          score_value?: number
          tier?: number
          valid_from?: string
          valid_until?: string
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
        Relationships: [
          {
            foreignKeyName: "template_public_search_trends_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      template_public_str_market_monthly_aggregates: {
        Row: {
          active_listings: number | null
          adjusted_occupancy_rate: number | null
          adjusted_revpar_minor: number | null
          adr_minor: number | null
          avg_length_of_stay: number | null
          booking_lead_time_days: number | null
          country_code: string
          currency: string
          fetched_at: string
          id: number
          market_id: string
          meta: Json
          occupancy_rate: number | null
          period: string
          revenue_minor: number | null
          revpar_minor: number | null
          run_id: string | null
        }
        Insert: {
          active_listings?: number | null
          adjusted_occupancy_rate?: number | null
          adjusted_revpar_minor?: number | null
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          booking_lead_time_days?: number | null
          country_code: string
          currency: string
          fetched_at: string
          id: number
          market_id: string
          meta: Json
          occupancy_rate?: number | null
          period: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
        }
        Update: {
          active_listings?: number | null
          adjusted_occupancy_rate?: number | null
          adjusted_revpar_minor?: number | null
          adr_minor?: number | null
          avg_length_of_stay?: number | null
          booking_lead_time_days?: number | null
          country_code?: string
          currency?: string
          fetched_at?: string
          id?: number
          market_id?: string
          meta?: Json
          occupancy_rate?: number | null
          period?: string
          revenue_minor?: number | null
          revpar_minor?: number | null
          run_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "template_public_zone_price_index_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_scopes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      tier_requirements: {
        Row: {
          description: string
          min_closed_ops: number
          min_months_data: number
          min_projects: number
          tier: number
          updated_at: string
        }
        Insert: {
          description: string
          min_closed_ops?: number
          min_months_data?: number
          min_projects?: number
          tier: number
          updated_at?: string
        }
        Update: {
          description?: string
          min_closed_ops?: number
          min_months_data?: number
          min_projects?: number
          tier?: number
          updated_at?: string
        }
        Relationships: []
      }
      ui_feature_flags: {
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
      unidades: {
        Row: {
          area_m2: number | null
          area_terreno_m2: number | null
          banos: number | null
          created_at: string
          features: Json
          floor: number | null
          floor_plan_url: string | null
          id: string
          maintenance_fee_mxn: number | null
          meta: Json
          numero: string
          parking: number | null
          photos: string[]
          price_mxn: number | null
          proyecto_id: string
          recamaras: number | null
          status: Database["public"]["Enums"]["unidad_status"]
          tipo: Database["public"]["Enums"]["unidad_tipo"]
          updated_at: string
        }
        Insert: {
          area_m2?: number | null
          area_terreno_m2?: number | null
          banos?: number | null
          created_at?: string
          features?: Json
          floor?: number | null
          floor_plan_url?: string | null
          id?: string
          maintenance_fee_mxn?: number | null
          meta?: Json
          numero: string
          parking?: number | null
          photos?: string[]
          price_mxn?: number | null
          proyecto_id: string
          recamaras?: number | null
          status?: Database["public"]["Enums"]["unidad_status"]
          tipo?: Database["public"]["Enums"]["unidad_tipo"]
          updated_at?: string
        }
        Update: {
          area_m2?: number | null
          area_terreno_m2?: number | null
          banos?: number | null
          created_at?: string
          features?: Json
          floor?: number | null
          floor_plan_url?: string | null
          id?: string
          maintenance_fee_mxn?: number | null
          meta?: Json
          numero?: string
          parking?: number | null
          photos?: string[]
          price_mxn?: number | null
          proyecto_id?: string
          recamaras?: number | null
          status?: Database["public"]["Enums"]["unidad_status"]
          tipo?: Database["public"]["Enums"]["unidad_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidades_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_scores: {
        Row: {
          citations: Json
          components: Json
          computed_at: string
          confidence: string
          country_code: string
          id: string
          inputs_used: Json
          level: number
          period_date: string
          provenance: Json
          score_label: string | null
          score_type: string
          score_value: number
          tenant_id: string | null
          tier: number
          trend_direction: string | null
          trend_vs_previous: number | null
          user_id: string
          valid_until: string | null
        }
        Insert: {
          citations?: Json
          components?: Json
          computed_at?: string
          confidence: string
          country_code: string
          id?: string
          inputs_used?: Json
          level: number
          period_date: string
          provenance?: Json
          score_label?: string | null
          score_type: string
          score_value: number
          tenant_id?: string | null
          tier: number
          trend_direction?: string | null
          trend_vs_previous?: number | null
          user_id: string
          valid_until?: string | null
        }
        Update: {
          citations?: Json
          components?: Json
          computed_at?: string
          confidence?: string
          country_code?: string
          id?: string
          inputs_used?: Json
          level?: number
          period_date?: string
          provenance?: Json
          score_label?: string | null
          score_type?: string
          score_value?: number
          tenant_id?: string | null
          tier?: number
          trend_direction?: string | null
          trend_vs_previous?: number | null
          user_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_scores_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "user_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_scopes"
            referencedColumns: ["id"]
          },
        ]
      }
      utm_tracks: {
        Row: {
          clicks_count: number
          created_at: string
          id: string
          short_url: string
          source_id: string | null
          source_type: string
          user_id: string
          utm_params: Json
        }
        Insert: {
          clicks_count?: number
          created_at?: string
          id?: string
          short_url: string
          source_id?: string | null
          source_type: string
          user_id: string
          utm_params?: Json
        }
        Update: {
          clicks_count?: number
          created_at?: string
          id?: string
          short_url?: string
          source_id?: string | null
          source_type?: string
          user_id?: string
          utm_params?: Json
        }
        Relationships: []
      }
      vibe_tags: {
        Row: {
          created_at: string
          id: string
          label_en: string
          label_es: string
          label_pt: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id: string
          label_en: string
          label_es: string
          label_pt: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          label_en?: string
          label_es?: string
          label_pt?: string
          sort_order?: number
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
      wa_templates: {
        Row: {
          body: string
          buttons: Json
          category: string
          created_at: string
          footer: string | null
          header_content: string | null
          header_type: string
          id: string
          meta_template_id: string | null
          name: string
          placeholders: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          buttons?: Json
          category: string
          created_at?: string
          footer?: string | null
          header_content?: string | null
          header_type?: string
          id?: string
          meta_template_id?: string | null
          name: string
          placeholders?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          buttons?: Json
          category?: string
          created_at?: string
          footer?: string | null
          header_content?: string | null
          header_type?: string
          id?: string
          meta_template_id?: string | null
          name?: string
          placeholders?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      widget_embed_registry: {
        Row: {
          active: boolean
          created_at: string
          customization: Json
          embed_id: string
          id: string
          owner_user_id: string | null
          scope_id: string
          scope_type: string
          views_count: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          customization?: Json
          embed_id: string
          id?: string
          owner_user_id?: string | null
          scope_id: string
          scope_type: string
          views_count?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          customization?: Json
          embed_id?: string
          id?: string
          owner_user_id?: string | null
          scope_id?: string
          scope_type?: string
          views_count?: number
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
          {
            foreignKeyName: "zona_snapshots_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_alert_subscriptions: {
        Row: {
          active: boolean
          channel: string
          country_code: string
          created_at: string
          id: string
          last_triggered_at: string | null
          threshold_pct: number
          user_id: string
          zone_id: string
        }
        Insert: {
          active?: boolean
          channel: string
          country_code?: string
          created_at?: string
          id?: string
          last_triggered_at?: string | null
          threshold_pct: number
          user_id: string
          zone_id: string
        }
        Update: {
          active?: boolean
          channel?: string
          country_code?: string
          created_at?: string
          id?: string
          last_triggered_at?: string | null
          threshold_pct?: number
          user_id?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_alert_subscriptions_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_alpha_alerts: {
        Row: {
          alpha_score: number
          country_code: string
          detected_at: string
          id: string
          is_active: boolean
          scope_type: string
          signals: Json
          subscribers_notified: number
          time_to_mainstream_months: number | null
          zone_id: string
        }
        Insert: {
          alpha_score: number
          country_code?: string
          detected_at?: string
          id?: string
          is_active?: boolean
          scope_type?: string
          signals?: Json
          subscribers_notified?: number
          time_to_mainstream_months?: number | null
          zone_id: string
        }
        Update: {
          alpha_score?: number
          country_code?: string
          detected_at?: string
          id?: string
          is_active?: boolean
          scope_type?: string
          signals?: Json
          subscribers_notified?: number
          time_to_mainstream_months?: number | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_alpha_alerts_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_certifications: {
        Row: {
          approved_by: string | null
          badge_metadata: Json
          certified_since: string
          country_code: string
          created_at: string
          criteria_met: Json
          id: string
          is_active: boolean
          score_id: string
          updated_at: string
          zone_id: string
        }
        Insert: {
          approved_by?: string | null
          badge_metadata?: Json
          certified_since: string
          country_code: string
          created_at?: string
          criteria_met?: Json
          id?: string
          is_active?: boolean
          score_id: string
          updated_at?: string
          zone_id: string
        }
        Update: {
          approved_by?: string | null
          badge_metadata?: Json
          certified_since?: string
          country_code?: string
          created_at?: string
          criteria_met?: Json
          id?: string
          is_active?: boolean
          score_id?: string
          updated_at?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_certifications_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_certifications_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_certifications_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "zone_certifications_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_climate_station_map: {
        Row: {
          distance_meters: number
          station_id: string
          station_source: string
          updated_at: string
          zone_id: string
        }
        Insert: {
          distance_meters: number
          station_id: string
          station_source: string
          updated_at?: string
          zone_id: string
        }
        Update: {
          distance_meters?: number
          station_id?: string
          station_source?: string
          updated_at?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_climate_station_map_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_constellation_clusters: {
        Row: {
          cluster_id: number
          computed_at: string
          id: string
          period_date: string
          zone_id: string
        }
        Insert: {
          cluster_id: number
          computed_at?: string
          id?: string
          period_date: string
          zone_id: string
        }
        Update: {
          cluster_id?: number
          computed_at?: string
          id?: string
          period_date?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_constellation_clusters_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_constellations_edges: {
        Row: {
          calculated_at: string
          edge_types: Json
          edge_weight: number
          id: string
          period_date: string
          source_colonia_id: string
          target_colonia_id: string
        }
        Insert: {
          calculated_at?: string
          edge_types?: Json
          edge_weight: number
          id?: string
          period_date: string
          source_colonia_id: string
          target_colonia_id: string
        }
        Update: {
          calculated_at?: string
          edge_types?: Json
          edge_weight?: number
          id?: string
          period_date?: string
          source_colonia_id?: string
          target_colonia_id?: string
        }
        Relationships: []
      }
      zone_migration_flows: {
        Row: {
          calculated_at: string
          confidence: number | null
          country_code: string
          dest_scope_id: string
          dest_scope_type: string
          id: string
          income_decile_dest: number | null
          income_decile_origin: number | null
          origin_scope_id: string
          origin_scope_type: string
          period_date: string
          source_mix: Json
          volume: number
        }
        Insert: {
          calculated_at?: string
          confidence?: number | null
          country_code?: string
          dest_scope_id: string
          dest_scope_type: string
          id?: string
          income_decile_dest?: number | null
          income_decile_origin?: number | null
          origin_scope_id: string
          origin_scope_type: string
          period_date: string
          source_mix: Json
          volume: number
        }
        Update: {
          calculated_at?: string
          confidence?: number | null
          country_code?: string
          dest_scope_id?: string
          dest_scope_type?: string
          id?: string
          income_decile_dest?: number | null
          income_decile_origin?: number | null
          origin_scope_id?: string
          origin_scope_type?: string
          period_date?: string
          source_mix?: Json
          volume?: number
        }
        Relationships: []
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
          {
            foreignKeyName: "zone_price_index_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
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
      zone_pulse_scores: {
        Row: {
          business_births: number
          business_deaths: number
          calculated_at: string
          calls_911_count: number | null
          components: Json
          confidence: string | null
          country_code: string
          events_count: number | null
          foot_traffic_day: number | null
          foot_traffic_night: number | null
          id: string
          period_date: string
          pulse_score: number | null
          scope_id: string
          scope_type: string
        }
        Insert: {
          business_births?: number
          business_deaths?: number
          calculated_at?: string
          calls_911_count?: number | null
          components?: Json
          confidence?: string | null
          country_code?: string
          events_count?: number | null
          foot_traffic_day?: number | null
          foot_traffic_night?: number | null
          id?: string
          period_date: string
          pulse_score?: number | null
          scope_id: string
          scope_type: string
        }
        Update: {
          business_births?: number
          business_deaths?: number
          calculated_at?: string
          calls_911_count?: number | null
          components?: Json
          confidence?: string | null
          country_code?: string
          events_count?: number | null
          foot_traffic_day?: number | null
          foot_traffic_night?: number | null
          id?: string
          period_date?: string
          pulse_score?: number | null
          scope_id?: string
          scope_type?: string
        }
        Relationships: []
      }
      zone_scores: {
        Row: {
          anomaly: Json | null
          citations: Json
          comparable_zones: Json
          components: Json
          computed_at: string
          confidence: string
          country_code: string
          deltas: Json
          id: string
          inputs_used: Json
          level: number
          ml_explanations: Json
          period_date: string
          provenance: Json
          ranking: Json
          score_label: string | null
          score_type: string
          score_value: number
          stability_index: number | null
          tenant_id: string | null
          tier: number
          trend_direction: string | null
          trend_vs_previous: number | null
          valid_until: string | null
          zone_id: string
        }
        Insert: {
          anomaly?: Json | null
          citations?: Json
          comparable_zones?: Json
          components?: Json
          computed_at?: string
          confidence: string
          country_code: string
          deltas?: Json
          id?: string
          inputs_used?: Json
          level: number
          ml_explanations?: Json
          period_date: string
          provenance?: Json
          ranking?: Json
          score_label?: string | null
          score_type: string
          score_value: number
          stability_index?: number | null
          tenant_id?: string | null
          tier: number
          trend_direction?: string | null
          trend_vs_previous?: number | null
          valid_until?: string | null
          zone_id: string
        }
        Update: {
          anomaly?: Json | null
          citations?: Json
          comparable_zones?: Json
          components?: Json
          computed_at?: string
          confidence?: string
          country_code?: string
          deltas?: Json
          id?: string
          inputs_used?: Json
          level?: number
          ml_explanations?: Json
          period_date?: string
          provenance?: Json
          ranking?: Json
          score_label?: string | null
          score_type?: string
          score_value?: number
          stability_index?: number | null
          tenant_id?: string | null
          tier?: number
          trend_direction?: string | null
          trend_vs_previous?: number | null
          valid_until?: string | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_scores_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "zone_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_scopes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_scores_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_slugs: {
        Row: {
          country_code: string
          created_at: string
          id: string
          scope_type: string
          slug: string
          source_label: string
          updated_at: string
          zone_id: string
        }
        Insert: {
          country_code?: string
          created_at?: string
          id?: string
          scope_type: string
          slug: string
          source_label: string
          updated_at?: string
          zone_id: string
        }
        Update: {
          country_code?: string
          created_at?: string
          id?: string
          scope_type?: string
          slug?: string
          source_label?: string
          updated_at?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_slugs_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "zone_slugs_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: true
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_streaks: {
        Row: {
          computed_at: string
          country_code: string
          current_pulse: number
          id: string
          period_date: string
          rank_in_country: number
          scope_id: string
          scope_type: string
          streak_length_months: number
        }
        Insert: {
          computed_at?: string
          country_code: string
          current_pulse: number
          id?: string
          period_date: string
          rank_in_country: number
          scope_id: string
          scope_type: string
          streak_length_months: number
        }
        Update: {
          computed_at?: string
          country_code?: string
          current_pulse?: number
          id?: string
          period_date?: string
          rank_in_country?: number
          scope_id?: string
          scope_type?: string
          streak_length_months?: number
        }
        Relationships: [
          {
            foreignKeyName: "zone_streaks_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
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
          {
            foreignKeyName: "zone_tiers_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: true
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_topology_metrics: {
        Row: {
          approximate_pagerank: number
          closeness_centrality: number
          components: Json
          computed_at: string
          degree_centrality: number
          id: string
          snapshot_date: string
          zone_id: string
        }
        Insert: {
          approximate_pagerank?: number
          closeness_centrality?: number
          components?: Json
          computed_at?: string
          degree_centrality?: number
          id?: string
          snapshot_date: string
          zone_id: string
        }
        Update: {
          approximate_pagerank?: number
          closeness_centrality?: number
          components?: Json
          computed_at?: string
          degree_centrality?: number
          id?: string
          snapshot_date?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_topology_metrics_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          area_km2: number | null
          boundary: unknown
          country_code: string
          created_at: string
          h3_r8: string | null
          id: string
          lat: number | null
          lng: number | null
          metadata: Json
          name_en: string
          name_es: string
          name_pt: string | null
          parent_scope_id: string | null
          population: number | null
          scope_id: string
          scope_type: string
          updated_at: string
        }
        Insert: {
          area_km2?: number | null
          boundary?: unknown
          country_code: string
          created_at?: string
          h3_r8?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          metadata?: Json
          name_en: string
          name_es: string
          name_pt?: string | null
          parent_scope_id?: string | null
          population?: number | null
          scope_id: string
          scope_type: string
          updated_at?: string
        }
        Update: {
          area_km2?: number | null
          boundary?: unknown
          country_code?: string
          created_at?: string
          h3_r8?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          metadata?: Json
          name_en?: string
          name_es?: string
          name_pt?: string | null
          parent_scope_id?: string | null
          population?: number | null
          scope_id?: string
          scope_type?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      asesor_stats_daily: {
        Row: {
          acms_generados: number | null
          asesor_id: string | null
          busquedas_activas: number | null
          busquedas_propuesta: number | null
          busquedas_total: number | null
          captaciones_creadas: number | null
          consultas_atendidas: number | null
          consultas_recibidas: number | null
          day: string | null
          inventario_activo: number | null
          operaciones_cerradas: number | null
          revenue_mxn: number | null
          t_primera_respuesta_min: number | null
          t_promedio_min: number | null
          visitas_agendadas: number | null
          visitas_completadas: number | null
        }
        Relationships: []
      }
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
      heatmap_cache: {
        Row: {
          computed_at: string | null
          confidence: string | null
          country_code: string | null
          period_date: string | null
          score_id: string | null
          value: number | null
          zone_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zone_scores_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "zone_scores_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
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
      v_ltr_str_connection: {
        Row: {
          country_code: string | null
          currency: string | null
          ltr_monthly_rent_median_minor: number | null
          ltr_sample_listings: number | null
          regime: string | null
          str_ltr_ratio: number | null
          str_monthly_revenue_median_minor: number | null
          str_sample_months: number | null
          zone_id: string | null
        }
        Relationships: []
      }
      v_str_market_monthly: {
        Row: {
          active_listings: number | null
          adjusted_occupancy_rate: number | null
          adjusted_revpar_minor: number | null
          adr_minor: number | null
          airroi_district: string | null
          airroi_locality: string | null
          avg_length_of_stay: number | null
          booking_lead_time_days: number | null
          country_code: string | null
          currency: string | null
          market_id: string | null
          occupancy_rate: number | null
          period: string | null
          revenue_minor: number | null
          revpar_minor: number | null
          source: string | null
        }
        Relationships: [
          {
            foreignKeyName: "str_market_monthly_aggregates_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "str_markets_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
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
          {
            foreignKeyName: "str_monthly_snapshots_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "v_str_market_monthly"
            referencedColumns: ["market_id"]
          },
        ]
      }
      zone_demographics_cache: {
        Row: {
          age_distribution: Json | null
          dominant_profession: string | null
          median_salary_mxn: number | null
          profession_distribution: Json | null
          salary_range_distribution: Json | null
          snapshot_date: string | null
          zone_id: string | null
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
      aggregate_zone_sentiment: {
        Args: {
          p_decay_half_life_days?: number
          p_lookback_days?: number
          p_market_id: string
        }
        Returns: {
          market_id: string
          negative_share: number
          positive_share: number
          reviews_analyzed: number
          sentiment_simple_avg: number
          sentiment_weighted_avg: number
          topic_counts: Json
        }[]
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
      cascade_deal_won_to_operacion: {
        Args: { p_deal_id: string }
        Returns: undefined
      }
      cascade_operacion_commission_calc: {
        Args: { p_operacion_id: string }
        Returns: undefined
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
      claim_pending_score_jobs: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          batch_mode: boolean
          country_code: string
          entity_id: string
          entity_type: string
          id: string
          priority: number
          scheduled_for: string
          score_id: string
          triggered_by: string
        }[]
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
      detect_invisible_hotel_candidates: {
        Args: {
          p_country_code: string
          p_max_radius_m?: number
          p_min_listings?: number
        }
        Returns: {
          bounding_radius_m: number
          center_lat: number
          center_lon: number
          host_id: string
          listing_ids: string[]
          listings_count: number
          market_id: string
        }[]
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
      encrypt_secret: { Args: { p_plaintext: string }; Returns: string }
      enqueue_score_recalc: {
        Args: {
          p_batch?: boolean
          p_country: string
          p_entity_id: string
          p_entity_type: string
          p_priority?: number
          p_scheduled_for?: string
          p_score_id: string
          p_triggered_by: string
        }
        Returns: Json
      }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      exec_refresh_heatmap_cache: { Args: never; Returns: undefined }
      exec_refresh_zone_demographics_cache: { Args: never; Returns: undefined }
      finalize_score_job: {
        Args: { p_error?: string; p_id: string; p_success: boolean }
        Returns: Json
      }
      find_climate_twins: {
        Args: { p_min_sim?: number; p_top_n?: number; p_zone_id: string }
        Returns: {
          similarity: number
          twin_zone_id: string
        }[]
      }
      fn_cascade_geo_data_updated: {
        Args: { p_country: string; p_source: string; p_zone_id: string }
        Returns: number
      }
      fn_cascade_macro_updated: { Args: { p_country: string }; Returns: number }
      fn_cascade_score_updated: {
        Args: {
          p_country: string
          p_entity_id: string
          p_entity_type: string
          p_source_score_id: string
        }
        Returns: number
      }
      fn_crm_retention_cleanup: { Args: never; Returns: undefined }
      fn_enqueue_indices_for_zone: {
        Args: {
          p_changed_score_type: string
          p_country_code: string
          p_zone_id: string
        }
        Returns: number
      }
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
      load_inegi_ageb_staging_batch: { Args: { p_rows: Json }; Returns: number }
      longtransactionsenabled: { Args: never; Returns: boolean }
      market_migration_alert_pct: {
        Args: { p_lookback_days?: number; p_market_id: string }
        Returns: number
      }
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
      ml_deterministic_split: {
        Args: { p_listing_id: string }
        Returns: string
      }
      monthly_airroi_spend_by_endpoint: {
        Args: { p_month?: string }
        Returns: {
          actual_cost_usd: number
          calls: number
          endpoint_key: string
          estimated_cost_usd: number
        }[]
      }
      monthly_anthropic_spend: {
        Args: { p_month?: string }
        Returns: {
          budget_usd: number
          month: string
          pct: number
          spent_usd: number
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
      purge_expired_score_history: { Args: never; Returns: number }
      queue_metrics_summary: { Args: never; Returns: Json }
      reapply_privileges: {
        Args: { p_parent_table: string }
        Returns: undefined
      }
      recompute_all_zone_tiers: { Args: never; Returns: number }
      recompute_buyer_twin_embedding: {
        Args: { p_twin_id: string }
        Returns: undefined
      }
      recompute_climate_aggregates_from_observations: {
        Args: { p_year_month?: string; p_zone_id?: string }
        Returns: Json
      }
      recompute_zone_demographics_from_ageb: {
        Args: { p_zone_id?: string }
        Returns: Json
      }
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
      refresh_asesor_stats_daily: { Args: never; Returns: undefined }
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
      resolve_polymorphic_referral_source: {
        Args: { s_id: string; s_type: string }
        Returns: Json
      }
      rls_is_admin: { Args: never; Returns: boolean }
      rls_is_asesor: { Args: never; Returns: boolean }
      rls_is_assigned_lead: { Args: { p_lead_id: string }; Returns: boolean }
      rls_is_brokerage_member: {
        Args: { p_brokerage_id: string }
        Returns: boolean
      }
      rls_is_developer: { Args: never; Returns: boolean }
      rls_is_master_broker: { Args: never; Returns: boolean }
      rls_owns_lead: { Args: { p_lead_id: string }; Returns: boolean }
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
      update_zone_boundary_from_geojson: {
        Args: {
          p_area_km2: number
          p_geojson_text: string
          p_lat_centroid: number
          p_lng_centroid: number
          p_zone_id: string
        }
        Returns: Json
      }
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
      zone_aqi_summary: {
        Args: {
          p_lookback_days?: number
          p_market_id: string
          p_radius_m?: number
        }
        Returns: {
          aqi_avg: number
          aqi_max: number
          aqi_min: number
          market_id: string
          samples: number
          stations_count: number
        }[]
      }
    }
    Enums: {
      captacion_operacion: "venta" | "renta"
      captacion_status:
        | "prospecto"
        | "presentacion"
        | "firmado"
        | "en_promocion"
        | "vendido"
        | "cerrado_no_listado"
      contact_note_level: "personal" | "colaborativo" | "sistema"
      exclusividad_scope: "full" | "category" | "territory"
      market_capture_source:
        | "chrome_extension"
        | "admin_upload"
        | "partnership_feed"
        | "api_official"
      marketing_asset_status: "ready" | "generating" | "expired" | "error"
      marketing_asset_type:
        | "photo_gallery"
        | "video"
        | "video_story"
        | "brochure_pdf"
        | "render_3d"
        | "virtual_tour"
        | "floor_plan"
        | "post_cuadrado"
        | "post_largo"
        | "story"
      project_broker_role: "lead_broker" | "associate" | "coordinator"
      proyecto_operacion: "venta" | "renta"
      proyecto_privacy: "public" | "broker_only" | "assigned_only"
      proyecto_status: "preventa" | "construccion" | "terminado" | "entregado"
      proyecto_tipo:
        | "departamento"
        | "casa"
        | "townhouse"
        | "loft"
        | "penthouse"
        | "oficina"
        | "local"
        | "terreno"
      unidad_status:
        | "disponible"
        | "apartada"
        | "vendida"
        | "reservada"
        | "bloqueada"
      unidad_tipo:
        | "departamento"
        | "casa"
        | "townhouse"
        | "loft"
        | "penthouse"
        | "estudio"
      user_role:
        | "superadmin"
        | "admin_desarrolladora"
        | "asesor"
        | "broker_manager"
        | "mb_admin"
        | "mb_coordinator"
        | "comprador"
        | "vendedor_publico"
        | "system"
        | "studio_user"
        | "studio_admin"
        | "studio_photographer"
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
      captacion_operacion: ["venta", "renta"],
      captacion_status: [
        "prospecto",
        "presentacion",
        "firmado",
        "en_promocion",
        "vendido",
        "cerrado_no_listado",
      ],
      contact_note_level: ["personal", "colaborativo", "sistema"],
      exclusividad_scope: ["full", "category", "territory"],
      market_capture_source: [
        "chrome_extension",
        "admin_upload",
        "partnership_feed",
        "api_official",
      ],
      marketing_asset_status: ["ready", "generating", "expired", "error"],
      marketing_asset_type: [
        "photo_gallery",
        "video",
        "video_story",
        "brochure_pdf",
        "render_3d",
        "virtual_tour",
        "floor_plan",
        "post_cuadrado",
        "post_largo",
        "story",
      ],
      project_broker_role: ["lead_broker", "associate", "coordinator"],
      proyecto_operacion: ["venta", "renta"],
      proyecto_privacy: ["public", "broker_only", "assigned_only"],
      proyecto_status: ["preventa", "construccion", "terminado", "entregado"],
      proyecto_tipo: [
        "departamento",
        "casa",
        "townhouse",
        "loft",
        "penthouse",
        "oficina",
        "local",
        "terreno",
      ],
      unidad_status: [
        "disponible",
        "apartada",
        "vendida",
        "reservada",
        "bloqueada",
      ],
      unidad_tipo: [
        "departamento",
        "casa",
        "townhouse",
        "loft",
        "penthouse",
        "estudio",
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
        "system",
        "studio_user",
        "studio_admin",
        "studio_photographer",
      ],
    },
  },
} as const
