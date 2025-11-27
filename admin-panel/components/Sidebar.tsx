'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  Heart, 
  FileText, 
  MessageSquare, 
  Image, 
  Bell, 
  Compass, 
  Mail, 
  BarChart3,
  LogOut
} from 'lucide-react'

const menuItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Kullanıcılar', path: '/dashboard/users', icon: Users },
  { name: 'Eşleşmeler', path: '/dashboard/matches', icon: Heart },
  { name: 'Proposallar', path: '/dashboard/proposals', icon: FileText },
  { name: 'Mesajlar', path: '/dashboard/messages', icon: MessageSquare },
  { name: 'Fotoğraflar', path: '/dashboard/photos', icon: Image },
  { name: 'Bildirimler', path: '/dashboard/notifications', icon: Bell },
  { name: 'Keşfet Feed', path: '/dashboard/discover', icon: Compass },
  { name: 'Davetler', path: '/dashboard/invitations', icon: Mail },
  { name: 'Raporlar', path: '/dashboard/reports', icon: BarChart3 },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem('admin_logged_in')
    router.push('/login')
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">Admin Panel</h1>
        <p className="text-xs text-gray-500 mt-1">Dating App</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.path
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm group ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`} />
              <span className="font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
        >
          <LogOut className="w-5 h-5 text-gray-400" />
          <span>Çıkış Yap</span>
        </button>
      </div>
    </div>
  )
}
