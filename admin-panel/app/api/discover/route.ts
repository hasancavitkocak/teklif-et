import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    
    const { data, error } = await supabase
      .from('discover_feed')
      .select(`
        *,
        proposal:proposal_id(title, city)
      `)
      .order('created_at', { ascending: false })
    
    // User bilgisini ayrı sorguda al
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(d => d.user_id))]
      const { data: users } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds)
      
      const userMap = users?.reduce((acc: any, user: any) => {
        acc[user.id] = user
        return acc
      }, {})
      
      data.forEach((item: any) => {
        item.user = userMap?.[item.user_id] || { name: 'Bilinmeyen' }
      })
    }

    if (error) throw error
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()
    const supabase = getSupabaseAdmin()
    
    const { error } = await supabase.from('discover_feed').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
