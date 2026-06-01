// Generated from the Clerow Supabase project (bglhkaltbcifughqxafl).
// Regenerate with the Supabase MCP `generate_typescript_types` or
// `supabase gen types typescript` after schema changes.

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
      api_keys: {
        Row: {
          brand_id: string | null
          created_at: string
          id: string
          key_hash: string
          last_used_at: string | null
          name: string
          prefix: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          id?: string
          key_hash: string
          last_used_at?: string | null
          name?: string
          prefix: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          id?: string
          key_hash?: string
          last_used_at?: string | null
          name?: string
          prefix?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_clients: {
        Row: {
          client_id: string
          client_name: string | null
          created_at: string
          redirect_uris: string[]
          token_endpoint_auth_method: string
        }
        Insert: {
          client_id: string
          client_name?: string | null
          created_at?: string
          redirect_uris?: string[]
          token_endpoint_auth_method?: string
        }
        Update: {
          client_id?: string
          client_name?: string | null
          created_at?: string
          redirect_uris?: string[]
          token_endpoint_auth_method?: string
        }
        Relationships: []
      }
      oauth_codes: {
        Row: {
          client_id: string
          code: string
          code_challenge: string | null
          code_challenge_method: string | null
          created_at: string
          expires_at: string
          redirect_uri: string
          resource: string | null
          scope: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          code: string
          code_challenge?: string | null
          code_challenge_method?: string | null
          created_at?: string
          expires_at: string
          redirect_uri: string
          resource?: string | null
          scope?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          code?: string
          code_challenge?: string | null
          code_challenge_method?: string | null
          created_at?: string
          expires_at?: string
          redirect_uri?: string
          resource?: string | null
          scope?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_codes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "oauth_clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
      brand_snapshots: {
        Row: {
          brand_id: string
          captured_on: string
          competitors: number
          created_at: string
          engines: number
          id: string
          overall: number
          position: number | null
          sentiment: number | null
          visibility: number
          your_rank: number | null
        }
        Insert: {
          brand_id: string
          captured_on: string
          competitors?: number
          created_at?: string
          engines?: number
          id?: string
          overall?: number
          position?: number | null
          sentiment?: number | null
          visibility?: number
          your_rank?: number | null
        }
        Update: {
          brand_id?: string
          captured_on?: string
          competitors?: number
          created_at?: string
          engines?: number
          id?: string
          overall?: number
          position?: number | null
          sentiment?: number | null
          visibility?: number
          your_rank?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_snapshots_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_streak: {
        Row: {
          brand_id: string
          current_streak: number
          freezes: number
          frozen_dates: string[]
          last_evaluated_date: string | null
          longest_streak: number
          updated_at: string
        }
        Insert: {
          brand_id: string
          current_streak?: number
          freezes?: number
          frozen_dates?: string[]
          last_evaluated_date?: string | null
          longest_streak?: number
          updated_at?: string
        }
        Update: {
          brand_id?: string
          current_streak?: number
          freezes?: number
          frozen_dates?: string[]
          last_evaluated_date?: string | null
          longest_streak?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_streak_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          audience: string[]
          company: string
          competitors: string[]
          created_at: string
          description: string
          differentiators: string[]
          enrich_notes: string
          geos: string[]
          id: string
          industry: string
          location: string
          site_audit: Json | null
          site_audited_at: string | null
          size: string
          timezone: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          audience?: string[]
          company?: string
          competitors?: string[]
          created_at?: string
          description?: string
          differentiators?: string[]
          enrich_notes?: string
          geos?: string[]
          id?: string
          industry?: string
          location?: string
          site_audit?: Json | null
          site_audited_at?: string | null
          size?: string
          timezone?: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          audience?: string[]
          company?: string
          competitors?: string[]
          created_at?: string
          description?: string
          differentiators?: string[]
          enrich_notes?: string
          geos?: string[]
          id?: string
          industry?: string
          location?: string
          site_audit?: Json | null
          site_audited_at?: string | null
          size?: string
          timezone?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      prompts: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          intent: Database["public"]["Enums"]["prompt_intent"]
          is_primary: boolean
          is_tracked: boolean
          source: Database["public"]["Enums"]["prompt_source"]
          text: string
          volume: Database["public"]["Enums"]["prompt_volume"]
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          intent?: Database["public"]["Enums"]["prompt_intent"]
          is_primary?: boolean
          is_tracked?: boolean
          source?: Database["public"]["Enums"]["prompt_source"]
          text: string
          volume?: Database["public"]["Enums"]["prompt_volume"]
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          intent?: Database["public"]["Enums"]["prompt_intent"]
          is_primary?: boolean
          is_tracked?: boolean
          source?: Database["public"]["Enums"]["prompt_source"]
          text?: string
          volume?: Database["public"]["Enums"]["prompt_volume"]
        }
        Relationships: [
          {
            foreignKeyName: "prompts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      result_brands: {
        Row: {
          id: string
          is_you: boolean
          name: string
          position: number | null
          rank: number
          scan_result_id: string
          sentiment: Database["public"]["Enums"]["brand_sentiment"]
          visibility: number
        }
        Insert: {
          id?: string
          is_you?: boolean
          name: string
          position?: number | null
          rank: number
          scan_result_id: string
          sentiment?: Database["public"]["Enums"]["brand_sentiment"]
          visibility?: number
        }
        Update: {
          id?: string
          is_you?: boolean
          name?: string
          position?: number | null
          rank?: number
          scan_result_id?: string
          sentiment?: Database["public"]["Enums"]["brand_sentiment"]
          visibility?: number
        }
        Relationships: [
          {
            foreignKeyName: "result_brands_scan_result_id_fkey"
            columns: ["scan_result_id"]
            isOneToOne: false
            referencedRelation: "scan_results"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_results: {
        Row: {
          citations: Json
          created_at: string
          engine: string
          id: string
          prompt_id: string
          raw_answer: string
          scan_id: string
          your_position: number | null
          your_sentiment: number | null
          your_visibility: number
        }
        Insert: {
          citations?: Json
          created_at?: string
          engine: string
          id?: string
          prompt_id: string
          raw_answer?: string
          scan_id: string
          your_position?: number | null
          your_sentiment?: number | null
          your_visibility?: number
        }
        Update: {
          citations?: Json
          created_at?: string
          engine?: string
          id?: string
          prompt_id?: string
          raw_answer?: string
          scan_id?: string
          your_position?: number | null
          your_sentiment?: number | null
          your_visibility?: number
        }
        Relationships: [
          {
            foreignKeyName: "scan_results_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_results_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      scans: {
        Row: {
          brand_id: string
          engines: string[]
          error: string | null
          est_cost: number
          finished_at: string | null
          id: string
          started_at: string
          status: Database["public"]["Enums"]["scan_status"]
          synthesis: Json | null
          tier: Database["public"]["Enums"]["scan_tier"]
        }
        Insert: {
          brand_id: string
          engines?: string[]
          error?: string | null
          est_cost?: number
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["scan_status"]
          synthesis?: Json | null
          tier?: Database["public"]["Enums"]["scan_tier"]
        }
        Update: {
          brand_id?: string
          engines?: string[]
          error?: string | null
          est_cost?: number
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["scan_status"]
          synthesis?: Json | null
          tier?: Database["public"]["Enums"]["scan_tier"]
        }
        Relationships: [
          {
            foreignKeyName: "scans_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      share_links: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          revoked_at: string | null
          token: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          revoked_at?: string | null
          token: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          revoked_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_links_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          plan: string | null
          price_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          plan?: string | null
          price_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          plan?: string | null
          price_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          archived: boolean
          archived_at: string | null
          brand_id: string
          completed_at: string | null
          content: string | null
          content_at: string | null
          created_at: string
          done: boolean
          for_date: string | null
          id: string
          impact: string
          ladder_key: string | null
          level: number | null
          meta: string
          source: string
          title: string
          xp: number
        }
        Insert: {
          archived?: boolean
          archived_at?: string | null
          brand_id: string
          completed_at?: string | null
          content?: string | null
          content_at?: string | null
          created_at?: string
          done?: boolean
          for_date?: string | null
          id?: string
          impact?: string
          ladder_key?: string | null
          level?: number | null
          meta?: string
          source?: string
          title: string
          xp?: number
        }
        Update: {
          archived?: boolean
          archived_at?: string | null
          brand_id?: string
          completed_at?: string | null
          content?: string | null
          content_at?: string | null
          created_at?: string
          done?: boolean
          for_date?: string | null
          id?: string
          impact?: string
          ladder_key?: string | null
          level?: number | null
          meta?: string
          source?: string
          title?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "tasks_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      brand_sentiment: "pos" | "neut" | "neg" | "warn"
      prompt_intent: "solution" | "compare" | "problem" | "branded"
      prompt_source: "ai" | "user"
      prompt_volume: "high" | "medium" | "low" | "rising"
      scan_status: "running" | "done" | "error"
      scan_tier: "free" | "full"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ---- Convenience aliases used across the app ----
export type PromptIntent = Database["public"]["Enums"]["prompt_intent"]
export type PromptVolume = Database["public"]["Enums"]["prompt_volume"]
export type PromptSource = Database["public"]["Enums"]["prompt_source"]
export type ScanTier = Database["public"]["Enums"]["scan_tier"]
export type ScanStatus = Database["public"]["Enums"]["scan_status"]
export type BrandSentiment = Database["public"]["Enums"]["brand_sentiment"]
export type Citation = { url: string; title: string }
export type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"]
export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"]
export type BrandStreakRow = Database["public"]["Tables"]["brand_streak"]["Row"]
export type BrandSnapshotRow = Database["public"]["Tables"]["brand_snapshots"]["Row"]
