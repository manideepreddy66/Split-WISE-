import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { Profile, Expense } from '../types/database.types'
import { Plus, Users, Receipt, Calendar, CreditCard, Trash2, Search, AlertTriangle, ArrowRight, CheckCircle } from 'lucide-react'

interface GroupDetailsViewProps {
  groupId: string
  onAddExpenseClick: () => void
  onExpenseClick: (expense: Expense) => void
}

export const GroupDetailsView: React.FC<GroupDetailsViewProps> = ({
  groupId,
  onAddExpenseClick,
  onExpenseClick,
}) => {
  const { profile } = useAuth()
  const {
    groupDetails,
    loadingGroupDetails,
    fetchGroupDetails,
    searchUserByExpenseId,
    addMemberToGroup,
    removeMemberFromGroup,
    createSettlement,
  } = useData()

  const [searchId, setSearchId] = useState('')
  const [searchedUser, setSearchedUser] = useState<Profile | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  
  // Settlement form state
  const [showSettleModal, setShowSettleModal] = useState(false)
  const [payerId, setPayerId] = useState('')
  const [payeeId, setPayeeId] = useState('')
  const [settleAmount, setSettleAmount] = useState('')
  const [settling, setSettling] = useState(false)

  useEffect(() => {
    fetchGroupDetails(groupId)
  }, [groupId])

  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchId.trim()) return
    setSearching(true)
    setSearchError(null)
    setSearchedUser(null)
    try {
      const user = await searchUserByExpenseId(searchId)
      if (user) {
        // Check if user is already a member
        const isMember = groupDetails?.members.some((m) => m.id === user.id)
        if (isMember) {
          setSearchError('User is already a member of this group.')
        } else {
          setSearchedUser(user)
        }
      } else {
        setSearchError('No user found with this Expense ID.')
      }
    } catch (err) {
      setSearchError('Error searching for user.')
    } finally {
      setSearching(false)
    }
  }

  const handleAddMember = async () => {
    if (!searchedUser) return
    try {
      await addMemberToGroup(groupId, searchedUser.id)
      setSearchedUser(null)
      setSearchId('')
    } catch (err) {
      // Caught in context
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    const memberBalance = groupDetails?.balances[memberId] || 0
    if (Math.abs(memberBalance) > 0.05) {
      alert('Cannot remove member with non-zero balance. Please settle up first!')
      return
    }
    if (confirm('Are you sure you want to remove this member from the group?')) {
      try {
        await removeMemberFromGroup(groupId, memberId)
      } catch (err) {
        // Caught in context
      }
    }
  }

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amountNum = parseFloat(settleAmount)
    if (isNaN(amountNum) || amountNum <= 0 || !payerId || !payeeId) return
    setSettling(true)
    try {
      await createSettlement(groupId, payerId, payeeId, amountNum)
      setShowSettleModal(false)
      setSettleAmount('')
      setPayerId('')
      setPayeeId('')
    } catch (err) {
      // Caught in context
    } finally {
      setSettling(false)
    }
  }

  const openSettleWithParams = (fromId: string, toId: string, amount: number) => {
    setPayerId(fromId)
    setPayeeId(toId)
    setSettleAmount(amount.toString())
    setShowSettleModal(true)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (loadingGroupDetails || !groupDetails) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-indigo-600 mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading group details...</p>
      </div>
    )
  }

  const { group, members, expenses, settlements, balances, debts } = groupDetails

  // Calculate total group pool spending
  const totalSpend = expenses.reduce((acc, exp) => acc + exp.amount, 0)

  return (
    <div className="flex flex-col space-y-6">
      
      {/* Group Info Header Banner */}
      <div className="glass-panel rounded-[20px] p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-2xl shadow-xl shadow-orange-500/10">
            🇯🇵
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
              <span className="text-xs bg-emerald-500/10 text-emerald-500 font-medium px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">
              Total Spending: ₹{totalSpend.toFixed(2)} • {members.length} Members
            </p>
          </div>
        </div>
        <div className="flex w-full md:w-auto gap-2 z-10">
          <button
            onClick={() => setShowSettleModal(true)}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm py-2.5 px-4 rounded-[14px] shadow-lg shadow-emerald-600/10 transition-all cursor-pointer"
          >
            <CreditCard size={16} /> Settle Up
          </button>
          <button
            onClick={onAddExpenseClick}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-2.5 px-5 rounded-[14px] shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus size={16} /> Add Expense
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Group Members & Search */}
        <div className="space-y-6">
          <div className="glass-panel rounded-[20px] p-5 flex flex-col justify-between min-h-[300px]">
            <div>
              <h3 className="text-sm font-semibold tracking-tight mb-4 flex items-center gap-2">
                <Users size={16} className="text-gray-400" /> Group Members
              </h3>
              <div className="space-y-3 mb-6">
                {members.map((member) => {
                  const bal = balances[member.id] || 0
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-white/30 dark:hover:bg-white/5 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                          {getInitials(member.name)}
                        </div>
                        <span className="text-sm font-medium">
                          {member.name} {member.id === profile?.id ? '(You)' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${
                          bal > 0.01
                            ? 'text-emerald-500'
                            : bal < -0.01
                            ? 'text-red-500'
                            : 'text-gray-400'
                        }`}>
                          {bal > 0.01 ? `+₹${bal.toFixed(2)}` : bal < -0.01 ? `-₹${Math.abs(bal).toFixed(2)}` : 'Settled'}
                        </span>
                        
                        {/* Option to remove member (only if not self, and balance is 0) */}
                        {member.id !== profile?.id && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Add Member section */}
            <div className="pt-4 border-t border-gray-200/20">
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Add Member by Expense ID
              </label>
              <form onSubmit={handleSearchUser} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="SPX-XXXXXX"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  className="flex-1 glass-input rounded-[12px] px-3 py-2 text-xs font-mono uppercase"
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 text-xs px-3 rounded-[12px] border border-gray-200/20 font-medium transition-all cursor-pointer"
                >
                  {searching ? '...' : <Search size={14} />}
                </button>
              </form>
              
              {searchError && (
                <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                  <AlertTriangle size={10} /> {searchError}
                </p>
              )}
              
              {searchedUser && (
                <div className="mt-3 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">{searchedUser.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{searchedUser.expense_id}</p>
                  </div>
                  <button
                    onClick={handleAddMember}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-2.5 py-1 rounded-lg font-medium cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Group simplified debts list */}
          <div className="glass-panel rounded-[20px] p-5">
            <h3 className="text-sm font-semibold tracking-tight mb-3">Simplified Debt Transfers</h3>
            {debts.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No balances to settle. All set! 🎉</p>
            ) : (
              <div className="space-y-3">
                {debts.map((debt, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white/20 dark:bg-white/5 border border-gray-200/5 flex flex-col space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{debt.fromName}</span>
                        <ArrowRight size={12} className="text-gray-400" />
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{debt.toName}</span>
                      </div>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">₹{debt.amount.toFixed(2)}</span>
                    </div>
                    {/* Quick action button to trigger settle modal with params */}
                    {(debt.from === profile?.id || debt.to === profile?.id) && (
                      <button
                        onClick={() => openSettleWithParams(debt.from, debt.to, debt.amount)}
                        className="w-full text-center py-1 rounded-lg bg-indigo-600/10 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-400 dark:hover:text-white text-[10px] font-semibold transition-all cursor-pointer"
                      >
                        Record Settlement
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Expenses & Settlements History */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Expenses list */}
          <div className="glass-panel rounded-[20px] p-5">
            <h3 className="text-sm font-semibold tracking-tight mb-4 flex items-center gap-2">
              <Receipt size={16} className="text-gray-400" /> Expense Records
            </h3>
            
            {expenses.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <Receipt className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400">No Expenses Logged</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-xs">
                  Create a new group expense to distribute pool charges among members.
                </p>
                <button
                  onClick={onAddExpenseClick}
                  className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-2 px-4 rounded-xl font-medium cursor-pointer"
                >
                  Add Expense
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {expenses.map((exp) => {
                  const paidByMe = exp.paid_by === profile?.id
                  const mySplit = exp.splits?.find((s) => s.profile_id === profile?.id)
                  const myShare = mySplit ? mySplit.share_amount : 0
                  
                  // Text representation of you lend / you owe
                  let lendingText = ''
                  let lendingClass = 'text-gray-400'
                  
                  if (paidByMe) {
                    const totalLent = exp.amount - myShare
                    lendingText = totalLent > 0 ? `You lent ₹${totalLent.toFixed(2)}` : 'You paid for yourself'
                    lendingClass = 'text-emerald-500'
                  } else {
                    lendingText = myShare > 0 ? `You owe ₹${myShare.toFixed(2)}` : 'Not involved'
                    lendingClass = myShare > 0 ? 'text-red-500' : 'text-gray-400'
                  }

                  return (
                    <div
                      key={exp.id}
                      onClick={() => onExpenseClick(exp)}
                      className="p-4 bg-white/40 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10 rounded-[16px] flex items-center justify-between cursor-pointer transition-all border border-transparent hover:border-gray-200/20"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center flex-shrink-0">
                          <Receipt size={18} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold truncate max-w-[200px]">{exp.title}</h4>
                          <p className="text-[10px] text-gray-400 truncate">
                            Paid by {paidByMe ? 'You' : exp.profiles?.name} •{' '}
                            {exp.split_type === 'equal'
                              ? 'Split Equally'
                              : exp.split_type === 'exact'
                              ? 'Exact Amounts'
                              : 'Percentages'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-sm font-bold block">₹{exp.amount.toFixed(2)}</span>
                        <span className={`text-[11px] font-medium ${lendingClass}`}>{lendingText}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Settlements History */}
          <div className="glass-panel rounded-[20px] p-5">
            <h3 className="text-sm font-semibold tracking-tight mb-4 flex items-center gap-2">
              <CheckCircle size={16} className="text-gray-400" /> Settlement Ledger History
            </h3>
            
            {settlements.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No settlements recorded yet.</p>
            ) : (
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {settlements.map((set) => {
                  const isPayerMe = set.payer_id === profile?.id
                  const isPayeeMe = set.payee_id === profile?.id
                  const payerName = isPayerMe ? 'You' : set.payer?.name
                  const payeeName = isPayeeMe ? 'You' : set.payee?.name

                  return (
                    <div
                      key={set.id}
                      className="p-3 bg-white/20 dark:bg-white/5 border border-gray-200/5 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-[10px]">
                          ✓
                        </div>
                        <span>
                          <span className="font-semibold">{payerName}</span> paid{' '}
                          <span className="font-semibold">{payeeName}</span>
                        </span>
                      </div>
                      <span className="font-bold text-emerald-500">₹{set.amount.toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Settle Up Modal */}
      {showSettleModal && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-[20px] p-6 shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold tracking-tight">Record a Payment</h3>
              <button
                onClick={() => setShowSettleModal(false)}
                className="p-1 rounded-lg bg-gray-200/50 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSettleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Who Paid?
                </label>
                <select
                  required
                  value={payerId}
                  onChange={(e) => setPayerId(e.target.value)}
                  className="w-full glass-input rounded-[14px] px-3 py-2.5 text-sm focus:outline-none"
                >
                  <option value="">Select payer</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.id === profile?.id ? '(You)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Who Received?
                </label>
                <select
                  required
                  value={payeeId}
                  onChange={(e) => setPayeeId(e.target.value)}
                  className="w-full glass-input rounded-[14px] px-3 py-2.5 text-sm focus:outline-none"
                >
                  <option value="">Select payee</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.id === profile?.id ? '(You)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  placeholder="0.00"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full glass-input rounded-[14px] px-3 py-2.5 text-sm font-semibold focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="flex-1 py-2.5 rounded-[14px] border border-gray-200/20 text-sm font-medium hover:bg-white/20 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settling}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[14px] text-sm font-medium shadow-lg shadow-emerald-600/10 transition-all cursor-pointer flex items-center justify-center"
                >
                  {settling ? 'Recording...' : 'Save Settlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
