import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MoreVertical } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { MatchInfo } from '@/api/messages';

interface MessageHeaderProps {
  matchInfo: MatchInfo | null;
  onMenuPress: (event: any) => void;
}

export default function MessageHeader({ matchInfo, onMenuPress }: MessageHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.headerCenter}
          onPress={() => matchInfo && router.push(`/profile/${matchInfo.otherUser.id}` as any)}
          activeOpacity={0.7}
          disabled={!matchInfo}
        >
          {matchInfo ? (
            <>
              <Image
                source={{ uri: matchInfo.otherUser.profile_photo }}
                style={styles.headerAvatar}
              />
              <View style={styles.headerInfo}>
                <Text style={styles.headerName}>{matchInfo.otherUser.name}</Text>
                {matchInfo.activity && (
                  <Text style={styles.headerActivity}>{matchInfo.activity}</Text>
                )}
              </View>
            </>
          ) : (
            <View style={styles.headerInfo}>
              <View style={styles.loadingPlaceholder} />
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={onMenuPress}
          style={styles.menuButton}
        >
          <MoreVertical size={22} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    height: 60,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  headerActivity: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingPlaceholder: {
    height: 20,
    width: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
  },
});