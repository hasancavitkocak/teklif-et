'use client'

import { useEffect, useState } from 'react'
import { Users, TrendingUp, MapPin, BarChart3, Heart, FileText, MessageSquare, Crown, Calendar } from 'lucide-react'

export default function ReportsPage() {
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    try {
      const response = await fetch('/api/reports')
      const result = await response.json()
      setStats(result)
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
    </div>
  )

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Raporlar ve Analizler</h1>
        <p className="text-sm text-gray-500">Detaylı istatistikler ve grafikler</p>
      </div>

      {/* Genel İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Toplam Kullanıcı"
          value={stats.totalUsers || 0}
          icon={Users}
          color="bg-blue-500"
        />
        <StatCard
          title="Toplam Eşleşme"
          value={stats.totalMatches || 0}
          icon={Heart}
          color="bg-red-500"
        />
        <StatCard
          title="Toplam Proposal"
          value={stats.totalProposals || 0}
          icon={FileText}
          color="bg-purple-500"
        />
        <StatCard
          title="Premium Kullanıcı"
          value={stats.premiumCount || 0}
          icon={Crown}
          color="bg-yellow-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Cinsiyet Dağılımı */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Cinsiyet Dağılımı</h2>
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  👨 Erkek
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {stats.maleCount || 0} ({stats.totalUsers ? Math.round((stats.maleCount / stats.totalUsers) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-blue-500 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${stats.totalUsers ? (stats.maleCount / stats.totalUsers) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="w-3 h-3 bg-pink-500 rounded-full"></span>
                  👩 Kadın
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {stats.femaleCount || 0} ({stats.totalUsers ? Math.round((stats.femaleCount / stats.totalUsers) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-pink-500 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${stats.totalUsers ? (stats.femaleCount / stats.totalUsers) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Proposal Durumları */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Proposal Durumları</h2>
          </div>
          <div className="space-y-3">
            {Object.entries(stats.proposalStats || {}).map(([status, count]: any) => {
              const colors: any = {
                active: 'bg-green-500',
                completed: 'bg-blue-500',
                cancelled: 'bg-red-500',
                expired: 'bg-gray-500',
              }
              return (
                <div key={status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${colors[status] || 'bg-gray-500'}`}></div>
                    <span className="text-sm text-gray-700 capitalize">{status}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Şehir Dağılımı */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 mb-8">
        <div className="flex items-center gap-2 mb-6">
          <MapPin className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Şehir Dağılımı (Top 12)</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(stats.cityStats || {})
            .sort((a: any, b: any) => b[1] - a[1])
            .slice(0, 12)
            .map(([city, count]: any, index) => (
              <div 
                key={city} 
                className="relative p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all group"
              >
                <div className="absolute top-2 right-2 text-xs font-bold text-gray-300">
                  #{index + 1}
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-1">{count}</p>
                <p className="text-sm text-gray-600 font-medium">{city}</p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                  <div
                    className="bg-blue-500 h-1 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${stats.totalUsers ? (count / stats.totalUsers) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Aktivite Özeti */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-gray-900">Eşleşme Oranı</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-2">
            {stats.totalUsers && stats.totalMatches 
              ? ((stats.totalMatches / stats.totalUsers) * 100).toFixed(1)
              : 0}%
          </p>
          <p className="text-sm text-gray-500">Kullanıcı başına ortalama eşleşme</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-gray-900">Aktif Proposal</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-2">
            {stats.proposalStats?.active || 0}
          </p>
          <p className="text-sm text-gray-500">Şu anda aktif olan proposallar</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold text-gray-900">Premium Oran</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-2">
            {stats.totalUsers && stats.premiumCount
              ? ((stats.premiumCount / stats.totalUsers) * 100).toFixed(1)
              : 0}%
          </p>
          <p className="text-sm text-gray-500">Premium kullanıcı oranı</p>
        </div>
      </div>
    </div>
  )
}
