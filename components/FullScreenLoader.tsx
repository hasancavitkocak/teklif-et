import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { AppIconLoader } from './AppIconLoader';

interface FullScreenLoaderProps {
  text?: string;
  showText?: boolean;
}

export const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({ 
  text = "Yükleniyor...", 
  showText = true 
}) => {
  return (
    <View style={styles.container}>
      <AppIconLoader size={120} />
      {showText && (
        <Text style={styles.loadingText}>{text}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    gap: 6,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
});