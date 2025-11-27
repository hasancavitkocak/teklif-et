# Dating App Admin Panel

Modern ve kapsamlı web tabanlı admin paneli.

## 🎯 Özellikler

### Dashboard
- 📊 Gerçek zamanlı istatistikler
- 📈 Trend göstergeleri (günlük karşılaştırma)
- 👥 Son kullanıcılar
- 💑 Son eşleşmeler
- 📝 Son proposallar
- 🏙️ Popüler şehirler

### Kullanıcı Yönetimi
- Kullanıcı listeleme ve arama
- Telefon numarası ile arama
- Filtreleme (Premium, Cinsiyet, Aktif)
- Kullanıcı detay sayfası
- Premium yapma/iptal etme
- Aktif/Pasif yapma
- Kullanıcı silme

### Eşleşme Yönetimi
- Tüm eşleşmeleri görüntüleme
- Eşleşme detayları
- Eşleşme silme

### Proposal Yönetimi
- Proposal listeleme (card görünümü)
- Proposal detay sayfası
- Eşleşmeler, davetler, başvurular
- Proposal silme ve düzenleme

### Mesaj Moderasyonu
- Match'lere göre gruplandırılmış mesajlar
- Konuşma listesi
- Mesaj detayları
- Okundu/okunmadı durumu
- Mesaj silme

### Fotoğraf Yönetimi
- Grid görünümü
- Kullanıcı bilgisi
- Ana fotoğraf işareti
- Fotoğraf sırası
- Fotoğraf silme

### Bildirimler
- Tüm bildirimleri görüntüleme
- Bildirim tipleri
- Okundu/okunmadı durumu

### Keşfet Feed
- Feed öğelerini görüntüleme
- Gösterildi/gösterilmedi durumu
- Feed silme

### Davetler
- Proposal davetlerini görüntüleme
- Davet durumları

### Raporlar ve Analizler
- Cinsiyet dağılımı (görsel)
- Proposal durumları
- Top 12 şehir (sıralı)
- Eşleşme oranı
- Premium kullanıcı oranı
- Aktivite özeti

## 🚀 Kurulum

1. Bağımlılıkları yükleyin:
\`\`\`bash
cd admin-panel
npm install
\`\`\`

2. Environment değişkenlerini ayarlayın:
\`\`\`bash
cp .env.local.example .env.local
\`\`\`

`.env.local` dosyasını düzenleyin:
\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
\`\`\`

3. Development sunucusunu başlatın:
\`\`\`bash
npm run dev
\`\`\`

Admin panel **http://localhost:3001** adresinde çalışacak.

## 🔐 Giriş

**Email:** `admin@datingapp.com`  
**Şifre:** `admin123456`

⚠️ **ÖNEMLİ**: Production'da mutlaka gerçek authentication ekleyin!

## 🛠️ Teknolojiler

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Supabase** - Backend ve database

## 📦 Production Deployment

1. Build alın:
\`\`\`bash
npm run build
\`\`\`

2. Production sunucusunu başlatın:
\`\`\`bash
npm start
\`\`\`

## 🔒 Güvenlik Notları

- ✅ Service Role Key ile RLS bypass
- ⚠️ Production'da gerçek auth ekleyin
- ⚠️ Service role key'i güvenli tutun
- ⚠️ Admin paneline IP kısıtlaması ekleyin
- ⚠️ HTTPS kullanın

## 📝 API Endpoints

Tüm API route'lar `/api` altında:
- `/api/dashboard` - Dashboard verileri
- `/api/users` - Kullanıcı CRUD
- `/api/matches` - Eşleşmeler
- `/api/proposals` - Proposallar
- `/api/messages` - Mesajlar
- `/api/photos` - Fotoğraflar
- `/api/notifications` - Bildirimler
- `/api/discover` - Keşfet feed
- `/api/invitations` - Davetler
- `/api/reports` - Raporlar

## 📄 Lisans

Private
