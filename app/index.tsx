import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function Index() {
  const { user, loading, isAccountFrozen } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    console.log('🔍 Index useEffect çalıştı - loading:', loading, 'user:', user?.id || 'null');
    
    if (loading) {
      console.log('⏳ Loading devam ediyor, bekleniyor...');
      return;
    }

    const checkProfile = async () => {
      console.log('🔍 Checking profile, user:', user?.id || 'null');
      
      if (!user) {
        console.log('❌ No user, redirecting to welcome');
        setTimeout(() => {
          console.log('🔄 Router replace to welcome çağrılıyor...');
          try {
            // Navigation stack'ini temizle ve welcome'a git
            router.dismissAll();
            router.replace('/auth/welcome');
            console.log('✅ Router replace başarılı');
          } catch (error) {
            console.error('❌ Router replace hatası:', error);
            // Fallback: push kullan
            router.push('/auth/welcome');
          }
        }, 100);
        return;
      }

      // Eğer zaten onboarding içindeyse, kontrol etme
      const inOnboarding = segments.some(segment => segment === 'onboarding');
      if (inOnboarding) {
        console.log('📚 Onboarding içinde, kontrol atlanıyor');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_completed, is_active')
        .eq('id', user.id)
        .maybeSingle();

      console.log('👤 Profile data:', profile);
      console.log('❗ Profile error:', error);

      if (!profile) {
        console.log('➡️ No profile, going to onboarding');
        router.replace('/onboarding/name');
      } else if (!profile.onboarding_completed) {
        console.log('➡️ Onboarding not completed, going to onboarding');
        router.replace('/onboarding/name');
      } else if (profile.is_active === false) {
        console.log('🥶 Account is frozen, going to frozen screen');
        router.replace('/account-frozen');
      } else {
        console.log('✅ Profile complete, going to tabs');
        router.replace('/(tabs)');
      }
    };

    checkProfile();
  }, [user, loading, segments]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#8B5CF6" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});
