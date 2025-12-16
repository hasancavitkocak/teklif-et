import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  let jobId: string | null = null
  
  try {
    const { jobName } = await request.json()

    if (!jobName) {
      return NextResponse.json({ error: 'Job name is required' }, { status: 400 })
    }

    // Job başlangıcını logla
    try {
      const { data: logData, error: logError } = await supabase.rpc('log_job_start', {
        p_job_name: jobName,
        p_job_type: 'manual',
        p_details: { triggered_by: 'admin_panel' }
      })
      
      if (!logError && logData) {
        jobId = logData
      }
    } catch (logErr) {
      console.warn('Failed to log job start:', logErr)
    }

    let result
    
    switch (jobName) {
      case 'daily_proposal_reset':
        try {
          const { data: proposalResult, error: proposalError } = await supabase.rpc('run_daily_proposal_reset')
          if (proposalError) {
            throw proposalError
          } else {
            result = proposalResult
          }
        } catch (error) {
          throw error
        }
        break

      case 'daily_super_like_reset':
        try {
          const { data: superLikeResult, error: superLikeError } = await supabase.rpc('run_daily_super_like_reset')
          if (superLikeError) {
            // Fonksiyon yoksa manuel reset yap
            if (superLikeError.code === 'PGRST202') {
              const { error: updateError } = await supabase
                .from('profiles')
                .update({ daily_super_likes_used: 0 })
                .gt('daily_super_likes_used', 0)
              
              if (updateError) throw updateError
              
              result = {
                success: true,
                affected_rows: 0,
                message: 'Günlük super like sayıları manuel olarak sıfırlandı'
              }
            } else {
              throw superLikeError
            }
          } else {
            result = superLikeResult
          }
        } catch (error) {
          throw error
        }
        break

      case 'premium_expire_check':
        try {
          const { data: premiumResult, error: premiumError } = await supabase.rpc('run_premium_expire_check')
          if (premiumError) {
            // Fonksiyon yoksa manuel kontrol yap
            if (premiumError.code === 'PGRST202') {
              const { error: updateError } = await supabase
                .from('premium_subscriptions')
                .update({ is_active: false })
                .eq('is_active', true)
                .lt('expires_at', new Date().toISOString())
              
              if (updateError) throw updateError
              
              result = {
                success: true,
                affected_rows: 0,
                message: 'Premium abonelik kontrolleri manuel olarak yapıldı'
              }
            } else {
              throw premiumError
            }
          } else {
            result = premiumResult
          }
        } catch (error) {
          throw error
        }
        break

      case 'cleanup_old_job_logs':
        try {
          const { data: cleanupResult, error: cleanupError } = await supabase.rpc('cleanup_old_job_logs')
          if (cleanupError) {
            // Fonksiyon yoksa manuel temizlik yap
            if (cleanupError.code === 'PGRST202') {
              result = {
                success: true,
                affected_rows: 0,
                message: 'Job logs tablosu henüz mevcut değil'
              }
            } else {
              throw cleanupError
            }
          } else {
            result = {
              success: true,
              affected_rows: cleanupResult,
              message: `${cleanupResult} eski log kaydı temizlendi`
            }
          }
        } catch (error) {
          throw error
        }
        break

      default:
        return NextResponse.json({ error: 'Unknown job name' }, { status: 400 })
    }

    // Job tamamlanmasını logla
    if (jobId) {
      try {
        await supabase.rpc('log_job_complete', {
          p_job_id: jobId,
          p_status: result.success ? 'success' : 'failed',
          p_affected_rows: result.affected_rows || 0,
          p_error_message: result.success ? null : result.message,
          p_details: { result }
        })
      } catch (logErr) {
        console.warn('Failed to log job completion:', logErr)
      }
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error running job:', error)
    
    // Hata durumunda da logla
    if (jobId) {
      try {
        await supabase.rpc('log_job_complete', {
          p_job_id: jobId,
          p_status: 'failed',
          p_affected_rows: 0,
          p_error_message: error.message,
          p_details: { error: error.message }
        })
      } catch (logErr) {
        console.warn('Failed to log job error:', logErr)
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}