import React from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import {
  LayoutDashboard,
  Users,
  Activity,
  User,
  Moon,
  Sun,
  LogOut,
  ChevronRight,
} from 'lucide-react'

interface SidebarProps {
  activeScreen: string
  setActiveScreen: (screen: string) => void
  setSelectedGroupId: (id: string | null) => void
  theme: 'light' | 'dark'
  toggleTheme: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeScreen,
  setActiveScreen,
  setSelectedGroupId,
  theme,
  toggleTheme,
}) => {
  const { profile, signOut } = useAuth()
  const { groups } = useData()

  // Get initials for profile badge
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleGroupClick = (groupId: string) => {
    setSelectedGroupId(groupId)
    setActiveScreen('group')
  }

  return (
    <aside className="hidden md:flex flex-col w-64 h-[calc(100vh-2rem)] sticky top-4 left-4 my-4 ml-4 glass-panel rounded-[20px] p-6 z-40 justify-between">
      <div>
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-600/20">
            X
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
            SplitX
          </span>
        </div>

        <nav className="space-y-2">
          <button
            onClick={() => {
              setSelectedGroupId(null)
              setActiveScreen('dashboard')
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-[14px] font-medium transition-all cursor-pointer ${
              activeScreen === 'dashboard'
                ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/5'
            }`}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>

          <button
            onClick={() => {
              setActiveScreen('activity')
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-[14px] font-medium transition-all cursor-pointer ${
              activeScreen === 'activity'
                ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/5'
            }`}
          >
            <Activity size={18} />
            Activity Feed
          </button>

          <button
            onClick={() => {
              setActiveScreen('profile')
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-[14px] font-medium transition-all cursor-pointer ${
              activeScreen === 'profile'
                ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/5'
            }`}
          >
            <User size={18} />
            Profile
          </button>

          {/* Groups Divider / Label */}
          {groups.length > 0 && (
            <div className="pt-4 pb-1">
              <span className="px-4 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Active Groups
              </span>
            </div>
          )}

          {/* Active Groups List */}
          <div className="max-h-48 overflow-y-auto space-y-1">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => handleGroupClick(group.id)}
                className={`w-full flex items-center justify-between px-4 py-2 rounded-[12px] text-sm font-medium transition-all cursor-pointer ${
                  activeScreen === 'group' && group.id === group.id
                    ? 'bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-white/40 dark:hover:bg-white/5'
                }`}
              >
                <span className="truncate">{group.name}</span>
                <ChevronRight size={14} className="opacity-50" />
              </button>
            ))}
          </div>
        </nav>
      </div>

      <div className="pt-4 border-t border-gray-200/30 dark:border-white/5 space-y-3">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-[12px] text-sm text-gray-500 dark:text-gray-400 hover:bg-white/40 dark:hover:bg-white/5 transition-all cursor-pointer"
        >
          <span className="flex items-center gap-2">
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </span>
          <div className="w-8 h-4 bg-gray-300 dark:bg-indigo-600 rounded-full relative p-0.5 transition-all">
            <div
              className={`w-3 h-3 bg-white rounded-full transition-transform transform ${
                theme === 'dark' ? 'translate-x-4' : 'translate-x-0'
              }`}
            ></div>
          </div>
        </button>

        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center font-bold text-xs text-indigo-600 dark:text-indigo-400 ring-2 ring-white/40">
            {profile ? getInitials(profile.name) : 'U'}
          </div>
          <div className="truncate flex-1">
            <p className="text-xs font-semibold leading-tight truncate">
              {profile?.name}
            </p>
            <p className="text-[10px] text-gray-400 truncate">
              {profile?.email}
            </p>
          </div>
        </div>

        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-[12px] text-sm text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20 font-medium transition-all cursor-pointer"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
