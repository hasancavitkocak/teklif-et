import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Temel istatistikler
    const [
      usersResult,
      matchesResult,
      proposalsResult,
      messagesResult,
      todayUsersResult,
      todayMatchesResult,
      todayProposalsResult,
      yesterdayUsersResult,
      yesterdayMatchesResult,
      recentUsers,
      recentMatches,
      recentProposals,
      topCities,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('matches').select('id', { count: 'exact', head: true }),
      supabase.from('proposals').select('id', { count: 'exact', head: true }),
      supabase.from('messages').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      supabase.from('matches').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      supabase.from('proposals').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', yesterday.toISOString()).lt('created_at', today.toISOString()),
      supabase.from('matches').select('id', { count: 'exact', head: true }).gte('created_at', yesterday.toISOString()).lt('created_at', today.toISOString()),
      supabase.from('profiles').select('id, name, city, created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('matches').select('id, created_at, user1:user1_id(name), user2:user2_id(name)').order('created_at', { ascending: false }).limit(5),
      supabase.from('proposals').select('id, title, city, status, created_at, creator:creator_id(name)').order('created_at', { ascending: false }).limit(5),
      supabase.from('profiles').select('city').then(res => {
        const cities = res.data?.reduce((acc: any, p: any) => {
          acc[p.city] = (acc[p.city] || 0) + 1
          return acc
        }, {})
        return Object.entries(cities || {})
          .sort((a: any, b: any) => b[1] - a[1])
          .slice(0, 5)
      }),
    ])

    return NextResponse.json({
      stats: {
        totalUsers: usersResult.count || 0,
        totalMatches: matchesResult.count || 0,
        totalProposals: proposalsResult.count || 0,
        totalMessages: messagesResult.count || 0,
        todayUsers: todayUsersResult.count || 0,
        todayMatches: todayMatchesResult.count || 0,
        todayProposals: todayProposalsResult.count || 0,
        yesterdayUsers: yesterdayUsersResult.count || 0,
        yesterdayMatches: yesterdayMatchesResult.count || 0,
      },
      recentUsers: recentUsers.data || [],
      recentMatches: recentMatches.data || [],
      recentProposals: recentProposals.data || [],
      topCities: topCities || [],
    })
  } catch (error: any) {
    console.error('Error loading dashboard:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
