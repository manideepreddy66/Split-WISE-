export interface Profile {
  id: string
  name: string
  email: string
  expense_id: string
  created_at: string
}

export interface Group {
  id: string
  name: string
  created_by: string | null
  created_at: string
  members_count?: number
}

export interface GroupMember {
  id: string
  group_id: string
  profile_id: string
  joined_at: string
  profiles?: Profile
}

export interface Expense {
  id: string
  group_id: string
  title: string
  amount: number
  notes: string | null
  paid_by: string
  split_type: 'equal' | 'exact' | 'percentage'
  receipt_url: string | null
  created_at: string
  profiles?: Profile
}

export interface ExpenseSplit {
  id: string
  expense_id: string
  profile_id: string
  share_amount: number
  profiles?: Profile
}

export interface Settlement {
  id: string
  group_id: string
  payer_id: string
  payee_id: string
  amount: number
  created_at: string
}

export interface ActivityLog {
  id: string
  type: 'expense' | 'settlement' | 'member_join' | 'member_leave'
  title: string
  details: string
  timestamp: string
  group_name: string
  group_id: string
}
