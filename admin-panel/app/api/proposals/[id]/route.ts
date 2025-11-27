import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin()
    
    // Proposal detayını al
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select(`
        *,
        creator:creator_id(name, city, gender)
      `)
      .eq('id', params.id)
      .single()

    if (proposalError) throw proposalError

    // Bu proposal'a ait eşleşmeleri al
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select(`
        *,
        user1:user1_id(name, city),
        user2:user2_id(name, city)
      `)
      .eq('proposal_id', params.id)

    // Bu proposal'a ait davetleri al
    const { data: invitations, error: invitationsError } = await supabase
      .from('proposal_invitations')
      .select(`
        *,
        inviter:inviter_id(name),
        invitee:invitee_id(name)
      `)
      .eq('proposal_id', params.id)

    // Bu proposal'a ait başvuruları al
    const { data: requests, error: requestsError } = await supabase
      .from('proposal_requests')
      .select(`
        *,
        requester:requester_id(name, city)
      `)
      .eq('proposal_id', params.id)

    return NextResponse.json({
      proposal,
      matches: matches || [],
      invitations: invitations || [],
      requests: requests || [],
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
      .from('proposals')
      .update(body)
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin()
    
    const { error } = await supabase
      .from('proposals')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
