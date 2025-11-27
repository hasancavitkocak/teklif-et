# Admin Panel Giriş Bilgileri

## Varsayılan Giriş

**Email:** `admin@datingapp.com`  
**Şifre:** `admin123456`

## Önemli Notlar

⚠️ **GÜVENLİK UYARISI**: Bu bilgiler sadece development amaçlıdır!

Production'a geçmeden önce:
1. Şifreyi mutlaka değiştirin
2. Gerçek bir authentication sistemi ekleyin (Supabase Auth veya JWT)
3. Admin paneline sadece güvenilir IP'lerden erişim verin
4. HTTPS kullanın

## Şifreyi Değiştirmek

`admin-panel/app/login/page.tsx` dosyasındaki şu satırları düzenleyin:

```typescript
const ADMIN_EMAIL = 'admin@datingapp.com'
const ADMIN_PASSWORD = 'admin123456'
```

## Gelişmiş Authentication (Önerilen)

Daha güvenli bir sistem için:
1. Supabase'de `admin_users` tablosunu kullanın
2. Şifreleri bcrypt ile hashleyin
3. JWT token kullanın
4. 2FA ekleyin

Migration dosyası hazır: `supabase/migrations/20251127100000_create_admin_users.sql`
