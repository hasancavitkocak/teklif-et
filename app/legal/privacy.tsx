import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gizlilik Politikası</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updateDate}>Son Güncelleme: 26 Kasım 2024</Text>

        <Text style={styles.intro}>
          Teklif.et olarak gizliliğinize önem veriyoruz. Bu politika, kişisel verilerinizin 
          nasıl toplandığını, kullanıldığını ve korunduğunu açıklar.
        </Text>

        <Text style={styles.sectionTitle}>1. Toplanan Bilgiler</Text>
        <Text style={styles.paragraph}>
          Hizmeti sağlamak için aşağıdaki bilgileri topluyoruz:{'\n\n'}
          • Profil bilgileri (isim, doğum tarihi, cinsiyet){'\n'}
          • Fotoğraflar{'\n'}
          • Konum bilgisi (şehir/ilçe){'\n'}
          • Aktivite tercihleri{'\n'}
          • Uygulama kullanım verileri{'\n'}
          • Cihaz bilgileri
        </Text>

        <Text style={styles.sectionTitle}>2. Bilgilerin Kullanımı</Text>
        <Text style={styles.paragraph}>
          Topladığımız bilgileri şu amaçlarla kullanırız:{'\n\n'}
          • Hizmeti sağlamak ve geliştirmek{'\n'}
          • Uygun eşleşmeler önermek{'\n'}
          • Kullanıcı deneyimini kişiselleştirmek{'\n'}
          • Güvenlik ve dolandırıcılık önleme{'\n'}
          • İstatistik ve analiz{'\n'}
          • Müşteri desteği sağlamak
        </Text>

        <Text style={styles.sectionTitle}>3. Bilgi Paylaşımı</Text>
        <Text style={styles.paragraph}>
          Kişisel bilgileriniz aşağıdaki durumlarda paylaşılabilir:{'\n\n'}
          • Diğer kullanıcılarla (profil bilgileri){'\n'}
          • Yasal zorunluluklar gereği{'\n'}
          • Güvenlik ve dolandırıcılık önleme amacıyla{'\n'}
          • Hizmet sağlayıcılarla (veri barındırma, analiz){'\n\n'}
          Bilgilerinizi üçüncü taraflara satmıyoruz.
        </Text>

        <Text style={styles.sectionTitle}>4. Veri Güvenliği</Text>
        <Text style={styles.paragraph}>
          Verilerinizi korumak için endüstri standardı güvenlik önlemleri kullanıyoruz:{'\n\n'}
          • Şifreli veri aktarımı{'\n'}
          • Güvenli veri depolama{'\n'}
          • Düzenli güvenlik denetimleri{'\n'}
          • Erişim kontrolü ve yetkilendirme
        </Text>

        <Text style={styles.sectionTitle}>5. Konum Bilgisi</Text>
        <Text style={styles.paragraph}>
          Konum bilginizi sadece şehir/ilçe düzeyinde topluyoruz. Bu bilgi size yakın 
          aktivite teklifleri göstermek için kullanılır. Konum paylaşımını istediğiniz 
          zaman kapatabilirsiniz.
        </Text>

        <Text style={styles.sectionTitle}>6. Fotoğraflar</Text>
        <Text style={styles.paragraph}>
          Yüklediğiniz fotoğraflar profilinizde görüntülenir ve diğer kullanıcılarla paylaşılır. 
          Fotoğraflarınızı istediğiniz zaman silebilir veya değiştirebilirsiniz.
        </Text>

        <Text style={styles.sectionTitle}>7. Çerezler ve Takip</Text>
        <Text style={styles.paragraph}>
          Uygulama deneyimini iyileştirmek için çerezler ve benzeri teknolojiler kullanıyoruz. 
          Bu teknolojiler tercihlerinizi hatırlamak ve kullanım istatistikleri toplamak için kullanılır.
        </Text>

        <Text style={styles.sectionTitle}>8. Çocukların Gizliliği</Text>
        <Text style={styles.paragraph}>
          Hizmetimiz 18 yaş altı kullanıcılara yönelik değildir. 18 yaş altı kullanıcılardan 
          bilerek veri toplamıyoruz.
        </Text>

        <Text style={styles.sectionTitle}>9. Haklarınız</Text>
        <Text style={styles.paragraph}>
          Kişisel verilerinizle ilgili aşağıdaki haklara sahipsiniz:{'\n\n'}
          • Verilerinize erişim{'\n'}
          • Verilerin düzeltilmesi{'\n'}
          • Verilerin silinmesi{'\n'}
          • Veri taşınabilirliği{'\n'}
          • İşlemeye itiraz{'\n\n'}
          Bu haklarınızı kullanmak için uygulama içi destek bölümünden bize ulaşabilirsiniz.
        </Text>

        <Text style={styles.sectionTitle}>10. Hesap Silme</Text>
        <Text style={styles.paragraph}>
          Hesabınızı istediğiniz zaman silebilirsiniz. Hesap silme işlemi kalıcıdır ve 
          tüm verileriniz sistemden silinir. Bu işlem geri alınamaz.
        </Text>

        <Text style={styles.sectionTitle}>11. Veri Saklama</Text>
        <Text style={styles.paragraph}>
          Verilerinizi hizmeti sağlamak için gerekli olduğu sürece saklıyoruz. Hesabınızı 
          sildiğinizde verileriniz 30 gün içinde sistemden tamamen silinir.
        </Text>

        <Text style={styles.sectionTitle}>12. Uluslararası Veri Aktarımı</Text>
        <Text style={styles.paragraph}>
          Verileriniz güvenli sunucularda saklanır ve işlenir. Veri aktarımı sırasında 
          uygun güvenlik önlemleri alınır.
        </Text>

        <Text style={styles.sectionTitle}>13. Politika Değişiklikleri</Text>
        <Text style={styles.paragraph}>
          Bu gizlilik politikası zaman zaman güncellenebilir. Önemli değişiklikler hakkında 
          uygulama içinde bildirim yapılacaktır.
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Gizlilik ile ilgili sorularınız için uygulama içi destek bölümünden bize ulaşabilirsiniz.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  updateDate: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  intro: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 24,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 16,
  },
  footer: {
    marginTop: 32,
    marginBottom: 40,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
