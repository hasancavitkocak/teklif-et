'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Heart, 
  Mail, 
  FileText,
  Trash2,
  Edit
} from 'lucide-react'
import Link from 'next/link'

export default function ProposalDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      loadProposalDetail()
    }
  }, [params.id])

  const loadProposalDetail = async () => {
    try {
      const response = await fetch(`/api/proposals/${params.id}`)
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error loading proposal detail:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteProposal = async () => {
    if (!confirm('Bu proposalı silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch(`/api/proposals/${params.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Proposal silindi')
        router.push('/dashboard/proposals')
      }
    } catch (error) {
      console.error('Error deleting proposal:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800',
    }
    return styles[status as keyof typeof styles] || styles.active
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

  if (!data?.proposal) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-gray-500">Proposal bulunamadı</p>
          <Link href="/dashboard/proposals" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
            Geri Dön
          </Link>
        </div>
      </div>
    )
  }

  const { proposal, matches, invitations, requests } = data

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href="/dashboard/proposals"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Geri Dön
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">{proposal.title}</h1>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(proposal.status)}`}>
              {proposal.status}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={deleteProposal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detaylar</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Açıklama</p>
                <p className="text-gray-900">{proposal.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Şehir</p>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{proposal.city}</span>
                  </div>
                </div>
                {proposal.venue && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Mekan</p>
                    <span className="text-gray-900">{proposal.venue}</span>
                  </div>
                )}
                {proposal.date_time && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Tarih & Saat</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">
                        {new Date(proposal.date_time).toLocaleString('tr-TR')}
                      </span>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500 mb-1">Oluşturan</p>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{proposal.creator?.name}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Eşleşmeler ({matches.length})</h2>
            </div>
            {matches.length > 0 ? (
              <div className="space-y-3">
                {matches.map((match: any) => (
                  <div key={match.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{match.user1?.name}</p>
                        <p className="text-xs text-gray-500">{match.user1?.city}</p>
                      </div>
                      <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{match.user2?.name}</p>
                        <p className="text-xs text-gray-500">{match.user2?.city}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(match.matched_at).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Henüz eşleşme yok</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Başvurular ({requests?.length || 0})</h2>
            </div>
            {requests && requests.length > 0 ? (
              <div className="space-y-3">
                {requests.map((request: any) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{request.requester?.name}</p>
                      <p className="text-xs text-gray-500">{request.requester?.city}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      request.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Henüz başvuru yok</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">İstatistikler</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Eşleşme Sayısı</p>
                <p className="text-2xl font-bold text-gray-900">{matches.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Davet Sayısı</p>
                <p className="text-2xl font-bold text-gray-900">{invitations.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Başvuru Sayısı</p>
                <p className="text-2xl font-bold text-gray-900">{requests?.length || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Oluşturulma</p>
                <p className="text-sm text-gray-900">
                  {new Date(proposal.created_at).toLocaleString('tr-TR')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Davetler</h2>
            </div>
            {invitations.length > 0 ? (
              <div className="space-y-2">
                {invitations.map((inv: any) => (
                  <div key={inv.id} className="text-sm">
                    <p className="text-gray-900">{inv.inviter?.name}</p>
                    <p className="text-xs text-gray-500">→ {inv.invitee?.name}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                      inv.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      inv.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Henüz davet yok</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
