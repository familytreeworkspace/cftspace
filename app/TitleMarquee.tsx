'use client'

import { useEffect } from 'react'

// Scrolls the browser tab title right-to-left, ticker style.
export default function TitleMarquee() {
  useEffect(() => {
    let text = 'Community Family Tree Space   ·   '
    const id = setInterval(() => {
      text = text.slice(1) + text.slice(0, 1)   // shift one char left → text moves right-to-left
      document.title = text
    }, 300)
    return () => clearInterval(id)
  }, [])

  return null
}
