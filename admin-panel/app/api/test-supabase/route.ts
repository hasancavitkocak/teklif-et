import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    console.log('Service Role Test:')
    console.log('URL:', supabaseUrl)
    console.log('Service Key exists:', !!serviceRoleKey)

    // Create admin client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { data, error, count } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' })
      .limit(5)

    if (error) {
      console.error('Service role error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('Service role success! Count:', count)
    return NextResponse.json({ data, count, success: true })
  } catch (err: any) {
    console.error('API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
