'use client'

import { useEffect, useState } from 'react'
import { TIMEZONE_BR } from '@betv/shared'

export function useBrtClock() {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    function update() {
      const now = new Date()
      const brt = new Intl.DateTimeFormat('pt-BR', {
        timeZone: TIMEZONE_BR,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now)

      const dateFmt = new Intl.DateTimeFormat('pt-BR', {
        timeZone: TIMEZONE_BR,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(now)

      setTime(brt)
      setDate(dateFmt.charAt(0).toUpperCase() + dateFmt.slice(1))
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  return { time, date }
}
