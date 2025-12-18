# Dislike Tracking Sistemi

Kullanıcıların tekliflerle etkileşimlerini (like, dislike, super_like) takip eden akıllı filtreleme sistemi.

## 🎯 Özellikler

### ✅ Etkileşim Takibi
- **Dislike**: Kullanıcı X butonuna bastığında kaydedilir
- **Like**: Kalp butonuna bastığında kaydedilir  
- **Super Like**: Yıldırım butonuna bastığında kaydedilir

### ✅ Akıllı Filtreleme
1. **İlk Gösterim**: Hiç etkileşimde bulunulmamış teklifler
2. **Tüm Teklifler Bittikten Sonra**: Dislike yapılan teklifler tekrar gösterilir
3. **Kalıcı Hariç Tutma**: Like/Super like yapılan teklifler bir daha gösterilmez

### ✅ Database Yapısı
```sql
user_interactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  proposal_id UUID REFERENCES proposals(id),
  interaction_type TEXT ('like', 'dislike', 'super_like'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(user_id, proposal_id)
)
```

## 🔧 Teknik Detaylar

### API Katmanı
- `api/user-interactions.ts` - Etkileşim yönetimi
- `api/discover.ts` - Güncellenmiş teklif filtreleme

### Frontend Entegrasyonu
- `handlePass()` - Dislike kaydeder
- `handleLike()` - Like/Super like kaydeder
- `loadProposals()` - Akıllı filtreleme uygular

### Database Migration
- `supabase/migrations/create_user_interactions_table.sql`
- RLS politikaları ile güvenlik
- Performans için indeksler

## 🚀 Kullanım Senaryosu

1. **Kullanıcı keşfet sayfasını açar**
   - Hiç etkileşimde bulunulmamış teklifler gösterilir

2. **Kullanıcı X butonuna basar (dislike)**
   - Etkileşim `user_interactions` tablosuna kaydedilir
   - Teklif bir daha gösterilmez (şimdilik)

3. **Tüm teklifler gösterildikten sonra**
   - Dislike yapılan teklifler tekrar gösterilir
   - Like/Super like yapılanlar hala hariç tutulur

## 💡 Avantajlar

- ✅ **Kullanıcı Deneyimi**: Aynı teklifleri tekrar tekrar görmez
- ✅ **İkinci Şans**: Dislike yapılan teklifler sonra tekrar görülebilir
- ✅ **Performans**: Akıllı filtreleme ile gereksiz yüklemeler önlenir
- ✅ **Analytics**: Kullanıcı davranışları analiz edilebilir

## 🔄 Gelecek Geliştirmeler

- [ ] Dislike sebebi ekleme (yaş, mesafe, ilgi alanı vs.)
- [ ] Zaman bazlı tekrar gösterme (1 hafta sonra)
- [ ] ML tabanlı öneri sistemi
- [ ] A/B test için farklı algoritma seçenekleri

Bu sistem sayesinde kullanıcılar daha kaliteli bir keşfet deneyimi yaşar ve teklifler daha akıllıca filtrelenir.