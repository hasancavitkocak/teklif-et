# Davet Kredisi Modal Kullanım Örneği

## 1. Import Etme

```tsx
import InvitationCreditModal from '@/components/InvitationCreditModal';
```

## 2. State Tanımlama

```tsx
const [showInvitationCreditModal, setShowInvitationCreditModal] = useState(false);
```

## 3. Modal Kullanımı

```tsx
<InvitationCreditModal
  visible={showInvitationCreditModal}
  onClose={() => setShowInvitationCreditModal(false)}
  onUpgrade={() => {
    setShowInvitationCreditModal(false);
    router.push('/(tabs)/premium');
  }}
/>
```

## 4. Modal Gösterme

Davet kredisi yetersiz olduğunda modalı göstermek için:

```tsx
const checkInvitationCredit = async () => {
  // Davet kredisi kontrolü
  if (!isPremium && remainingInvitations <= 0) {
    setShowInvitationCreditModal(true);
    return false;
  }
  return true;
};

// Kullanım örneği
const handleInviteUser = async () => {
  const hasCredit = await checkInvitationCredit();
  if (!hasCredit) return;
  
  // Davet gönderme işlemi...
};
```

## 5. InviteUsersModal'da Entegrasyon

`InviteUsersModal` komponenti artık otomatik olarak davet kredisi yetersizliği durumunda bu modalı gösteriyor:

- Kullanıcı seçerken limit kontrolü
- Davet gönderirken limit kontrolü
- Tasarıma uygun pop-up gösterimi
- Premium'a yönlendirme seçeneği

## Modal Özellikleri

- ✅ Tasarıma uygun stil
- ✅ Kırmızı tema (uyarı rengi)
- ✅ Premium'a yönlendirme
- ✅ Kapatma seçenekleri
- ✅ Mevcut modal tasarımıyla tutarlı
- ✅ Premium özelliklerini vurgulama