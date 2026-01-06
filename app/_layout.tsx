import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { UnreadProvider } from '@/contexts/UnreadContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { PushNotificationProvider } from '@/contexts/PushNotificationContext';
import { NotificationBadgeProvider } from '@/contexts/NotificationBadgeContext';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <UnreadProvider>
          <NotificationProvider>
            <PushNotificationProvider>
              <NotificationBadgeProvider>
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
                  <Stack.Screen name="account-frozen" />
                  <Stack.Screen name="notifications" />
                  <Stack.Screen name="+not-found" />
                </Stack>
                <StatusBar style="dark" translucent={false} />
              </NotificationBadgeProvider>
            </PushNotificationProvider>
          </NotificationProvider>
        </UnreadProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
