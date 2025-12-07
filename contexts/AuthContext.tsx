import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import * as Location from 'expo-location';

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

  const updateUserLocation = async () => {
    if (!user?.id) return;
    
    try {
      // Konum izni iste
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      // Mevcut konumu al
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // Reverse geocoding ile şehir bilgisini al
      const [geocode] = await Location.reverseGeocodeAsync({ latitude, longitude });
      
      if (geocode?.city) {
        // Profildeki şehir bilgisini güncelle
        await supabase
          .from('profiles')
          .update({
            city: geocode.city,
            latitude,
            longitude,
          })
          .eq('id', user.id);

        console.log('✅ Location updated:', geocode.city);
      }
    } catch (error) {
      console.error('Location update error:', error);
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
