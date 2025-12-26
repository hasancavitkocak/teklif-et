import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GooglePlayPurchaseData {
  kind: string
  purchaseTimeMillis: string
  purchaseState: number
  consumptionState: number
  developerPayload: string
  orderId: string
  acknowledgementState: number
  purchaseToken: string
  productId: string
  quantity: number
  obfuscatedExternalAccountId: string
  obfuscatedExternalProfileId: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { purchaseToken, productId, packageName } = await req.json()

    if (!purchaseToken || !productId || !packageName) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameters' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Google Play Developer API Service Account Key
    const serviceAccountKey = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_KEY')
    if (!serviceAccountKey) {
      console.error('❌ Google Play Service Account Key bulunamadı')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Service account key not configured' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse service account key
    const credentials = JSON.parse(serviceAccountKey)

    // Create JWT for Google API authentication
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }

    // Sign JWT (simplified - in production use proper JWT library)
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const payloadEncoded = btoa(JSON.stringify(payload))
    
    // Get access token from Google
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${header}.${payloadEncoded}.signature` // Simplified
      })
    })

    if (!tokenResponse.ok) {
      console.error('❌ Google OAuth token alınamadı')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to get Google access token' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { access_token } = await tokenResponse.json()

    // Validate purchase with Google Play Developer API
    const validateUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${purchaseToken}`
    
    console.log('🔍 Google Play API çağrılıyor:', validateUrl)

    const validateResponse = await fetch(validateUrl, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      }
    })

    if (!validateResponse.ok) {
      console.error('❌ Google Play API validation başarısız:', validateResponse.status)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Google Play API error: ${validateResponse.status}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const purchaseData: GooglePlayPurchaseData = await validateResponse.json()
    
    console.log('✅ Google Play API response:', purchaseData)

    // Validate purchase state
    if (purchaseData.purchaseState !== 0) { // 0 = Purchased
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid purchase state: ${purchaseData.purchaseState}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate acknowledgement state
    if (purchaseData.acknowledgementState !== 1) { // 1 = Acknowledged
      console.warn('⚠️ Purchase not acknowledged yet')
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        purchaseData: {
          orderId: purchaseData.orderId,
          purchaseTime: purchaseData.purchaseTimeMillis,
          purchaseState: purchaseData.purchaseState,
          acknowledgementState: purchaseData.acknowledgementState,
          quantity: purchaseData.quantity
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Validation error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})