import React, { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider, useData } from './context/DataContext'
import { Sidebar } from './components/Sidebar'
import { MobileNav } from './components/MobileNav'
import { Dashboard } from './components/Dashboard'
import { GroupDetailsView } from './components/GroupDetailsView'
import { ActivityFeed } from './components/ActivityFeed'
import { ProfileView } from './components/ProfileView'
import { AuthScreens } from './components/AuthScreens'
import { ExpenseModal } from './components/ExpenseModal'
import { ExpenseDetailsModal } from './components/ExpenseDetailsModal'
import { Expense } from './types/database.types'

function AppContent() {
  const { user, loading: authLoading } = useAuth()
  const { error: dataError, clearError: clearDataError } = useData()

  const [activeScreen, setActiveScreen] = useState('dashboard')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [showExpenseModal, setShowExpenseModal] = useState(false)

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const cached = localStorage.getItem('theme')
    if (cached === 'light' || cached === 'dark') return cached
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  // Sync theme with html root class
  useEffect(() => {
    const html = document.documentElement
    if (theme === 'dark') {
      html.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      html.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'))
  }

  // Fullscreen loader while checking session
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0e0e12] flex flex-col items-center justify-center text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <svg className="animate-spin h-8 w-8 text-indigo-600 mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-sm text-gray-500 dark:text-gray-400">Verifying session...</p>
      </div>
    )
  }

  // Non-authenticated layout
  if (!user) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0e0e12] flex flex-col justify-center items-center overflow-x-hidden antialiased relative transition-colors duration-300">
        <div className="fixed -top-40 -left-40 w-96 h-96 bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none z-0"></div>
        <div className="fixed bottom-10 right-10 w-96 h-96 bg-emerald-400/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none z-0"></div>
        <AuthScreens />
      </div>
    )
  }

  const handleGroupSelection = (groupId: string) => {
    setSelectedGroupId(groupId)
    setActiveScreen('group')
  }

  const handleExpenseSelection = (expense: Expense) => {
    setSelectedExpense(expense)
  }

  const triggerAddExpense = () => {
    if (!selectedGroupId) {
      alert('Please select or create a group from the dashboard first!')
      return
    }
    setShowExpenseModal(true)
  }

  return (
    <div className="bg-[#f5f5f7] dark:bg-[#0e0e12] text-gray-900 dark:text-gray-100 min-h-screen flex flex-col md:flex-row overflow-x-hidden antialiased selection:bg-indigo-200 transition-colors duration-300 w-full">
      {/* Blur elements */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none z-0"></div>
      <div className="fixed bottom-10 right-10 w-96 h-96 bg-emerald-400/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none z-0"></div>

      {/* Desktop Navigation */}
      <Sidebar
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
        setSelectedGroupId={setSelectedGroupId}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
        selectedGroupId={selectedGroupId}
        onAddExpenseClick={triggerAddExpense}
      />

      {/* Content wrapper */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 mb-24 md:mb-0 z-10 flex flex-col justify-start">
        {dataError && (
          <div className="mb-5 p-3 rounded-[12px] bg-red-500/10 border border-red-500/20 text-red-500 text-xs text-center flex justify-between items-center">
            <span>{dataError}</span>
            <button onClick={clearDataError} className="font-semibold text-red-400 hover:text-red-300 ml-2">Dismiss</button>
          </div>
        )}

        {activeScreen === 'dashboard' && (
          <Dashboard
            onGroupClick={handleGroupSelection}
            onAddExpenseClick={triggerAddExpense}
            theme={theme}
          />
        )}

        {activeScreen === 'group' && selectedGroupId && (
          <GroupDetailsView
            groupId={selectedGroupId}
            onAddExpenseClick={triggerAddExpense}
            onExpenseClick={handleExpenseSelection}
          />
        )}

        {activeScreen === 'activity' && (
          <ActivityFeed onGroupClick={handleGroupSelection} />
        )}

        {activeScreen === 'profile' && (
          <ProfileView theme={theme} toggleTheme={toggleTheme} />
        )}
      </main>

      {/* Add Expense Overlay */}
      {selectedGroupId && (
        <ExpenseModal
          groupId={selectedGroupId}
          isOpen={showExpenseModal}
          onClose={() => setShowExpenseModal(false)}
        />
      )}

      {/* Expense Detail Overlay */}
      <ExpenseDetailsModal
        expense={selectedExpense}
        isOpen={!!selectedExpense}
        onClose={() => setSelectedExpense(null)}
      />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  )
}
