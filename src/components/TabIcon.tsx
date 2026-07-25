import React from 'react';
import { Text, View, StyleSheet } from 'react-native';

/**
 * Mappa icone tab bar — codici Unicode dal glyphmap Ionicons.
 * Bypassa @expo/vector-icons per evitare il bug di font loading
 * con fontFamily case-mismatch ('ionicons' vs 'Ionicons').
 */
const ICON_MAP: Record<string, number> = {
  'grid-outline':    0xEC57,  // 60503
  'cart-outline':    0xEB04,  // 60164
  'receipt-outline': 0xEE10,  // 60944
  'person-outline':  0xEDAD,  // 60845
};

interface TabIconProps {
  name: string;
  size: number;
  color: string;
}

export default function TabIcon({ name, size, color }: TabIconProps) {
  const codePoint = ICON_MAP[name];
  if (!codePoint) {
    // Fallback: prima lettera del nome
    return (
      <Text style={{ fontSize: size, color, fontWeight: '700' }}>
        {name.charAt(0).toUpperCase()}
      </Text>
    );
  }
  return (
    <Text
      style={{
        fontFamily: 'Ionicons',  // maiuscolo — match esatto del filename TTF
        fontSize: size,
        color,
        // Necessario per allineamento corretto su Android
        textAlign: 'center',
        textAlignVertical: 'center',
        includeFontPadding: false,
      }}
      // Disabilita accessibilità per l'icona decorativa
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {String.fromCharCode(codePoint)}
    </Text>
  );
}

export function CartTabIcon({ color, size, badge }: TabIconProps & { badge?: number }) {
  return (
    <View>
      <TabIcon name="cart-outline" size={size} color={color} />
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -6,
    top: -4,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
});
