import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <View style={{ flex: 1, backgroundColor: '#FFF' }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth/welcome" />
          <Stack.Screen name="auth/phone" />
          <Stack.Screen name="auth/verify" />
          <Stack.Screen name="onboarding/name" />
          <Stack.Screen name="onboarding/birthdate" />
          <Stack.Screen name="onboarding/gender" />
          <Stack.Screen name="onboarding/interests" />
          <Stack.Screen name="onboarding/lifestyle" />
          <Stack.Screen name="onboarding/location" />
          <Stack.Screen name="onboarding/photos" />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="dark" backgroundColor="#FFF" />
      </View>
    </AuthProvider>
  );
}
