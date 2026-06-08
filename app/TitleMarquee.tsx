'use client'

import { useEffect } from 'react'

// Scrolls the browser TAB title right-to-left, ticker style.
// Skipped inside an installed PWA: there the browser prepends the static app name to the
// title bar, so a marquee would show up twice (app name + moving title). In standalone we
// leave the title to the app name only.
export default function TitleMarquee() {
  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true

    if (standalone) {
      // Empty → the browser shows only the manifest app name (no duplicate)
      document.title = ''
      return
    }

    let text = 'Community Family Tree Space   ·   '
    const id = setInterval(() => {
      text = text.slice(1) + text.slice(0, 1)   // shift one char left → text moves right-to-left
      document.title = text
    }, 300)
    return () => clearInterval(id)
  }, [])

  return null
}
