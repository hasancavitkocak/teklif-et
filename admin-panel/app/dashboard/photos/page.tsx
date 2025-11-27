'use client'

import { useEffect, useState } from 'react'
import { Image as ImageIcon, Trash2, Star } from 'lucide-react'

export default function PhotosPage() {
  const [photos, setPhotos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPhotos()
  }, [])

  const loadPhotos = async () => {
    try {
      const response = await fetch('/api/photos')
      const result = await response.json()
      setPhotos(result.data || [])
    } catch (error) {
      console.error('Error loading photos:', error)
    } finally {
      setLoading(false)
    }
  }

  const deletePhoto = async (id: string) => {
    if (!confirm('Bu fotoğrafı silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch('/api/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (response.ok) {
        setPhotos(photos.filter(p => p.id !== id))
      }
    } catch (error) {
      console.error('Error deleting photo:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="aspect-square bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Fotoğraflar</h1>
        <p className="text-sm text-gray-500">{photos.length} fotoğraf bulundu</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {photos.map((photo) => (
          <div key={photo.id} className="group relative bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-square bg-gray-100 relative">
              <img
                src={photo.photo_url}
                alt="Profile"
                className="w-full h-full object-cover"
              />
              {photo.position === 0 && (
                <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded-lg text-xs font-medium">
                  Ana Fotoğraf
                </div>
              )}
              <div className="absolute top-2 right-2 bg-gray-900 bg-opacity-75 text-white px-2 py-1 rounded-lg text-xs">
                #{photo.position + 1}
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                <button
                  onClick={() => deletePhoto(photo.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white p-2 rounded-lg hover:bg-red-600"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-3 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-900 truncate">
                👤 {photo.user?.name || 'Bilinmeyen Kullanıcı'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                📅 {new Date(photo.created_at).toLocaleDateString('tr-TR')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
