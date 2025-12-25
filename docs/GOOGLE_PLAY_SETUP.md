# Google Play Console Setup - Adım Adım Rehber

## 🎯 Hedef
Premium satın alma işlemlerinin Google Play Store'da görünmesi ve gerçek ödeme yapılması.

## 📋 Gereksinimler
- Google Play Console Developer hesabı ($25 tek seferlik)
- Signed APK/AAB dosyası
- Test Gmail hesapları

## 1️⃣ Google Play Console Hesap Açma

### Adım 1: Developer Hesabı
1. [Google Play Console](https://play.google.com/console) gidin
2. "Create Developer Account" tıklayın
3. $25 ödeme yapın (tek seferlik)
4. Hesap doğrulamasını tamamlayın

### Adım 2: Uygulama Oluşturma
1. "Create app" butonuna tıklayın
2. App details doldurun:
   - **App name:** Teklif Et
   - **Default language:** Turkish
   - **App or game:** App
   - **Free or paid:** Free

## 2️⃣ In-App Products Oluşturma

### Adım 1: Monetization Setup
1. Sol menüden **Monetization > Products > In-app products**
2. "Create product" butonuna tıklayın

### Adım 2: Ürünleri Tek Tek Oluşturun

#### Premium Aylık
```
Product ID: premium_monthly
Name: Premium Aylık Abonelik
Description: Tüm premium özelliklere aylık erişim
Price: ₺29,99
```

#### Premium Yıllık
```
Product ID: premium_yearly
Name: Premium Yıllık Abonelik  
Description: Yıllık premium abonelik - %44 tasarruf
Price: ₺199,99
```

#### Super Like Paketleri
```
Product ID: super_like_5
Name: 5 Super Like
Description: 5 adet Super Like paketi
Price: ₺9,99

Product ID: super_like_10
Name: 10 Super Like
Description: 10 adet Super Like paketi
Price: ₺17,99
```

#### Boost Paketi
```
Product ID: boost_3
Name: 3 Boost
Description: 3 adet Boost paketi
Price: ₺14,99
```

### Adım 3: Her Ürün İçin
1. **Product details** doldurun
2. **Pricing** ayarlayın (TRY - Türk Lirası)
3. **Status** = Active yapın
4. **Save** butonuna basın

## 3️⃣ APK/AAB Yükleme

### Adım 1: Build Oluşturma
```bash
# EAS Build (Önerilen)
npm install -g @expo/eas-cli
eas login
eas build:configure
eas build --platform android --profile production

# Veya Local Build
npx expo run:android --variant release
```

### Adım 2: Internal Testing
1. Sol menüden **Release > Testing > Internal testing**
2. "Create new release" tıklayın
3. APK/AAB dosyanızı yükleyin
4. Release notes ekleyin
5. "Save" ve "Review release" yapın
6. "Start rollout to Internal testing" tıklayın

## 4️⃣ Test Kullanıcıları Ekleme

### Adım 1: License Testing
1. **Setup > License testing** gidin
2. Test Gmail hesaplarınızı ekleyin:
   ```
   test1@gmail.com
   test2@gmail.com
   yourtest@gmail.com
   ```
3. **License test response** = RESPOND_NORMALLY

### Adım 2: Internal Testing Testers
1. **Release > Testing > Internal testing > Testers** tab
2. Test Gmail hesaplarınızı ekleyin
3. "Save changes" yapın

## 5️⃣ Test Etme

### Adım 1: Test Cihazında Setup
1. Test Gmail hesabı ile Google Play Store'a giriş yapın
2. Internal testing linkini açın (email'de gelecek)
3. "Download it on Google Play" tıklayın
4. Uygulamayı indirin ve kurun

### Adım 2: IAP Test
1. Uygulamayı açın
2. Premium sayfasına gidin
3. Herhangi bir pakete tıklayın
4. **Google Play Store ödeme ekranı açılacak**
5. Test kartı ile ödeme yapın (gerçek para ödenmez)

## 6️⃣ Beklenen Sonuçlar

### ✅ Başarılı Test Göstergeleri:
- Google Play Store ödeme ekranı açılır
- Ürün fiyatları doğru görünür
- "Test purchase" yazısı görünür
- Ödeme tamamlandıktan sonra uygulama premium olur
- Google Play Console'da transaction görünür

### 📊 Google Play Console'da Görebileceğiniz:
1. **Monetization > Products > In-app products** - Ürün satışları
2. **Statistics > Financial reports** - Gelir raporları  
3. **Statistics > User acquisition** - Kullanıcı istatistikleri

## 7️⃣ Production'a Geçiş

### Test Başarılı Olduktan Sonra:
1. **Production track'ine yükleyin**
2. **Store listing** tamamlayın
3. **Content rating** alın
4. **App review'a** gönderin
5. **Yayın onayı** bekleyin (1-3 gün)

## 🚨 Önemli Notlar

- **Test hesapları gerçek para ödemez**
- **Ürünler 2-3 saat içinde aktif olur**
- **İlk test öncesi biraz bekleme süresi olabilir**
- **Internal testing linki email ile gelir**

## 🔧 Sorun Giderme

### "Item not found" hatası:
- Ürünlerin Google Play Console'da aktif olduğunu kontrol edin
- 2-3 saat bekleyin (propagation süresi)
- Test hesabının doğru olduğunu kontrol edin

### "Authentication required" hatası:
- Test hesabının Google Play Store'da oturum açtığını kontrol edin
- Cihazı yeniden başlatın
- Google Play Store'u güncelleyin

Bu adımları tamamladıktan sonra premium satın alma işlemleri Google Play Store üzerinden gerçek ödeme ile çalışacak!