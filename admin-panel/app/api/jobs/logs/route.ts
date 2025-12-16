import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')
    const jobType = searchParams.get('job_type')

    // Önce tablo var mı kontrol et
    const { data: tableExists } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'job_logs')
      .single()

    if (!tableExists) {
      console.log('job_logs table does not exist yet, returning empty array')
      return NextResponse.json([])
    }

    let query = supabase
      .from('job_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (jobType) {
      query = query.eq('job_type', jobType)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching job logs:', error)
      // Tablo yoksa boş array döndür
      if (error.code === 'PGRST116' || error.message.includes('job_logs')) {
        return NextResponse.json([])
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error in job logs API:', error)
    return NextResponse.json([])
  }
}