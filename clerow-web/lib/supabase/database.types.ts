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
          size: string
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
          size?: string
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
          size?: string
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
          finished_at: string | null
          id: string
          started_at: string
          status: Database["public"]["Enums"]["scan_status"]
          tier: Database["public"]["Enums"]["scan_tier"]
        }
        Insert: {
          brand_id: string
          engines?: string[]
          error?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["scan_status"]
          tier?: Database["public"]["Enums"]["scan_tier"]
        }
        Update: {
          brand_id?: string
          engines?: string[]
          error?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["scan_status"]
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
      tasks: {
        Row: {
          brand_id: string
          created_at: string
          done: boolean
          id: string
          impact: string
          meta: string
          source: string
          title: string
          xp: number
        }
        Insert: {
          brand_id: string
          created_at?: string
          done?: boolean
          id?: string
          impact?: string
          meta?: string
          source?: string
          title: string
          xp?: number
        }
        Update: {
          brand_id?: string
          created_at?: string
          done?: boolean
          id?: string
          impact?: string
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
