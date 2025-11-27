import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin()
    
    const [userRes, photosRes, matchesRes, proposalsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', params.id).single(),
      supabase.from('profile_photos').select('*').eq('user_id', params.id),
      supabase.from('matches').select('*').or(`user1_id.eq.${params.id},user2_id.eq.${params.id}`),
      supabase.from('proposals').select('*').eq('creator_id', params.id),
    ])

    return NextResponse.json({
      user: userRes.data,
      photos: photosRes.data || [],
      matches: matchesRes.data || [],
      proposals: proposalsRes.data || [],
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const supabase = getSupabaseAdmin()
    
    const { error } = await supabase
      .from('profiles')
      .update(body)
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
