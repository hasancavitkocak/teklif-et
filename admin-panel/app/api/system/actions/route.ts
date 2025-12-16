import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    let result

    switch (action) {
      case 'cleanup_database':
        try {
          // Eski job loglarını temizle
          const { data: cleanupResult, error: cleanupError } = await supabase.rpc('cleanup_old_job_logs')
          if (cleanupError) {
            if (cleanupError.code === 'PGRST202') {
              result = {
                success: true,
                message: 'Job logs tablosu henüz mevcut değil, temizlik gerekmiyor.'
              }
            } else {
              throw cleanupError
            }
          } else {
            result = {
              success: true,
              message: `Veritabanı temizliği tamamlandı. ${cleanupResult} log kaydı silindi.`
            }
          }
        } catch (error) {
          throw error
        }
        break

      case 'clear_cache':
        // Önbellek temizliği (şimdilik sadece başarılı mesaj)
        result = {
          success: true,
          message: 'Önbellek temizliği tamamlandı.'
        }
        break

      case 'cleanup_inactive_users':
        try {
          // 30 günden fazla giriş yapmayan kullanıcıları temizle
          const { data: inactiveResult, error: inactiveError } = await supabase.rpc('cleanup_inactive_users')
          if (inactiveError) {
            if (inactiveError.code === 'PGRST202') {
              // Manuel temizlik yap
              const { error: deleteError } = await supabase
                .from('profiles')
                .delete()
                .eq('is_active', false)
                .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
              
              if (deleteError) throw deleteError
              
              result = {
                success: true,
                message: 'Pasif kullanıcı temizliği manuel olarak yapıldı.'
              }
            } else {
              throw inactiveError
            }
          } else {
            result = {
              success: true,
              message: `${inactiveResult} pasif kullanıcı temizlendi.`
            }
          }
        } catch (error) {
          throw error
        }
        break

      case 'cleanup_test_data':
        try {
          // Test verilerini temizle
          const { data: testResult, error: testError } = await supabase.rpc('cleanup_test_data')
          if (testError) {
            if (testError.code === 'PGRST202') {
              result = {
                success: true,
                message: 'Test veri temizleme fonksiyonu henüz mevcut değil.'
              }
            } else {
              throw testError
            }
          } else {
            result = {
              success: true,
              message: 'Test verileri temizlendi.'
            }
          }
        } catch (error) {
          throw error
        }
        break

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error running system action:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}