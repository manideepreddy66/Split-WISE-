import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { Group, Profile, Expense, ExpenseSplit, Settlement, ActivityLog } from '../types/database.types'

interface Debt {
  from: string
  to: string
  amount: number
  fromName: string
  toName: string
}

interface GroupDetails {
  group: Group
  members: Profile[]
  expenses: (Expense & { profiles: Profile; splits?: (ExpenseSplit & { profiles: Profile })[] })[]
  settlements: (Settlement & { payer: Profile; payee: Profile })[]
  balances: Record<string, number>
  debts: Debt[]
}

interface DataContextType {
  groups: Group[]
  recentActivity: ActivityLog[]
  loadingGroups: boolean
  groupDetails: GroupDetails | null
  loadingGroupDetails: boolean
  dashboardStats: {
    totalOwedToYou: number
    totalYouOwe: number
    netBalance: number
    debtsSummary: { type: 'owe' | 'owed'; user: string; amount: number; groupId: string; groupName: string }[]
  }
  fetchGroups: () => Promise<void>
  fetchGroupDetails: (groupId: string) => Promise<void>
  createGroup: (name: string) => Promise<string>
  searchUserByExpenseId: (expenseId: string) => Promise<Profile | null>
  addMemberToGroup: (groupId: string, profileId: string) => Promise<void>
  removeMemberFromGroup: (groupId: string, profileId: string) => Promise<void>
  createExpense: (
    groupId: string,
    title: string,
    amount: number,
    notes: string,
    paidBy: string,
    splitType: 'equal' | 'exact' | 'percentage',
    splitsData: { profileId: string; value: number }[], // value represents share amount, exact amount or percentage
    receiptFile: File | null
  ) => Promise<void>
  deleteExpense: (expenseId: string) => Promise<void>
  createSettlement: (groupId: string, payerId: string, payeeId: string, amount: number) => Promise<void>
  fetchRecentActivity: () => Promise<void>
  error: string | null
  clearError: () => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null)
  const [loadingGroupDetails, setLoadingGroupDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [dashboardStats, setDashboardStats] = useState<{
    totalOwedToYou: number
    totalYouOwe: number
    netBalance: number
    debtsSummary: { type: 'owe' | 'owed'; user: string; amount: number; groupId: string; groupName: string }[]
  }>({
    totalOwedToYou: 0,
    totalYouOwe: 0,
    netBalance: 0,
    debtsSummary: [],
  })

  const clearError = () => setError(null)

  // Fetch all groups for current user
  const fetchGroups = async () => {
    if (!profile) return
    setLoadingGroups(true)
    try {
      const { data, error: groupErr } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups (
            id,
            name,
            created_by,
            created_at
          )
        `)
        .eq('profile_id', profile.id)

      if (groupErr) throw groupErr

      const mappedGroups = (data || [])
        .map((item: any) => item.groups)
        .filter(Boolean) as Group[]

      // Fetch member counts for each group
      const updatedGroups = await Promise.all(
        mappedGroups.map(async (g) => {
          const { count } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', g.id)
          return { ...g, members_count: count || 0 }
        })
      )

      setGroups(updatedGroups)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to fetch groups.')
    } finally {
      setLoadingGroups(false)
    }
  }

  // Fetch full details of a specific group
  const fetchGroupDetails = async (groupId: string) => {
    if (!profile) return
    setLoadingGroupDetails(true)
    try {
      // 1. Fetch group info
      const { data: groupData, error: gErr } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single()
      if (gErr) throw gErr

      // 2. Fetch group members
      const { data: membersData, error: mErr } = await supabase
        .from('group_members')
        .select(`
          profiles (
            id,
            name,
            email,
            expense_id,
            created_at
          )
        `)
        .eq('group_id', groupId)
      if (mErr) throw mErr
      const members = (membersData || []).map((m: any) => m.profiles).filter(Boolean) as Profile[]

      // 3. Fetch expenses
      const { data: expensesData, error: eErr } = await supabase
        .from('expenses')
        .select(`
          *,
          profiles:paid_by (
            id,
            name,
            email,
            expense_id,
            created_at
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
      if (eErr) throw eErr

      // 4. Fetch splits for all expenses
      const expensesWithSplits = await Promise.all(
        (expensesData || []).map(async (exp: any) => {
          const { data: splits } = await supabase
            .from('expense_splits')
            .select(`
              *,
              profiles (
                id,
                name,
                email,
                expense_id,
                created_at
              )
            `)
            .eq('expense_id', exp.id)
          return {
            ...exp,
            amount: Number(exp.amount),
            splits: (splits || []).map((s: any) => ({
              ...s,
              share_amount: Number(s.share_amount),
            })),
          }
        })
      )

      // 5. Fetch settlements
      const { data: settlementsData, error: sErr } = await supabase
        .from('settlements')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
      if (sErr) throw sErr

      // Fetch profiles for settlements manually or join if relation is set
      const settlementsWithProfiles = await Promise.all(
        (settlementsData || []).map(async (set: any) => {
          const { data: payer } = await supabase.from('profiles').select('*').eq('id', set.payer_id).single()
          const { data: payee } = await supabase.from('profiles').select('*').eq('id', set.payee_id).single()
          return {
            ...set,
            amount: Number(set.amount),
            payer,
            payee,
          }
        })
      )

      // 6. Calculate Balances
      const balances: Record<string, number> = {}
      members.forEach((m) => {
        balances[m.id] = 0
      })

      // Add expense payments
      expensesWithSplits.forEach((exp) => {
        const payerId = exp.paid_by
        if (balances[payerId] !== undefined) {
          balances[payerId] += exp.amount
        }
        exp.splits?.forEach((split: any) => {
          const debtorId = split.profile_id
          if (balances[debtorId] !== undefined) {
            balances[debtorId] -= split.share_amount
          }
        })
      })

      // Add settlement payments
      settlementsWithProfiles.forEach((set) => {
        const payerId = set.payer_id
        const payeeId = set.payee_id
        if (balances[payerId] !== undefined) {
          balances[payerId] += set.amount
        }
        if (balances[payeeId] !== undefined) {
          balances[payeeId] -= set.amount
        }
      })

      // Round balances to 2 decimals
      Object.keys(balances).forEach((key) => {
        balances[key] = Number(balances[key].toFixed(2))
      })

      // 7. Simplify Debts
      const debts = calculateSimplifiedDebts(members, balances)

      setGroupDetails({
        group: groupData,
        members,
        expenses: expensesWithSplits,
        settlements: settlementsWithProfiles,
        balances,
        debts,
      })
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to fetch group details.')
    } finally {
      setLoadingGroupDetails(false)
    }
  }

  const calculateSimplifiedDebts = (members: Profile[], currentBalances: Record<string, number>): Debt[] => {
    const debts: Debt[] = []
    const participants = members.map((m) => ({
      id: m.id,
      name: m.name,
      balance: currentBalances[m.id] || 0,
    }))

    const debtors = participants.filter((p) => p.balance < -0.01).sort((a, b) => a.balance - b.balance)
    const creditors = participants.filter((p) => p.balance > 0.01).sort((a, b) => b.balance - a.balance)

    let dIdx = 0
    let cIdx = 0

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx]
      const creditor = creditors[cIdx]

      const oweAmount = -debtor.balance
      const creditAmount = creditor.balance
      const settleAmount = Math.min(oweAmount, creditAmount)

      debts.push({
        from: debtor.id,
        to: creditor.id,
        amount: Number(settleAmount.toFixed(2)),
        fromName: debtor.name,
        toName: creditor.name,
      })

      debtor.balance += settleAmount
      creditor.balance -= settleAmount

      if (Math.abs(debtor.balance) < 0.01) {
        dIdx++
      }
      if (Math.abs(creditor.balance) < 0.01) {
        cIdx++
      }
    }

    return debts
  }

  // Create a new group
  const createGroup = async (name: string): Promise<string> => {
    if (!profile) throw new Error('Not authenticated')
    try {
      // 1. Create group
      const { data: gData, error: gErr } = await supabase
        .from('groups')
        .insert({ name, created_by: profile.id })
        .select()
        .single()

      if (gErr) throw gErr

      // 2. Add creator as first member
      const { error: mErr } = await supabase
        .from('group_members')
        .insert({ group_id: gData.id, profile_id: profile.id })

      if (mErr) throw mErr

      await fetchGroups()
      return gData.id
    } catch (err: any) {
      setError(err.message || 'Failed to create group.')
      throw err
    }
  }

  // Search profile by expense_id
  const searchUserByExpenseId = async (expenseId: string): Promise<Profile | null> => {
    try {
      const formattedId = expenseId.trim().toUpperCase()
      const { data, error: sErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('expense_id', formattedId)
        .maybeSingle()

      if (sErr) throw sErr
      return data
    } catch (err: any) {
      setError(err.message || 'User search failed.')
      return null
    }
  }

  // Add member to group
  const addMemberToGroup = async (groupId: string, profileId: string) => {
    try {
      const { error: mErr } = await supabase
        .from('group_members')
        .insert({ group_id: groupId, profile_id: profileId })

      if (mErr) throw mErr

      // Refresh group details
      await fetchGroupDetails(groupId)
    } catch (err: any) {
      setError(err.message || 'Failed to add member to group.')
      throw err
    }
  }

  // Remove member from group
  const removeMemberFromGroup = async (groupId: string, profileId: string) => {
    try {
      const { error: mErr } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('profile_id', profileId)

      if (mErr) throw mErr

      if (profileId === profile?.id) {
        // If user removed themselves, go back to groups
        setGroupDetails(null)
        await fetchGroups()
      } else {
        await fetchGroupDetails(groupId)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to remove member.')
      throw err
    }
  }

  // Upload receipt to Supabase storage
  const uploadReceipt = async (groupId: string, file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${groupId}/${crypto.randomUUID()}.${fileExt}`

      const { error: uploadErr } = await supabase.storage
        .from('receipts')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadErr) throw uploadErr

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (err: any) {
      console.error('File upload failed:', err.message)
      throw err
    }
  }

  // Create an expense
  const createExpense = async (
    groupId: string,
    title: string,
    amount: number,
    notes: string,
    paidBy: string,
    splitType: 'equal' | 'exact' | 'percentage',
    splitsData: { profileId: string; value: number }[],
    receiptFile: File | null
  ) => {
    try {
      let receiptUrl: string | null = null
      if (receiptFile) {
        receiptUrl = await uploadReceipt(groupId, receiptFile)
      }

      // 1. Create expense row
      const { data: expData, error: expErr } = await supabase
        .from('expenses')
        .insert({
          group_id: groupId,
          title,
          amount,
          notes: notes || null,
          paid_by: paidBy,
          split_type: splitType,
          receipt_url: receiptUrl,
        })
        .select()
        .single()

      if (expErr) throw expErr

      // 2. Prepare splits records
      // SplitsData contains profileId and their input value (e.g. ratio, percentage or fixed dollar amount)
      let calculatedSplits: { profile_id: string; share_amount: number }[] = []

      if (splitType === 'equal') {
        const share = Number((amount / splitsData.length).toFixed(2))
        let totalDistributed = 0
        splitsData.forEach((item, index) => {
          let itemShare = share
          // Adjust last item's share for rounding discrepancies
          if (index === splitsData.length - 1) {
            itemShare = Number((amount - totalDistributed).toFixed(2))
          }
          totalDistributed += itemShare
          calculatedSplits.push({
            profile_id: item.profileId,
            share_amount: itemShare,
          })
        })
      } else if (splitType === 'exact') {
        calculatedSplits = splitsData.map((item) => ({
          profile_id: item.profileId,
          share_amount: Number(item.value.toFixed(2)),
        }))
      } else if (splitType === 'percentage') {
        let totalDistributed = 0
        splitsData.forEach((item, index) => {
          let itemShare = Number(((amount * item.value) / 100).toFixed(2))
          if (index === splitsData.length - 1) {
            itemShare = Number((amount - totalDistributed).toFixed(2))
          }
          totalDistributed += itemShare
          calculatedSplits.push({
            profile_id: item.profileId,
            share_amount: itemShare,
          })
        })
      }

      // Insert splits
      const splitInserts = calculatedSplits.map((split) => ({
        expense_id: expData.id,
        profile_id: split.profile_id,
        share_amount: split.share_amount,
      }))

      const { error: splitErr } = await supabase.from('expense_splits').insert(splitInserts)
      if (splitErr) throw splitErr

      await fetchGroupDetails(groupId)
      await fetchRecentActivity()
    } catch (err: any) {
      setError(err.message || 'Failed to create expense.')
      throw err
    }
  }

  // Delete an expense
  const deleteExpense = async (expenseId: string) => {
    try {
      const groupId = groupDetails?.group.id
      const { error: dErr } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)

      if (dErr) throw dErr

      if (groupId) {
        await fetchGroupDetails(groupId)
        await fetchRecentActivity()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete expense.')
      throw err
    }
  }

  // Create settlement record
  const createSettlement = async (groupId: string, payerId: string, payeeId: string, amount: number) => {
    try {
      const { error: sErr } = await supabase
        .from('settlements')
        .insert({
          group_id: groupId,
          payer_id: payerId,
          payee_id: payeeId,
          amount,
        })

      if (sErr) throw sErr

      await fetchGroupDetails(groupId)
      await fetchRecentActivity()
    } catch (err: any) {
      setError(err.message || 'Failed to create settlement.')
      throw err
    }
  }

  // Fetch recent activity across all groups
  const fetchRecentActivity = async () => {
    if (!profile) return
    try {
      // Get all group IDs where user is member
      const { data: memberGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('profile_id', profile.id)

      const groupIds = (memberGroups || []).map((mg) => mg.group_id)
      if (groupIds.length === 0) {
        setRecentActivity([])
        return
      }

      // Fetch expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select(`
          id,
          title,
          amount,
          created_at,
          paid_by,
          group_id,
          groups ( name ),
          profiles:paid_by ( name )
        `)
        .in('group_id', groupIds)
        .order('created_at', { ascending: false })
        .limit(10)

      // Fetch settlements
      const { data: settlements } = await supabase
        .from('settlements')
        .select(`
          id,
          amount,
          created_at,
          payer_id,
          payee_id,
          group_id,
          groups ( name )
        `)
        .in('group_id', groupIds)
        .order('created_at', { ascending: false })
        .limit(10)

      const logs: ActivityLog[] = []

      // Map expenses to logs
      if (expenses) {
        expenses.forEach((e: any) => {
          logs.push({
            id: e.id,
            type: 'expense',
            title: `${e.profiles?.name === profile.name ? 'You' : e.profiles?.name} added "${e.title}"`,
            details: `Amount: ₹${Number(e.amount).toFixed(2)}`,
            timestamp: e.created_at,
            group_name: e.groups?.name || 'Group',
            group_id: e.group_id,
          })
        })
      }

      // Map settlements to logs
      if (settlements) {
        await Promise.all(
          settlements.map(async (s: any) => {
            const { data: payer } = await supabase.from('profiles').select('name').eq('id', s.payer_id).single()
            const { data: payee } = await supabase.from('profiles').select('name').eq('id', s.payee_id).single()
            const payerName = payer?.name === profile.name ? 'You' : payer?.name
            const payeeName = payee?.name === profile.name ? 'You' : payee?.name

            logs.push({
              id: s.id,
              type: 'settlement',
              title: `${payerName} paid ${payeeName}`,
              details: `Settled: ₹${Number(s.amount).toFixed(2)}`,
              timestamp: s.created_at,
              group_name: s.groups?.name || 'Group',
              group_id: s.group_id,
            })
          })
        )
      }

      // Sort logs by timestamp desc
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setRecentActivity(logs.slice(0, 15))
    } catch (err) {
      console.error('Error fetching recent activity:', err)
    }
  }

  // Sync dashboard stats
  useEffect(() => {
    if (!profile || groups.length === 0) {
      setDashboardStats({
        totalOwedToYou: 0,
        totalYouOwe: 0,
        netBalance: 0,
        debtsSummary: [],
      })
      return
    }

    const calculateDashboardStats = async () => {
      let totalOwedToYou = 0
      let totalYouOwe = 0
      const debtsSummary: { type: 'owe' | 'owed'; user: string; amount: number; groupId: string; groupName: string }[] = []

      // For each group, fetch members and calculate balances
      await Promise.all(
        groups.map(async (g) => {
          // Fetch members
          const { data: mData } = await supabase.from('group_members').select('profile_id, profiles(id, name, email, expense_id)').eq('group_id', g.id)
          const members = (mData || []).map((m: any) => m.profiles).filter(Boolean) as Profile[]

          // Fetch expenses and splits
          const { data: eData } = await supabase.from('expenses').select('id, amount, paid_by').eq('group_id', g.id)
          const expenses = eData || []

          const expenseSplitsList = await Promise.all(
            expenses.map(async (e) => {
              const { data: sData } = await supabase.from('expense_splits').select('profile_id, share_amount').eq('expense_id', e.id)
              return { expenseId: e.id, splits: sData || [] }
            })
          )

          // Fetch settlements
          const { data: sData } = await supabase.from('settlements').select('payer_id, payee_id, amount').eq('group_id', g.id)
          const settlements = sData || []

          // Compute balances
          const balances: Record<string, number> = {}
          members.forEach((m) => {
            balances[m.id] = 0
          })

          expenses.forEach((exp) => {
            const paidBy = exp.paid_by
            if (balances[paidBy] !== undefined) balances[paidBy] += Number(exp.amount)
            const splits = expenseSplitsList.find((es) => es.expenseId === exp.id)?.splits || []
            splits.forEach((split) => {
              if (balances[split.profile_id] !== undefined) {
                balances[split.profile_id] -= Number(split.share_amount)
              }
            })
          })

          settlements.forEach((set) => {
            if (balances[set.payer_id] !== undefined) balances[set.payer_id] += Number(set.amount)
            if (balances[set.payee_id] !== undefined) balances[set.payee_id] -= Number(set.amount)
          })

          // Calculate simplified debts
          const debts = calculateSimplifiedDebts(members, balances)

          // Filter debts involving "You"
          debts.forEach((debt) => {
            if (debt.from === profile.id) {
              totalYouOwe += debt.amount
              debtsSummary.push({
                type: 'owe',
                user: debt.toName,
                amount: debt.amount,
                groupId: g.id,
                groupName: g.name,
              })
            } else if (debt.to === profile.id) {
              totalOwedToYou += debt.amount
              debtsSummary.push({
                type: 'owed',
                user: debt.fromName,
                amount: debt.amount,
                groupId: g.id,
                groupName: g.name,
              })
            }
          })
        })
      )

      setDashboardStats({
        totalOwedToYou: Number(totalOwedToYou.toFixed(2)),
        totalYouOwe: Number(totalYouOwe.toFixed(2)),
        netBalance: Number((totalOwedToYou - totalYouOwe).toFixed(2)),
        debtsSummary,
      })
    }

    calculateDashboardStats()
  }, [profile, groups, groupDetails])

  // Trigger loading of groups on profile load
  useEffect(() => {
    if (profile) {
      fetchGroups()
      fetchRecentActivity()
    } else {
      setGroups([])
      setGroupDetails(null)
      setRecentActivity([])
    }
  }, [profile])

  return (
    <DataContext.Provider
      value={{
        groups,
        recentActivity,
        loadingGroups,
        groupDetails,
        loadingGroupDetails,
        dashboardStats,
        fetchGroups,
        fetchGroupDetails,
        createGroup,
        searchUserByExpenseId,
        addMemberToGroup,
        removeMemberFromGroup,
        createExpense,
        deleteExpense,
        createSettlement,
        fetchRecentActivity,
        error,
        clearError,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
