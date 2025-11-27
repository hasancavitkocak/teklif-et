import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [
      usersResult,
      matchesResult,
      proposalsResult,
      messagesResult,
      todayUsersResult,
      todayMatchesResult,
      todayProposalsResult,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('matches').select('id', { count: 'exact', head: true }),
      supabase.from('proposals').select('id', { count: 'exact', head: true }),
      supabase.from('messages').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      supabase.from('matches').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      supabase.from('proposals').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    ])

    return NextResponse.json({
      totalUsers: usersResult.count || 0,
      activeUsers: usersResult.count || 0,
      totalMatches: matchesResult.count || 0,
      totalProposals: proposalsResult.count || 0,
      totalMessages: messagesResult.count || 0,
      todayUsers: todayUsersResult.count || 0,
      todayMatches: todayMatchesResult.count || 0,
      todayProposals: todayProposalsResult.count || 0,
    })
  } catch (error: any) {
    console.error('Error loading stats:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
