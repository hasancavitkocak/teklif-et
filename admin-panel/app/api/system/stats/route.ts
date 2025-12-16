import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Sistem istatistiklerini al
    const { data: systemStats, error } = await supabase.rpc('get_system_statistics')

    if (error) {
      console.error('Error fetching system stats:', error)
      
      // Fonksiyon yoksa manuel istatistik topla
      if (error.code === 'PGRST202') {
        try {
          const [
            { count: totalUsers },
            { count: activeUsers },
            { count: premiumUsers },
            { count: totalProposals },
            { count: activeProposals },
            { count: totalMatches },
            { count: totalMessages }
          ] = await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_premium', true),
            supabase.from('proposals').select('*', { count: 'exact', head: true }),
            supabase.from('proposals').select('*', { count: 'exact', head: true }).eq('status', 'active'),
            supabase.from('matches').select('*', { count: 'exact', head: true }).is('deleted_by', null),
            supabase.from('messages').select('*', { count: 'exact', head: true })
          ])

          const manualStats = {
            database_size: 'N/A',
            total_users: totalUsers || 0,
            active_users: activeUsers || 0,
            frozen_users: (totalUsers || 0) - (activeUsers || 0),
            premium_users: premiumUsers || 0,
            total_proposals: totalProposals || 0,
            active_proposals: activeProposals || 0,
            total_matches: totalMatches || 0,
            total_messages: totalMessages || 0,
            storage_usage: 'N/A'
          }

          return NextResponse.json(manualStats)
        } catch (manualError) {
          console.error('Error in manual stats collection:', manualError)
          return NextResponse.json({ error: 'Could not collect system statistics' }, { status: 500 })
        }
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(systemStats)
  } catch (error) {
    console.error('Error in system stats API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}