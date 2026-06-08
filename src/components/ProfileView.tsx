import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Copy, Check, User, Mail, Sparkles, Moon, Sun, Save } from 'lucide-react'

interface ProfileViewProps {
  theme: 'light' | 'dark'
  toggleTheme: () => void
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  theme,
  toggleTheme,
}) => {
  const { profile, refreshProfile } = useAuth()
  
  const [name, setName] = useState(profile?.name || '')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleCopyId = () => {
    if (!profile) return
    navigator.clipboard.writeText(profile.expense_id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !name.trim()) return
    setSaving(true)
    setSuccessMsg(null)
    setErrorMsg(null)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: name.trim() })
        .eq('id', profile.id)

      if (error) throw error
      
      await refreshProfile()
      setSuccessMsg('Display name updated successfully!')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  // Get initials for profile badge
  const getInitials = (nameStr: string) => {
    return nameStr
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="max-w-xl w-full mx-auto flex flex-col space-y-6">
      
      {/* Account Info Header */}
      <div className="glass-panel rounded-[20px] p-6 text-center relative overflow-hidden">
        {/* Decorator light blob */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>

        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 mx-auto flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-indigo-600/20 mb-4">
          {profile ? getInitials(profile.name) : 'U'}
        </div>
        <h2 className="text-xl font-bold tracking-tight">{profile?.name}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-center gap-1">
          <Sparkles size={12} className="text-indigo-500" /> Premium Tier User
        </p>

        {/* Expense ID Box */}
        <div className="mt-6 p-4 bg-white/50 dark:bg-black/20 rounded-[16px] max-w-sm mx-auto border border-gray-200/20">
          <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Your Unique Expense ID
          </span>
          <div className="flex items-center justify-between bg-white dark:bg-white/5 px-4 py-2.5 rounded-xl border border-gray-200/10">
            <code className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400">
              {profile?.expense_id}
            </code>
            <button
              onClick={handleCopyId}
              className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Profile Editing & Settings */}
      <div className="glass-panel rounded-[20px] p-5 space-y-4">
        <h3 className="text-sm font-semibold tracking-tight">Account Parameters</h3>

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs text-center rounded-lg">
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs text-center rounded-lg">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              Display Name
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <User size={16} />
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full glass-input rounded-[14px] pl-10 pr-4 py-3 text-sm focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <Mail size={16} />
              </span>
              <input
                type="email"
                disabled
                value={profile?.email || ''}
                className="w-full glass-input rounded-[14px] pl-10 pr-4 py-3 text-sm opacity-50 cursor-not-allowed"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 ml-1">
              Email addresses cannot be modified. Contact support to change email verification.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving || !name.trim() || name.trim() === profile?.name}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm py-3 px-4 rounded-[14px] shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Save size={16} />
            {saving ? 'Saving changes...' : 'Save Settings'}
          </button>
        </form>
      </div>

      {/* Theme Toggler Settings card */}
      <div className="glass-panel rounded-[20px] p-5 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold">Interface Theme Mode</h4>
          <p className="text-xs text-gray-400 mt-0.5">Toggle light and dark color preferences</p>
        </div>
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 p-2.5 rounded-xl bg-white/40 dark:bg-white/5 border border-gray-200/10 font-medium transition-all text-xs cursor-pointer"
        >
          {theme === 'light' ? (
            <span className="flex items-center gap-1.5 text-gray-700">
              <Moon size={14} /> Dark Mode
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-yellow-400">
              <Sun size={14} /> Light Mode
            </span>
          )}
        </button>
      </div>

    </div>
  )
}
