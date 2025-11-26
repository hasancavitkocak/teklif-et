import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kullanım Koşulları</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updateDate}>Son Güncelleme: 26 Kasım 2024</Text>

        <Text style={styles.sectionTitle}>1. Hizmetin Kabul Edilmesi</Text>
        <Text style={styles.paragraph}>
          Teklif.et uygulamasını kullanarak bu kullanım koşullarını kabul etmiş sayılırsınız. 
          Koşulları kabul etmiyorsanız lütfen uygulamayı kullanmayınız.
        </Text>

        <Text style={styles.sectionTitle}>2. Hizmet Tanımı</Text>
        <Text style={styles.paragraph}>
          Teklif.et, kullanıcıların aktivite bazlı buluşma teklifleri oluşturmasına ve 
          diğer kullanıcıların tekliflerine katılmasına olanak sağlayan bir sosyal platformdur.
        </Text>

        <Text style={styles.sectionTitle}>3. Kullanıcı Sorumlulukları</Text>
        <Text style={styles.paragraph}>
          • 18 yaşından büyük olmalısınız{'\n'}
          • Gerçek ve doğru bilgiler sağlamalısınız{'\n'}
          • Diğer kullanıcılara saygılı davranmalısınız{'\n'}
          • Yasalara uygun davranmalısınız{'\n'}
          • Hesabınızın güvenliğinden siz sorumlusunuz
        </Text>

        <Text style={styles.sectionTitle}>4. Yasak Davranışlar</Text>
        <Text style={styles.paragraph}>
          Aşağıdaki davranışlar kesinlikle yasaktır:{'\n\n'}
          • Taciz, tehdit veya rahatsız edici davranışlar{'\n'}
          • Sahte profil oluşturma{'\n'}
          • Spam veya istenmeyen içerik paylaşma{'\n'}
          • Ticari amaçlı kullanım{'\n'}
          • Başkalarının kişisel bilgilerini paylaşma{'\n'}
          • Platformu kötüye kullanma
        </Text>

        <Text style={styles.sectionTitle}>5. İçerik ve Fikri Mülkiyet</Text>
        <Text style={styles.paragraph}>
          Paylaştığınız içeriklerden siz sorumlusunuz. Platformda paylaştığınız içeriklerin 
          kullanım hakkını Teklif.et'e vermiş olursunuz. Ancak içeriklerin mülkiyeti size aittir.
        </Text>

        <Text style={styles.sectionTitle}>6. Hesap Askıya Alma ve Sonlandırma</Text>
        <Text style={styles.paragraph}>
          Kullanım koşullarını ihlal etmeniz durumunda hesabınız uyarı almadan askıya alınabilir 
          veya kalıcı olarak kapatılabilir.
        </Text>

        <Text style={styles.sectionTitle}>7. Hizmet Değişiklikleri</Text>
        <Text style={styles.paragraph}>
          Teklif.et, hizmeti dilediği zaman değiştirme, askıya alma veya sonlandırma hakkını saklı tutar. 
          Önemli değişiklikler hakkında kullanıcılar bilgilendirilecektir.
        </Text>

        <Text style={styles.sectionTitle}>8. Sorumluluk Reddi</Text>
        <Text style={styles.paragraph}>
          Teklif.et, kullanıcılar arasındaki etkileşimlerden sorumlu değildir. Platform sadece 
          bir buluşma aracıdır. Güvenliğiniz için her zaman dikkatli olun ve kamu alanlarında buluşun.
        </Text>

        <Text style={styles.sectionTitle}>9. Premium Üyelik</Text>
        <Text style={styles.paragraph}>
          Premium üyelik otomatik olarak yenilenir. İstediğiniz zaman iptal edebilirsiniz. 
          İptal sonrası mevcut dönem sonuna kadar premium özelliklerden yararlanmaya devam edersiniz.
        </Text>

        <Text style={styles.sectionTitle}>10. Değişiklikler</Text>
        <Text style={styles.paragraph}>
          Bu kullanım koşulları zaman zaman güncellenebilir. Önemli değişiklikler hakkında 
          uygulama içinde bildirim yapılacaktır. Güncellemelerden sonra uygulamayı kullanmaya 
          devam etmeniz yeni koşulları kabul ettiğiniz anlamına gelir.
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Sorularınız için uygulama içi destek bölümünden bize ulaşabilirsiniz.
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
    marginBottom: 24,
    fontStyle: 'italic',
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
