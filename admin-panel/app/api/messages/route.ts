import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id(name),
        match:match_id(
          user1_id,
          user2_id,
          user1:user1_id(name),
          user2:user2_id(name)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    
    // Receiver bilgisini match'ten çıkar
    const messagesWithReceiver = data?.map(msg => {
      const isUser1Sender = msg.match?.user1_id === msg.sender_id
      const receiver = isUser1Sender ? msg.match?.user2 : msg.match?.user1
      
      return {
        ...msg,
        receiver: receiver || { name: 'Bilinmeyen' }
      }
    })

    return NextResponse.json({ data: messagesWithReceiver })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()
    const supabase = getSupabaseAdmin()
    
    const { error } = await supabase.from('messages').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
