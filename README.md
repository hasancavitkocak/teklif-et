# Teklif.et - Aktivite Bazlı Flört Uygulaması

Modern bir flört uygulaması. Kullanıcılar etkinlik teklifleri oluşturur, diğer kullanıcıların tekliflerine katılım talebi gönderir ve eşleştiklerinde mesajlaşabilirler.

## 🎯 Özellikler

### Temel Özellikler
- **Telefon ile kayıt/giriş** - OTP doğrulaması ile güvenli giriş (Demo için: 123456)
- **Adım adım profil oluşturma** - İsim, doğum tarihi, cinsiyet, ilgi alanları, yaşam tarzı, konum ve fotoğraflar
- **Keşfet sayfası** - Swipe ile etkinlik tekliflerini görüntüleme
- **Teklif oluşturma** - Kategorili etkinlik talebi oluşturma
- **Teklifler yönetimi** - Gelen ve giden teklifleri yönetme
- **Eşleşme ve mesajlaşma** - Kabul edilen teklifler için mesajlaşma
- **Premium özellikler** - Ücretli paketler ve avantajlar
- **Profil yönetimi** - Kullanıcı bilgileri ve ayarlar

### Premium Özellikler
- Sınırsız teklif gönderme (ücretsiz: 5 teklif/gün)
- Profil boost (30 dakika öncelik)
- Super like (ücretsiz: 1/gün)
- Gelişmiş filtreleme

## 🛠️ Teknolojiler

- **Framework:** Expo (React Native)
- **Database:** Supabase
- **Authentication:** Supabase Auth (Phone OTP)
- **Navigation:** Expo Router
- **UI:** React Native, Lucide Icons, Linear Gradient
- **Language:** TypeScript

## 🚀 Kurulum

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. `.env` dosyasını kontrol edin (Supabase bağlantı bilgileri otomatik yapılandırılmıştır)

3. Uygulamayı başlatın:
```bash
npm run dev
```

## 📱 Sayfalar

### 1. Giriş ve Onboarding
- Welcome ekranı
- Telefon numarası girişi
- OTP doğrulama (Demo: 123456)
- Profil oluşturma adımları (7 adım)

### 2. Ana Sayfalar (Tabs)
- **Keşfet:** Etkinlik tekliflerini görüntüleme ve teklif oluşturma
- **Teklifler:** Gelen ve giden teklifleri yönetme
- **Eşleşmeler:** Eşleşmeler ve mesajlaşma
- **Premium:** Ücretli paket seçenekleri
- **Profil:** Kullanıcı profili ve ayarlar

## 🗄️ Database Yapısı

### Tablolar
- `profiles` - Kullanıcı profilleri
- `profile_photos` - Profil fotoğrafları
- `interests` - İlgi alanları kategorileri
- `user_interests` - Kullanıcı ilgi alanları
- `proposals` - Etkinlik teklifleri
- `proposal_requests` - Teklif katılım talepleri
- `matches` - Eşleşmeler
- `messages` - Mesajlar

### Güvenlik
- Row Level Security (RLS) tüm tablolarda aktif
- Kullanıcılar sadece kendi verilerine erişebilir
- Proposal'lar sadece aktif olanlar görülebilir
- Mesajlar sadece eşleşmiş kullanıcılar arasında

## 🎨 Tasarım

- **Renk Paleti:** Violet-Purple gradient (#8B5CF6 → #A855F7)
- **Font:** Sistem default (clean ve modern)
- **Responsive:** Tüm ekran boyutları için optimize
- **Minimal:** Az icon kullanımı, temiz arayüz

## 🔧 Performans Optimizasyonları

- Cache sistemi ile veri yönetimi
- Ayrı tablolar ve ilişkiler ile optimize edilmiş sorgular
- RLS politikaları ile güvenli veri erişimi
- Lazy loading ve pagination hazır

## 📝 Notlar

- Bu bir demo uygulamadır
- OTP doğrulaması için test kodu: 123456
- Premium özellikleri demo modda çalışır
- Fotoğraf yükleme için placeholder URL'ler kullanılır
- Gerçek üretim ortamında ödeme sistemi entegrasyonu gerekir

## 🔐 Güvenlik

- Phone hash ile güvenli depolama
- IP maskeleme
- Row Level Security (RLS)
- Kullanıcı verilerinin şifrelenmesi
- Güvenli authentication akışı

## 📄 Lisans

Bu proje demo amaçlıdır.
