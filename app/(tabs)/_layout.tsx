import { Tabs } from 'expo-router';
import { Platform, View, Text } from 'react-native';
import { Heart, MessageCircle, FileText, Crown, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnread } from '@/contexts/UnreadContext';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { unreadCount, proposalsCount } = useUnread();
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          height: Platform.OS === 'ios' ? 90 : 60 + Math.max(insets.bottom, 0),
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Keşfet',
          tabBarIcon: ({ size, color }) => <Heart size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="proposals"
        options={{
          title: 'Tekliflerim',
          tabBarIcon: ({ size, color }) => (
            <View style={{ position: 'relative' }}>
              <FileText size={size} color={color} />
              {(proposalsCount || 0) > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -8,
                    backgroundColor: '#EF4444',
                    borderRadius: 10,
                    minWidth: 18,
                    height: 18,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 4,
                  }}
                >
                  <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>
                    {(proposalsCount || 0) > 9 ? '9+' : String(proposalsCount || 0)}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Sohbet',
          tabBarIcon: ({ size, color }) => <MessageCircle size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="premium"
        options={{
          title: 'Premium',
          tabBarIcon: ({ size, color }) => <Crown size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
