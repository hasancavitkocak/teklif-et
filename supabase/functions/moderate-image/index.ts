import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ModerationRequest {
  imageUrl: string;
  userId: string;
  photoId?: string;
}

interface GoogleVisionResponse {
  responses: Array<{
    safeSearchAnnotation: {
      adult: string;
      spoof: string;
      medical: string;
      violence: string;
      racy: string;
    }
  }>
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { imageUrl, userId, photoId }: ModerationRequest = await req.json()

    console.log('🔍 Moderating image:', { imageUrl: imageUrl.substring(0, 50) + '...', userId, photoId })

    // Google Vision API çağrısı
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${Deno.env.get('GOOGLE_VISION_API_KEY')}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                source: {
                  imageUri: imageUrl
                }
              },
              features: [
                {
                  type: 'SAFE_SEARCH_DETECTION'
                }
              ]
            }
          ]
        })
      }
    )

    if (!visionResponse.ok) {
      throw new Error(`Google Vision API error: ${visionResponse.status}`)
    }

    const visionData: GoogleVisionResponse = await visionResponse.json()
    const safeSearch = visionData.responses[0]?.safeSearchAnnotation

    if (!safeSearch) {
      throw new Error('No safe search annotation found')
    }

    // İçeriği değerlendir
    const isInappropriate = 
      safeSearch.adult === 'LIKELY' || safeSearch.adult === 'VERY_LIKELY' ||
      safeSearch.racy === 'LIKELY' || safeSearch.racy === 'VERY_LIKELY' ||
      safeSearch.violence === 'LIKELY' || safeSearch.violence === 'VERY_LIKELY' ||
      safeSearch.adult === 'POSSIBLE' || safeSearch.racy === 'POSSIBLE'

    const reasons = []
    if (safeSearch.adult === 'LIKELY' || safeSearch.adult === 'VERY_LIKELY') {
      reasons.push('Adult/explicit content')
    }
    if (safeSearch.racy === 'LIKELY' || safeSearch.racy === 'VERY_LIKELY') {
      reasons.push('Racy/suggestive content')
    }
    if (safeSearch.violence === 'LIKELY' || safeSearch.violence === 'VERY_LIKELY') {
      reasons.push('Violent content')
    }
    if (safeSearch.adult === 'POSSIBLE' || safeSearch.racy === 'POSSIBLE') {
      reasons.push('Potentially inappropriate content')
    }

    console.log('📊 Vision results:', { 
      adult: safeSearch.adult, 
      racy: safeSearch.racy, 
      violence: safeSearch.violence,
      isInappropriate,
      reasons
    })

    if (isInappropriate) {
      // Fotoğrafı reddet
      if (photoId) {
        await supabase
          .from('profile_photos')
          .update({ 
            moderation_status: 'rejected',
            moderation_reason: reasons.join(', '),
            moderated_at: new Date().toISOString(),
            is_visible: false
          })
          .eq('id', photoId)
      }

      // Kullanıcıya bildirim gönder
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'photo_rejected',
          title: 'Fotoğraf Reddedildi',
          message: `Yüklediğiniz fotoğraf topluluk kurallarına uygun olmadığı için reddedildi: ${reasons.join(', ')}`,
          data: { 
            photo_id: photoId, 
            reasons,
            vision_results: safeSearch
          }
        })

      // Moderation log
      await supabase
        .from('content_moderation_logs')
        .insert({
          content_type: 'profile_photo',
          content_id: photoId,
          user_id: userId,
          action: 'rejected',
          reason: `Auto-rejected by Google Vision: ${reasons.join(', ')}`,
          moderator_id: null // Otomatik sistem
        })

      return new Response(
        JSON.stringify({ 
          approved: false, 
          reason: reasons.join(', '),
          details: safeSearch
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    } else {
      // Fotoğrafı onayla
      if (photoId) {
        await supabase
          .from('profile_photos')
          .update({ 
            moderation_status: 'approved',
            moderated_at: new Date().toISOString(),
            is_visible: true
          })
          .eq('id', photoId)
      }

      // Moderation log
      await supabase
        .from('content_moderation_logs')
        .insert({
          content_type: 'profile_photo',
          content_id: photoId,
          user_id: userId,
          action: 'approved',
          reason: 'Auto-approved by Google Vision - content appears appropriate',
          moderator_id: null // Otomatik sistem
        })

      return new Response(
        JSON.stringify({ 
          approved: true, 
          reason: 'Content appears appropriate',
          details: safeSearch
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

  } catch (error) {
    console.error('❌ Moderation error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        approved: false,
        reason: 'Moderation service error - manual review required'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})