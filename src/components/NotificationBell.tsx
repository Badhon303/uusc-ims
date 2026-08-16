'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Popup,
  PopupList,
  formatTimeToNow,
  useAuth,
  useConfig,
  useTranslation,
} from '@payloadcms/ui'

type BellNotification = {
  id: number | string
  channel: 'email' | 'in-app' | 'whatsapp'
  createdAt: string
  payload?: Record<string, unknown> | null
  readAt?: string | null
  sentAt?: string | null
  status: 'failed' | 'pending' | 'queued' | 'sent'
  type: string
}

const POLL_INTERVAL_MS = 120_000
const FEED_LIMIT = 10

const channelLabels: Record<BellNotification['channel'], string> = {
  email: 'Email',
  'in-app': 'In-app',
  whatsapp: 'WhatsApp',
}

const titleOf = (notification: BellNotification): string => {
  const subject = notification.payload?.subject

  return typeof subject === 'string' && subject.trim() ? subject : notification.type
}

const bodyOf = (notification: BellNotification): string | null => {
  const message = notification.payload?.message

  return typeof message === 'string' && message.trim() ? message : null
}

const BellIcon: React.FC = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height="20"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
    width="20"
  >
    <path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5" />
    <path d="M10.3 19a2 2 0 0 0 3.4 0" />
  </svg>
)

