import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { X, Zap, Plus, MapPin, Sparkles, SlidersHorizontal, Calendar, Store, ChevronDown, Crown, 
  Music, Gamepad2, Book, Dumbbell, Camera, Utensils, Plane, Palette, Users, Heart, Circle, 
  Activity, Waves, Trophy, Target, Flower2, Bike, Mountain, Film, Headphones, Theater, 
  Guitar, Piano, Brush, Tent, Trees, Coffee, PenTool, ShoppingBag, Shirt, Laptop, 
  Lightbulb, TrendingUp, Mic, HandHeart, Dog, Brain, Leaf } from 'lucide-react-native';
import { getDistrictFromNeighborhood } from '@/constants/neighborhoodToDistrict';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { usePushNotifications } from '@/contexts/PushNotificationContext';
import { discoverAPI, interestsAPI, proposalsAPI, type DiscoverProposal } from '@/api';
import PremiumPopup from '@/components/PremiumPopup';
import SimplePremiumAlert from '@/components/SimplePremiumAlert';
import SuperLikeSuccessModal from '@/components/SuperLikeSuccessModal';
import SuperLikeToast from '@/components/SuperLikeToast';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { AppIconLoader } from '@/components/AppIconLoader';
import ProposalSentToast from '@/components/ProposalSentToast';
import ProposalCreatedToast from '@/components/ProposalCreatedToast';
import LocationPermissionModal from '@/components/LocationPermissionModal';
import MatchSuccessModal from '@/components/MatchSuccessModal';
import ProposalLimitModal from '@/components/ProposalLimitModal';
import RequestLimitModal from '@/components/RequestLimitModal';
import ErrorToast from '@/components/ErrorToast';
import InfoToast from '@/components/InfoToast';
import WarningToast from '@/components/WarningToast';
import SuperLikeIcon from '@/components/SuperLikeIcon';

import { PROVINCES } from '@/constants/cities';

const { width, height } = Dimensions.get('window');

