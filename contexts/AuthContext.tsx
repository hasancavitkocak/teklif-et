import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import * as Location from 'expo-location';
import { getDistrictFromNeighborhood } from '@/constants/neighborhoodToDistrict';
import { NetgsmSmsService } from '@/utils/smsService';
import { otpCache } from '@/utils/otpCache';
import { settingsAPI } from '@/api/settings';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isPremium: boolean;
  isAccountFrozen: boolean;
  currentCity: string;
  remainingProposalsToday: number;
  dailyProposalLimit: number;
  remainingRequestsToday: number;
  dailyRequestLimit: number;
  refreshPremiumStatus: () => Promise<void>;
  refreshAccountStatus: () => Promise<void>;
  refreshUserStats: () => Promise<void>;
  refreshProposalLimits: () => Promise<void>;
  refreshRequestLimits: () => Promise<void>;
  unfreezeAccount: () => Promise<boolean>;
  updateLocationManually: () => Promise<{ success: boolean; city?: string; error?: string }>;
  updateCityFromSettings: (newCity: string) => Promise<boolean>;
  onLocationUpdate?: (newCity: string) => void; // Konum güncellendiğinde çağrılacak callback
  requestLocationPermission: () => Promise<{ granted: boolean; error?: string }>;
  getCachedLocation: () => { coordinates: { latitude: number; longitude: number } | null; city: string; timestamp: number } | null;
  clearLocationCache: () => void;
  signInWithPhone: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, otp: string) => Promise<boolean>;
  resendOtp: (phone: string) => Promise<boolean>;
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
  const [remainingProposalsToday, setRemainingProposalsToday] = useState(0);
  const [dailyProposalLimit, setDailyProposalLimit] = useState(0);
  const [remainingRequestsToday, setRemainingRequestsToday] = useState(0);
  const [dailyRequestLimit, setDailyRequestLimit] = useState(0);

  // Konum cache sistemi
  const [locationCache, setLocationCache] = useState<{
    coordinates: { latitude: number; longitude: number } | null;
    city: string;
    timestamp: number;
  }>({
    coordinates: null,
    city: '',
    timestamp: 0
  });

  const LOCATION_CACHE_DURATION = 10 * 60 * 1000; // 10 dakika cache

  // Cache'den konum al
  const getCachedLocation = () => {
    const now = Date.now();
    if (locationCache.timestamp && (now - locationCache.timestamp) < LOCATION_CACHE_DURATION) {
      console.log('📍 Cache\'den konum alındı:', locationCache.city);
      return locationCache;
    }
    return null;
  };

  // Cache'e konum kaydet
  const setCachedLocation = (coordinates: { latitude: number; longitude: number } | null, city: string) => {
    const newCache = {
      coordinates,
      city,
      timestamp: Date.now()
    };
    setLocationCache(newCache);
    console.log('💾 Konum cache\'e kaydedildi:', city);
  };

  // Cache'i temizle
  const clearLocationCache = () => {
    setLocationCache({
      coordinates: null,
      city: '',
      timestamp: 0
    });
    console.log('🗑️ Konum cache temizlendi');
  };

  const refreshPremiumStatus = async () => {
    if (!user?.id) return;
    try {
      // Önce expired premiumları kontrol et
      await supabase.rpc('check_expired_premiums');
      
      // Sonra güncel premium durumunu al
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium, premium_expires_at')
        .eq('id', user.id)
        .single();
      
      // Eğer premium_expires_at varsa ve geçmişse, premium'u false yap
      let isPremiumActive = profile?.is_premium || false;
      if (profile?.premium_expires_at) {
        const expiryDate = new Date(profile.premium_expires_at);
        const now = new Date();
        if (expiryDate < now) {
          isPremiumActive = false;
        }
      }
      
      setIsPremium(isPremiumActive);
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

  const refreshUserStats = async () => {
    // Bu fonksiyon profile sayfasının stats'larını yenilemek için kullanılacak
    // Event emitter gibi çalışacak
    console.log('🔄 User stats refresh triggered');
    await refreshProposalLimits();
    await refreshRequestLimits();
  };

  const refreshProposalLimits = async () => {
    if (!user?.id) return;
    
    try {
      // Kalan teklif sayısını al
      const { data: remaining, error: remainingError } = await supabase.rpc('get_remaining_proposals_today', {
        p_user_id: user.id
      });

      if (remainingError) throw remainingError;

      // Günlük limiti al
      const { data: limit, error: limitError } = await supabase.rpc('get_daily_proposal_limit', {
        p_user_id: user.id
      });

      if (limitError) throw limitError;

      setRemainingProposalsToday(remaining || 0);
      setDailyProposalLimit(limit || 0);
    } catch (error) {
      console.error('Error refreshing proposal limits:', error);
    }
  };

  const refreshRequestLimits = async () => {
    if (!user?.id) return;
    
    try {
      // Kalan eşleşme isteği sayısını al
      const { data: remaining, error: remainingError } = await supabase.rpc('get_remaining_requests_today', {
        p_user_id: user.id
      });

      if (remainingError) throw remainingError;

      // Günlük limiti al
      const { data: limit, error: limitError } = await supabase.rpc('get_daily_request_limit', {
        p_user_id: user.id
      });

      if (limitError) throw limitError;

      setRemainingRequestsToday(remaining || 0);
      setDailyRequestLimit(limit || 0);
    } catch (error) {
      console.error('Error refreshing request limits:', error);
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

      // Kullanıcının soft delete edilmiş match'lerini temizle (hesap dondurmadan çıkınca)
      const { error: matchesError } = await supabase
        .from('matches')
        .update({ deleted_by: null })
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('deleted_by', user.id);

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

  const updateLocationManually = async (): Promise<{ success: boolean; city?: string; error?: string }> => {
    if (!user?.id) {
      console.log('❌ User ID bulunamadı, manuel güncelleme iptal edildi');
      return { success: false };
    }
    
    try {
      console.log('📍 Manuel konum güncelleme başlatılıyor (GPS\'ten gerçek konum alınacak)... User ID:', user.id);
      
      // Manuel güncelleme için cache'i atla, direkt GPS'ten konum al
      const result = await updateUserLocationWithResult();
      
      if (result.success && result.city) {
        console.log('✅ Manuel konum güncelleme tamamlandı, yeni şehir:', result.city);
        
        // Cache'i yeni konum ile güncelle
        setCachedLocation(result.coordinates || null, result.city);
        
        return { success: true, city: result.city };
      } else if (result.error === 'permission_denied') {
        console.log('❌ Konum izni reddedildi');
        return { success: false, error: 'permission_denied' };
      } else {
        console.log('⚠️ Konum güncellendi ama şehir bilgisi alınamadı');
        return { success: true };
      }
    } catch (error) {
      console.error('❌ Manuel konum güncelleme hatası:', error);
      return { success: false };
    }
  };

  const requestLocationPermission = async (): Promise<{ granted: boolean; error?: string }> => {
    try {
      console.log('📍 Konum izni isteniyor...');
      
      // Önce mevcut izin durumunu kontrol et
      const { status: currentStatus } = await Location.getForegroundPermissionsAsync();
      
      if (currentStatus === 'granted') {
        console.log('✅ Konum izni zaten verilmiş');
        return { granted: true };
      }
      
      // İzin iste
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        console.log('✅ Konum izni verildi');
        return { granted: true };
      } else {
        console.log('❌ Konum izni reddedildi:', status);
        return { granted: false, error: status };
      }
    } catch (error) {
      console.error('❌ Konum izni isteme hatası:', error);
      return { granted: false, error: 'unknown' };
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
      
      // Cache'i güncelle
      const cacheCoordinates = coordinates ? { latitude: coordinates.lat, longitude: coordinates.lon } : null;
      setCachedLocation(cacheCoordinates, newCity);
      
      console.log('✅ Ayarlardan şehir güncellendi ve cache güncellendi:', newCity);
      return true;
    } catch (error) {
      console.error('❌ Ayarlar şehir güncelleme hatası:', error);
      return false;
    }
  };

  useEffect(() => {
    console.log('🔄 AuthContext session değişti:', session?.user?.id || 'null');
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      console.log('🔄 Initial session set:', session?.user?.id || 'null');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔄 Auth state changed:', _event, session?.user?.id || 'null');
      (async () => {
        const newUser = session?.user ?? null;
        console.log('🔄 Setting new user:', newUser?.id || 'null');
        setSession(session);
        setUser(newUser);
        console.log('✅ User state updated');
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  // User değiştiğinde premium durumunu yükle ve konumu güncelle (premium değilse)
  useEffect(() => {
    if (user?.id) {
      refreshPremiumStatus();
      refreshAccountStatus();
      refreshProposalLimits();
      refreshRequestLimits();
      
      // Premium kullanıcılar için otomatik konum güncellemesi yapma
      // Sadece ilk login'de veya manuel olarak güncellenecek
    } else {
      setIsPremium(false);
      setIsAccountFrozen(false);
      setRemainingProposalsToday(0);
      setDailyProposalLimit(0);
      setRemainingRequestsToday(0);
      setDailyRequestLimit(0);
    }
  }, [user?.id]);

  // Otomatik konum güncelleme kaldırıldı - sadece onboarding'de konum alınacak

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

  // Otomatik konum güncelleme kaldırıldı - sadece onboarding'de konum alınacak

  const updateUserLocationWithResult = async (): Promise<{ success: boolean; city?: string; error?: string; coordinates?: { latitude: number; longitude: number } }> => {
    if (!user?.id) return { success: false };
    
    try {
      console.log('🔄 Konum güncelleniyor...');
      
      // Konum izni iste
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ Konum izni reddedildi');
        return { success: false, error: 'permission_denied' };
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
        console.log('🔍 Reverse geocoding başlatılıyor...');
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
          
          // Subregion ve district'dan en uygun olanı seç
          let districtName = '';
          let regionName = geocode.region || '';
          
          // Önce subregion'ı kontrol et
          if (geocode.subregion && geocode.subregion.trim()) {
            districtName = geocode.subregion.trim();
            console.log('📍 Subregion kullanıldı:', districtName);
          } 
          // Subregion yoksa district'i kullan
          else if (geocode.district && geocode.district.trim()) {
            districtName = geocode.district.trim();
            console.log('📍 District kullanıldı:', districtName);
          }
          
          // Final şehir adını oluştur
          if (districtName && regionName) {
            finalCityName = `${districtName}, ${regionName}`;
            console.log('📍 Final konum (subregion/district + region):', finalCityName);
          } else if (regionName) {
            finalCityName = regionName;
            console.log('📍 Final konum (sadece region):', finalCityName);
          } else if (districtName) {
            finalCityName = districtName;
            console.log('📍 Final konum (sadece subregion/district):', finalCityName);
          }
        }
      } catch (error) {
        console.error('❌ Low accuracy geocoding hatası:', error);
        
        // Geocoding hatası durumunda koordinatları kaydet ama şehir adını manuel belirle
        console.log('🔄 Geocoding başarısız, koordinat tabanlı şehir belirleniyor...');
        
        // Türkiye'nin büyük şehirlerinin koordinat aralıkları
        if (latitude >= 40.8 && latitude <= 41.2 && longitude >= 28.8 && longitude <= 29.3) {
          finalCityName = 'İstanbul';
        } else if (latitude >= 39.8 && latitude <= 40.1 && longitude >= 32.7 && longitude <= 33.0) {
          finalCityName = 'Ankara';
        } else if (latitude >= 38.3 && latitude <= 38.5 && longitude >= 27.0 && longitude <= 27.3) {
          finalCityName = 'İzmir';
        } else if (latitude >= 37.0 && latitude <= 37.1 && longitude >= 27.1 && longitude <= 27.3) {
          finalCityName = 'Muğla';
        } else if (latitude >= 36.8 && latitude <= 37.0 && longitude >= 30.6 && longitude <= 30.8) {
          finalCityName = 'Antalya';
        } else {
          // Genel Türkiye koordinatları içindeyse
          if (latitude >= 35.8 && latitude <= 42.1 && longitude >= 25.7 && longitude <= 44.8) {
            finalCityName = 'Türkiye'; // Genel konum
          } else {
            finalCityName = 'Bilinmeyen Konum';
          }
        }
        
        console.log('📍 Koordinat tabanlı konum belirlendi:', finalCityName);
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
            
            // Önce subregion, sonra district
            if (geocode.subregion && geocode.region) {
              finalCityName = `${geocode.subregion.trim()}, ${geocode.region}`;
              console.log('📍 Normal accuracy - Subregion kullanıldı:', finalCityName);
            } else if (geocode.district && geocode.region) {
              finalCityName = `${geocode.district.trim()}, ${geocode.region}`;
              console.log('📍 Normal accuracy - District kullanıldı:', finalCityName);
            } else if (geocode.city && geocode.region) {
              finalCityName = `${geocode.city}, ${geocode.region}`;
              console.log('📍 Normal accuracy - City kullanıldı:', finalCityName);
            } else if (geocode.region) {
              finalCityName = geocode.region;
              console.log('📍 Normal accuracy - Sadece region kullanıldı:', finalCityName);
            }
          }
        } catch (error) {
          console.error('❌ Normal geocoding hatası:', error);
          
          // İkinci geocoding de başarısızsa, koordinat tabanlı belirleme yap
          if (!finalCityName) {
            console.log('🔄 İkinci geocoding de başarısız, koordinat tabanlı belirleme...');
            
            if (latitude >= 40.8 && latitude <= 41.2 && longitude >= 28.8 && longitude <= 29.3) {
              finalCityName = 'İstanbul';
            } else if (latitude >= 39.8 && latitude <= 40.1 && longitude >= 32.7 && longitude <= 33.0) {
              finalCityName = 'Ankara';
            } else if (latitude >= 38.3 && latitude <= 38.5 && longitude >= 27.0 && longitude <= 27.3) {
              finalCityName = 'İzmir';
            } else {
              finalCityName = 'Türkiye';
            }
            
            console.log('📍 Fallback konum belirlendi:', finalCityName);
          }
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
          return { success: true, city: finalCityName, coordinates: { latitude, longitude } };
        }
      } else {
        console.warn('⚠️ Şehir bilgisi bulunamadı, sadece koordinatlar kaydediliyor');
        
        // En azından koordinatları kaydet
        const { error } = await supabase
          .from('profiles')
          .update({
            latitude,
            longitude,
            city: 'Konum Tespit Edilemedi'
          })
          .eq('id', user.id);

        if (error) {
          console.error('❌ Koordinat kaydetme hatası:', error);
          return { success: false };
        } else {
          console.log('✅ Koordinatlar kaydedildi');
          setCurrentCity('Konum Tespit Edilemedi');
          return { success: true, city: 'Konum Tespit Edilemedi', coordinates: { latitude, longitude } };
        }
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
    try {
      // Supabase'den SMS modunu kontrol et
      const smsEnabled = await settingsAPI.isSmsEnabled();
      const demoCode = await settingsAPI.getDemoOtpCode();
      
      console.log('📱 SMS Mode:', smsEnabled ? 'Production' : 'Development');
      
      // Development modunda demo kod kullan
      if (!smsEnabled) {
        console.log('📱 Demo mode: Supabase ayarlarından demo kodu kullanılıyor:', demoCode);
        console.log('📱 Telefon numarası:', phone);
        otpCache.setOtp(phone, demoCode);
        console.log('📱 Demo kod cache\'e kaydedildi');
        return;
      }

      // Production modunda gerçek SMS gönder
      console.log('📱 Production mode: Gerçek SMS gönderiliyor');

      // OTP kodu oluştur
      const otpCode = NetgsmSmsService.generateOtp();
      
      // Netgsm konfigürasyonu - Supabase'den al
      const netgsmConfig = await settingsAPI.getNetgsmConfig();

      // Debug: Netgsm config kontrolü
      console.log('🔍 Netgsm config debug:', {
        configFound: !!netgsmConfig,
        username: netgsmConfig?.username ? '✅ Var' : '❌ Yok',
        password: netgsmConfig?.password ? '✅ Var' : '❌ Yok',
        header: netgsmConfig?.msgheader ? '✅ Var' : '❌ Yok'
      });

      // Netgsm bilgileri kontrolü
      if (!netgsmConfig) {
        console.warn('⚠️ Netgsm bilgileri bulunamadı, demo moda geçiliyor');
        otpCache.setOtp(phone, demoCode);
        return;
      }

      // Android için SMS Retriever hash'ini al
      let appHash = '';
      if (Platform.OS === 'android') {
        try {
          const { SmsRetrieverService } = await import('@/utils/smsRetriever');
          const hash = await SmsRetrieverService.getAppHash();
          if (hash) {
            appHash = ` ${hash}`;
          }
        } catch (error) {
          console.warn('⚠️ App hash alınamadı:', error);
        }
      }

      // SMS mesajını oluştur
      const message = `Teklif Et doğrulama kodunuz: ${otpCode}${appHash}`;

      // SMS gönder
      const smsResult = await NetgsmSmsService.sendSms({
        phone,
        message,
        config: netgsmConfig
      });

      if (smsResult.success) {
        // OTP'yi cache'e kaydet
        otpCache.setOtp(phone, otpCode);
        console.log('✅ SMS başarıyla gönderildi, Job ID:', smsResult.jobId);
      } else {
        throw new Error(smsResult.error || 'SMS gönderilemedi');
      }
    } catch (error) {
      console.error('❌ SMS gönderim hatası:', error);
      throw error;
    }
  };

  const resendOtp = async (phone: string) => {
    try {
      // SMS gönderim sınırlaması kontrolü (1 dakika)
      const resendCheck = otpCache.canResendOtp(phone);
      if (!resendCheck.canResend) {
        throw new Error(`Lütfen ${resendCheck.remainingSeconds} saniye bekleyin`);
      }

      // Yeni OTP gönder
      await signInWithPhone(phone);
      return true;
    } catch (error) {
      console.error('❌ OTP yeniden gönderim hatası:', error);
      throw error;
    }
  };

  const verifyOtp = async (phone: string, otp: string) => {
    // OTP doğrulaması
    const verification = otpCache.verifyOtp(phone, otp);
    if (!verification.success) {
      throw new Error(verification.error || 'Geçersiz doğrulama kodu');
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

            // Kullanıcının soft delete edilmiş match'lerini temizle (login sırasında)
            await supabase
              .from('matches')
              .update({ deleted_by: null })
              .or(`user1_id.eq.${authResult.data.user.id},user2_id.eq.${authResult.data.user.id}`)
              .eq('deleted_by', authResult.data.user.id);

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
    console.log('🔘 AuthContext signOut başlıyor...');
    try {
      console.log('🔘 Supabase auth signOut çağrılıyor...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Supabase signOut error:', error);
        // Hata olsa bile local state'i temizle
      } else {
        console.log('✅ Supabase signOut başarılı');
      }
    } catch (error) {
      console.error('❌ SignOut catch error:', error);
    } finally {
      // Her durumda local state'i temizle
      console.log('🔘 Local state temizleniyor...');
      setSession(null);
      setUser(null);
      setLoading(false); // Loading'i de sıfırla
      console.log('✅ Local state temizlendi');
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
        remainingProposalsToday,
        dailyProposalLimit,
        remainingRequestsToday,
        dailyRequestLimit,
        refreshPremiumStatus,
        refreshAccountStatus,
        refreshUserStats,
        refreshProposalLimits,
        refreshRequestLimits,
        unfreezeAccount,
        updateLocationManually,
        updateCityFromSettings,
        requestLocationPermission,
        getCachedLocation,
        clearLocationCache,
        signInWithPhone,
        verifyOtp,
        resendOtp,
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
