'use client'

import { useState } from 'react'
import { login } from '@/app/actions/auth'
import InstallAppButton from './InstallAppButton'

const translations = {
  'auth.platform': ' ',
  'auth.signInTitle': 'Sign In',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.signIn': 'Sign In',
  'auth.signingIn': 'Signing In...',
  'auth.contactAdmin': 'Contact your administrator for access.',
}

export default function LoginPage() {
  const [error, setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const t = (key: string) => translations[key as keyof typeof translations] || key

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  const googleConic =
    'conic-gradient(from 0deg, #4285F4, #EA4335, #FBBC05, #34A853, #4285F4)'

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-slate-100 via-white to-slate-200">
      {/* Crystal-white soft light overlays */}
      <div className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(1200px 500px at 50% -10%, rgba(255,255,255,0.9), transparent), radial-gradient(800px 400px at 80% 110%, rgba(226,232,240,0.7), transparent)' }} />

      <div className="relative w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)] ring-1 ring-black/5 mb-4 overflow-hidden">
            <img
              src="/icons/icon-512.png"
              alt="Community Family Tree Space"
              className="w-full h-full object-contain p-1.5"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Community Family Tree Space</h1>
          <p className="text-gray-500 mt-1 text-sm">{t('auth.platform')}</p>
        </div>

        {/* Animated Google-colour border wrapper */}
        <div className="relative">
          {/* Crisp rotating border ring (no background glow) */}
          <div className="relative rounded-2xl p-[3px] overflow-hidden">
            <div className="absolute inset-[-60%] animate-[spin_6s_linear_infinite]"
              style={{ background: googleConic }} />

            {/* Raised / embossed card — lifted higher */}
            <div className="relative z-10 bg-white rounded-[14px] p-8
              shadow-[0_36px_70px_-18px_rgba(0,0,0,0.45),0_12px_28px_-10px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.95)]">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">{t('auth.signInTitle')}</h2>

              <form action={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('auth.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('auth.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md disabled:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {loading ? t('auth.signingIn') : t('auth.signIn')}
            </button>
              </form>
            </div>
          </div>
        </div>

        {/* Install as App (Android / Desktop / iOS) */}
        <InstallAppButton />

        <p className="text-center text-gray-400 text-xs mt-6">
          {t('auth.contactAdmin')}
        </p>
      </div>
    </div>
  )
}