export default function DiscoverScreen() {
  const { 
    user, 
    isPremium, 
    refreshPremiumStatus, 
    currentCity, 
    requestLocationPermission, 
    refreshUserStats,
    getCachedLocation,
    updateLocationManually,
    clearLocationCache
  } = useAuth();
  const { registerForPushNotifications } = usePushNotifications();
  const router = useRouter();
  const [proposals, setProposals] = useState<DiscoverProposal[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false); // Başlangıçta false yap
  const [refreshing, setRefreshing] = useState(false);
  const [skippedProposalIds, setSkippedProposalIds] = useState<Set<string>>(new Set());
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [editingCity, setEditingCity] = useState(false);
  const [premiumPopupVisible, setPremiumPopupVisible] = useState(false);
  const [premiumFeature, setPremiumFeature] = useState<'likes' | 'superLikes' | 'filters' | 'requests'>('likes');
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false);
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const [selectedInterest, setSelectedInterest] = useState<string>('');
  const [maxDistance, setMaxDistance] = useState<number>(50);
  const [interests, setInterests] = useState<any[]>([]);
  const [showInterestDropdown, setShowInterestDropdown] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [minAge, setMinAge] = useState<number>(18);
  const [maxAge, setMaxAge] = useState<number>(50);
  const [selectedGender, setSelectedGender] = useState<string>('all'); // 'all', 'male', 'female'
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSuperLikeSuccess, setShowSuperLikeSuccess] = useState(false);
  const [showSuperLikeToast, setShowSuperLikeToast] = useState(false);
  const [superLikeUserName, setSuperLikeUserName] = useState<string>('');
  const [remainingProposals, setRemainingProposals] = useState<number>(0);
  const [showProposalSentToast, setShowProposalSentToast] = useState(false);
  const [isToastSuperLike, setIsToastSuperLike] = useState(false);
  const [showProposalCreatedToast, setShowProposalCreatedToast] = useState(false);
  
  // Modal states
  const [showLocationPermissionModal, setShowLocationPermissionModal] = useState(false);
  const [showMatchSuccessModal, setShowMatchSuccessModal] = useState(false);
  const [matchedUserName, setMatchedUserName] = useState('');
  const [showProposalLimitModal, setShowProposalLimitModal] = useState(false);
  const [showRequestLimitModal, setShowRequestLimitModal] = useState(false);
  
  // Toast states
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showInfoToast, setShowInfoToast] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [showWarningToast, setShowWarningToast] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  
  // Action loading states
  const [isLiking, setIsLiking] = useState(false);
  const [isSuperLiking, setIsSuperLiking] = useState(false);
  const [isPassing, setIsPassing] = useState(false);
  
  // Batch update için counter
  const [actionCount, setActionCount] = useState(0);
  
  // İlk yükleme kontrolü için
  const [hasInitialLoaded, setHasInitialLoaded] = useState(false);
  const batchUpdateThreshold = 3; // Her 3 aksiyonda bir güncelle
  
  // Debounce ref'i artık gerekmiyor (manuel filtreleme)
  
  // Duplicate çağrı engelleme için ref'ler
  const isLoadingProposalsRef = useRef(false);
  const isUpdatingLocationRef = useRef(false);
  
  const sliderWidth = useRef(0);

  // Slider için ref
  const sliderTrackRef = useRef<View>(null);
  const sliderStartX = useRef(0);
  
  // Yaş slider için ref
  const ageSliderTrackRef = useRef<View>(null);
  const ageSliderStartX = useRef(0);
  const ageSliderWidth = useRef(0);

  // Slider PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        // Başlangıç pozisyonunu kaydet
        if (sliderTrackRef.current) {
          sliderTrackRef.current.measure((x, y, width, height, pageX) => {
            sliderStartX.current = pageX;
            sliderWidth.current = width;
          });
        }
      },
      onPanResponderMove: (evt) => {
        if (sliderWidth.current > 0 && sliderStartX.current > 0) {
          const touchX = evt.nativeEvent.pageX;
          const relativeX = touchX - sliderStartX.current;
          const percentage = Math.max(0, Math.min(1, relativeX / sliderWidth.current));
          const newDistance = Math.round(percentage * 99) + 1; // 1-100 km
          setMaxDistance(newDistance);
        }
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  // Yaş Slider PanResponder (Min)
  const ageMinPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        if (ageSliderTrackRef.current) {
          ageSliderTrackRef.current.measure((x, y, width, height, pageX) => {
            ageSliderStartX.current = pageX;
            ageSliderWidth.current = width;
          });
        }
      },
      onPanResponderMove: (evt) => {
        if (ageSliderWidth.current > 0 && ageSliderStartX.current > 0) {
          const touchX = evt.nativeEvent.pageX;
          const relativeX = touchX - ageSliderStartX.current;
          const percentage = Math.max(0, Math.min(1, relativeX / ageSliderWidth.current));
          const newAge = Math.round(percentage * 82) + 18; // 18-100 yaş
          if (newAge < maxAge) {
            setMinAge(newAge);
          }
        }
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  // Yaş Slider PanResponder (Max)
  const ageMaxPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        if (ageSliderTrackRef.current) {
          ageSliderTrackRef.current.measure((x, y, width, height, pageX) => {
            ageSliderStartX.current = pageX;
            ageSliderWidth.current = width;
          });
        }
      },
      onPanResponderMove: (evt) => {
        if (ageSliderWidth.current > 0 && ageSliderStartX.current > 0) {
          const touchX = evt.nativeEvent.pageX;
          const relativeX = touchX - ageSliderStartX.current;
          const percentage = Math.max(0, Math.min(1, relativeX / ageSliderWidth.current));
          const newAge = Math.round(percentage * 82) + 18; // 18-100 yaş
          if (newAge > minAge) {
            setMaxAge(newAge);
          }
        }
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  // Sayfa her açıldığında veri yükle
  useFocusEffect(
    useCallback(() => {
      console.log('Discover screen focused');
      if (user?.id) {
        // Sadece ilk kez yükle - bir kez yüklendikten sonra tekrar yükleme
        if (!hasInitialLoaded && !loading) {
          console.log('📋 İlk kez proposals yükleniyor...');
          setLoading(true);
          
          // Konum güncellemesi tamamlandıktan sonra teklifleri yükle
          updateUserLocationOnFocus().then(() => {
            loadProposals();
          }).catch(() => {
            // Konum güncellemesi başarısız olsa bile teklifleri yükle
            loadProposals();
          });
        }
        
        loadRemainingProposals(); // Kalan teklif kredisini yükle
        refreshPremiumStatus(); // Premium durumunu yenile
        
        // İlk kez uygulamaya girişte bildirim izni al
        registerForPushNotifications();
        
        // İlk yüklemede selectedCity'yi currentCity'den al
        if (!selectedCity && currentCity) {
          setSelectedCity(currentCity);
        }
      }
    }, [user?.id, isPremium, hasInitialLoaded, loading, selectedCity, currentCity]) // hasInitialLoaded ekledik
  );

  const loadRemainingProposals = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase.rpc('get_remaining_proposals', {
        p_user_id: user.id
      });
      
      if (error) throw error;
      setRemainingProposals(data || 0);
    } catch (error) {
      console.error('Error loading remaining proposals:', error);
    }
  };

  useEffect(() => {
    // Sadece interests'i yükle ve real-time dinlemeyi başlat
    // loadProposals çağrısını kaldırdık - useFocusEffect'te yapılıyor
    loadInterests();

    // Real-time yeni teklif dinleme - yeni teklifleri listeye ekle
    const subscription = supabase
      .channel('proposals-changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'proposals' 
      }, async (payload) => {
        console.log('🆕 Yeni teklif geldi:', payload);
        // Yeni teklifi arka planda yükle - index'i koruyarak
        if (!isLoadingProposalsRef.current) {
          console.log('🔄 Yeni teklif için proposals güncelleniyor...');
          loadProposals(false);
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]); // Sadece user değiştiğinde çalış

  // Filtre değiştiğinde otomatik yükleme KALDIRILDI
  // Artık sadece "Uygula" butonuna basıldığında filtreleme yapılacak

  // AuthContext'teki currentCity değiştiğinde selectedCity'yi güncelle
  useEffect(() => {
    if (currentCity && !selectedCity) {
      console.log('🔄 AuthContext\'ten gelen şehir filtre olarak ayarlanıyor:', currentCity);
      setSelectedCity(currentCity);
    }
  }, [currentCity]);
  
  // Manuel filtreleme için - hiçbir filtre değişikliği otomatik API çağırmayacak

  const updateUserLocationOnFocus = async () => {
    if (!user?.id) return;
    
    // Duplicate konum güncelleme engelle
    if (isUpdatingLocationRef.current) {
      console.log('⚠️ Konum güncelleme zaten çalışıyor, duplicate çağrı engellendi');
      return;
    }
    
    // Önce cache'i kontrol et
    const cachedLocation = getCachedLocation();
    if (cachedLocation && cachedLocation.city) {
      console.log('📍 Cache\'den konum kullanılıyor:', cachedLocation.city);
      // Cache'den konum var, API çağrısı yapmaya gerek yok
      return;
    }
    
    // Premium kullanıcılar için otomatik konum güncellemesi yapma
    if (isPremium) {
      console.log('👑 Premium kullanıcı, otomatik konum güncellemesi atlanıyor');
      return;
    }
    
    isUpdatingLocationRef.current = true;
    
    try {
      console.log('🔄 Ana sayfada konum güncelleniyor (cache yok)...');
      
      // AuthContext'teki cache'li konum güncelleme fonksiyonunu kullan
      const result = await updateLocationManually();
      
      if (result.success && result.city) {
        console.log('✅ Ana sayfada konum güncellendi:', result.city);
      } else if (result.error === 'permission_denied') {
        console.log('❌ Konum izni reddedildi');
        showLocationPermissionAlert();
      }
    } catch (error) {
      // Sessizce logla, kullanıcıyı rahatsız etme
      console.log('⚠️ Ana sayfa konum güncelleme hatası:', error);
    } finally {
      isUpdatingLocationRef.current = false; // Guard'ı serbest bırak
    }
  };

  const showLocationPermissionAlert = () => {
    setShowLocationPermissionModal(true);
  };

  const handleLocationPermissionGrant = async () => {
    setShowLocationPermissionModal(false);
    const result = await requestLocationPermission();
    if (result.granted) {
      // İzin verildi, konum güncellemeyi tekrar dene
      updateUserLocationOnFocus();
    } else {
      // İzin reddedildi, tekrar sor
      setTimeout(() => {
        setShowLocationPermissionModal(true);
      }, 1000);
    }
  };

  const loadInterests = async () => {
    try {
      const data = await interestsAPI.getAll();
      // Alfabetik sıraya koy
      const sortedInterests = data.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
      setInterests(sortedInterests);
    } catch (error: any) {
      console.error('Error loading interests:', error.message);
    }
  };

  // İlgi alanı iconları
  const getInterestIcon = (interestName: string, size = 18, color = '#8B5CF6') => {
    const iconProps = { size, color, strokeWidth: 2 };
    
    switch (interestName.toLowerCase()) {
      // Spor & Aktivite
      case 'futbol': return <Circle {...iconProps} />;
      case 'basketbol': return <Trophy {...iconProps} />;
      case 'yüzme': return <Waves {...iconProps} />;
      case 'voleybol': return <Target {...iconProps} />;
      case 'tenis': return <Target {...iconProps} />;
      case 'yoga': return <Flower2 {...iconProps} />;
      case 'fitness': return <Dumbbell {...iconProps} />;
      case 'koşu': return <Activity {...iconProps} />;
      case 'yürüyüş': return <Activity {...iconProps} />;
      case 'bisiklet': return <Bike {...iconProps} />;
      case 'dağcılık': return <Mountain {...iconProps} />;
      case 'spor': return <Activity {...iconProps} />;
      
      // Sanat & Müzik & Eğlence
      case 'sinema': return <Film {...iconProps} />;
      case 'müzik': return <Music {...iconProps} />;
      case 'dans': return <Users {...iconProps} />;
      case 'tiyatro': return <Theater {...iconProps} />;
      case 'konser': return <Headphones {...iconProps} />;
      case 'gitar': return <Guitar {...iconProps} />;
      case 'piyano': return <Piano {...iconProps} />;
      case 'resim': return <Brush {...iconProps} />;
      case 'fotoğrafçılık': return <Camera {...iconProps} />;
      case 'eğlence': return <Sparkles {...iconProps} />;
      case 'kültür': return <Book {...iconProps} />;
      
      // Yaşam Tarzı
      case 'seyahat': return <Plane {...iconProps} />;
      case 'kamp': return <Tent {...iconProps} />;
      case 'doğa': return <Trees {...iconProps} />;
      case 'yemek': return <Utensils {...iconProps} />;
      case 'kahve': return <Coffee {...iconProps} />;
      case 'içecek': return <Coffee {...iconProps} />;
      case 'kitap': return <Book {...iconProps} />;
      case 'alışveriş': return <ShoppingBag {...iconProps} />;
      
      // Teknoloji & Oyun
      case 'teknoloji': return <Laptop {...iconProps} />;
      case 'oyun': return <Gamepad2 {...iconProps} />;
      case 'girişimcilik': return <Lightbulb {...iconProps} />;
      case 'satranç': return <Target {...iconProps} />;
      case 'okey': return <Users {...iconProps} />;
      case 'tavla': return <Circle {...iconProps} />;
      
      // Sosyal & Diğer
      case 'hayvanlar': return <Dog {...iconProps} />;
      case 'bahçecilik': return <Leaf {...iconProps} />;
      
      default: return <Heart {...iconProps} />;
    }
  };



  const loadProposals = async (resetIndex = true) => {
    if (!user?.id) {
      console.log('❌ User ID yok, proposals yüklenemiyor');
      setLoading(false);
      setHasInitialLoaded(true); // User yoksa da flag'i set et
      return;
    }

    // Güçlü duplicate engelleme
    if (isLoadingProposalsRef.current) {
      console.log('⚠️ loadProposals zaten çalışıyor, duplicate çağrı engellendi');
      return;
    }

    isLoadingProposalsRef.current = true;

    try {
      console.log('🔄 Proposals yükleniyor...');
      setLoading(true);
      
      // 5 saniye timeout ekle - daha kısa
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('API çağrısı zaman aşımına uğradı')), 5000)
      );
      
      const apiPromise = discoverAPI.getProposals(user.id, {
        city: undefined, // Şehir filtresini kaldır, sadece mesafe filtresi kullan
        interestId: selectedInterest,
        minAge: isPremium ? minAge : undefined,
        maxAge: isPremium ? maxAge : undefined,
        gender: isPremium ? selectedGender : undefined,
        maxDistance: maxDistance, // 50 km varsayılan
        eventDate: selectedDate ? selectedDate.toISOString() : undefined, // Tarih filtresi
      });
      
      const data = await Promise.race([apiPromise, timeoutPromise]) as any[];
      
      console.log(`📊 API'den ${data.length} teklif geldi`);
      
      // Geçilen teklifleri frontend'te filtrele (sadece o liste için)
      const filteredData = resetIndex ? data : data.filter(proposal => !skippedProposalIds.has(proposal.id));
      
      console.log(`✅ Filtrelemeden sonra ${filteredData.length} teklif kaldı`);
      
      setProposals(filteredData);
      // Sadece manuel yüklemede veya filtre değişiminde index'i sıfırla
      if (resetIndex) {
        setCurrentIndex(0);
      }
    } catch (error: any) {
      console.error('❌ Proposals yükleme hatası:', error.message);
      setErrorMessage(error.message || 'Bir hata oluştu');
      setShowErrorToast(true);
    } finally {
      console.log('🏁 Proposals yükleme tamamlandı');
      setLoading(false);
      setRefreshing(false);
      setHasInitialLoaded(true); // İlk yükleme tamamlandı flag'ini set et
      isLoadingProposalsRef.current = false; // Guard'ı serbest bırak
    }
  };

  const applyFilters = () => {
    setFilterModalVisible(false);
    setLoading(true);
    loadProposals();
  };

  const clearFilters = () => {
    setFilterModalVisible(false);
    
    // Filtreleri temizle
    setSelectedCity('');
    setSelectedInterest('');
    setSelectedDate(null);
    
    // Temizledikten sonra hemen uygula
    console.log('🧹 Filtreler temizlendi, proposals yükleniyor...');
    setTimeout(() => {
      loadProposals();
    }, 10);
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleLike = async (isSuperLike = false) => {
    if (currentIndex >= proposals.length || !user?.id) return;
    
    // Eğer herhangi bir işlem devam ediyorsa, yeni işlem başlatma
    if (isLiking || isSuperLiking || isPassing) {
      console.log('⚠️ İşlem devam ediyor, duplicate engellendi');
      return;
    }

    const proposal = proposals[currentIndex];

    // Loading state'i ayarla
    if (isSuperLike) {
      setIsSuperLiking(true);
    } else {
      setIsLiking(true);
    }

    try {
      // Like/Super like etkileşimini kaydet
      const { userInteractionsAPI } = await import('@/api/user-interactions');
      await userInteractionsAPI.recordInteraction(
        user.id, 
        proposal.id, 
        isSuperLike ? 'super_like' : 'like'
      );
      
      console.log(`${isSuperLike ? '⚡' : '👍'} ${isSuperLike ? 'Super like' : 'Like'} kaydedildi:`, proposal.activity_name);

      // Backend işlemini tamamla
      const result = await discoverAPI.likeProposal(proposal.id, user.id, isSuperLike);
      
      // İşlem tamamlandı, şimdi UI güncellemelerini yap
      const nextIndex = currentIndex + 1;
      
      // Süper beğeni başarı bildirimi göster
      if (isSuperLike && !result.matched) {
        setSuperLikeUserName(proposal.creator.name);
        // Modal yerine toast kullan (daha sade)
        setShowSuperLikeToast(true);
        
        // İşlem tamamlandıktan sonra karta geç
        setCurrentIndex(nextIndex);
        
        // Loading'i hemen temizle - bekleme yok!
        setIsSuperLiking(false);
        return;
      }
      
      if (result.matched) {
        setMatchedUserName(proposal.creator.name);
        setShowMatchSuccessModal(true);
        // Match durumunda da işlem tamamlandıktan sonra geç
        setCurrentIndex(nextIndex);
      } else {
        // Eşleşme yoksa toast göster ve karta geç
        setIsToastSuperLike(isSuperLike);
        setShowProposalSentToast(true);
        
        // İşlem tamamlandıktan sonra karta geç
        setCurrentIndex(nextIndex);
      }

      // Batch update sistemi - her 3 aksiyonda bir güncelle
      const newActionCount = actionCount + 1;
      setActionCount(newActionCount);
      
      if (newActionCount % batchUpdateThreshold === 0) {
        // Sadece belirli aralıklarla güncelle (performans için)
        loadRemainingProposals();
        refreshUserStats();
      }
      
    } catch (error: any) {
      if (error.message.includes('limit') || error.message.includes('başvurdunuz') || error.message.includes('hakkınız bitti')) {
        // Limit hatası - Premium popup göster veya premium sayfasına yönlendir
        if (error.message.includes('Günlük eşleşme isteği hakkınız bitti')) {
          // Eşleşme isteği limiti bitti - Basit modal göster
          setShowRequestLimitModal(true);
        } else if (error.message.includes('super like hakkınız')) {
          // Super like limiti bitti
          setPremiumFeature('superLikes');
          setPremiumPopupVisible(true);
        } else {
          setInfoMessage(error.message);
          setShowInfoToast(true);
        }
        if (error.message.includes('başvurdunuz')) {
          setCurrentIndex(currentIndex + 1);
        }
      } else {
        setErrorMessage(error.message);
        setShowErrorToast(true);
      }
    } finally {
      // Loading state'i temizle
      if (isSuperLike) {
        setIsSuperLiking(false);
      } else {
        setIsLiking(false);
      }
    }
  };

  const handlePass = async () => {
    if (currentIndex >= proposals.length || !user?.id) return;
    
    // Eğer herhangi bir işlem devam ediyorsa, yeni işlem başlatma
    if (isLiking || isSuperLiking || isPassing) {
      console.log('⚠️ İşlem devam ediyor, duplicate engellendi');
      return;
    }

    const proposal = proposals[currentIndex];

    // Loading state'i ayarla
    setIsPassing(true);

    try {
      // Dislike etkileşimini kaydet
      const { userInteractionsAPI } = await import('@/api/user-interactions');
      await userInteractionsAPI.recordInteraction(user.id, proposal.id, 'dislike');
      
      console.log('👎 Dislike kaydedildi:', proposal.activity_name);

      // Geçilen teklifi hatırla (o oturum için - eski sistem uyumluluğu)
      const currentProposal = proposals[currentIndex];
      if (currentProposal) {
        setSkippedProposalIds(prev => new Set([...Array.from(prev), currentProposal.id]));
      }

      // İşlem tamamlandıktan sonra sonraki karta geç
      setCurrentIndex(currentIndex + 1);
      
    } catch (error: any) {
      console.error('Pass error:', error);
      // Duplicate hatası değilse kullanıcıya göster
      if (error.code !== '23505') {
        setErrorMessage('Bir hata oluştu, tekrar deneyin');
        setShowErrorToast(true);
      }
    } finally {
      setIsPassing(false);
    }
  };

  const currentProposal = proposals[currentIndex];

  // Sadece loading true olduğunda göster
  if (loading) {
    return <FullScreenLoader text="Öneriler yükleniyor..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('@/assets/images/puzzle-iconnew.png')} 
            style={styles.logoIcon}
            resizeMode="contain"
          />
          <Text style={[styles.logoText, { fontFamily: 'System' }]}>Teklif Et</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <SlidersHorizontal size={22} color="#8B5CF6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setCreateModalVisible(true)}
          >
            <Plus size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {currentProposal ? (
        <View style={styles.cardContainer}>
          {/* Kart */}
          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push(`/profile/${currentProposal.creator_id}` as any)}
            activeOpacity={0.95}
          >
            <Image
              source={{ uri: currentProposal.creator.profile_photo }}
              style={styles.cardImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.cardGradient}
            >
              {/* Ana Container - Yan Yana */}
              <View style={styles.cardBottomContainer}>
                {/* Sol Taraf - Aktivite ve Kullanıcı */}
                <View style={styles.cardLeftInfo}>
                  <Text style={styles.activityName}>{currentProposal.activity_name}</Text>
                  <Text style={styles.userName}>
                    {currentProposal.creator.name}, {calculateAge(currentProposal.creator.birth_date)}
                  </Text>
                </View>
                
                {/* Sağ Taraf - Tarih/Saat/Mekan/Konum */}
                {(currentProposal.event_datetime || currentProposal.venue_name || currentProposal.city) && (
                  <View style={styles.cardRightInfo}>
                    {/* Tarih */}
                    {currentProposal.event_datetime && (
                      <View style={styles.infoItem}>
                        <Calendar size={12} color="#FFF" />
                        <Text style={styles.infoText}>
                          {new Date(currentProposal.event_datetime).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'long',
                          })}
                        </Text>
                      </View>
                    )}
                    
                    {/* Mekan ve Konum - Alt Alta */}
                    {currentProposal.venue_name && (
                      <View style={styles.infoItem}>
                        <Store size={12} color="#FFF" />
                        <Text style={styles.infoText} numberOfLines={1}>
                          {currentProposal.venue_name}
                        </Text>
                      </View>
                    )}
                    {currentProposal.city && (
                      <View style={styles.infoItem}>
                        <MapPin size={12} color="#FFF" />
                        <Text style={styles.infoText}>{currentProposal.city}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
              
              {/* Kategori - En Alt */}
              {currentProposal.interest && (
                <View style={styles.interestChip}>
                  <Text style={styles.interestText}>{currentProposal.interest.name}</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {/* REDDET Butonu */}
            <TouchableOpacity 
              style={[styles.actionButton, styles.passButton]} 
              onPress={handlePass}
              disabled={isLiking || isSuperLiking || isPassing}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FFFFFF', '#FFFFFF']}
                style={styles.buttonGradient}
              >
                <X size={30} color="#EF4444" strokeWidth={3} />
              </LinearGradient>
            </TouchableOpacity>
            
            {/* SÜPER BEĞENİ Butonu */}
            <TouchableOpacity
              style={[styles.actionButton, styles.superLikeButton]}
              onPress={() => handleLike(true)}
              disabled={isLiking || isSuperLiking || isPassing}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FFFFFF', '#FFFFFF']}
                style={styles.buttonGradient}
              >
                <SuperLikeIcon 
                  size={30}
                />
              </LinearGradient>
            </TouchableOpacity>
            
            {/* TEKLİF ET Butonu */}
            <TouchableOpacity 
              style={[styles.actionButton, styles.likeButton]} 
              onPress={() => handleLike(false)}
              disabled={isLiking || isSuperLiking || isPassing}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FFFFFF', '#FFFFFF']}
                style={styles.buttonGradient}
              >
                <Image 
                  source={require('@/assets/images/puzzle-iconnew.png')} 
                  style={{ 
                    width:50, 
                    height: 50, 
                    tintColor: '#8B5CF6'
                  }}
                  resizeMode="contain"
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          {loading || refreshing ? (
            <>
              <Text style={styles.emptyText}>Öneriler yenileniyor...</Text>
              <Text style={styles.emptySubtext}>Lütfen bekleyin</Text>
            </>
          ) : (
            <>
              <Text style={styles.emptyText}>Şu an gösterilecek teklif yok</Text>
              <Text style={styles.emptySubtext}>Yeni teklifler için daha sonra tekrar kontrol edin</Text>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={() => {
                  console.log('🔄 Manuel refresh başlatıldı');
                  setRefreshing(true);
                  setCurrentIndex(0);
                  setSkippedProposalIds(new Set()); // Geçilen teklifleri temizle
                  clearLocationCache(); // Konum cache'ini temizle
                  
                  // Manuel refresh - loading guard'ını bypass et
                  isLoadingProposalsRef.current = false;
                  loadProposals(true); // resetIndex = true
                }}
              >
                <Text style={styles.refreshButtonText}>Yenile</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <CreateProposalModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreated={() => {
          setCreateModalVisible(false);
          setShowProposalCreatedToast(true);
          // 3 saniye sonra proposals sayfasına yönlendir
          setTimeout(() => {
            router.push('/(tabs)/proposals');
          }, 3000);
        }}
        onShowProposalLimit={() => setShowProposalLimitModal(true)}
      />

      {/* Premium Popup */}
      <PremiumPopup
        visible={premiumPopupVisible}
        onClose={() => setPremiumPopupVisible(false)}
        feature={premiumFeature}
      />

      {/* Simple Premium Alert */}
      <SimplePremiumAlert
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
      />

      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setFilterModalVisible(false);
          setShowAdvancedFilters(false);
          setEditingCity(false);
        }}
      >
        <TouchableOpacity 
          style={styles.filterModalOverlay} 
          activeOpacity={1}
          onPress={() => {
            setFilterModalVisible(false);
            setShowAdvancedFilters(false);
            setEditingCity(false);
          }}
        >
          <TouchableOpacity 
            style={styles.filterModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.filterModalHeader}>
              {showAdvancedFilters ? (
                <TouchableOpacity
                  style={styles.backToBasicButton}
                  onPress={() => setShowAdvancedFilters(false)}
                >
                  <ChevronDown size={20} color="#8B5CF6" style={{ transform: [{ rotate: '90deg' }] }} />
                  <Text style={styles.backToBasicButtonText}>Geri</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ width: 40 }} />
              )}
              <Text style={styles.filterModalTitle}>Filtreler</Text>
              <TouchableOpacity onPress={() => {
                setFilterModalVisible(false);
                setShowAdvancedFilters(false);
                setEditingCity(false);
              }}>
                <X size={22} color="#8B5CF6" />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <ScrollView 
              style={styles.filterModalBody}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {!showAdvancedFilters ? (
                <>
                  {/* Basit Filtreler */}
                  {/* Kategori Dropdown */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterLabel}>Kategori</Text>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() => setShowInterestDropdown(!showInterestDropdown)}
                    >
                      <Text style={styles.dropdownButtonText}>
                        {selectedInterest
                          ? interests.find((i) => i.id === selectedInterest)?.name || 'Kategori Seç'
                          : 'Tümü'}
                      </Text>
                      <ChevronDown size={20} color="#8B5CF6" />
                    </TouchableOpacity>
                  </View>

                  {/* Tarih Filtresi */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterLabel}>Tarih</Text>
                    <TouchableOpacity
                      style={styles.dateFilterButton}
                      onPress={() => {
                        if (Platform.OS === 'android') {
                          DateTimePickerAndroid.open({
                            value: selectedDate || new Date(),
                            mode: 'date',
                            is24Hour: true,
                            minimumDate: new Date(),
                            onChange: (event, date) => {
                              if (event.type === 'set' && date) {
                                setSelectedDate(date);
                              }
                            },
                          });
                        } else {
                          setShowDatePicker(true);
                        }
                      }}
                    >
                      <Calendar size={18} color="#8B5CF6" />
                      <Text style={styles.dateFilterButtonText}>
                        {selectedDate
                          ? selectedDate.toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          : 'Tüm Tarihler'}
                      </Text>
                      {selectedDate && (
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            setSelectedDate(null);
                          }}
                          style={styles.clearDateButton}
                        >
                          <X size={16} color="#6B7280" />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Gelişmiş Filtre Butonu */}
                  <TouchableOpacity
                    style={styles.advancedFilterButton}
                    onPress={() => {
                      if (isPremium) {
                        setShowAdvancedFilters(true);
                      } else {
                        setShowPremiumModal(true);
                      }
                    }}
                  >
                    <View style={styles.advancedFilterButtonContent}>
                      <SlidersHorizontal size={20} color="#8B5CF6" />
                      <Text style={styles.advancedFilterButtonText}>Gelişmiş Filtreler</Text>
                      {!isPremium && <Crown size={16} color="#F59E0B" fill="#F59E0B" />}
                    </View>
                    <ChevronDown size={18} color="#8B5CF6" style={{ transform: [{ rotate: '-90deg' }] }} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Gelişmiş Filtreler */}
                  {/* Şehir */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterLabel}>Şehir</Text>
                    
                    {!editingCity ? (
                      <View style={styles.cityDisplayContainer}>
                        <View style={styles.cityDisplay}>
                          <MapPin size={18} color="#8B5CF6" />
                          <Text style={styles.cityDisplayText}>
                            {selectedProvince && selectedDistrict
                              ? `${selectedDistrict}, ${PROVINCES.find(p => p.id === selectedProvince)?.name}`
                              : currentCity || 'Konum alınıyor...'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.editCityButton}
                          onPress={() => setEditingCity(true)}
                        >
                          <Text style={styles.editCityButtonText}>Değiştir</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.cityEditContainer}>
                        {/* İl Seçimi */}
                        <View style={styles.citySelectGroup}>
                          <Text style={styles.citySelectLabel}>İl</Text>
                          <TouchableOpacity
                            style={styles.dropdownButton}
                            onPress={() => {
                              setShowProvinceDropdown(!showProvinceDropdown);
                              setShowDistrictDropdown(false);
                            }}
                          >
                            <Text style={styles.dropdownButtonText}>
                              {selectedProvince
                                ? PROVINCES.find(p => p.id === selectedProvince)?.name || 'İl Seç'
                                : 'İl Seç'}
                            </Text>
                            <ChevronDown size={20} color="#8B5CF6" />
                          </TouchableOpacity>
                          
                          {showProvinceDropdown && (
                            <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                              {PROVINCES.map((province) => (
                                <TouchableOpacity
                                  key={province.id}
                                  style={[
                                    styles.dropdownItem,
                                    selectedProvince === province.id && styles.dropdownItemActive,
                                  ]}
                                  onPress={() => {
                                    setSelectedProvince(province.id);
                                    setSelectedDistrict('');
                                    setShowProvinceDropdown(false);
                                  }}
                                >
                                  <Text
                                    style={[
                                      styles.dropdownItemText,
                                      selectedProvince === province.id && styles.dropdownItemTextActive,
                                    ]}
                                  >
                                    {province.name}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          )}
                        </View>

                        {/* İlçe Seçimi */}
                        {selectedProvince && (
                          <View style={styles.citySelectGroup}>
                            <Text style={styles.citySelectLabel}>İlçe</Text>
                            <TouchableOpacity
                              style={styles.dropdownButton}
                              onPress={() => {
                                setShowDistrictDropdown(!showDistrictDropdown);
                                setShowProvinceDropdown(false);
                              }}
                            >
                              <Text style={styles.dropdownButtonText}>
                                {selectedDistrict || 'İlçe Seç'}
                              </Text>
                              <ChevronDown size={20} color="#8B5CF6" />
                            </TouchableOpacity>
                            
                            {showDistrictDropdown && (
                              <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                                {PROVINCES.find(p => p.id === selectedProvince)?.districts.map((district) => (
                                  <TouchableOpacity
                                    key={district}
                                    style={[
                                      styles.dropdownItem,
                                      selectedDistrict === district && styles.dropdownItemActive,
                                    ]}
                                    onPress={() => {
                                      setSelectedDistrict(district);
                                      setShowDistrictDropdown(false);
                                    }}
                                  >
                                    <Text
                                      style={[
                                        styles.dropdownItemText,
                                        selectedDistrict === district && styles.dropdownItemTextActive,
                                      ]}
                                    >
                                      {district}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </ScrollView>
                            )}
                          </View>
                        )}

                        {/* Butonlar */}
                        <View style={styles.cityEditButtons}>
                          <TouchableOpacity
                            style={styles.cityEditCancel}
                            onPress={() => {
                              setEditingCity(false);
                              setShowProvinceDropdown(false);
                              setShowDistrictDropdown(false);
                            }}
                          >
                            <Text style={styles.cityEditCancelText}>İptal</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.cityEditDone}
                            onPress={() => {
                              if (selectedProvince && selectedDistrict) {
                                const provinceName = PROVINCES.find(p => p.id === selectedProvince)?.name;
                                setSelectedCity(`${selectedDistrict}, ${provinceName}`);
                                setEditingCity(false);
                                setShowProvinceDropdown(false);
                                setShowDistrictDropdown(false);
                              } else {
                                setWarningMessage('Lütfen il ve ilçe seçin');
                                setShowWarningToast(true);
                              }
                            }}
                          >
                            <Text style={styles.cityEditDoneText}>Tamam</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Yaş Aralığı */}
                  <View style={styles.filterSection}>
                    <View style={styles.filterLabelRow}>
                      <Text style={styles.filterLabel}>Yaş Aralığı</Text>
                      <Text style={styles.filterValue}>{minAge} - {maxAge}</Text>
                    </View>
                    <View style={styles.ageSliderContainer}>
                      <Text style={styles.sliderMinMax}>18</Text>
                      <View
                        ref={ageSliderTrackRef}
                        style={styles.sliderTrack}
                      >
                        {/* Fill between min and max */}
                        <View style={[
                          styles.sliderFill,
                          {
                            left: `${((minAge - 18) / 82) * 100}%`,
                            width: `${((maxAge - minAge) / 82) * 100}%`,
                          }
                        ]} />
                        {/* Min Thumb */}
                        <View
                          style={[styles.sliderThumb, { left: `${((minAge - 18) / 82) * 100}%` }]}
                          {...ageMinPanResponder.panHandlers}
                        />
                        {/* Max Thumb */}
                        <View
                          style={[styles.sliderThumb, { left: `${((maxAge - 18) / 82) * 100}%` }]}
                          {...ageMaxPanResponder.panHandlers}
                        />
                      </View>
                      <Text style={styles.sliderMinMax}>100</Text>
                    </View>
                  </View>

                  {/* Cinsiyet */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterLabel}>Cinsiyet</Text>
                    <View style={styles.genderButtons}>
                      <TouchableOpacity
                        style={[
                          styles.genderButton,
                          selectedGender === 'all' && styles.genderButtonActive,
                        ]}
                        onPress={() => setSelectedGender('all')}
                      >
                        <Text style={[
                          styles.genderButtonText,
                          selectedGender === 'all' && styles.genderButtonTextActive,
                        ]}>
                          Hepsi
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.genderButton,
                          selectedGender === 'male' && styles.genderButtonActive,
                        ]}
                        onPress={() => setSelectedGender('male')}
                      >
                        <Text style={[
                          styles.genderButtonText,
                          selectedGender === 'male' && styles.genderButtonTextActive,
                        ]}>
                          Erkek
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.genderButton,
                          selectedGender === 'female' && styles.genderButtonActive,
                        ]}
                        onPress={() => setSelectedGender('female')}
                      >
                        <Text style={[
                          styles.genderButtonText,
                          selectedGender === 'female' && styles.genderButtonTextActive,
                        ]}>
                          Kadın
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Kategori Dropdown */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterLabel}>Kategori</Text>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() => setShowInterestDropdown(!showInterestDropdown)}
                    >
                      <Text style={styles.dropdownButtonText}>
                        {selectedInterest
                          ? interests.find((i) => i.id === selectedInterest)?.name || 'Kategori Seç'
                          : 'Tümü'}
                      </Text>
                      <ChevronDown size={20} color="#8B5CF6" />
                    </TouchableOpacity>
                  </View>

                  {/* Tarih Filtresi */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterLabel}>Tarih</Text>
                    <TouchableOpacity
                      style={styles.dateFilterButton}
                      onPress={() => {
                        if (Platform.OS === 'android') {
                          DateTimePickerAndroid.open({
                            value: selectedDate || new Date(),
                            mode: 'date',
                            is24Hour: true,
                            minimumDate: new Date(),
                            onChange: (event, date) => {
                              if (event.type === 'set' && date) {
                                setSelectedDate(date);
                              }
                            },
                          });
                        } else {
                          setShowDatePicker(true);
                        }
                      }}
                    >
                      <Calendar size={18} color="#8B5CF6" />
                      <Text style={styles.dateFilterButtonText}>
                        {selectedDate
                          ? selectedDate.toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          : 'Tüm Tarihler'}
                      </Text>
                      {selectedDate && (
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            setSelectedDate(null);
                          }}
                          style={styles.clearDateButton}
                        >
                          <X size={16} color="#6B7280" />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>

            {/* Kategori Dropdown - Modal Seviyesinde */}
            {showInterestDropdown && (
              <View style={styles.dropdownOverlay}>
                <ScrollView style={styles.dropdownListFixed} nestedScrollEnabled>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedInterest('');
                      setShowInterestDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>Tümü</Text>
                  </TouchableOpacity>
                  {interests.map((interest) => (
                    <TouchableOpacity
                      key={interest.id}
                      style={[
                        styles.dropdownItem,
                        selectedInterest === interest.id && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setSelectedInterest(interest.id);
                        setShowInterestDropdown(false);
                      }}
                    >
                      <View style={styles.dropdownItemContent}>
                        {getInterestIcon(interest.name, 16, selectedInterest === interest.id ? '#8B5CF6' : '#6B7280')}
                        <Text
                          style={[
                            styles.dropdownItemText,
                            selectedInterest === interest.id && styles.dropdownItemTextActive,
                          ]}
                        >
                          {interest.name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Footer */}
            <View style={styles.filterModalFooter}>
              <TouchableOpacity
                style={[
                  styles.filterClearButton,
                  (!selectedCity && !selectedInterest && minAge === 18 && maxAge === 50 && selectedGender === 'all' && !selectedDate) && styles.filterClearButtonDisabled
                ]}
                onPress={() => {
                  if (selectedCity || selectedInterest || minAge !== 18 || maxAge !== 50 || selectedGender !== 'all' || selectedDate) {
                    setSelectedCity('');
                    setSelectedInterest('');
                    setMinAge(18);
                    setMaxAge(50);
                    setSelectedGender('all');
                    setSelectedDate(null);
                    setShowInterestDropdown(false);
                    setShowAdvancedFilters(false);
                  }
                }}
                disabled={!selectedCity && !selectedInterest && minAge === 18 && maxAge === 50 && selectedGender === 'all' && !selectedDate}
              >
                <Text style={[
                  styles.filterClearButtonText,
                  (!selectedCity && !selectedInterest && minAge === 18 && maxAge === 50 && selectedGender === 'all') && styles.filterClearButtonTextDisabled
                ]}>
                  Temizle
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterApplyButton,
                  editingCity && styles.filterApplyButtonDisabled
                ]}
                onPress={() => {
                  if (!editingCity) {
                    setFilterModalVisible(false);
                    setShowInterestDropdown(false);
                    setShowAdvancedFilters(false);
                    applyFilters();
                  }
                }}
                disabled={editingCity}
              >
                <Text style={styles.filterApplyButtonText}>
                  {editingCity ? 'Şehir seçimini tamamlayın' : 'Uygula'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* DateTimePicker - iOS için */}
      {Platform.OS === 'ios' && showDatePicker && (
        <Modal transparent animationType="slide">
          <View style={styles.datePickerOverlay}>
            <TouchableOpacity
              style={styles.datePickerBackdrop}
              activeOpacity={1}
              onPress={() => setShowDatePicker(false)}
            />
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => {
                  setSelectedDate(null);
                  setShowDatePicker(false);
                }}>
                  <Text style={styles.datePickerCancel}>İptal</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Tarih Seç</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerDone}>Tamam</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate || new Date()}
                mode="date"
                display="spinner"
                onChange={(event, date) => {
                  if (date) {
                    setSelectedDate(date);
                  }
                }}
                minimumDate={new Date()}
                textColor="#000"
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Super Like Success Modal */}
      <SuperLikeSuccessModal
        visible={showSuperLikeSuccess}
        onClose={() => setShowSuperLikeSuccess(false)}
        userName={superLikeUserName}
      />

      {/* Super Like Toast - Daha sade alternatif */}
      <SuperLikeToast
        visible={showSuperLikeToast}
        onClose={() => setShowSuperLikeToast(false)}
        userName={superLikeUserName}
      />

      {/* Proposal Sent Toast */}
      <ProposalSentToast
        visible={showProposalSentToast}
        onHide={() => setShowProposalSentToast(false)}
        isSuperLike={isToastSuperLike}
      />

      {/* Proposal Created Toast */}
      <ProposalCreatedToast
        visible={showProposalCreatedToast}
        onHide={() => setShowProposalCreatedToast(false)}
      />

      {/* Location Permission Modal */}
      <LocationPermissionModal
        visible={showLocationPermissionModal}
        onClose={() => setShowLocationPermissionModal(false)}
        onGrantPermission={handleLocationPermissionGrant}
      />

      {/* Match Success Modal */}
      <MatchSuccessModal
        visible={showMatchSuccessModal}
        onClose={() => {
          setShowMatchSuccessModal(false);
          // Kart geçişi zaten yapıldı, ek işlem gerekmiyor
        }}
        userName={matchedUserName}
        onMessage={() => {
          setShowMatchSuccessModal(false);
          // TODO: Navigate to messages
          // Kart geçişi zaten yapıldı
        }}
      />

      {/* Proposal Limit Modal */}
      <ProposalLimitModal
        visible={showProposalLimitModal}
        onClose={() => setShowProposalLimitModal(false)}
        onUpgrade={() => {
          setShowProposalLimitModal(false);
          router.push('/(tabs)/premium');
        }}
      />

      {/* Request Limit Modal */}
      <RequestLimitModal
        visible={showRequestLimitModal}
        onClose={() => setShowRequestLimitModal(false)}
      />

      {/* Error Toast */}
      <ErrorToast
        visible={showErrorToast}
        message={errorMessage}
        onHide={() => setShowErrorToast(false)}
      />

      {/* Info Toast */}
      <InfoToast
        visible={showInfoToast}
        message={infoMessage}
        onHide={() => setShowInfoToast(false)}
      />

      {/* Warning Toast */}
      <WarningToast
        visible={showWarningToast}
        message={warningMessage}
        onHide={() => setShowWarningToast(false)}
      />
    </View>
  );
}

function CreateProposalModal({
  visible,
  onClose,
  onCreated,
  onShowProposalLimit,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  onShowProposalLimit: () => void;
}) {
  const { user, currentCity, refreshUserStats } = useAuth();
  const [activityName, setActivityName] = useState('');
  const [venueName, setVenueName] = useState('');
  const [eventDate, setEventDate] = useState(() => {
    // Default olarak 10 gün sonrası
    const tenDaysLater = new Date();
    tenDaysLater.setDate(tenDaysLater.getDate() + 10);
    tenDaysLater.setHours(23, 59, 59, 999);
    return tenDaysLater;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedInterest, setSelectedInterest] = useState<string | null>(null);
  const [interests, setInterests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  // Step system kaldırıldı - tek ekran yaklaşımı
  
  // Toast states for CreateProposalModal
  const [showWarningToast, setShowWarningToast] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (visible) {
      loadInterests();
    }
  }, [visible]);

  const loadInterests = async () => {
    const { data } = await supabase.from('interests').select('*');
    if (data) {
      // Alfabetik sıraya koy
      const sortedInterests = data.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
      setInterests(sortedInterests);
    }
  };

  // İlgi alanı iconları - CreateProposalModal içinde
  const getInterestIcon = (interestName: string, size = 18, color = '#8B5CF6') => {
    const iconProps = { size, color, strokeWidth: 2 };
    
    switch (interestName.toLowerCase()) {
      // Spor & Aktivite
      case 'futbol': return <Circle {...iconProps} />;
      case 'basketbol': return <Trophy {...iconProps} />;
      case 'yüzme': return <Waves {...iconProps} />;
      case 'voleybol': return <Target {...iconProps} />;
      case 'tenis': return <Target {...iconProps} />;
      case 'yoga': return <Flower2 {...iconProps} />;
      case 'fitness': return <Dumbbell {...iconProps} />;
      case 'koşu': return <Activity {...iconProps} />;
      case 'yürüyüş': return <Activity {...iconProps} />;
      case 'bisiklet': return <Bike {...iconProps} />;
      case 'dağcılık': return <Mountain {...iconProps} />;
      case 'spor': return <Activity {...iconProps} />;
      
      // Sanat & Müzik & Eğlence
      case 'sinema': return <Film {...iconProps} />;
      case 'müzik': return <Music {...iconProps} />;
      case 'dans': return <Users {...iconProps} />;
      case 'tiyatro': return <Theater {...iconProps} />;
      case 'konser': return <Headphones {...iconProps} />;
      case 'gitar': return <Guitar {...iconProps} />;
      case 'piyano': return <Piano {...iconProps} />;
      case 'resim': return <Brush {...iconProps} />;
      case 'fotoğrafçılık': return <Camera {...iconProps} />;
      case 'eğlence': return <Sparkles {...iconProps} />;
      case 'kültür': return <Book {...iconProps} />;
      
      // Yaşam Tarzı
      case 'seyahat': return <Plane {...iconProps} />;
      case 'kamp': return <Tent {...iconProps} />;
      case 'doğa': return <Trees {...iconProps} />;
      case 'yemek': return <Utensils {...iconProps} />;
      case 'kahve': return <Coffee {...iconProps} />;
      case 'içecek': return <Coffee {...iconProps} />;
      case 'kitap': return <Book {...iconProps} />;
      case 'alışveriş': return <ShoppingBag {...iconProps} />;
      
      // Teknoloji & Oyun
      case 'teknoloji': return <Laptop {...iconProps} />;
      case 'oyun': return <Gamepad2 {...iconProps} />;
      case 'girişimcilik': return <Lightbulb {...iconProps} />;
      case 'satranç': return <Target {...iconProps} />;
      case 'okey': return <Users {...iconProps} />;
      case 'tavla': return <Circle {...iconProps} />;
      
      // Sosyal & Diğer
      case 'hayvanlar': return <Dog {...iconProps} />;
      case 'bahçecilik': return <Leaf {...iconProps} />;
      
      default: return <Heart {...iconProps} />;
    }
  };



  const showDateTimePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: eventDate,
        mode: 'date',
        is24Hour: true,
        minimumDate: new Date(), // Bugünden önceki tarihleri engelle
        onChange: (event, date) => {
          if (event.type === 'set' && date) {
            // Seçilen tarih bugünden önceyse uyarı göster
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (date < today) {
              setWarningMessage('Etkinlik tarihi geçmiş bir tarih olamaz');
              setShowWarningToast(true);
              return;
            }
            // Seçilen tarihi saat 23:59'a ayarla
            const newDate = new Date(date);
            newDate.setHours(23, 59, 59, 999);
            setEventDate(newDate);
          }
        },
      });
    } else {
      setShowDatePicker(true);
    }
  };

  // Step functions removed - using simple form now

  const handleCreate = async () => {
    if (!activityName.trim()) {
      setWarningMessage('Lütfen aktivite adı girin');
      setShowWarningToast(true);
      return;
    }
    
    if (!selectedInterest) {
      setWarningMessage('Lütfen kategori seçin');
      setShowWarningToast(true);
      return;
    }

    setLoading(true);
    try {
      // Kullanıcının koordinatlarını al
      const { data: userData } = await supabase
        .from('profiles')
        .select('latitude, longitude')
        .eq('id', user!.id)
        .single();

      await proposalsAPI.createProposal({
        creator_id: user!.id,
        activity_name: activityName.trim(),
        participant_count: 1,
        is_group: false,
        interest_id: selectedInterest,
        city: currentCity || 'İstanbul',
        latitude: userData?.latitude,
        longitude: userData?.longitude,
        event_datetime: eventDate.toISOString(),
        venue_name: venueName.trim() || undefined
      });

      // Form'u temizle
      setActivityName('');
      setVenueName('');
      // Event date'i 10 gün sonrası olarak ayarla
      const tenDaysLater = new Date();
      tenDaysLater.setDate(tenDaysLater.getDate() + 10);
      tenDaysLater.setHours(23, 59, 59, 999);
      setEventDate(tenDaysLater);
      setSelectedInterest(null);
      // Form reset
      
      // Profile sayfasının stats'larını güncelle
      refreshUserStats();
      
      onCreated();
    } catch (error: any) {
      if (error.message?.includes('Günlük teklif') || error.message?.includes('hakkınız bitti') || error.message?.includes('Bu tarih için zaten')) {
        // Tüm limit hataları için ProposalLimitModal göster
        onShowProposalLimit();
      } else {
        setErrorMessage(error.message);
        setShowErrorToast(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <TouchableOpacity 
        style={styles.stepModalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity 
          style={styles.stepModalContainer}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Simple Header */}
          <View style={styles.simpleHeader}>
            <TouchableOpacity onPress={onClose} style={styles.modernCloseButton}>
              <X size={22} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.simpleTitle}>Yeni Teklif</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Content */}
          <View style={{ flex: 1 }}>
            <ScrollView 
              style={styles.simpleContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Aktivite Adı */}
              <View style={styles.simpleInputGroup}>
                <Text style={styles.simpleLabel}>Ne yapmak istersin?</Text>
                <View style={styles.modernInputContainer}>
                  <TextInput
                    style={styles.modernTextInput}
                    placeholder="Kahve içmek, sinemaya gitmek..."
                    value={activityName}
                    onChangeText={setActivityName}
                    maxLength={100}
                    placeholderTextColor="#9CA3AF"
                    autoFocus
                  />
                </View>
              </View>

              {/* Kategori */}
              <View style={styles.simpleInputGroup}>
                <Text style={styles.simpleLabel}>Kategori</Text>
                <TouchableOpacity
                  style={styles.modernDropdownButton}
                  onPress={() => {
                    setShowCategoryDropdown(!showCategoryDropdown);
                    Keyboard.dismiss();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.modernDropdownContent}>
                    <Text style={[
                      styles.modernDropdownText,
                      !selectedInterest && styles.modernDropdownPlaceholder
                    ]}>
                      {selectedInterest 
                        ? interests.find(i => i.id === selectedInterest)?.name 
                        : 'Kategori seçin'
                      }
                    </Text>
                    <ChevronDown 
                      size={20} 
                      color="#6B7280" 
                      style={[
                        styles.modernDropdownIcon,
                        showCategoryDropdown && styles.modernDropdownIconRotated
                      ]}
                    />
                  </View>
                </TouchableOpacity>
                
                {/* Dropdown Menu */}
                {showCategoryDropdown && (
                  <View style={styles.modernDropdownMenu}>
                    <ScrollView 
                      style={styles.modernDropdownScroll}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled={true}
                    >
                      {interests.map(interest => (
                        <TouchableOpacity
                          key={interest.id}
                          style={[
                            styles.modernDropdownItem,
                            selectedInterest === interest.id && styles.modernDropdownItemSelected
                          ]}
                          onPress={() => {
                            setSelectedInterest(interest.id);
                            setShowCategoryDropdown(false);
                            Keyboard.dismiss();
                          }}
                        >
                          <View style={styles.modernDropdownItemContent}>
                            {getInterestIcon(interest.name, 18, selectedInterest === interest.id ? '#8B5CF6' : '#6B7280')}
                            <Text style={[
                              styles.modernDropdownItemText,
                              selectedInterest === interest.id && styles.modernDropdownItemTextSelected
                            ]}>
                              {interest.name}
                            </Text>
                          </View>
                          {selectedInterest === interest.id && (
                            <View style={styles.modernDropdownCheckmark}>
                              <Text style={styles.modernDropdownCheckmarkText}>✓</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Konum */}
              <View style={styles.simpleInputGroup}>
                <Text style={styles.simpleLabel}>Konum</Text>
                <View style={styles.compactLocationBadge}>
                  <MapPin size={16} color="#8B5CF6" />
                  <Text style={styles.compactLocationText}>
                    {currentCity || 'Konum alınıyor...'}
                  </Text>
                </View>
              </View>

              {/* Tarih */}
              <View style={styles.simpleInputGroup}>
                <Text style={styles.simpleLabel}>Tarih</Text>
                <TouchableOpacity
                  style={styles.modernDateButton}
                  onPress={showDateTimePicker}
                  activeOpacity={0.7}
                >
                  <View style={styles.modernDateContent}>
                    <Calendar size={20} color="#8B5CF6" />
                    <Text style={styles.modernDateText}>
                      {eventDate.toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Mekan (Opsiyonel) */}
              <View style={styles.simpleInputGroup}>
                <Text style={styles.simpleLabel}>Mekan (Opsiyonel)</Text>
                <View style={styles.modernInputContainer}>
                  <Store size={18} color="#9CA3AF" style={styles.modernInputIcon} />
                  <TextInput
                    style={[styles.modernTextInput, styles.modernTextInputWithIcon]}
                    placeholder="Starbucks Kadıköy, Moda Sahil..."
                    value={venueName}
                    onChangeText={setVenueName}
                    maxLength={100}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </ScrollView>

            {/* Submit Button */}
            <View style={styles.simpleFooter}>
              <TouchableOpacity
                style={[styles.simpleSubmitButton, loading && styles.modernSubmitButtonDisabled]}
                onPress={handleCreate}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <View style={styles.modernButtonLoading}>
                    <AppIconLoader size={20} />
                    <Text style={styles.simpleSubmitButtonText}>Oluşturuluyor</Text>
                  </View>
                ) : (
                  <View style={styles.modernButtonContent}>
                    <Sparkles size={20} color="#FFFFFF" />
                    <Text style={styles.simpleSubmitButtonText}>Teklifi Oluştur</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
      
      {/* DateTimePicker - Sadece iOS için */}
      {Platform.OS === 'ios' && showDatePicker && (
        <DateTimePicker
          value={eventDate}
          mode="date"
          display="spinner"
          minimumDate={new Date()} // Bugünden önceki tarihleri engelle
          onChange={(event, date) => {
            if (event.type === 'set' && date) {
              // Seçilen tarih bugünden önceyse uyarı göster
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              if (date < today) {
                setWarningMessage('Etkinlik tarihi geçmiş bir tarih olamaz');
                setShowWarningToast(true);
                setShowDatePicker(false);
                return;
              }
              // Seçilen tarihi saat 23:59'a ayarla
              const newDate = new Date(date);
              newDate.setHours(23, 59, 59, 999);
              setEventDate(newDate);
              setShowDatePicker(false);
            } else if (event.type === 'dismissed') {
              setShowDatePicker(false);
            }
          }}
        />
      )}
      
      {/* Warning Toast - CreateProposalModal içinde */}
      <WarningToast
        visible={showWarningToast}
        message={warningMessage}
        onHide={() => setShowWarningToast(false)}
      />

      {/* Error Toast - CreateProposalModal içinde */}
      <ErrorToast
        visible={showErrorToast}
        message={errorMessage}
        onHide={() => setShowErrorToast(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    paddingTop: 35,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 1,
  },
  logoIcon: {
    width: 35,
    height: 35,
    tintColor: '#8B5CF6',
    marginTop: -2,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B5CF6',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButton: {
    width: 40,
    height: 40,
    backgroundColor: '#8B5CF6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    flex: 1,
    padding: 16,
    paddingBottom: 120,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingTop: 100,
  },

  cardBottomContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  cardLeftInfo: {
    flex: 1,
    gap: 6,
  },
  activityName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },
  cardRightInfo: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 10,
    gap: 6,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  interestChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  interestText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginTop: 24,
  },
  passButton: {
    width: 64,
    height: 64,
    backgroundColor: '#FFF',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EF4444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  superLikeButton: {
    // Özel stil gerekirse buraya eklenebilir
  },
  likeButton: {
    width: 64,
    height: 64,
    backgroundColor: '#FFF',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  puzzleIconContainer: {
    width: 32,
    height: 32,
    position: 'relative',
  },
  puzzlePiece: {
    position: 'absolute',
    width: 18,
    height: 18,
    backgroundColor: '#8B5CF6',
  },
  puzzlePieceLeft: {
    left: 0,
    top: 7,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderTopRightRadius: 8,
  },
  puzzlePieceRight: {
    right: 0,
    top: 7,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    borderTopLeftRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  inputGroup: {
    marginBottom: 20,
  },
  dateTimeButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  dateTimeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateTimeDisplayText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
  },
  textAreaInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  locationDetectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3E8FF',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  locationDetectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  locationDetectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 16,
  },
  locationDetectedText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8B5CF6',
    flex: 1,
  },

  // Modern Styles
  modernInputGroup: {
    marginBottom: 20,
  },
  modernInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  modernInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  modernTextInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 16,
    paddingHorizontal: 0,
    minHeight: 50,
  },
  modernTextInputWithIcon: {
    paddingLeft: 8,
  },
  modernInputIcon: {
    marginRight: 4,
  },
  modernDropdownButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  modernDropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modernDropdownText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  modernDropdownPlaceholder: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  modernDropdownIcon: {
    transform: [{ rotate: '0deg' }],
  },
  modernDropdownIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  modernDropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 999,
  },
  modernDropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    marginTop: 8,
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  modernDropdownScroll: {
    maxHeight: 250,
  },
  modernDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modernDropdownItemSelected: {
    backgroundColor: '#F3E8FF',
  },
  modernDropdownItemText: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },
  modernDropdownItemTextSelected: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  modernDropdownCheckmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernDropdownCheckmarkText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modernDateButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  modernDateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modernDateText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  modernLocationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: -8,
    marginBottom: 8,
  },
  modernLocationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  modernLocationSection: {
    marginBottom: 20,
  },
  modernLocationBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginTop: 8,
  },
  modernLocationTextInline: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  modernModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modernHeaderContent: {
    flex: 1,
    paddingRight: 16,
  },
  modernModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  modernModalSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '400',
    lineHeight: 20,
  },
  modernCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernModalFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  modernSubmitButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modernSubmitButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  modernButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modernButtonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modernSubmitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modernLoadingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  modernLoadingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    opacity: 0.6,
  },

  // Step Styles
  stepHeader: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  stepHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepProgress: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stepProgressText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
  },
  stepTitleContainer: {
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  compactStepContent: {
    flex: 1,
  },
  compactStepContentContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
    minHeight: 120,
  },
  compactStepContainer: {
    width: '100%',
  },
  modernLocationBadgeStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E9D5FF',
    marginBottom: 16,
  },
  modernLocationTextStep: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  stepInfoText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 16,
    paddingHorizontal: 20,
  },
  stepFooter: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  stepButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  stepBackButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  stepNextButton: {
    flex: 2,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  stepNextButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  stepNextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Compact Step Styles
  compactLocationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 8,
  },
  compactLocationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  compactInfoText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Step Modal Popup Styles
  stepModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  stepModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 420,
    height: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25,
  },
  // Simple Form Styles
  simpleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  simpleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  simpleContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  simpleInputGroup: {
    marginBottom: 12,
  },
  simpleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  simpleFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  simpleSubmitButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  simpleSubmitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  stepKeyboardView: {
    flex: 1,
    maxHeight: '100%',
  },

  modernModalBody: {
    flex: 1,
  },
  modernModalBodyContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },

  participantSelector: {
    marginBottom: 16,
  },
  participantLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
  },
  participantButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  participantButton: {
    width: 44,
    height: 44,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  participantButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  participantButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
  participantButtonTextActive: {
    color: '#FFF',
  },
  groupToggle: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    alignItems: 'center',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: '#D1D5DB',
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  checkmark: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  groupToggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestOption: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#F3F4F6',
  },
  interestOptionSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  interestOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  interestChipSmall: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  interestChipSelected: {
    backgroundColor: '#8B5CF6',
  },
  interestChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  interestChipTextSelected: {
    color: '#FFF',
  },
  interestOptionTextSelected: {
    color: '#FFF',
  },
  createProposalButton: {
    backgroundColor: '#8B5CF6',
    marginHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  submitButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  disabledButton: {
    opacity: 0.5,
  },
  createProposalButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  // Yeni Filtre Modal Stilleri
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  filterModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFF',
    zIndex: 10,
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  filterModalBody: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    overflow: 'visible',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionLast: {
    marginBottom: 24,
    overflow: 'visible',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 10,
  },
  filterLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  filterValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  premiumButton: {
    padding: 4,
  },
  cityDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cityDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cityDisplayText: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '600',
  },
  editCityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3E8FF',
    borderRadius: 8,
  },
  editCityButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
  cityEditContainer: {
    gap: 12,
  },
  citySelectGroup: {
    gap: 8,
    marginBottom: 16,
  },
  citySelectLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  cityEditButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  cityEditCancel: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
  },
  cityEditCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  cityEditDone: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    alignItems: 'center',
  },
  cityEditDoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  filterInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#000',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sliderMinMax: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    position: 'relative',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute',
    top: -7,
    width: 20,
    height: 20,
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    marginLeft: -10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },

  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    position: 'relative',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  dropdownList: {
    marginTop: 8,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownOverlay: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    zIndex: 10000,
  },
  dropdownListFixed: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 999,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemActive: {
    backgroundColor: '#F3E8FF',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  dropdownItemTextActive: {
    color: '#8B5CF6',
    fontWeight: '700',
  },
  filterModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFF',
    zIndex: 10,
  },
  filterClearButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
  },
  filterClearButtonDisabled: {
    backgroundColor: '#E5E7EB',
    opacity: 0.5,
  },
  filterClearButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
  filterClearButtonTextDisabled: {
    color: '#9CA3AF',
  },
  filterApplyButton: {
    flex: 2,
    paddingVertical: 14,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  filterApplyButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  filterApplyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  // Premium Modal Stilleri
  premiumModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  premiumModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  premiumModalIcon: {
    marginBottom: 20,
  },
  premiumModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  premiumModalMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  premiumFeaturesList: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  premiumFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  premiumFeatureIcon: {
    width: 36,
    height: 36,
    backgroundColor: '#F3E8FF',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumFeatureText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  premiumModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  premiumModalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
  },
  premiumModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  premiumModalUpgradeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
  },
  premiumModalUpgradeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  // Gelişmiş Filtre Stilleri
  advancedFilterButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderWidth: 2,
    borderColor: '#E9D5FF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
  },
  advancedFilterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  advancedFilterButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  backToBasicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backToBasicButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  ageSliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  genderButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  genderButtonTextActive: {
    color: '#FFF',
  },
  dateFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateFilterButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  clearDateButton: {
    padding: 4,
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  datePickerBackdrop: {
    flex: 1,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  datePickerCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  datePickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  
  // Dropdown item content styles
  dropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modernDropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  
  // Loading ve Disabled Button Stilleri (artık kullanılmıyor)
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingSpinner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFF',
    borderTopColor: 'transparent',
  },
  // Action Buttons
  actionButton: {
    alignItems: 'center',
  },
  buttonGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
