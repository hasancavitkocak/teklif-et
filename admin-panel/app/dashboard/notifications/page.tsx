'use client'

import { useEffect, useState } from 'react'
import { Bell, Heart, MessageSquare, FileText, CheckCircle, XCircle, Clock } from 'lucide-react'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/notifications')
      const result = await response.json()
      setNotifications(result.data || [])
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    const icons: any = {
      new_match: Heart,
      new_message: MessageSquare,
      proposal_invitation: FileText,
      proposal_accepted: CheckCircle,
      proposal_rejected: XCircle,
      proposal_auto_rejected: Clock,
    }
    return icons[type] || Bell
  }

  const getTypeColor = (type: string) => {
    const colors: any = {
      new_match: 'text-red-500',
      new_message: 'text-blue-500',
      proposal_invitation: 'text-purple-500',
      proposal_accepted: 'text-green-500',
      proposal_rejected: 'text-red-500',
      proposal_auto_rejected: 'text-gray-500',
    }
    return colors[type] || 'text-gray-500'
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Bildirimler</h1>
        <p className="text-sm text-gray-500">Son 100 bildirim</p>
      </div>

      <div className="space-y-3">
        {notifications.map((notif) => {
          const Icon = getTypeIcon(notif.type)
          const iconColor = getTypeColor(notif.type)
          
          return (
            <div
              key={notif.id}
              className={`bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow ${
                !notif.read ? 'border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg bg-gray-50 ${iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-gray-500">{notif.user?.name}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(notif.created_at).toLocaleString('tr-TR')}
                        </span>
                      </div>
                    </div>
                    {!notif.read && (
                      <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full"></span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
