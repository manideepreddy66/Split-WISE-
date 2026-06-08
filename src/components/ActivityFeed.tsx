import React, { useEffect } from 'react'
import { useData } from '../context/DataContext'
import { Activity, RefreshCw, PlusCircle, CreditCard, ChevronRight } from 'lucide-react'

interface ActivityFeedProps {
  onGroupClick: (groupId: string) => void
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ onGroupClick }) => {
  const { recentActivity, fetchRecentActivity } = useData()

  useEffect(() => {
    fetchRecentActivity()
  }, [])

  return (
    <div className="max-w-2xl w-full mx-auto flex flex-col space-y-6">
      
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="text-indigo-600 dark:text-indigo-400" /> Activity Feed
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Real-time settlement transaction ledger logs
          </p>
        </div>
        <button
          onClick={fetchRecentActivity}
          className="p-2 rounded-xl bg-white/40 dark:bg-white/5 border border-gray-200/10 hover:bg-white/70 dark:hover:bg-white/10 transition-all cursor-pointer text-gray-500 dark:text-gray-400"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Activity Timeline Card */}
      <div className="glass-panel rounded-[20px] p-5 space-y-4 relative">
        {recentActivity.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center justify-center">
            <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-400">No activity recorded yet.</p>
            <p className="text-xs text-gray-500 mt-1">
              Add transactions inside groups to populate this feed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div
                key={activity.id}
                onClick={() => onGroupClick(activity.group_id)}
                className="relative flex gap-4 pb-4 border-b border-gray-200/10 last:border-b-0 last:pb-0 last:mb-0 cursor-pointer hover:bg-white/20 dark:hover:bg-white/5 p-2 rounded-xl transition-all"
              >
                {/* Visual timeline connectors */}
                {index < recentActivity.length - 1 && (
                  <span
                    className="absolute left-6 top-11 bottom-0 w-0.5 bg-gray-200 dark:bg-white/5 pointer-events-none"
                    style={{ height: 'calc(100% - 10px)' }}
                  />
                )}

                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 z-10 ${
                  activity.type === 'expense'
                    ? 'bg-indigo-500/10 text-indigo-600'
                    : 'bg-emerald-500/10 text-emerald-500'
                }`}>
                  {activity.type === 'expense' ? <PlusCircle size={18} /> : <CreditCard size={18} />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {activity.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <span>{activity.details}</span>
                    <span>•</span>
                    <span className="font-semibold text-indigo-500">{activity.group_name}</span>
                  </p>
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    {new Date(activity.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>

                <div className="self-center text-gray-400 opacity-50 flex-shrink-0">
                  <ChevronRight size={16} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
