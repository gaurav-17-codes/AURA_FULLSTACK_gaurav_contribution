export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string
          tenant_id: string
          title: string
          status: string | null
          due_date: string | null
          source: string | null
          source_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          title: string
          status?: string | null
          due_date?: string | null
          source?: string | null
          source_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          title?: string
          status?: string | null
          due_date?: string | null
          source?: string | null
          source_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          tenant_id: string
          title: string
          start_time: string | null
          end_time: string | null
          attendees: Json | null
          source: string | null
          source_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          title: string
          start_time?: string | null
          end_time?: string | null
          attendees?: Json | null
          source?: string | null
          source_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          title?: string
          start_time?: string | null
          end_time?: string | null
          attendees?: Json | null
          source?: string | null
          source_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          tenant_id: string
          sender: string | null
          subject: string | null
          snippet: string | null
          flagged: boolean | null
          source: string | null
          source_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          sender?: string | null
          subject?: string | null
          snippet?: string | null
          flagged?: boolean | null
          source?: string | null
          source_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          sender?: string | null
          subject?: string | null
          snippet?: string | null
          flagged?: boolean | null
          source?: string | null
          source_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          tenant_id: string
          title: string
          url: string | null
          last_modified: string | null
          source: string | null
          source_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          title: string
          url?: string | null
          last_modified?: string | null
          source?: string | null
          source_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          title?: string
          url?: string | null
          last_modified?: string | null
          source?: string | null
          source_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      oauth_tokens: {
        Row: {
          id: string
          user_id: string
          provider: string
          access_token: string
          refresh_token: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          access_token: string
          refresh_token?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          access_token?: string
          refresh_token?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sync_jobs: {
        Row: {
          id: string
          tenant_id: string
          connector: string
          status: string
          started_at: string | null
          completed_at: string | null
          error_message: string | null
          items_synced: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          connector: string
          status?: string
          started_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          items_synced?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          connector?: string
          status?: string
          started_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          items_synced?: number | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
