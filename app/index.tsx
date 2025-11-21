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

      // Eğer zaten onboarding içindeyse, kontrol etme
      const inOnboarding = segments.some(segment => segment === 'onboarding');
      if (inOnboarding) {
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) {
        router.replace('/onboarding/name');
      } else if (!profile.onboarding_completed) {
        router.replace('/onboarding/name');
      } else {
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
