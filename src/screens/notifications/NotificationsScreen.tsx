import React, { useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '@/context/NotificationsContext';
import { useI18n, type Lang } from '@/i18n/I18nContext';
import { COLORS, SPACING, RADIUS } from '@/constants';
import type { AppNotification } from '@/types';
import type { RootStackParamList } from '@/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type IoniconsName = keyof typeof Ionicons.glyphMap;

const LOCALE_MAP: Record<Lang, string> = {
  it: 'it-IT', fr: 'fr-CH', de: 'de-CH', en: 'en-GB', es: 'es-ES', pt: 'pt-PT',
};

// Colore + icona per tipo notifica (label viene dai dizionari)
const TYPE_VISUAL: Record<string, { color: string; icon: IoniconsName }> = {
  ORDER_CONFIRMED:     { color: COLORS.success,       icon: 'checkmark-circle-outline' },
  ORDER_SHIPPED:       { color: '#4338ca',           icon: 'bicycle-outline'          },
  ORDER_DELIVERED:     { color: COLORS.primary,       icon: 'checkmark-done-outline'   },
  ORDER_CANCELLED:     { color: COLORS.error,         icon: 'close-circle-outline'     },
  ORDER_RECEIVED:      { color: COLORS.accent,        icon: 'receipt-outline'          },
  CONNECTION_APPROVED: { color: COLORS.success,       icon: 'link-outline'             },
  CONNECTION_REQUEST:  { color: COLORS.accent,        icon: 'person-add-outline'       },
  SECURITY_ALERT:      { color: COLORS.warning,       icon: 'shield-outline'           },
  GENERIC:             { color: COLORS.textSecondary, icon: 'notifications-outline'    },
};

function timeAgo(iso: string, lang: Lang, t: (p: string, f?: string) => string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  const min = Math.floor(diffSec / 60);
  const hour = Math.floor(min / 60);
  const day = Math.floor(hour / 24);
  if (diffSec < 60) return t('mobile.notifications.now', 'adesso');
  if (min < 60)  return `${min} ${t('mobile.notifications.minShort', 'min')}`;
  if (hour < 24) return `${hour} ${t('mobile.notifications.hourShort', 'h')}`;
  if (day < 7)   return `${day} ${t('mobile.notifications.dayShort', 'g')}`;
  return new Date(iso).toLocaleDateString(LOCALE_MAP[lang] ?? 'it-IT', { day: '2-digit', month: 'short' });
}

function NotificationRow({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const { lang, t } = useI18n();
  const visual = TYPE_VISUAL[item.type] ?? TYPE_VISUAL.GENERIC;
  const unread = !item.readAt;

  return (
    <TouchableOpacity
      style={[styles.row, unread && styles.rowUnread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${visual.color}18` }]}>
        <Ionicons name={visual.icon} size={20} color={visual.color} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>{item.title}</Text>
        {!!item.message && <Text style={styles.rowMessage} numberOfLines={3}>{item.message}</Text>}
        <Text style={styles.rowTime}>{timeAgo(item.createdAt, lang, t)}</Text>
      </View>
      {unread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useI18n();
  const { notifications, unreadCount, isLoading, refresh, markRead, markAllRead } = useNotifications();

  // Aggiorna l'header: titolo localizzato + "segna tutte come lette"
  useEffect(() => {
    navigation.setOptions({
      title: t('mobile.notifications.title', 'Notifiche'),
      headerRight: () =>
        unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.markAll}>{t('mobile.notifications.markAllRead', 'Segna lette')}</Text>
          </TouchableOpacity>
        ) : null,
    });
  }, [navigation, unreadCount, markAllRead, t]);

  // Refresh quando si apre la schermata
  useEffect(() => { refresh(); }, [refresh]);

  function handlePress(item: AppNotification) {
    if (!item.readAt) markRead(item.id);
    const orderId = item.payload?.orderId;
    if (orderId) {
      navigation.navigate('OrderDetail', { orderId });
    }
  }

  return (
    <FlatList
      style={styles.container}
      data={notifications}
      keyExtractor={(n) => n.id}
      renderItem={({ item }) => <NotificationRow item={item} onPress={() => handlePress(item)} />}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={COLORS.primary} />}
      contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : { padding: SPACING.md, gap: SPACING.sm }}
      ListEmptyComponent={
        isLoading ? null : (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyTitle}>{t('mobile.notifications.empty', 'Nessuna notifica')}</Text>
            <Text style={styles.emptySubtitle}>{t('mobile.notifications.emptySub', 'Qui vedrai gli aggiornamenti sui tuoi ordini')}</Text>
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  emptyState: { alignItems: 'center', gap: SPACING.sm },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },

  markAll: { color: COLORS.accent, fontWeight: '700', fontSize: 14, marginRight: 4 },

  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md,
  },
  rowUnread: { borderColor: COLORS.accent, backgroundColor: `${COLORS.accent}08` },
  iconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  rowMessage: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  rowTime: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.accent, marginTop: 6, flexShrink: 0 },
});
