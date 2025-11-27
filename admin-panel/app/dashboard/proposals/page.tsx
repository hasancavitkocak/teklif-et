'use client'

import { useEffect, useState } from 'react'
import { FileText, Trash2, MapPin, Calendar, Clock } from 'lucide-react'
import Link from 'next/link'

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProposals()
  }, [])

  const loadProposals = async () => {
    try {
      const response = await fetch('/api/proposals')
      const result = await response.json()
      setProposals(result.data || [])
    } catch (error) {
      console.error('Error loading proposals:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteProposal = async (id: string) => {
    if (!confirm('Bu proposalı silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch('/api/proposals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (response.ok) {
        setProposals(proposals.filter(p => p.id !== id))
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

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Proposallar</h1>
        <p className="text-sm text-gray-500">{proposals.length} proposal bulundu</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {proposals.map((proposal) => (
          <Link
            key={proposal.id}
            href={`/dashboard/proposals/${proposal.id}`}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(proposal.status)}`}>
                  {proposal.status}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  deleteProposal(proposal.id)
                }}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">{proposal.title}</h3>
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{proposal.description}</p>

            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{proposal.city}</span>
              </div>
              {proposal.date_time && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(proposal.date_time).toLocaleDateString('tr-TR')}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Oluşturan: {proposal.creator?.name}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
