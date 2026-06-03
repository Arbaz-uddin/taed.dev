export type UserRole = 'user' | 'super_admin'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  team_id: string | null
  wallet_balance: number
  api_key: string | null
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  name: string
  created_at: string
  created_by: string
}

export interface TeamInvitation {
  id: string
  team_id: string
  invited_email: string
  invited_by: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

export interface SavedAPI {
  id: string
  user_id: string
  team_id: string | null
  name: string
  fields: { name: string; description: string }[]
  is_library: boolean
  description: string | null
  category: string | null
  cloned_from: string | null
  created_at: string
  updated_at: string
}

export interface APICategory {
  id: string
  name: string
  created_by: string | null
  created_at: string
}

export interface APIUsageLog {
  id: string
  user_id: string
  api_id: string | null
  team_id: string | null
  file_name: string | null
  file_type: string | null
  success: boolean
  error_message: string | null
  processing_time_ms: number | null
  cost: number | null
  api_key_used: string | null
  created_at: string
}

export interface PaymentMethod {
  id: string
  user_id: string
  card_last_four: string
  card_brand: string
  exp_month: number
  exp_year: number
  is_default: boolean
  created_at: string
}
