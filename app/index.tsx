import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const checkProfile = async () => {
      if (!user) {
        setTimeout(() => {
          router.replace('/auth/welcome');
        }, 100);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, name, birth_date, gender, city')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) {
        router.replace('/onboarding/name');
        return;
      }

      // Onboarding tamamlandıysa ana ekrana git
      if (profile.onboarding_completed) {
        router.replace('/(tabs)');
        return;
      }

      // Hangi adımda kaldığını kontrol et
      if (!profile.name) {
        router.replace('/onboarding/name');
      } else if (!profile.birth_date) {
        router.replace('/onboarding/birthdate');
      } else if (!profile.gender) {
        router.replace('/onboarding/gender');
      } else if (!profile.city) {
        router.replace('/onboarding/location');
      } else {
        // Diğer adımlar için interests'e git
        router.replace('/onboarding/interests');
      }
    };

    checkProfile();
  }, [user, loading]);

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
