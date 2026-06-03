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
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          broker: string | null
          type: 'live' | 'demo' | 'prop'
          balance: number
          currency: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['accounts']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['accounts']['Insert']>
      }
      tags: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          category: 'setup' | 'mistake' | 'condition' | 'custom'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['tags']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['tags']['Insert']>
      }
      strategies: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          asset_class: string | null
          entry_rules: string | null
          exit_rules: string | null
          risk_rules: string | null
          checklist: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['strategies']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['strategies']['Insert']>
      }
      trades: {
        Row: {
          id: string
          user_id: string
          account_id: string | null
          symbol: string
          side: 'long' | 'short'
          status: 'open' | 'closed'
          asset_class: 'forex' | 'stocks' | 'crypto' | 'futures' | 'options'
          entry_date: string
          exit_date: string | null
          entry_price: number
          exit_price: number | null
          quantity: number
          stop_loss: number | null
          take_profit: number | null
          gross_pnl: number | null
          net_pnl: number | null
          commission: number
          r_multiple: number | null
          risk_amount: number | null
          rating: number | null
          emotion: 'confident' | 'fearful' | 'impulsive' | 'neutral' | 'greedy' | 'calm' | 'anxious' | null
          notes: string | null
          setup_notes: string | null
          mistake_notes: string | null
          screenshots: string[]
          mt5_deal_id: string | null
          mt5_position_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['trades']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['trades']['Insert']>
      }
      trade_tags: {
        Row: { trade_id: string; tag_id: string }
        Insert: { trade_id: string; tag_id: string }
        Update: never
      }
      trade_strategies: {
        Row: { trade_id: string; strategy_id: string }
        Insert: { trade_id: string; strategy_id: string }
        Update: never
      }
      notebook_entries: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          type: 'daily' | 'weekly' | 'plan' | 'recap' | 'custom'
          trade_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['notebook_entries']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['notebook_entries']['Insert']>
      }
      settings: {
        Row: {
          user_id: string
          anthropic_api_key: string | null
          default_commission: number
          breakeven_range: number
          currency: string
          timezone: string
          display_mode: 'dollar' | 'percentage' | 'r_multiple'
          last_mt5_sync_at: string | null
          mt5_account_id: string | null
        }
        Insert: Database['public']['Tables']['settings']['Row']
        Update: Partial<Database['public']['Tables']['settings']['Row']>
      }
    }
  }
}
