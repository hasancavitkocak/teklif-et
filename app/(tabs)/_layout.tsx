import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Heart, MessageCircle, FileText, Crown, User } from 'lucide-react-native';

export default function TabLayout() {
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
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          height: Platform.OS === 'ios' ? 90 : 70,
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
          tabBarIcon: ({ size, color }) => <FileText size={size} color={color} />,
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
