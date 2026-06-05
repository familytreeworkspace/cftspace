'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    router.push('/login')
  }, [router])

  return null
}
