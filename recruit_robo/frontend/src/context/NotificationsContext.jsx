import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { interviewsApi, offersApi, pipelineApi } from '../api'

const NotificationsContext = createContext(null)
const STORAGE_KEY = 'rr_notif_read_ids'

function getReadIds() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')) }
  catch { return new Set() }
}

export function timeAgo(dateVal) {
  if (!dateVal) return ''
  const diff = Date.now() - new Date(dateVal).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [loading,       setLoading]       = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    const readIds = getReadIds()
    const items   = []

    try {
      const [iRes, oRes, aRes] = await Promise.allSettled([
        interviewsApi.list(),
        offersApi.list(),
        pipelineApi.recentActivity(),
      ])

      const todayStr = new Date().toISOString().slice(0, 10)
      const in7Days  = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

      // ── Interviews ──────────────────────────────────────────────────────────
      if (iRes.status === 'fulfilled') {
        const interviews = iRes.value?.data || []
        interviews.forEach(iv => {
          const dateStr    = iv.scheduled_at?.slice(0, 10)
          const isToday    = dateStr === todayStr
          const isUpcoming = dateStr > todayStr && dateStr <= in7Days
          if (!dateStr || (!isToday && !isUpcoming)) return
          if (iv.status === 'cancelled' || iv.status === 'completed') return

          const daysAway = Math.ceil((new Date(dateStr) - new Date(todayStr)) / 86400000)
          const id = `interview_${iv.id}_${dateStr}`
          items.push({
            id,
            type:    'interview',
            color:   isToday ? '#ef4444' : '#f59e0b',
            title:   isToday
              ? `Interview today — ${iv.candidateName || 'Candidate'}`
              : `Interview in ${daysAway}d — ${iv.candidateName || 'Candidate'}`,
            subtitle: iv.jobTitle || '',
            time:     iv.scheduled_at,
            read:     readIds.has(id),
            link:     '/interviews',
            urgent:   isToday,
          })
        })
      }

      // ── Offers ─────────────────────────────────────────────────────────────
      if (oRes.status === 'fulfilled') {
        const offers = oRes.value?.data || []
        offers.forEach(offer => {
          const id   = `offer_${offer.offerId}`
          const name = offer.candidateName || 'Candidate'
          const job  = offer.jobTitle || ''

          if (offer.status === 'sent' || offer.status === 'negotiating') {
            items.push({
              id, type: 'offer_pending', color: '#f59e0b', urgent: false,
              title: `Offer awaiting response — ${name}`, subtitle: job,
              time: null, read: readIds.has(id), link: '/offers',
            })
          } else if (offer.status === 'accepted') {
            items.push({
              id, type: 'offer_accepted', color: '#10b981', urgent: false,
              title: `Offer accepted — ${name}`, subtitle: job,
              time: null, read: readIds.has(id), link: '/offers',
            })
          } else if (offer.status === 'declined') {
            items.push({
              id, type: 'offer_declined', color: '#ef4444', urgent: false,
              title: `Offer declined — ${name}`, subtitle: job,
              time: null, read: readIds.has(id), link: '/offers',
            })
          }
        })
      }

      // ── Pipeline activity (last 24 h) ───────────────────────────────────────
      if (aRes.status === 'fulfilled') {
        const activity = aRes.value?.data || []
        activity.slice(0, 8).forEach((item, i) => {
          if (!item.text) return
          const actTime = item.time ? new Date(item.time) : null
          if (actTime && Date.now() - actTime > 86400000) return
          const id = `activity_${i}_${item.time || i}`
          items.push({
            id, type: 'activity', color: '#8b5cf6', urgent: false,
            title: item.text, subtitle: '',
            time: item.time, read: readIds.has(id), link: '/pipeline',
          })
        })
      }
    } catch { /* silent — API errors don't break the app */ }

    // Sort: urgent → unread → newest
    items.sort((a, b) => {
      if (a.urgent !== b.urgent) return a.urgent ? -1 : 1
      if (a.read   !== b.read)   return a.read   ?  1 : -1
      return 0
    })

    setNotifications(items)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 2 * 60 * 1000)
    return () => clearInterval(id)
  }, [refresh])

  const markAllRead = useCallback(() => {
    const ids = notifications.map(n => n.id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [notifications])

  const markRead = useCallback((id) => {
    const readIds = getReadIds()
    readIds.add(id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...readIds]))
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationsContext.Provider value={{ notifications, loading, unreadCount, markAllRead, markRead, refresh }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationsContext)
}
