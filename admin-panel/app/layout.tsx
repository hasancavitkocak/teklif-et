import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Panel - Dating App',
  description: 'Admin panel for managing the dating app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  )
}
