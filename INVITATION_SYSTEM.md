# Teklif Davet Sistemi

## Genel Bakış

Teklif sahiplerinin kullanıcıları tekliflerine davet edebilmesi için oluşturulmuş sistem.

## Özellikler

### 1. Davet Gönderme
- Teklif sahipleri, aynı şehirde ve ilgi alanında olan kullanıcıları davet edebilir
- Bir kullanıcı bir teklife sadece **bir kez** davet edilebilir (UNIQUE constraint)
- Zaten başvuru yapmış kullanıcılar davet edilemez
- Kullanıcı kendi teklifine davet edemez

### 2. Davet Durumları
- **pending**: Davet gönderildi, yanıt bekleniyor
- **accepted**: Davet kabul edildi → Otomatik match oluşur
- **declined**: Davet reddedildi

### 3. Otomatik İşlemler
- Davet kabul edildiğinde otomatik olarak **match** oluşur
- Davet gönderildiğinde davet edilen kullanıcıya **bildirim** gider
- Davet kabul edildiğinde davet eden kullanıcıya **bildirim** gider

## Veritabanı Yapısı

### `proposal_invitations` Tablosu

```sql
CREATE TABLE proposal_invitations (
  id uuid PRIMARY KEY,
  proposal_id uuid REFERENCES proposals(id),
  inviter_id uuid REFERENCES profiles(id),
  invited_user_id uuid REFERENCES profiles(id),
  status text CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz,
  responded_at timestamptz,
  UNIQUE(proposal_id, invited_user_id)
);
```

### Trigger'lar

1. **update_invitation_responded_at**: Status değiştiğinde `responded_at` otomatik güncellenir
2. **create_match_on_invitation_accept**: Davet kabul edildiğinde match oluşturur
3. **notify_on_invitation_created**: Davet gönderildiğinde bildirim oluşturur

## API Kullanımı

### Kullanıcıları Davet Et

```typescript
import { invitationsAPI } from '@/api';

// Tek kullanıcı davet et
await invitationsAPI.inviteUser(proposalId, inviterId, userId);

// Birden fazla kullanıcı davet et
await invitationsAPI.inviteUsers(proposalId, inviterId, [userId1, userId2]);
```

### Davetleri Görüntüle

```typescript
// Gönderilen davetler (teklif sahibi için)
const sentInvitations = await invitationsAPI.getSentInvitations(userId);

// Alınan davetler (davet edilen kullanıcı için)
const receivedInvitations = await invitationsAPI.getReceivedInvitations(userId);

// Belirli bir teklif için davetler
const proposalInvitations = await invitationsAPI.getInvitationsForProposal(proposalId);
```

### Daveti Yanıtla

```typescript
// Daveti kabul et
await invitationsAPI.acceptInvitation(invitationId);

// Daveti reddet
await invitationsAPI.declineInvitation(invitationId);

// Daveti iptal et (sadece pending olanlar)
await invitationsAPI.cancelInvitation(invitationId);
```

### Davet Edilebilir Kullanıcıları Getir

```typescript
// Aynı şehir ve ilgi alanında, henüz davet edilmemiş kullanıcılar
const users = await invitationsAPI.getInvitableUsers(proposalId, currentUserId);
```

## UI Bileşenleri

### 1. InviteUsersModal
Kullanıcı davet etme modal'ı. Teklif sahipleri bu modal ile kullanıcıları seçip davet gönderebilir.

```tsx
<InviteUsersModal
  visible={visible}
  onClose={onClose}
  proposalId={proposalId}
  proposalName={proposalName}
/>
```

### 2. InvitationsList
Alınan davetleri listeleyen bileşen. Kullanıcılar davetleri kabul veya reddedebilir.

```tsx
<InvitationsList />
```

## Kullanım Akışı

### Teklif Sahibi Perspektifi

1. Kullanıcı bir teklif oluşturur
2. "Tekliflerim" tab'ında teklifini görür
3. Teklif kartındaki **"Davet Et"** butonuna tıklar
4. Modal açılır ve davet edilebilir kullanıcılar listelenir
5. Kullanıcıları seçer ve "Gönder" butonuna basar
6. Davetler gönderilir ve bildirim oluşur

### Davet Edilen Kullanıcı Perspektifi

1. Kullanıcıya bildirim gelir: "Yeni Davet! 💌"
2. "Teklifler" → "Davetler" tab'ına gider
3. Daveti görür (teklif detayları ile birlikte)
4. **"Kabul Et"** veya **"Reddet"** butonuna basar
5. Kabul ederse otomatik match oluşur
6. "Eşleşmeler" ekranından mesajlaşmaya başlayabilir

## Bildirim Tipleri

### `proposal_invitation`
- **Başlık**: "Yeni Davet! 💌"
- **Mesaj**: "Bir teklife davet edildiniz!"
- **Alıcı**: Davet edilen kullanıcı

### `invitation_accepted`
- **Başlık**: "Davet Kabul Edildi! 🎉"
- **Mesaj**: "Davetiniz kabul edildi ve eşleştiniz!"
- **Alıcı**: Davet eden kullanıcı (teklif sahibi)

## Güvenlik

### RLS Policies

1. **Görüntüleme**:
   - Teklif sahipleri kendi tekliflerine ait davetleri görebilir
   - Davet edilen kullanıcılar kendi davetlerini görebilir

2. **Oluşturma**:
   - Sadece teklif sahipleri davet gönderebilir

3. **Güncelleme**:
   - Sadece davet edilen kullanıcılar davetlerini yanıtlayabilir (status update)

4. **Silme**:
   - Sadece teklif sahipleri bekleyen davetleri iptal edebilir

## Kısıtlamalar

- Bir kullanıcı bir teklife sadece **bir kez** davet edilebilir
- Kullanıcı kendi teklifine davet edemez
- Zaten başvuru yapmış kullanıcılar davet edilemez
- Sadece **pending** durumundaki davetler iptal edilebilir

## Gelecek Geliştirmeler

- [ ] Davet limiti (günlük/haftalık)
- [ ] Davet geçmişi ve istatistikler
- [ ] Toplu davet gönderme
- [ ] Davet şablonları (özel mesaj ile davet)
- [ ] Davet hatırlatıcıları
- [ ] Davet reddetme nedenleri
