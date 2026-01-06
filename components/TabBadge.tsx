import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface TabBadgeProps {
  count: number;
  size?: 'small' | 'medium';
}

export default function TabBadge({ count, size = 'small' }: TabBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > 99 ? '99+' : count.toString();
  const isLarge = displayCount.length > 2;

  return (
    <View style={[
      styles.badge,
      size === 'medium' && styles.badgeMedium,
      isLarge && styles.badgeLarge
    ]}>
      <Text style={[
        styles.badgeText,
        size === 'medium' && styles.badgeTextMedium,
        isLarge && styles.badgeTextLarge
      ]}>
        {displayCount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  badgeMedium: {
    top: -8,
    right: -10,
    minWidth: 20,
    height: 20,
    borderRadius: 12,
  },
  badgeLarge: {
    minWidth: 24,
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 12,
  },
  badgeTextMedium: {
    fontSize: 11,
    lineHeight: 13,
  },
  badgeTextLarge: {
    fontSize: 9,
    lineHeight: 11,
  },
});