'use client'

import { useEffect, useState } from 'react'
import { Users, Heart, FileText, MessageSquare, TrendingUp, TrendingDown, Clock, MapPin, Crown } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const response = await fetch('/api/dashboard')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, icon: Icon, change, trend, color }: any) => {
    const changePercent = change?.yesterday ? 
      Math.round(((change.today - change.yesterday) / change.yesterday) * 100) : 0
    
    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            <p className="text-3xl font-semibold text-gray-900 mb-2">{value.toLocaleString()}</p>
            {change && (
              <div className="flex items-center gap-2">
                {changePercent > 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600">
                      +{change.today} bugün ({changePercent > 0 ? '+' : ''}{changePercent}%)
                    </span>
                  </>
                ) : changePercent < 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-red-600">
                      +{change.today} bugün ({changePercent}%)
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-medium text-gray-600">
                    +{change.today} bugün
                  </span>
                )}
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  const { stats, recentUsers, recentMatches, recentProposals, topCities } = data || {}

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Dashboard</h1>
        <p className="text-sm text-gray-500">Hoş geldiniz! İşte genel bakış</p>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Toplam Kullanıcı"
          value={stats?.totalUsers || 0}
          icon={Users}
          change={{ today: stats?.todayUsers || 0, yesterday: stats?.yesterdayUsers || 0 }}
          color="bg-blue-500"
        />
        <StatCard
          title="Toplam Eşleşme"
          value={stats?.totalMatches || 0}
          icon={Heart}
          change={{ today: stats?.todayMatches || 0, yesterday: stats?.yesterdayMatches || 0 }}
          color="bg-red-500"
        />
        <StatCard
          title="Toplam Proposal"
          value={stats?.totalProposals || 0}
          icon={FileText}
          change={{ today: stats?.todayProposals || 0 }}
          color="bg-purple-500"
        />
        <StatCard
          title="Toplam Mesaj"
          value={stats?.totalMessages || 0}
          icon={MessageSquare}
          color="bg-green-500"
        />
      </div>

      {/* Job Durumu Widget */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Sistem Durumu</h2>
          <Link href="/dashboard/jobs" className="text-sm text-blue-600 hover:text-blue-800">
            Job Yönetimi
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <div className="text-sm font-medium text-gray-900">Veritabanı</div>
              <div className="text-xs text-gray-500">Çalışıyor</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <div className="text-sm font-medium text-gray-900">Job'lar</div>
              <div className="text-xs text-gray-500">Normal</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <div className="text-sm font-medium text-gray-900">API</div>
              <div className="text-xs text-gray-500">Aktif</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <Clock className="w-4 h-4 text-blue-500" />
            <div>
              <div className="text-sm font-medium text-gray-900">Son Reset</div>
              <div className="text-xs text-gray-500">Bugün 00:00</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Son Kullanıcılar */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Son Kullanıcılar</h2>
            <Link href="/dashboard/users" className="text-sm text-blue-600 hover:text-blue-800">
              Tümünü Gör
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {recentUsers?.map((user: any) => (
              <Link
                key={user.id}
                href={`/dashboard/users/${user.id}`}
                className="p-4 hover:bg-gray-50 transition-colors block"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <p className="text-xs text-gray-500">{user.city}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {new Date(user.created_at).toLocaleDateString('tr-TR')}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Son Eşleşmeler */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Son Eşleşmeler</h2>
            <Link href="/dashboard/matches" className="text-sm text-blue-600 hover:text-blue-800">
              Tümünü Gör
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {recentMatches?.map((match: any) => (
              <div key={match.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-gray-900">{match.user1?.name}</span>
                  <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                  <span className="font-medium text-gray-900">{match.user2?.name}</span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  {new Date(match.created_at).toLocaleString('tr-TR')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popüler Şehirler */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Popüler Şehirler</h2>
            <Link href="/dashboard/reports" className="text-sm text-blue-600 hover:text-blue-800">
              Detaylı Rapor
            </Link>
          </div>
          <div className="p-4 space-y-3">
            {topCities?.map(([city, count]: any, index: number) => (
              <div key={city} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-400">#{index + 1}</span>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">{city}</span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Son Proposallar */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Son Proposallar</h2>
          <Link href="/dashboard/proposals" className="text-sm text-blue-600 hover:text-blue-800">
            Tümünü Gör
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Başlık</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Oluşturan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Şehir</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentProposals?.map((proposal: any) => (
                <tr key={proposal.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/dashboard/proposals/${proposal.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                      {proposal.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{proposal.creator?.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{proposal.city}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      proposal.status === 'active' ? 'bg-green-100 text-green-800' :
                      proposal.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {proposal.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(proposal.created_at).toLocaleDateString('tr-TR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
