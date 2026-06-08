import React from 'react'
import {
  LayoutDashboard,
  Users,
  Plus,
  Activity,
  User,
} from 'lucide-react'

interface MobileNavProps {
  activeScreen: string
  setActiveScreen: (screen: string) => void
  selectedGroupId: string | null
  onAddExpenseClick: () => void
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeScreen,
  setActiveScreen,
  selectedGroupId,
  onAddExpenseClick,
}) => {
  return (
    <nav className="fixed bottom-4 left-4 right-4 h-16 glass-panel rounded-[20px] shadow-xl z-50 px-4 flex items-center justify-around md:hidden">
      <button
        onClick={() => setActiveScreen('dashboard')}
        className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-colors ${
          activeScreen === 'dashboard'
            ? 'text-indigo-600 dark:text-indigo-400'
            : 'text-gray-400 hover:text-gray-500'
        }`}
      >
        <LayoutDashboard size={20} />
      </button>

      <button
        onClick={() => {
          if (selectedGroupId) {
            setActiveScreen('group')
          } else {
            setActiveScreen('dashboard')
            alert('Please select a group from the dashboard first!')
          }
        }}
        className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-colors ${
          activeScreen === 'group'
            ? 'text-indigo-600 dark:text-indigo-400'
            : 'text-gray-400 hover:text-gray-500'
        }`}
      >
        <Users size={20} />
      </button>

      {/* Floating Action Button */}
      <button
        onClick={onAddExpenseClick}
        className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 -translate-y-4 hover:bg-indigo-500 transition-transform active:scale-95 cursor-pointer"
      >
        <Plus size={24} />
      </button>

      <button
        onClick={() => setActiveScreen('activity')}
        className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-colors ${
          activeScreen === 'activity'
            ? 'text-indigo-600 dark:text-indigo-400'
            : 'text-gray-400 hover:text-gray-500'
        }`}
      >
        <Activity size={20} />
      </button>

      <button
        onClick={() => setActiveScreen('profile')}
        className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-colors ${
          activeScreen === 'profile'
            ? 'text-indigo-600 dark:text-indigo-400'
            : 'text-gray-400 hover:text-gray-500'
        }`}
      >
        <User size={20} />
      </button>
    </nav>
  )
}
