'use client'

import { useEffect, useState } from 'react'

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export default function InstallAppButton() {
  const [deferred, setDeferred]   = useState<BIPEvent | null>(null)
  const [isIOS, setIsIOS]         = useState(false)
  const [standalone, setStandalone] = useState(false)
  const [showHelp, setShowHelp]   = useState(false)

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true
    setStandalone(isStandalone)

    const ua = navigator.userAgent || ''
    setIsIOS(/iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream)

    const onBIP = (e: Event) => { e.preventDefault(); setDeferred(e as BIPEvent) }
    window.addEventListener('beforeinstallprompt', onBIP)

    const onInstalled = () => setStandalone(true)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // Already running as an installed app → no need to show anything
  if (standalone) return null

  async function handleClick() {
    if (deferred) {
      // Android / Desktop Chrome / Edge — native install prompt
      await deferred.prompt()
      await deferred.userChoice
      setDeferred(null)
    } else {
      // iOS Safari (no prompt API) or prompt not yet available → show manual steps
      setShowHelp(v => !v)
    }
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={handleClick}
        className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/25 font-semibold py-2.5 px-4 rounded-lg transition-colors backdrop-blur-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
        </svg>
        Install App
      </button>

      {showHelp && (
        <div className="mt-3 rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-xs text-blue-100 leading-relaxed">
          {isIOS ? (
            <>
              <p className="font-semibold text-white mb-1">iPhone / iPad (Safari):</p>
              <p>1. Niche <span className="font-semibold">Share</span> button (⬆️) dabayein</p>
              <p>2. <span className="font-semibold">“Add to Home Screen”</span> chunein</p>
              <p>3. <span className="font-semibold">Add</span> dabayein — app home screen par aa jayegi</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-white mb-1">Install nahi dikha?</p>
              <p>Browser ke <span className="font-semibold">menu (⋮)</span> mein jaa kar <span className="font-semibold">“Install app”</span> / <span className="font-semibold">“Add to Home screen”</span> chunein. (Production site par hi kaam karega.)</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
