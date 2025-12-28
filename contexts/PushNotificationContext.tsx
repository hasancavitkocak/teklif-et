import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

// Bildirim davranışını ayarla
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface PushNotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  permissionStatus: string | null;
  registerForPushNotifications: () => Promise<string | null>;
  checkPermissionStatus: () => Promise<string>;
}

const PushNotificationContext = createContext<PushNotificationContextType | undefined>(undefined);

export function PushNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Kullanıcı giriş yaptıysa izin durumunu kontrol et
    if (user?.id) {
      // İzin durumunu kontrol et
      checkPermissionStatus().then(status => {
        setPermissionStatus(status);
        console.log('📱 Push notification izin durumu:', status);
        
        // Eğer izin verilmişse token'ı al
        if (status === 'granted') {
          registerForPushNotifications().then(token => {
            if (token) {
              setExpoPushToken(token);
              savePushTokenToDatabase(token);
            }
          });
        } else {
          console.log('📱 Push notification izni verilmemiş - kullanıcı daha sonra verebilir');
        }
      });
    } else {
      // Kullanıcı çıkış yaptıysa state'i temizle
      setPermissionStatus(null);
      setExpoPushToken(null);
    }

    // Bildirim dinleyicilerini kur
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Bildirim alındı:', notification);
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('📱 Bildirime tıklandı:', response);
      handleNotificationResponse(response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user?.id]);

  const checkPermissionStatus = async (): Promise<string> => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      console.log('🔍 [DEBUG] Push permission durumu kontrol edildi:', status);
      return status;
    } catch (error) {
      console.error('❌ [ERROR] Push permission kontrol hatası:', error);
      return 'undetermined';
    }
  };

  const registerForPushNotifications = async (): Promise<string | null> => {
    let token = null;

    console.log('🚀 [DEBUG] Push notification kayıt işlemi başlatıldı');
    console.log('🔧 [DEBUG] Device.isDevice:', Device.isDevice);
    console.log('🔧 [DEBUG] Platform.OS:', Platform.OS);
    console.log('🔧 [DEBUG] __DEV__:', __DEV__);

    // Expo Go'da push notification desteği yok
    if (__DEV__ && !Device.isDevice) {
      console.log('📱 [WARNING] Expo Go\'da push notifications desteklenmiyor. Development build kullanın.');
      return null;
    }

    if (Platform.OS === 'android') {
      console.log('🤖 [DEBUG] Android notification channel oluşturuluyor...');
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Teklif Et Bildirimleri',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8B5CF6',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
      console.log('✅ [DEBUG] Android notification channel oluşturuldu');
    }

    if (Device.isDevice) {
      console.log('📱 [DEBUG] Mevcut izin durumu kontrol ediliyor...');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('📱 [DEBUG] Mevcut izin durumu:', existingStatus);
      
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        console.log('🔔 [DEBUG] İzin isteniyor...');
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: true,
          },
          android: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
        console.log('📱 [DEBUG] İzin isteği sonucu:', finalStatus);
      }
      
      if (finalStatus !== 'granted') {
        console.log('❌ [ERROR] Push notification izni reddedildi. Final status:', finalStatus);
        setPermissionStatus('denied');
        return null;
      }
      
      try {
        console.log('🎯 [DEBUG] Push token alınıyor...');
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        console.log('🎯 [DEBUG] Project ID:', projectId);
        
        if (!projectId) {
          throw new Error('Project ID bulunamadı');
        }
        
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        token = tokenData.data;
        console.log('✅ [SUCCESS] Push token alındı:', token.substring(0, 50) + '...');
        
        if (token !== expoPushToken) {
          console.log('🔄 [DEBUG] Token değişti, güncelleniyor...');
        }
        setPermissionStatus('granted');
      } catch (error) {
        console.error('❌ [ERROR] Push token alma hatası:', error);
        console.error('❌ [ERROR] Hata detayı:', JSON.stringify(error, null, 2));
        setPermissionStatus('denied');
      }
    } else {
      console.log('❌ [ERROR] Push notifications sadece fiziksel cihazlarda çalışır');
      setPermissionStatus('denied');
    }

    return token;
  };

  const savePushTokenToDatabase = async (token: string) => {
    if (!user?.id) return;

    try {
      console.log('💾 Push token kaydediliyor...', token.substring(0, 30) + '...');
      
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', user.id);

      if (error) {
        console.error('❌ Push token kaydetme hatası:', error);
      } else {
        console.log('✅ Push token kaydedildi');
      }
    } catch (error) {
      console.error('❌ Push token kaydetme hatası:', error);
    }
  };

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;
    console.log('📱 Bildirim data:', data);

    // Bildirim türüne göre yönlendirme
    switch (data?.type) {
      case 'message':
        // Mesaj bildirimi - mesajlaşma sayfasına git
        if (data.matchId) {
          router.push({
            pathname: '/messages/[id]' as any,
            params: { id: data.matchId.toString() }
          });
        } else {
          router.push('/(tabs)/matches');
        }
        break;

      case 'match':
        // Yeni eşleşme - matches sayfasına git
        router.push('/(tabs)/matches');
        break;

      case 'proposal':
        // Teklif kabul/red - proposals sayfasına git
        router.push('/(tabs)/proposals');
        break;

      case 'invitation':
        // Davet - proposals sayfasının invitations tab'ına git
        router.push('/(tabs)/proposals');
        break;

      case 'marketing':
        // Pazarlama - premium sayfasına git (genellikle)
        router.push('/(tabs)/premium');
        break;

      default:
        // Varsayılan - ana sayfaya git
        router.push('/(tabs)');
        break;
    }
  };

  return (
    <PushNotificationContext.Provider
      value={{
        expoPushToken,
        notification,
        permissionStatus,
        registerForPushNotifications,
        checkPermissionStatus,
      }}
    >
      {children}
    </PushNotificationContext.Provider>
  );
}

export function usePushNotifications() {
  const context = useContext(PushNotificationContext);
  if (context === undefined) {
    throw new Error('usePushNotifications must be used within a PushNotificationProvider');
  }
  return context;
}