const NotificationBell: React.FC = () => {
  const { user } = useAuth()
  const { i18n } = useTranslation()
  const {
    config: {
      routes: { admin: adminRoute, api: apiRoute },
      serverURL,
    },
  } = useConfig()

  const [notifications, setNotifications] = useState<BellNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const isMounted = useRef(true)

  const apiBase = `${serverURL || ''}${apiRoute}/notifications`

  const loadFeed = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/mine?limit=${FEED_LIMIT}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        return
      }

      const data = (await response.json()) as {
        docs?: BellNotification[]
        unreadCount?: number
      }

      if (!isMounted.current) {
        return
      }

      setNotifications(Array.isArray(data.docs) ? data.docs : [])
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0)
    } catch {
      // Header widget: never surface transient polling failures to the user
    } finally {
      if (isMounted.current) {
        setIsLoading(false)
      }
    }
  }, [apiBase])

  const markRead = useCallback(
    async (ids?: Array<number | string>) => {
      const unreadIds = ids?.length
        ? ids
        : notifications.filter((notification) => !notification.readAt).map(({ id }) => id)

      if (ids && !ids.length) {
        return
      }

      if (!ids && !unreadCount) {
        return
      }

      const readAt = new Date().toISOString()

      // Optimistic update, then reconcile with the server
      setNotifications((current) =>
        current.map((notification) =>
          !notification.readAt && (!ids || ids.includes(notification.id))
            ? { ...notification, readAt }
            : notification,
        ),
      )
      setUnreadCount((current) => (ids ? Math.max(current - unreadIds.length, 0) : 0))

      try {
        await fetch(`${apiBase}/mark-read`, {
          body: JSON.stringify(ids ? { ids } : {}),
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        })
      } catch {
        // Ignore: the next poll restores the authoritative state
      }

      void loadFeed()
    },
    [apiBase, loadFeed, notifications, unreadCount],
  )

  useEffect(() => {
    isMounted.current = true

    if (!user) {
      return
    }

    void loadFeed()

    // Pause polling when the tab is hidden to avoid unnecessary background
    // requests; resume immediately when it becomes visible again.
    let interval: ReturnType<typeof setInterval> | null = null

    const startPolling = () => {
      if (interval) return
      interval = setInterval(() => {
        if (!document.hidden) {
          void loadFeed()
        }
      }, POLL_INTERVAL_MS)
    }

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        stopPolling()
      } else {
        void loadFeed()
        startPolling()
      }
    }

    startPolling()
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      isMounted.current = false
      stopPolling()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [loadFeed, user])

  if (!user) {
    return null
  }

  return (
    <Popup
      button={
        <span
          aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
          style={{
            alignItems: 'center',
            display: 'flex',
            height: 'calc(var(--base) * 1.4)',
            justifyContent: 'center',
            position: 'relative',
            width: 'calc(var(--base) * 1.4)',
          }}
        >
          <BellIcon />
          {unreadCount > 0 && (
            <span
              style={{
                alignItems: 'center',
                background: 'var(--theme-error-500)',
                borderRadius: '9px',
                color: 'var(--theme-base-0)',
                display: 'flex',
                fontSize: '9px',
                fontWeight: 700,
                height: '16px',
                justifyContent: 'center',
                lineHeight: 1,
                minWidth: '16px',
                padding: '0 4px',
                position: 'absolute',
                right: '-4px',
                top: '-4px',
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </span>
      }
      buttonType="custom"
      horizontalAlign="right"
      render={({ close }) => (
        <div style={{ minWidth: '320px' }}>
          <div
            style={{
              alignItems: 'center',
              borderBottom: '1px solid var(--theme-elevation-100)',
              display: 'flex',
              gap: 'calc(var(--base) / 2)',
              justifyContent: 'space-between',
              padding: 'calc(var(--base) / 2) calc(var(--base) / 1.5)',
            }}
          >
            <strong style={{ fontSize: '13px' }}>Notifications</strong>
            {unreadCount > 0 && (
              <button
                onClick={() => void markRead()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--theme-elevation-600)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  padding: 0,
                  textDecoration: 'underline',
                }}
                type="button"
              >
                Mark all as read
              </button>
            )}
          </div>

          {isLoading && !notifications.length && (
            <p
              style={{
                color: 'var(--theme-elevation-500)',
                fontSize: '12px',
                margin: 0,
                padding: 'calc(var(--base) / 1.5)',
              }}
            >
              Loading…
            </p>
          )}

          {!isLoading && !notifications.length && (
            <p
              style={{
                color: 'var(--theme-elevation-500)',
                fontSize: '12px',
                margin: 0,
                padding: 'calc(var(--base) / 1.5)',
              }}
            >
              You have no notifications yet.
            </p>
          )}

          {notifications.length > 0 && (
            <PopupList.ButtonGroup>
              {notifications.map((notification) => {
                const body = bodyOf(notification)

                return (
                  <PopupList.Button
                    href={`${adminRoute}/collections/notifications/${notification.id}`}
                    key={notification.id}
                    onClick={() => {
                      if (!notification.readAt) {
                        void markRead([notification.id])
                      }
                      close()
                    }}
                  >
                    <span
                      style={{
                        display: 'flex',
                        gap: 'calc(var(--base) / 3)',
                        maxWidth: '320px',
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          background: notification.readAt
                            ? 'transparent'
                            : 'var(--theme-success-500)',
                          borderRadius: '50%',
                          flexShrink: 0,
                          height: '6px',
                          marginTop: '6px',
                          width: '6px',
                        }}
                      />
                      <span style={{ display: 'block', overflow: 'hidden' }}>
                        <span
                          style={{
                            display: 'block',
                            fontWeight: notification.readAt ? 400 : 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {titleOf(notification)}
                        </span>
                        {body && (
                          <span
                            style={{
                              color: 'var(--theme-elevation-600)',
                              display: 'block',
                              fontSize: '11px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {body}
                          </span>
                        )}
                        <span
                          style={{
                            color: 'var(--theme-elevation-450)',
                            display: 'block',
                            fontSize: '10px',
                            textTransform: 'uppercase',
                          }}
                        >
                          {channelLabels[notification.channel] || notification.channel}
                          {' · '}
                          {formatTimeToNow({
                            date: notification.sentAt || notification.createdAt,
                            i18n,
                          })}
                        </span>
                      </span>
                    </span>
                  </PopupList.Button>
                )
              })}
            </PopupList.ButtonGroup>
          )}

          <div
            style={{
              borderTop: '1px solid var(--theme-elevation-100)',
              padding: 'calc(var(--base) / 2) calc(var(--base) / 1.5)',
            }}
          >
            <Link
              href={`${adminRoute}/collections/notifications`}
              onClick={() => close()}
              style={{ fontSize: '12px' }}
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
      size="fit-content"
      verticalAlign="bottom"
    />
  )
}

export default NotificationBell
