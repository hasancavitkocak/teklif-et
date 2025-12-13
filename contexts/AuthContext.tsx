import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { supabase } from '@/lib/supabase';
import * as Location from 'expo-location';
import { getDistrictFromNeighborhood } from '@/constants/neighborhoodToDistrict';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isPremium: boolean;
  refreshPremiumStatus: () => Promise<void>;
  signInWithPhone: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, otp: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);

  const refreshPremiumStatus = async () => {
    if (!user?.id) return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', user.id)
        .single();
      
      setIsPremium(profile?.is_premium || false);
    } catch (error) {
      console.error('Error loading premium status:', error);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  // User değiştiğinde premium durumunu yükle ve konumu güncelle
  useEffect(() => {
    if (user?.id) {
      refreshPremiumStatus();
      updateUserLocation();
    } else {
      setIsPremium(false);
    }
  }, [user?.id]);

  // App state değişikliklerini dinle - uygulamaya geri dönüldüğünde konum güncelle
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && user?.id) {
        console.log('📱 Uygulama aktif hale geldi, konum güncelleniyor...');
        updateUserLocation();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [user?.id]);

  const updateUserLocation = async () => {
    if (!user?.id) return;
    
    try {
      console.log('🔄 Konum güncelleniyor...');
      
      // Konum izni iste
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ Konum izni reddedildi');
        return;
      }

      // Mevcut konumu al
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      console.log('📍 Konum alındı:', { latitude, longitude });

      // Farklı accuracy seviyelerinde reverse geocoding dene
      let finalCityName = '';
      
      // Önce düşük accuracy ile dene (daha geniş alan)
      try {
        const lowAccuracyResults = await Location.reverseGeocodeAsync({ 
          latitude, 
          longitude 
        });
        
        if (lowAccuracyResults && lowAccuracyResults.length > 0) {
          const geocode = lowAccuracyResults[0];
          
          // Debug: Tüm geocode alanlarını logla
          console.log('🗺️ Geocode sonucu (Low Accuracy):', {
            name: geocode.name,
            street: geocode.street,
            district: geocode.district,
            subregion: geocode.subregion,
            city: geocode.city,
            region: geocode.region,
            country: geocode.country,
            postalCode: geocode.postalCode
          });
          
          // İlçe bilgisini akıllı şekilde belirle
          let districtName = '';
          let regionName = geocode.region || '';
          
          // Önce district alanını kontrol et
          if (geocode.district) {
            // District alanı mahalle/cadde adı olabilir, gerçek ilçeye çevir
            districtName = getDistrictFromNeighborhood(geocode.district);
            console.log('🔄 District mapping:', geocode.district, '->', districtName);
          }
          // Sonra subregion'ı kontrol et
          else if (geocode.subregion) {
            districtName = getDistrictFromNeighborhood(geocode.subregion);
            console.log('🔄 Subregion mapping:', geocode.subregion, '->', districtName);
          }
          // Son çare olarak city'yi kullan
          else if (geocode.city) {
            districtName = geocode.city;
            console.log('🔄 City kullanıldı:', districtName);
          }
          
          // Final şehir adını oluştur
          if (districtName && regionName) {
            finalCityName = `${districtName}, ${regionName}`;
            console.log('📍 Final konum:', finalCityName);
          } else if (districtName) {
            finalCityName = districtName;
            console.log('📍 Final konum (sadece ilçe):', finalCityName);
          } else if (regionName) {
            finalCityName = regionName;
            console.log('📍 Final konum (sadece il):', finalCityName);
          }
        }
      } catch (error) {
        console.error('❌ Low accuracy geocoding hatası:', error);
      }
      
      // Eğer low accuracy sonuç vermezse, normal accuracy dene
      if (!finalCityName) {
        try {
          const normalResults = await Location.reverseGeocodeAsync({ 
            latitude, 
            longitude 
          });
          
          if (normalResults && normalResults.length > 0) {
            const geocode = normalResults[0];
            console.log('🗺️ Normal Geocode sonucu:', geocode);
            
            // Basit fallback
            if (geocode.district && geocode.region) {
              const mappedDistrict = getDistrictFromNeighborhood(geocode.district);
              finalCityName = `${mappedDistrict}, ${geocode.region}`;
            } else if (geocode.subregion && geocode.region) {
              const mappedDistrict = getDistrictFromNeighborhood(geocode.subregion);
              finalCityName = `${mappedDistrict}, ${geocode.region}`;
            } else if (geocode.city && geocode.region) {
              finalCityName = `${geocode.city}, ${geocode.region}`;
            } else if (geocode.region) {
              finalCityName = geocode.region;
            }
          }
        } catch (error) {
          console.error('❌ Normal geocoding hatası:', error);
        }
      }
      
      if (finalCityName) {

        // Profildeki şehir ve koordinat bilgilerini güncelle
        const { error } = await supabase
          .from('profiles')
          .update({
            city: finalCityName,
            latitude,
            longitude,
          })
          .eq('id', user.id);

        if (error) {
          console.error('❌ Profil güncelleme hatası:', error);
        } else {
          console.log('✅ Konum güncellendi:', finalCityName);
        }
      } else {
        console.warn('⚠️ Şehir bilgisi bulunamadı');
      }
    } catch (error) {
      console.error('❌ Konum güncelleme hatası:', error);
    }
  };

  const signInWithPhone = async (phone: string) => {
    setPendingPhone(phone);
  };

  const verifyOtp = async (phone: string, otp: string) => {
    if (otp !== '123456') {
      throw new Error('Geçersiz doğrulama kodu');
    }

    const email = `${phone.replace(/\+/g, '')}@teklif.et`;
    const password = phone + '_demo_password';

    console.log('🔑 Attempting sign in with:', email);
    const signInResult = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('📝 Sign in result:', signInResult.error?.message || 'Success');
    let authResult = signInResult;

    if (signInResult.error && signInResult.error.message.includes('Invalid')) {
      console.log('👤 User not found, creating new account...');
      const signUpResult = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            phone,
          },
          emailRedirectTo: undefined,
        },
      });

      console.log('✨ Sign up result:', signUpResult.error?.message || 'Success');
      if (signUpResult.error) throw signUpResult.error;

      if (signUpResult.data.user && !signUpResult.data.session) {
        authResult = await supabase.auth.signInWithPassword({
          email,
          password,
        });
      } else {
        authResult = signUpResult as any;
      }
    }

    if (authResult.data?.session) {
      setSession(authResult.data.session);
      setUser(authResult.data.user);
      return true;
    }

    return false;
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase signOut error:', error);
        // Hata olsa bile local state'i temizle
      }
    } catch (error) {
      console.error('SignOut catch error:', error);
    } finally {
      // Her durumda local state'i temizle
      setSession(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        isPremium,
        refreshPremiumStatus,
        signInWithPhone,
        verifyOtp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
