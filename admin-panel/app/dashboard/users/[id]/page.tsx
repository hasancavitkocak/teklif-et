'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Crown, 
  UserX, 
  UserCheck,
  Trash2,
  Phone,
  MapPin,
  Calendar,
  Heart,
  FileText,
  Image as ImageIcon
} from 'lucide-react'
import Link from 'next/link'

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [photos, setPhotos] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [proposals, setProposals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      loadUserData()
    }
  }, [params.id])

  const loadUserData = async () => {
    try {
      const response = await fetch(`/api/users/${params.id}`)
      const data = await response.json()
      
      setUser(data.user)
      setPhotos(data.photos || [])
      setMatches(data.matches || [])
      setProposals(data.proposals || [])
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const togglePremium = async () => {
    if (!user) return
    
    try {
      const response = await fetch(`/api/users/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_premium: !user.is_premium }),
      })

      if (response.ok) {
        setUser({ ...user, is_premium: !user.is_premium })
        alert(user.is_premium ? 'Premium iptal edildi' : 'Premium aktif edildi')
      }
    } catch (error) {
      console.error('Error updating premium:', error)
      alert('Hata oluştu')
    }
  }

  const toggleActive = async () => {
    if (!user) return
    
    try {
      const response = await fetch(`/api/users/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding_completed: !user.onboarding_completed }),
      })

      if (response.ok) {
        setUser({ ...user, onboarding_completed: !user.onboarding_completed })
        alert(user.onboarding_completed ? 'Kullanıcı pasif edildi' : 'Kullanıcı aktif edildi')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Hata oluştu')
    }
  }

  const deleteUser = async () => {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: params.id }),
      })

      if (response.ok) {
        alert('Kullanıcı silindi')
        router.push('/dashboard/users')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Kullanıcı silinirken hata oluştu')
    }
  }

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

  if (!user) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-gray-500">Kullanıcı bulunamadı</p>
          <Link href="/dashboard/users" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
            Geri Dön
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href="/dashboard/users"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Geri Dön
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">{user.name}</h1>
            <div className="flex gap-2">
              {user.is_premium && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                  <Crown className="w-4 h-4" />
                  Premium
                </span>
              )}
              {user.onboarding_completed ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <UserCheck className="w-4 h-4" />
                  Aktif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                  <UserX className="w-4 h-4" />
                  Pasif
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={toggleActive}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                user.onboarding_completed
                  ? 'bg-gray-500 text-white hover:bg-gray-600'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {user.onboarding_completed ? (
                <>
                  <UserX className="w-4 h-4" />
                  Pasif Et
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  Aktif Et
                </>
              )}
            </button>
            <button
              onClick={togglePremium}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                user.is_premium
                  ? 'bg-gray-500 text-white hover:bg-gray-600'
                  : 'bg-yellow-500 text-white hover:bg-yellow-600'
              }`}
            >
              <Crown className="w-4 h-4" />
              {user.is_premium ? 'Premium İptal Et' : 'Premium Yap'}
            </button>
            <button
              onClick={deleteUser}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Sil
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Temel Bilgiler</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">İsim</p>
                <p className="font-medium text-gray-900">{user.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Telefon</p>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <p className="font-medium text-gray-900">{user.phone || '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Cinsiyet</p>
                <p className="font-medium text-gray-900">
                  {user.gender === 'male' ? '👨 Erkek' : '👩 Kadın'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Şehir</p>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <p className="font-medium text-gray-900">{user.city}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Doğum Tarihi</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <p className="font-medium text-gray-900">{user.birth_date}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Kayıt Tarihi</p>
                <p className="font-medium text-gray-900">
                  {new Date(user.created_at).toLocaleDateString('tr-TR')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Fotoğraflar ({photos.length})</h2>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={photo.photo_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                  {photo.position === 0 && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-white p-1 rounded">
                      <Crown className="w-3 h-3" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">İlgi Alanları</h2>
            <div className="flex flex-wrap gap-2">
              {user.interests?.map((interest: string) => (
                <span key={interest} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">İstatistikler</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Heart className="w-4 h-4" />
                  <span>Eşleşme Sayısı</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{matches.length}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <FileText className="w-4 h-4" />
                  <span>Oluşturulan Proposal</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{proposals.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tercihler</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Sigara</span>
                <span className="font-medium text-gray-900">{user.smoking ? 'Evet' : 'Hayır'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Alkol</span>
                <span className="font-medium text-gray-900">{user.drinking ? 'Evet' : 'Hayır'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
