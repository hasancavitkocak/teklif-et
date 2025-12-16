'use client'

import { useEffect, useState } from 'react'
import { 
  Database, 
  Users, 
  FileText, 
  Heart, 
  MessageSquare,
  Crown,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface SystemStats {
  database_size: string
  total_users: number
  active_users: number
  frozen_users: number
  premium_users: number
  total_proposals: number
  active_proposals: number
  total_matches: number
  total_messages: number
  storage_usage: string
}

export default function SystemPage() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    loadSystemStats()
  }, [])

  const loadSystemStats = async () => {
    try {
      const response = await fetch('/api/system/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error loading system stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const runSystemAction = async (action: string, confirmMessage?: string) => {
    if (confirmMessage && !confirm(confirmMessage)) {
      return
    }

    setActionLoading(action)
    
    try {
      const response = await fetch('/api/system/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert(`İşlem başarılı: ${result.message}`)
        await loadSystemStats() // Stats'ları yenile
      } else {
        alert(`Hata: ${result.error}`)
      }
    } catch (error) {
      console.error('Error running system action:', error)
      alert('İşlem sırasında hata oluştu')
    } finally {
      setActionLoading(null)
    }
  }

  const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
    <div className="bg-white p-6 rounded-xl border border-gray-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-semibold text-gray-900 mb-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )

  const ActionButton = ({ 
    title, 
    description, 
    action, 
    icon: Icon, 
    color, 
    confirmMessage,
    dangerous = false 
  }: any) => (
    <div className="bg-white p-6 rounded-xl border border-gray-200">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-500 mb-4">{description}</p>
          <button
            onClick={() => runSystemAction(action, confirmMessage)}
            disabled={actionLoading === action}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              dangerous
                ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300'
                : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300'
            } disabled:cursor-not-allowed`}
          >
            {actionLoading === action ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                İşleniyor...
              </>
            ) : (
              <>
                <Icon className="w-4 h-4" />
                Çalıştır
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Sistem Yönetimi</h1>
        <p className="text-sm text-gray-500">Sistem durumunu görüntüleyin ve bakım işlemlerini gerçekleştirin</p>
      </div>

      {/* Sistem İstatistikleri */}
      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Toplam Kullanıcı"
              value={stats.total_users.toLocaleString()}
              subtitle={`${stats.active_users} aktif, ${stats.frozen_users} dondurulmuş`}
              icon={Users}
              color="bg-blue-500"
            />
            <StatCard
              title="Premium Kullanıcı"
              value={stats.premium_users.toLocaleString()}
              subtitle={`%${((stats.premium_users / stats.total_users) * 100).toFixed(1)} premium oranı`}
              icon={Crown}
              color="bg-yellow-500"
            />
            <StatCard
              title="Toplam Proposal"
              value={stats.total_proposals.toLocaleString()}
              subtitle={`${stats.active_proposals} aktif`}
              icon={FileText}
              color="bg-purple-500"
            />
            <StatCard
              title="Toplam Eşleşme"
              value={stats.total_matches.toLocaleString()}
              icon={Heart}
              color="bg-red-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <StatCard
              title="Veritabanı Boyutu"
              value={stats.database_size}
              icon={Database}
              color="bg-gray-500"
            />
            <StatCard
              title="Toplam Mesaj"
              value={stats.total_messages.toLocaleString()}
              icon={MessageSquare}
              color="bg-green-500"
            />
          </div>
        </>
      )}

      {/* Sistem İşlemleri */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Bakım İşlemleri</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ActionButton
            title="Veritabanı Temizliği"
            description="Eski job loglarını, silinmiş kayıtları ve geçici dosyaları temizler"
            action="cleanup_database"
            icon={Database}
            color="bg-blue-500"
            confirmMessage="Veritabanı temizliği yapılacak. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?"
          />
          
          <ActionButton
            title="Önbellek Temizliği"
            description="Sistem önbelleklerini temizler ve performansı artırır"
            action="clear_cache"
            icon={RefreshCw}
            color="bg-green-500"
          />
          
          <ActionButton
            title="Pasif Kullanıcı Temizliği"
            description="30 günden fazla giriş yapmayan kullanıcıları temizler"
            action="cleanup_inactive_users"
            icon={Users}
            color="bg-orange-500"
            confirmMessage="30 günden fazla giriş yapmayan kullanıcılar silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?"
            dangerous={true}
          />
          
          <ActionButton
            title="Test Verilerini Temizle"
            description="Test amaçlı oluşturulan tüm verileri siler"
            action="cleanup_test_data"
            icon={Trash2}
            color="bg-red-500"
            confirmMessage="TÜM TEST VERİLERİ SİLİNECEK! Bu işlem geri alınamaz. Emin misiniz?"
            dangerous={true}
          />
        </div>
      </div>

      {/* Sistem Durumu */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sistem Durumu</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <div>
              <div className="font-medium text-gray-900">Veritabanı</div>
              <div className="text-sm text-gray-500">Çalışıyor</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <div>
              <div className="font-medium text-gray-900">Depolama</div>
              <div className="text-sm text-gray-500">Normal</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <div>
              <div className="font-medium text-gray-900">API</div>
              <div className="text-sm text-gray-500">Aktif</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}