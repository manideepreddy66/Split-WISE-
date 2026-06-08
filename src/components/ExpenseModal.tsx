import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { Profile } from '../types/database.types'
import { X, UploadCloud, AlertCircle, CheckCircle } from 'lucide-react'

interface ExpenseModalProps {
  groupId: string
  isOpen: boolean
  onClose: () => void
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  groupId,
  isOpen,
  onClose,
}) => {
  const { profile } = useAuth()
  const { groupDetails, createExpense } = useData()

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [splitType, setSplitType] = useState<'equal' | 'exact' | 'percentage'>('equal')
  
  // Member split values: maps profileId -> checkbox selection / value (share amount or percentage)
  const [memberSelections, setMemberSelections] = useState<Record<string, boolean>>({})
  const [memberValues, setMemberValues] = useState<Record<string, string>>({})
  
  // File upload state
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const members = groupDetails?.members || []

  // Initialize form when group details load or modal opens
  useEffect(() => {
    if (isOpen && members.length > 0) {
      setTitle('')
      setAmount('')
      setNotes('')
      setPaidBy(profile?.id || members[0]?.id || '')
      setSplitType('equal')
      setReceiptFile(null)
      setValidationError(null)

      // Check all members by default for equal split
      const selections: Record<string, boolean> = {}
      const values: Record<string, string> = {}
      members.forEach((m) => {
        selections[m.id] = true
        values[m.id] = ''
      })
      setMemberSelections(selections)
      setMemberValues(values)
    }
  }, [isOpen, groupDetails])

  if (!isOpen || !groupDetails) return null

  const handleCheckboxChange = (profileId: string) => {
    setMemberSelections((prev) => ({
      ...prev,
      [profileId]: !prev[profileId],
    }))
  }

  const handleValueChange = (profileId: string, value: string) => {
    setMemberValues((prev) => ({
      ...prev,
      [profileId]: value,
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        alert('Only JPG, PNG and PDF receipts are allowed.')
        return
      }
      // Limit size to 5MB
      if (file.size > 5 * 1024 * 1024) {
        alert('Receipt size must be smaller than 5MB.')
        return
      }
      setReceiptFile(file)
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)
    const totalAmount = parseFloat(amount)
    
    if (isNaN(totalAmount) || totalAmount <= 0) {
      setValidationError('Please enter a valid expense amount.')
      return
    }

    const participatingMembers = members.filter((m) => memberSelections[m.id])
    if (participatingMembers.length === 0) {
      setValidationError('At least one member must be selected for the split.')
      return
    }

    // Process splits based on type and validate
    const splitsData: { profileId: string; value: number }[] = []

    if (splitType === 'equal') {
      participatingMembers.forEach((m) => {
        splitsData.push({
          profileId: m.id,
          value: totalAmount / participatingMembers.length,
        })
      })
    } else if (splitType === 'exact') {
      let sum = 0
      for (const m of members) {
        const valStr = memberValues[m.id] || '0'
        const val = parseFloat(valStr) || 0
        if (val < 0) {
          setValidationError('Split shares cannot be negative.')
          return
        }
        if (val > 0) {
          splitsData.push({ profileId: m.id, value: val })
          sum += val
        }
      }
      // Check if sum matches total amount within small margin (cents)
      if (Math.abs(sum - totalAmount) > 0.02) {
        setValidationError(`The sum of split shares (₹${sum.toFixed(2)}) must equal the total amount (₹${totalAmount.toFixed(2)}).`)
        return
      }
    } else if (splitType === 'percentage') {
      let sumPct = 0
      for (const m of members) {
        const valStr = memberValues[m.id] || '0'
        const val = parseFloat(valStr) || 0
        if (val < 0) {
          setValidationError('Percentages cannot be negative.')
          return
        }
        if (val > 0) {
          splitsData.push({ profileId: m.id, value: val })
          sumPct += val
        }
      }
      if (Math.abs(sumPct - 100) > 0.05) {
        setValidationError(`The sum of percentages (${sumPct.toFixed(1)}%) must equal exactly 100%.`)
        return
      }
    }

    setUploading(true)
    try {
      await createExpense(
        groupId,
        title,
        totalAmount,
        notes,
        paidBy,
        splitType,
        splitsData,
        receiptFile
      )
      onClose()
    } catch (err) {
      // Caught in context
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-lg rounded-[20px] p-6 shadow-2xl relative overflow-hidden transform scale-100 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold tracking-tight">Create Group Expense</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-gray-200/50 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {validationError && (
          <div className="mb-4 p-3 rounded-[12px] bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
            <AlertCircle size={14} className="flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Expense Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Airbnb Accommodation"
                className="w-full glass-input rounded-[14px] px-3 py-2.5 text-sm focus:outline-none"
              />
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
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full glass-input rounded-[14px] px-3 py-2.5 text-sm font-semibold focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Paid By
              </label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full glass-input rounded-[14px] px-3 py-2.5 text-sm appearance-none focus:outline-none"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.id === profile?.id ? '(You)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Split Strategy Layout
              </label>
              <select
                value={splitType}
                onChange={(e) => setSplitType(e.target.value as any)}
                className="w-full glass-input rounded-[14px] px-3 py-2.5 text-sm appearance-none focus:outline-none"
              >
                <option value="equal">Split Equally (1/N)</option>
                <option value="exact">Exact Share Amounts</option>
                <option value="percentage">Exact Percentages</option>
              </select>
            </div>
          </div>

          {/* Dynamic Split Section */}
          <div className="border border-gray-200/10 rounded-[14px] p-4 bg-white/20 dark:bg-white/5 space-y-3">
            <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Split Distribution details
            </span>

            {splitType === 'equal' ? (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {members.map((m) => (
                  <label key={m.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/20 dark:hover:bg-white/5 cursor-pointer">
                    <span className="text-xs font-medium">{m.name}</span>
                    <input
                      type="checkbox"
                      checked={!!memberSelections[m.id]}
                      onChange={() => handleCheckboxChange(m.id)}
                      className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-4 p-1">
                    <span className="text-xs font-medium truncate max-w-[150px]">{m.name}</span>
                    <div className="relative w-28">
                      {splitType === 'exact' ? (
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">₹</span>
                      ) : null}
                      <input
                        type="number"
                        step="any"
                        placeholder="0"
                        value={memberValues[m.id] || ''}
                        onChange={(e) => handleValueChange(m.id, e.target.value)}
                        className={`w-full glass-input rounded-lg py-1 px-2.5 text-xs text-right font-medium focus:outline-none ${
                          splitType === 'exact' ? 'pl-6' : 'pr-6'
                        }`}
                      />
                      {splitType === 'percentage' ? (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              Notes / Context Meta
            </label>
            <textarea
              placeholder="Add details (e.g. food list, booking number)..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full glass-input rounded-[14px] px-3 py-2 text-sm focus:outline-none resize-none"
            ></textarea>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              Receipt Capture (JPG, PNG, PDF)
            </label>
            <div className="relative border border-dashed border-gray-300 dark:border-white/20 rounded-[14px] p-4 text-center cursor-pointer hover:bg-white/20 transition-all flex flex-col items-center justify-center">
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <UploadCloud className="w-7 h-7 text-indigo-500 mb-1" />
              {receiptFile ? (
                <span className="text-xs text-emerald-500 font-semibold truncate max-w-xs flex items-center gap-1">
                  <CheckCircle size={12} /> {receiptFile.name}
                </span>
              ) : (
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Drop document photo or browse files
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-[14px] border border-gray-200/20 text-sm font-medium hover:bg-white/20 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[14px] text-sm font-medium shadow-lg shadow-indigo-600/10 transition-all cursor-pointer flex items-center justify-center"
            >
              {uploading ? 'Saving Expense...' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
