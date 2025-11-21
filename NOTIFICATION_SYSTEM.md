# 🔔 Bildirim Sistemi ve Otomatik İşlemler

## 📋 Yapılan İyileştirmeler

### 1️⃣ **Bildirim Sistemi**
- ✅ `notifications` tablosu oluşturuldu
- ✅ Bildirim tipleri: `match`, `request_accepted`, `new_request`
- ✅ Real-time bildirim güncellemeleri
- ✅ Okundu/okunmadı durumu takibi

### 2️⃣ **Otomatik Reddetme**
- ✅ Bir başvuru kabul edildiğinde, aynı teklife yapılan diğer bekleyen başvurular otomatik olarak `auto_rejected` durumuna alınır
- ✅ Teklif durumu `matched` olarak güncellenir
- ✅ Otomatik reddedilen başvurular kullanıcıya gösterilmez

### 3️⃣ **Başvuru Durumları**
- `pending` - Beklemede
- `accepted` - Kabul edildi ✓
- `rejected` - Manuel olarak reddedildi ✗
- `auto_rejected` - Başka biri kabul edildiği için otomatik reddedildi (gizli)

### 4️⃣ **Trigger'lar**

#### Yeni Başvuru Geldiğinde
```sql
on_new_proposal_request → notify_new_request()
```
- Teklif sahibine bildirim gönderilir
- "X kişisi teklifinize başvurdu"

#### Başvuru Kabul Edildiğinde
```sql
on_request_accepted → handle_request_acceptance()
```
- Başvuran kişiye bildirim gönderilir
- Diğer bekleyen başvurular otomatik reddedilir
- Teklif durumu `matched` olur

#### Match Oluştuğunda
```sql
on_new_match → notify_new_match()
```
- Her iki kullanıcıya da bildirim gönderilir
- "X ile eşleştiniz! 🎉"

### 5️⃣ **API Katmanı**

#### Notifications API (`api/notifications.ts`)
```typescript
notificationsAPI.getNotifications(userId)
notificationsAPI.getUnreadCount(userId)
notificationsAPI.markAsRead(notificationId)
notificationsAPI.markAllAsRead(userId)
notificationsAPI.deleteNotification(notificationId)
```

#### Proposals API Güncellemeleri
```typescript
// Kabul edilenleri de göster
getReceivedRequests() → status IN ['pending', 'accepted']

// Otomatik reddedilenleri gizle
getSentRequests() → status != 'auto_rejected'
```

### 6️⃣ **Context ve State Yönetimi**

#### NotificationContext
```typescript
const { 
  notifications,
  unreadCount,
  refreshNotifications,
  markAsRead,
  markAllAsRead 
} = useNotifications();
```

### 7️⃣ **UI İyileştirmeleri**

#### Bildirim Ekranı (`app/notifications.tsx`)
- Bildirim listesi
- Okunmamış sayısı badge
- "Tümünü okundu işaretle" butonu
- Bildirim tipine göre yönlendirme
- Silme işlevi

#### Proposals Ekranı
- Kabul edilen başvurular yeşil badge ile gösterilir
- Status renkleri ve metinleri güncellendi
- Otomatik reddedilenler gösterilmez

#### Discover Ekranı
- Header'a bildirim ikonu eklendi
- Bildirim ekranına yönlendirme

## 🔄 İş Akışı

### Senaryo 1: Normal Başvuru
1. **Kullanıcı A** → Kullanıcı B'nin teklifine başvurur
2. **Kullanıcı B** → Bildirim alır: "A kişisi teklifinize başvurdu"
3. **Kullanıcı B** → Başvuruları görüntüler (Proposals > Başvurular)
4. **Kullanıcı B** → Kabul eder
5. **Sistem** → Match oluşturur
6. **Sistem** → Diğer bekleyen başvuruları otomatik reddeder
7. **Sistem** → Teklifi `matched` durumuna alır
8. **Her iki kullanıcı** → "Eşleştiniz! 🎉" bildirimi alır
9. **Her iki kullanıcı** → Mesajlaşmaya başlayabilir

### Senaryo 2: Çoklu Başvuru
1. **Kullanıcı A, C, D** → Kullanıcı B'nin teklifine başvurur
2. **Kullanıcı B** → 3 bildirim alır
3. **Kullanıcı B** → A'nın başvurusunu kabul eder
4. **Sistem** → A ile match oluşturur
5. **Sistem** → C ve D'nin başvurularını otomatik reddeder (`auto_rejected`)
6. **C ve D** → Bildirim almaz (kötü UX önlenir)
7. **C ve D** → Gönderilen başvurularında bu teklifi görmez

### Senaryo 3: Karşılıklı Başvuru (Otomatik Match)
1. **Kullanıcı A** → Kullanıcı B'nin teklifine başvurur
2. **Kullanıcı B** → Kullanıcı A'nın teklifine başvurur
3. **Sistem** → Otomatik match oluşturur
4. **Her iki kullanıcı** → Anında "Eşleştiniz! 🎉" bildirimi alır

## 📦 Yeni Dosyalar

```
supabase/migrations/
  └── 20251121220000_add_notifications_and_auto_reject.sql

api/
  └── notifications.ts

contexts/
  └── NotificationContext.tsx

app/
  └── notifications.tsx
```

## 🔧 Güncellenen Dosyalar

```
app/_layout.tsx                 → NotificationProvider eklendi
app/(tabs)/index.tsx            → Bildirim ikonu eklendi
app/(tabs)/proposals.tsx        → Status gösterimi iyileştirildi
api/proposals.ts                → Filtreler güncellendi
api/index.ts                    → notifications export eklendi
```

## 🚀 Kullanım

### Bildirimleri Görüntüleme
```typescript
import { useNotifications } from '@/contexts/NotificationContext';

const { notifications, unreadCount } = useNotifications();
```

### Bildirim Ekranına Gitme
```typescript
router.push('/notifications');
```

### Manuel Bildirim Oluşturma (Gelecek için)
```sql
INSERT INTO notifications (user_id, type, title, message, data)
VALUES (
  'user-uuid',
  'custom',
  'Başlık',
  'Mesaj',
  '{"key": "value"}'::jsonb
);
```

## 🧹 Temizleme

30 günden eski reddedilen başvuruları temizlemek için:
```sql
SELECT cleanup_old_rejected_requests();
```

Bu fonksiyonu cron job olarak çalıştırabilirsiniz.

## 📊 Database Schema

### notifications
```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES auth.users
type            TEXT (match, request_accepted, new_request)
title           TEXT
message         TEXT
data            JSONB
read            BOOLEAN DEFAULT false
created_at      TIMESTAMP
```

### proposal_requests (güncellendi)
```sql
status          TEXT (pending, accepted, rejected, auto_rejected)
```

### proposals (güncellendi)
```sql
status          TEXT (active, matched, expired)
```

## ✅ Test Checklist

- [ ] Yeni başvuru geldiğinde bildirim oluşuyor mu?
- [ ] Başvuru kabul edildiğinde bildirim gidiyor mu?
- [ ] Diğer başvurular otomatik reddediliyor mu?
- [ ] Match oluştuğunda bildirim gidiyor mu?
- [ ] Bildirimler real-time güncelleniy or mu?
- [ ] Okundu işaretleme çalışıyor mu?
- [ ] Bildirim silme çalışıyor mu?
- [ ] Otomatik reddedilenler gizleniyor mu?
