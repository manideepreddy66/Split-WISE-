import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Copy, Check, Eye, EyeOff } from 'lucide-react'

export const AuthScreens: React.FC = () => {
  const { signUp, signIn, error, clearError, loading } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (isLogin) {
        await signIn(email, password)
      } else {
        await signUp(name, email, password)
      }
    } catch (err) {
      // Errors are handled and set in context
    }
  }

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center max-w-md w-full mx-auto p-4 z-10">
      <div className="glass-panel rounded-[20px] p-8 w-full shadow-2xl relative overflow-hidden transition-all duration-300">
        
        {/* Decorative backdrop blobs */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>

        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-xl shadow-indigo-600/20">
            X
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            {isLogin ? 'Welcome to SplitX' : 'Create Account'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isLogin ? 'Sleek expense management' : 'Get started with your smart split hub'}
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-[12px] bg-red-500/10 border border-red-500/20 text-red-500 text-xs text-center flex justify-between items-center">
            <span>{error}</span>
            <button onClick={clearError} className="font-semibold text-red-400 hover:text-red-300 ml-2">Dismiss</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 ml-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Craig Federighi"
                className="w-full glass-input rounded-[14px] px-4 py-3 text-sm focus:outline-none focus:border-indigo-600 focus:ring-3 focus:ring-indigo-600/15"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 ml-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="craig@apple.com"
              className="w-full glass-input rounded-[14px] px-4 py-3 text-sm focus:outline-none focus:border-indigo-600 focus:ring-3 focus:ring-indigo-600/15"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 ml-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full glass-input rounded-[14px] pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-indigo-600 focus:ring-3 focus:ring-indigo-600/15"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-medium text-sm py-3 px-4 rounded-[14px] shadow-lg shadow-indigo-600/20 transition-all transform active:scale-[0.98] mt-2 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : isLogin ? (
              'Sign In'
            ) : (
              'Complete Registration'
            )}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                clearError()
              }}
              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              {isLogin ? 'Create one' : 'Log In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
