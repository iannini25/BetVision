'use client'

import { useEffect, useState } from 'react'

const FINAL_DATE = new Date('2026-07-19T23:59:00-03:00').getTime()

type CountdownValues = {
  days: number
  hours: number
  minutes: number
  seconds: number
  isExpired: boolean
}

export function useCountdown(): CountdownValues {
  const [diff, setDiff] = useState<number | null>(null)

  useEffect(() => {
    const update = () => setDiff(Math.max(0, FINAL_DATE - Date.now()))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  if (diff === null) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false }
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    isExpired: diff <= 0,
  }
}
