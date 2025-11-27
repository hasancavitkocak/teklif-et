'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, Trash2, Clock, Users } from 'lucide-react'

interface Message {
  id: string
  match_id: string
  sender_id: string
  receiver_id: string
  content: string
  read: boolean
  created_at: string
  sender: { name: string }
  receiver: { name: string }
}

interface GroupedMessages {
  [matchId: string]: {
    messages: Message[]
    user1: string
    user2: string
  }
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null)

  useEffect(() => {
    loadMessages()
  }, [])

  const loadMessages = async () => {
    try {
      const response = await fetch('/api/messages')
      const result = await response.json()
      setMessages(result.data || [])
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteMessage = async (id: string) => {
    if (!confirm('Bu mesajı silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch('/api/messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (response.ok) {
        setMessages(messages.filter(m => m.id !== id))
      }
    } catch (error) {
      console.error('Error deleting message:', error)
    }
  }

  // Mesajları match'lere göre grupla
  const groupedMessages: GroupedMessages = messages.reduce((acc, msg) => {
    if (!acc[msg.match_id]) {
      acc[msg.match_id] = {
        messages: [],
        user1: msg.sender.name,
        user2: msg.receiver.name,
      }
    }
    acc[msg.match_id].messages.push(msg)
    return acc
  }, {} as GroupedMessages)

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Mesajlar</h1>
        <p className="text-sm text-gray-500">
          {Object.keys(groupedMessages).length} konuşma, {messages.length} mesaj
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Konuşma Listesi */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900">Konuşmalar</h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {Object.entries(groupedMessages).map(([matchId, data]) => (
              <button
                key={matchId}
                onClick={() => setSelectedMatch(matchId)}
                className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                  selectedMatch === matchId ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-gray-400" />
                  <p className="font-medium text-gray-900 text-sm">
                    {data.user1} ↔ {data.user2}
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  {data.messages.length} mesaj
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Mesaj Detayları */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          {selectedMatch && groupedMessages[selectedMatch] ? (
            <>
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-gray-600" />
                    <h2 className="font-semibold text-gray-900">
                      {groupedMessages[selectedMatch].user1} ↔ {groupedMessages[selectedMatch].user2}
                    </h2>
                  </div>
                  <span className="text-sm text-gray-500">
                    {groupedMessages[selectedMatch].messages.length} mesaj
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                {groupedMessages[selectedMatch].messages
                  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                  .map((msg) => (
                    <div
                      key={msg.id}
                      className="group relative p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {msg.sender.name}
                            </span>
                            <span className="text-xs text-gray-400">→</span>
                            <span className="text-sm text-gray-600">
                              {msg.receiver.name}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{msg.content}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {new Date(msg.created_at).toLocaleString('tr-TR')}
                            </span>
                            {msg.read && (
                              <span className="text-xs text-green-600">✓ Okundu</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteMessage(msg.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full p-8">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Bir konuşma seçin</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
