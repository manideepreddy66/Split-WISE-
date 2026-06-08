import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { Expense } from '../types/database.types'
import { X, Trash2, Calendar, FileText, ExternalLink, Image } from 'lucide-react'

interface ExpenseDetailsModalProps {
  expense: Expense | null
  isOpen: boolean
  onClose: () => void
}

export const ExpenseDetailsModal: React.FC<ExpenseDetailsModalProps> = ({
  expense,
  isOpen,
  onClose,
}) => {
  const { profile } = useAuth()
  const { deleteExpense } = useData()
  const [deleting, setDeleting] = useState(false)

  if (!isOpen || !expense) return null

  // Check if receipt is PDF or Image
  const isPdf = expense.receipt_url?.toLowerCase().endsWith('.pdf')
  const hasReceipt = !!expense.receipt_url

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this expense? This will recalculate everyone\'s balances.')) {
      setDeleting(true)
      try {
        await deleteExpense(expense.id)
        onClose()
      } catch (err) {
        // Caught in context
      } finally {
        setDeleting(false)
      }
    }
  }

  // Get initials for profile badge
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Cast splits
  const splits = (expense as any).splits || []

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md rounded-[20px] p-6 shadow-2xl relative overflow-hidden transform scale-100 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold tracking-tight">Expense Details</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-gray-200/50 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5">
          {/* Header Summary */}
          <div className="text-center p-4 bg-white/30 dark:bg-white/5 rounded-2xl border border-gray-200/10">
            <h4 className="text-base font-bold text-gray-800 dark:text-gray-100">{expense.title}</h4>
            <h2 className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
              ₹{Number(expense.amount).toFixed(2)}
            </h2>
            <p className="text-[10px] text-gray-400 mt-2 flex items-center justify-center gap-1">
              <Calendar size={12} />
              Paid on {new Date(expense.created_at).toLocaleDateString([], { dateStyle: 'medium' })}
            </p>
          </div>

          {/* Who Paid */}
          <div className="flex justify-between items-center py-2 border-b border-gray-200/10 text-sm">
            <span className="text-gray-400">Paid By</span>
            <span className="font-semibold text-gray-800 dark:text-white">
              {expense.paid_by === profile?.id ? 'You' : expense.profiles?.name || 'Group Member'}
            </span>
          </div>

          {/* Splits List */}
          <div className="space-y-2.5">
            <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Split Breakdown Share
            </span>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {splits.map((split: any) => (
                <div
                  key={split.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-white/20 dark:bg-white/5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-[10px] font-bold">
                      {getInitials(split.profiles?.name || 'M')}
                    </div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {split.profiles?.name} {split.profile_id === profile?.id ? '(You)' : ''}
                    </span>
                  </div>
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    ₹{Number(split.share_amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {expense.notes && (
            <div className="p-3 bg-white/20 dark:bg-white/5 rounded-xl border border-gray-200/5 text-xs text-gray-600 dark:text-gray-300">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Notes / Context
              </span>
              <p className="whitespace-pre-wrap">{expense.notes}</p>
            </div>
          )}

          {/* Receipt Viewer */}
          {hasReceipt && (
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                {isPdf ? <FileText size={12} /> : <Image size={12} />} Receipt Capture
              </span>
              {isPdf ? (
                <a
                  href={expense.receipt_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-3 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-semibold border border-indigo-500/15 transition-all"
                >
                  View PDF Document <ExternalLink size={14} />
                </a>
              ) : (
                <div className="relative group rounded-xl overflow-hidden border border-gray-200/10 bg-black/10 flex justify-center items-center p-1">
                  <img
                    src={expense.receipt_url!}
                    alt="Receipt"
                    className="max-h-52 object-contain rounded-lg shadow-sm"
                  />
                  <a
                    href={expense.receipt_url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity"
                  >
                    Open Full Image <ExternalLink size={12} className="ml-1" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Delete Button */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-[14px] border border-gray-200/20 text-sm font-medium hover:bg-white/20 transition-all cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 py-2.5 bg-red-600/10 hover:bg-red-600 text-red-600 hover:text-white rounded-[14px] text-sm font-semibold border border-red-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Trash2 size={16} />
              {deleting ? 'Deleting...' : 'Delete Entry'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
