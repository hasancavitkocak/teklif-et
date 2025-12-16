# 🕐 Cron Jobs Kurulum Rehberi

Bu dosya, uygulamanın düzgün çalışması için gerekli olan otomatik görevlerin (cron jobs) kurulum talimatlarını içerir.

## 📋 Gerekli Cron Jobs

### 1. **Günlük Temizlik ve Reset İşlemleri**
**Dosya**: `scripts/daily_proposal_reset.sql`
**Sıklık**: Her gün gece yarısı
**Görev**: 
- Eski günlük sayaçları temizler
- Süresi geçen teklifleri expired yapar
- Veritabanı performansını optimize eder

```bash
# Crontab'a ekle
0 0 * * * psql -d your_database_url -f /path/to/scripts/daily_proposal_reset.sql
```

### 2. **Saatlik Teklif Expiry Kontrolü**
**Dosya**: `scripts/expire_old_proposals.sql`
**Sıklık**: Her saat başı
**Görev**: 
- Saati geçen teklifleri expired yapar
- Daha hızlı tepki süresi sağlar

```bash
# Crontab'a ekle
0 * * * * psql -d your_database_url -f /path/to/scripts/expire_old_proposals.sql
```

### 3. **Premium Abonelik Kontrolü** (Mevcut)
**Dosya**: `scripts/premium_expire_job.sql`
**Sıklık**: Her gün
**Görev**: Süresi dolan premium abonelikleri kontrol eder

```bash
# Crontab'a ekle
0 1 * * * psql -d your_database_url -f /path/to/scripts/premium_expire_job.sql
```

## 🛠️ Kurulum Adımları

### 1. Crontab'ı Düzenle
```bash
crontab -e
```

### 2. Aşağıdaki satırları ekle
```bash
# Günlük temizlik (her gece 00:00)
0 0 * * * psql -d "your_supabase_connection_string" -f /path/to/scripts/daily_proposal_reset.sql

# Saatlik expiry kontrolü (her saat başı)
0 * * * * psql -d "your_supabase_connection_string" -f /path/to/scripts/expire_old_proposals.sql

# Premium kontrolü (her gün 01:00)
0 1 * * * psql -d "your_supabase_connection_string" -f /path/to/scripts/premium_expire_job.sql
```

### 3. Cron servisini yeniden başlat
```bash
sudo service cron restart
```

## 📊 Monitoring

### Logları Kontrol Et
```bash
# Cron loglarını görüntüle
tail -f /var/log/cron.log

# Veya sistem loglarında ara
grep CRON /var/log/syslog
```

### Manuel Test
```bash
# Scriptleri manuel çalıştırarak test et
psql -d "your_connection_string" -f scripts/daily_proposal_reset.sql
psql -d "your_connection_string" -f scripts/expire_old_proposals.sql
```

## ⚠️ Önemli Notlar

1. **Connection String**: Supabase connection string'inizi güvenli bir şekilde saklayın
2. **Dosya Yolları**: Script dosyalarının tam yolunu kullanın
3. **Permissions**: Cron job'ın dosyalara erişim yetkisi olduğundan emin olun
4. **Timezone**: Sunucu timezone'unu kontrol edin
5. **Backup**: Önemli işlemler öncesi veritabanı backup'ı alın

## 🔧 Alternatif Çözümler

### Supabase Edge Functions
Cron job yerine Supabase Edge Functions kullanabilirsiniz:

```typescript
// edge-functions/expire-proposals/index.ts
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  const { data, error } = await supabase.rpc('expire_old_proposals')
  
  return new Response(JSON.stringify({ expired: data }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### GitHub Actions (CI/CD)
```yaml
# .github/workflows/cron-jobs.yml
name: Database Maintenance
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
jobs:
  expire-proposals:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run expiry job
        run: |
          psql "${{ secrets.DATABASE_URL }}" -f scripts/daily_proposal_reset.sql
```