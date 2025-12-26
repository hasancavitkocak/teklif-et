# Google Play Developer API Kurulumu

## 🔧 Kurulum Adımları:

### 1. Google Cloud Console Kurulumu:

1. **Google Cloud Console**'a git: https://console.cloud.google.com/
2. **Proje seç** veya yeni proje oluştur
3. **APIs & Services** → **Library**
4. **"Google Play Developer API"** ara ve **Enable** et

### 2. Service Account Oluştur:

1. **APIs & Services** → **Credentials**
2. **Create Credentials** → **Service Account**
3. Service account adı: `google-play-validator`
4. **Create and Continue**
5. **Role**: `Service Account User`
6. **Done**

### 3. Service Account Key İndir:

1. Oluşturulan service account'a tıkla
2. **Keys** tab'ına git
3. **Add Key** → **Create New Key**
4. **JSON** seç ve **Create**
5. İndirilen JSON dosyasını güvenli yerde sakla

### 4. Google Play Console Kurulumu:

1. **Google Play Console**'a git: https://play.google.com/console/
2. **Setup** → **API access**
3. **Link a Google Cloud project**
4. Yukarıda oluşturduğun projeyi seç
5. **Service accounts** bölümünde service account'u bul
6. **Grant access** → **App permissions** → Uygulanı seç
7. **Account permissions**:
   - ✅ View app information and download bulk reports
   - ✅ View financial data, orders, and cancellation survey responses
   - ✅ Manage orders and subscriptions
8. **Invite user**

### 5. Supabase Environment Variables:

```bash
# Supabase Dashboard → Settings → Environment Variables
GOOGLE_PLAY_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
```

### 6. Supabase Edge Function Deploy:

```bash
# Edge function'ı deploy et
supabase functions deploy validate-google-play-purchase

# Environment variable'ı set et
supabase secrets set GOOGLE_PLAY_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

### 7. Test Et:

```bash
# Test purchase token ile test et
curl -X POST 'https://your-project.supabase.co/functions/v1/validate-google-play-purchase' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "purchaseToken": "test_token",
    "productId": "premiummonthly",
    "packageName": "com.teklifet.app"
  }'
```

## 🔒 Güvenlik Notları:

- Service Account JSON'ını **asla** client-side'da kullanma
- Sadece Supabase Edge Function'da kullan
- Production'da mutlaka gerçek API doğrulaması yap
- Development'da bypass mekanizması var ama production'da kapalı

## 📋 Kontrol Listesi:

- [ ] Google Cloud Console'da API aktif
- [ ] Service Account oluşturuldu
- [ ] JSON key indirildi
- [ ] Google Play Console'da erişim verildi
- [ ] Supabase'de environment variable set edildi
- [ ] Edge function deploy edildi
- [ ] Test edildi

## 🚨 Önemli:

Bu kurulum **production için zorunlu**. Olmadan satın almalar doğrulanamaz ve **güvenlik açığı** oluşur!