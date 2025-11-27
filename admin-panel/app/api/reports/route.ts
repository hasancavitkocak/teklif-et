import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    
    const [usersRes, matchesRes, proposalsRes] = await Promise.all([
      supabase.from('profiles').select('gender, city, created_at, is_premium'),
      supabase.from('matches').select('created_at'),
      supabase.from('proposals').select('status, city, created_at'),
    ])

    const users = usersRes.data || []
    const matches = matchesRes.data || []
    const proposals = proposalsRes.data || []

    // Gender distribution
    const maleCount = users.filter(u => u.gender === 'male').length
    const femaleCount = users.filter(u => u.gender === 'female').length

    // City distribution
    const cityStats = users.reduce((acc: any, user) => {
      acc[user.city] = (acc[user.city] || 0) + 1
      return acc
    }, {})

    // Proposal status
    const proposalStats = proposals.reduce((acc: any, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1
      return acc
    }, {})

    // Premium kullanıcı sayısı
    const premiumCount = users.filter(u => u.is_premium).length

    return NextResponse.json({
      totalUsers: users.length,
      maleCount,
      femaleCount,
      premiumCount,
      totalMatches: matches.length,
      totalProposals: proposals.length,
      cityStats,
      proposalStats,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
