import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Önce fonksiyon var mı kontrol et
    const { data: functionExists } = await supabase
      .rpc('get_job_statistics')
      .then(() => ({ data: true }))
      .catch(() => ({ data: false }))

    if (!functionExists) {
      console.log('get_job_statistics function does not exist yet, returning empty object')
      return NextResponse.json({})
    }

    // Her job için istatistikleri al
    const { data: jobStats, error } = await supabase.rpc('get_job_statistics')

    if (error) {
      console.error('Error fetching job stats:', error)
      // Fonksiyon yoksa boş obje döndür
      if (error.code === 'PGRST202' || error.message.includes('get_job_statistics')) {
        return NextResponse.json({})
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Job isimlerine göre grupla
    const statsMap: Record<string, any> = {}
    
    if (jobStats && Array.isArray(jobStats)) {
      jobStats.forEach((stat: any) => {
        statsMap[stat.job_name] = {
          total_runs: stat.total_runs || 0,
          success_rate: stat.success_rate || 0,
          avg_duration: stat.avg_duration || 0,
          last_run: stat.last_run
        }
      })
    }

    return NextResponse.json(statsMap)
  } catch (error) {
    console.error('Error in job stats API:', error)
    return NextResponse.json({})
  }
}

// Job istatistikleri fonksiyonunu oluşturmak için migration'a eklenecek