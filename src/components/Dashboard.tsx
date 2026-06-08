import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { Chart, registerables } from 'chart.js'
import { Plus, ArrowUpRight, ArrowDownLeft, TrendingUp, Users, PlusCircle } from 'lucide-react'

// Register Chart.js modules
Chart.register(...registerables)

interface DashboardProps {
  onGroupClick: (groupId: string) => void
  onAddExpenseClick: () => void
  theme: 'light' | 'dark'
}

export const Dashboard: React.FC<DashboardProps> = ({
  onGroupClick,
  onAddExpenseClick,
  theme,
}) => {
  const { profile } = useAuth()
  const { groups, dashboardStats, createGroup, recentActivity } = useData()
  
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)
  
  const chartRef = useRef<HTMLCanvasElement | null>(null)
  const chartInstance = useRef<Chart | null>(null)

  // Initialize and update the chart
  useEffect(() => {
    if (!chartRef.current) return

    // Destroy existing chart instance if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return

    const isDark = theme === 'dark'

    // Compute some mock trend data based on user net balance for rich appearance
    const netBal = dashboardStats.netBalance
    const baseData = [0, netBal * 0.3, netBal * 0.2, netBal * 0.7, netBal]

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['1 Week Ago', '5 Days Ago', '3 Days Ago', 'Yesterday', 'Today'],
        datasets: [
          {
            label: 'Net Balance',
            data: baseData,
            borderColor: '#4f46e5',
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#4f46e5',
            tension: 0.35,
            fill: true,
            backgroundColor: (context) => {
              const chart = context.chart
              const { ctx, chartArea } = chart
              if (!chartArea) return 'transparent'
              const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
              gradient.addColorStop(0, 'rgba(79, 70, 229, 0.24)')
              gradient.addColorStop(1, 'rgba(79, 70, 229, 0.0)')
              return gradient
            },
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: isDark ? '#9ca3af' : '#6b7280',
              font: { size: 10 },
            },
          },
          y: {
            grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
            ticks: {
              color: isDark ? '#9ca3af' : '#6b7280',
              font: { size: 10 },
            },
          },
        },
      },
    })

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [theme, dashboardStats.netBalance])

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim()) return
    setCreatingGroup(true)
    try {
      const newId = await createGroup(newGroupName)
      setNewGroupName('')
      setShowCreateGroup(false)
      onGroupClick(newId) // Open newly created group details
    } catch (err) {
      // Error is caught in context
    } finally {
      setCreatingGroup(false)
    }
  }

  // Get first letter of group for emoji/icon placeholder
  const getGroupIcon = (name: string) => {
    const emojis = ['🏠', '🇯🇵', '🍔', '✈️', '🚗', '🍿', '🍻', '🛍️', '💡']
    const charCodeSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return emojis[charCodeSum % emojis.length]
  }

  return (
    <div className="flex flex-col space-y-6">
      
      {/* Welcome & Stats Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
            Welcome back, {profile?.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onAddExpenseClick}
            className="hidden md:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-2.5 px-4 rounded-[14px] shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus size={16} /> Add Expense
          </button>
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 ring-2 ring-white/40">
            {profile ? profile.name.slice(0, 2).toUpperCase() : 'U'}
          </div>
        </div>
      </div>

      {/* Balance Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel rounded-[20px] p-5 relative overflow-hidden">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Total Owed to You
          </span>
          <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            ₹{dashboardStats.totalOwedToYou.toFixed(2)}
          </h3>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
            <ArrowUpRight className="w-8 h-8 text-emerald-500/30" />
          </div>
        </div>
        <div className="glass-panel rounded-[20px] p-5 relative overflow-hidden">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Total You Owe
          </span>
          <h3 className="text-2xl font-bold text-red-500 dark:text-red-400 mt-2">
            ₹{dashboardStats.totalYouOwe.toFixed(2)}
          </h3>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
            <ArrowDownLeft className="w-8 h-8 text-red-500/30" />
          </div>
        </div>
        <div className={`glass-panel rounded-[20px] p-5 border-l-4 relative overflow-hidden ${
          dashboardStats.netBalance >= 0 ? 'border-l-emerald-500' : 'border-l-red-500'
        }`}>
          <span className={`text-xs font-semibold uppercase tracking-wider ${
            dashboardStats.netBalance >= 0 ? 'text-emerald-500' : 'text-red-500'
          }`}>
            Net Balance
          </span>
          <h3 className={`text-2xl font-bold mt-2 ${
            dashboardStats.netBalance >= 0 ? 'text-emerald-500' : 'text-red-500'
          }`}>
            {dashboardStats.netBalance >= 0 ? '+' : ''}₹{dashboardStats.netBalance.toFixed(2)}
          </h3>
        </div>
      </div>

      {/* Charts and Active Groups Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend line chart */}
        <div className="glass-panel rounded-[20px] p-5 lg:col-span-2 flex flex-col justify-between min-h-[300px]">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-semibold tracking-tight">Net Balance Trend</span>
            <span className="text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
              <TrendingUp size={12} /> Live Sync
            </span>
          </div>
          <div className="flex-1 relative w-full h-48">
            <canvas ref={chartRef}></canvas>
          </div>
        </div>

        {/* Groups widget */}
        <div className="glass-panel rounded-[20px] p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold tracking-tight">Your Groups</span>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} /> New Group
              </button>
            </div>
            
            {groups.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center justify-center">
                <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-xs text-gray-400">No active groups yet.</p>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="mt-3 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium cursor-pointer"
                >
                  Create one now
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    onClick={() => onGroupClick(group.id)}
                    className="p-3 bg-white/40 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10 rounded-[14px] flex items-center justify-between cursor-pointer transition-all border border-transparent hover:border-gray-200/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-semibold text-sm">
                        {getGroupIcon(group.name)}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium truncate max-w-[120px]">{group.name}</h4>
                        <p className="text-xs text-gray-400">{group.members_count} Members</p>
                      </div>
                    </div>
                    {/* Add indicator whether you owe or are owed in this group */}
                    <span className="text-xs text-gray-400 font-medium">View details</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global Activity Feed & Debts List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Simplified debts split list */}
        <div className="glass-panel rounded-[20px] p-5">
          <h3 className="text-sm font-semibold tracking-tight mb-4">Summary of Debts</h3>
          {dashboardStats.debtsSummary.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-400">
              You are completely settled up globally! 🎉
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {dashboardStats.debtsSummary.map((debt, idx) => (
                <div
                  key={idx}
                  onClick={() => onGroupClick(debt.groupId)}
                  className="p-3 rounded-xl bg-white/30 dark:bg-white/5 border border-gray-200/10 flex items-center justify-between cursor-pointer hover:bg-white/40 dark:hover:bg-white/10 transition-colors"
                >
                  <div>
                    <p className="text-xs text-gray-400">{debt.groupName}</p>
                    <p className="text-sm font-medium">
                      {debt.type === 'owe' ? (
                        <span>You owe <span className="font-semibold">{debt.user}</span></span>
                      ) : (
                        <span><span className="font-semibold">{debt.user}</span> owes you</span>
                      )}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${
                    debt.type === 'owe' ? 'text-red-500' : 'text-emerald-500'
                  }`}>
                    {debt.type === 'owe' ? '-₹' : '+₹'}{debt.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Global Recent Expenses Feed */}
        <div className="glass-panel rounded-[20px] p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold tracking-tight mb-4">Global Activity Logs</h3>
          {recentActivity.length === 0 ? (
            <div className="py-10 text-center text-xs text-gray-400">
              No recent activity found. Add expenses or settle up to start!
            </div>
          ) : (
            <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  onClick={() => onGroupClick(activity.group_id)}
                  className="flex gap-4 pb-4 border-b border-gray-200/10 last:border-b-0 last:pb-0 cursor-pointer hover:bg-white/20 dark:hover:bg-white/5 p-2 rounded-xl transition-all"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    activity.type === 'expense'
                      ? 'bg-indigo-500/10 text-indigo-600'
                      : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {activity.type === 'expense' ? <PlusCircle size={18} /> : <ArrowUpRight size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {activity.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {activity.details} • <span className="font-medium text-indigo-500">{activity.group_name}</span>
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-400 self-center">
                    {new Date(activity.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-[20px] p-6 shadow-2xl relative overflow-hidden transform transition-all scale-100">
            <h3 className="text-lg font-bold tracking-tight mb-4">Create New SplitX Group</h3>
            <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Trip to Tokyo, Roommates 402"
                  className="w-full glass-input rounded-[14px] px-3 py-2.5 text-sm focus:outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroup(false)}
                  className="flex-1 py-2.5 rounded-[14px] border border-gray-200/20 text-sm font-medium hover:bg-white/20 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingGroup}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[14px] text-sm font-medium shadow-lg shadow-indigo-600/10 transition-all cursor-pointer flex items-center justify-center"
                >
                  {creatingGroup ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
