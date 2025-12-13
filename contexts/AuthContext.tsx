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
  isAccountFrozen: boolean;
  currentCity: string;
  refreshPremiumStatus: () => Promise<void>;
  refreshAccountStatus: () => Promise<void>;
  unfreezeAccount: () => Promise<boolean>;
  updateLocationManually: () => Promise<{ success: boolean; city?: string }>;
  updateCityFromSettings: (newCity: string) => Promise<boolean>;
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
  const [isAccountFrozen, setIsAccountFrozen] = useState(false);
  const [currentCity, setCurrentCity] = useState<string>('');

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

  const refreshAccountStatus = async () => {
    if (!user?.id) return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_active, city')
        .eq('id', user.id)
        .single();
      
      setIsAccountFrozen(!(profile?.is_active ?? true));
      if (profile?.city) {
        setCurrentCity(profile.city);
      }
    } catch (error) {
      console.error('Error loading account status:', error);
    }
  };

  const unfreezeAccount = async (): Promise<boolean> => {
    if (!user?.id) return false;
    
    try {
      console.log('🔥 Hesap dondurmayı kaldırma işlemi başlatılıyor...');
      
      // Hesabı aktif hale getir
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_active: true })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Dondurulmuş teklifleri aktif yap
      const { error: proposalsError } = await supabase
        .from('proposals')
        .update({ status: 'active' })
        .eq('creator_id', user.id)
        .eq('status', 'frozen');

      if (proposalsError) {
        console.warn('⚠️ Teklifler aktif edilirken hata:', proposalsError);
      }

      // Dondurulmuş eşleşmeleri aktif yap
      const { error: matchesError } = await supabase
        .from('matches')
        .update({ is_active: true })
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('is_active', false);

      if (matchesError) {
        console.warn('⚠️ Eşleşmeler aktif edilirken hata:', matchesError);
      }

      setIsAccountFrozen(false);
      console.log('✅ Hesap başarıyla aktif hale getirildi');
      return true;
    } catch (error) {
      console.error('❌ Hesap aktif etme hatası:', error);
      return false;
    }
  };

  const updateLocationManually = async (): Promise<{ success: boolean; city?: string }> => {
    if (!user?.id) {
      console.log('❌ User ID bulunamadı, manuel güncelleme iptal edildi');
      return { success: false };
    }
    
    try {
      console.log('📍 Manuel konum güncelleme başlatılıyor... User ID:', user.id);
      
      // Konum güncelleme işlemini yap ve güncellenmiş şehir bilgisini al
      const result = await updateUserLocationWithResult();
      
      if (result.success && result.city) {
        console.log('✅ Manuel konum güncelleme tamamlandı, yeni şehir:', result.city);
        return { success: true, city: result.city };
      } else {
        console.log('⚠️ Konum güncellendi ama şehir bilgisi alınamadı');
        return { success: true };
      }
    } catch (error) {
      console.error('❌ Manuel konum güncelleme hatası:', error);
      return { success: false };
    }
  };

  const updateCityFromSettings = async (newCity: string): Promise<boolean> => {
    if (!user?.id) {
      console.log('❌ User ID bulunamadı, ayarlar güncellemesi iptal edildi');
      return false;
    }
    
    try {
      console.log('🏙️ Ayarlardan şehir güncelleniyor:', newCity);
      
      // Şehir koordinatlarını al
      const { getCityCoordinates } = await import('@/constants/cityCoordinates');
      let coordinates = getCityCoordinates(newCity);

      // Bulunamazsa Geocoding API'den al
      if (!coordinates) {
        console.log('📍 Geocoding API kullanılıyor...');
        const { geocodeCity } = await import('@/utils/geocoding');
        const geocoded = await geocodeCity(newCity);
        
        if (geocoded) {
          coordinates = { lat: geocoded.latitude, lon: geocoded.longitude };
        }
      }

      // Veritabanını güncelle
      const updateData: any = { city: newCity };
      if (coordinates) {
        updateData.latitude = coordinates.lat;
        updateData.longitude = coordinates.lon;
        console.log('✅ Koordinatlar da güncelleniyor:', coordinates);
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        console.error('❌ Ayarlar şehir güncelleme hatası:', error);
        return false;
      }

      // Global state'i güncelle
      setCurrentCity(newCity);
      console.log('✅ Ayarlardan şehir güncellendi:', newCity);
      return true;
    } catch (error) {
      console.error('❌ Ayarlar şehir güncelleme hatası:', error);
      return false;
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

  // User değiştiğinde premium durumunu yükle ve konumu güncelle (premium değilse)
  useEffect(() => {
    if (user?.id) {
      refreshPremiumStatus();
      refreshAccountStatus();
      
      // Premium kullanıcılar için otomatik konum güncellemesi yapma
      // Sadece ilk login'de veya manuel olarak güncellenecek
    } else {
      setIsPremium(false);
      setIsAccountFrozen(false);
    }
  }, [user?.id]);

  // Premium durumu yüklendikten sonra konum güncellemesi yap (sadece premium olmayanlar için)
  useEffect(() => {
    if (user?.id && isPremium === false) {
      console.log('👤 Premium olmayan kullanıcı, otomatik konum güncelleniyor...');
      updateUserLocation();
    }
  }, [user?.id, isPremium]);

  // Real-time hesap durumu dinleme
  useEffect(() => {
    if (!user?.id) return;

    console.log('👂 Hesap durumu dinleme başlatılıyor...');
    
    const subscription = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔄 Profil güncellendi:', payload);
          
          const newProfile = payload.new as any;
          
          // Hesap dondurulmuşsa otomatik çıkış yap
          if (newProfile.is_active === false && !isAccountFrozen) {
            console.log('🥶 Hesap donduruldu, otomatik çıkış yapılıyor...');
            setIsAccountFrozen(true);
            
            // Kısa bir gecikme ile çıkış yap (UI güncellemesi için)
            setTimeout(async () => {
              try {
                await signOut();
                console.log('✅ Otomatik çıkış tamamlandı');
              } catch (error) {
                console.error('❌ Otomatik çıkış hatası:', error);
              }
            }, 1000);
          }
          
          // Premium durumu değişmişse güncelle
          if (newProfile.is_premium !== undefined) {
            setIsPremium(newProfile.is_premium);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('👂 Hesap durumu dinleme durduruldu');
      subscription.unsubscribe();
    };
  }, [user?.id, isAccountFrozen]);

  // App state değişikliklerini dinle - uygulamaya geri dönüldüğünde konum güncelle (sadece premium olmayanlar için)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && user?.id && !isPremium) {
        console.log('📱 Uygulama aktif hale geldi, premium olmayan kullanıcı için konum güncelleniyor...');
        updateUserLocation();
      } else if (nextAppState === 'active' && user?.id && isPremium) {
        console.log('👑 Premium kullanıcı, otomatik konum güncellemesi atlanıyor');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [user?.id, isPremium]);

  const updateUserLocationWithResult = async (): Promise<{ success: boolean; city?: string }> => {
    if (!user?.id) return { success: false };
    
    try {
      console.log('🔄 Konum güncelleniyor...');
      
      // Konum izni iste
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ Konum izni reddedildi');
        return { success: false };
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
          return { success: false };
        } else {
          console.log('✅ Konum güncellendi:', finalCityName);
          setCurrentCity(finalCityName); // Global state'i güncelle
          return { success: true, city: finalCityName };
        }
      } else {
        console.warn('⚠️ Şehir bilgisi bulunamadı');
        return { success: false };
      }
    } catch (error) {
      console.error('❌ Konum güncelleme hatası:', error);
      return { success: false };
    }
  };

  const updateUserLocation = async () => {
    const result = await updateUserLocationWithResult();
    // Otomatik güncellemeler için sadece başarı/başarısızlık önemli
    return result.success;
  };

  const signInWithPhone = async (phone: string) => {
    // Phone number is handled in verifyOtp
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
      
      // Login başarılıysa, hesap donmuş mu kontrol et ve otomatik aktif et
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_active')
          .eq('id', authResult.data.user.id)
          .single();

        if (profile && profile.is_active === false) {
          console.log('🔥 Donmuş hesap tespit edildi, otomatik aktif ediliyor...');
          
          // Hesabı aktif hale getir
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ is_active: true })
            .eq('id', authResult.data.user.id);

          if (profileError) {
            console.warn('⚠️ Hesap aktif edilirken hata:', profileError);
          } else {
            // Dondurulmuş teklifleri aktif yap
            await supabase
              .from('proposals')
              .update({ status: 'active' })
              .eq('creator_id', authResult.data.user.id)
              .eq('status', 'frozen');

            // Dondurulmuş eşleşmeleri aktif yap
            await supabase
              .from('matches')
              .update({ is_active: true })
              .or(`user1_id.eq.${authResult.data.user.id},user2_id.eq.${authResult.data.user.id}`)
              .eq('is_active', false);

            console.log('✅ Hesap login sırasında otomatik aktif edildi');
          }
        }
      } catch (error) {
        console.warn('⚠️ Login sırasında hesap durumu kontrol hatası:', error);
      }
      
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
        isAccountFrozen,
        currentCity,
        refreshPremiumStatus,
        refreshAccountStatus,
        unfreezeAccount,
        updateLocationManually,
        updateCityFromSettings,
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
