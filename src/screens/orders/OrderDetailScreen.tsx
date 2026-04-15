import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getOrder }  from '@/api/orders';
import { useI18n, type Lang } from '@/i18n/I18nContext';
import { COLORS, SPACING, RADIUS } from '@/constants';
import type { Order } from '@/types';
import type { RootStackParamList } from '@/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderDetail'>;

const LOCALE_MAP: Record<Lang, string> = { it: 'it-IT', fr: 'fr-CH', de: 'de-CH', en: 'en-GB' };

function formatPrice(cents: number, currency = 'CHF') {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}
function formatDate(iso: string, lang: Lang) {
  return new Date(iso).toLocaleString(LOCALE_MAP[lang] ?? 'it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

type IoniconsName = keyof typeof Ionicons.glyphMap;
const STATUS_VISUAL: Record<string, { color: string; icon: IoniconsName }> = {
  PENDING:   { color: '#d97706',           icon: 'time-outline'            },
  CONFIRMED: { color: COLORS.success,       icon: 'checkmark-circle-outline' },
  SHIPPED:   { color: '#4338ca',           icon: 'bicycle-outline'         },
  DELIVERED: { color: COLORS.primary,       icon: 'checkmark-done-outline'  },
  CANCELLED: { color: COLORS.textSecondary, icon: 'close-circle-outline'    },
  DRAFT:     { color: COLORS.textSecondary, icon: 'document-outline'        },
  PRE_ORDER: { color: COLORS.accent,        icon: 'calendar-outline'        },
};

export default function OrderDetailScreen({ route }: Props) {
  const { orderId } = route.params;
  const { lang, t }  = useI18n();
  const [order,   setOrder]   = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await getOrder(orderId);
        setOrder(data);
      } catch (e) {
        setError((e as any)?.response?.data?.error ?? t('mobile.orders.loadErrorDetail', 'Errore caricamento ordine.'));
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId, t]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} />;

  if (error || !order) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || t('mobile.orders.notFound', 'Ordine non trovato.')}</Text>
      </View>
    );
  }

  const visual = STATUS_VISUAL[order.status] ?? { color: COLORS.textSecondary, icon: 'help-outline' as IoniconsName };
  const label  = t(`mobile.orders.status.${order.status}`, order.status);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text style={styles.supplierName}>{order.supplier.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${visual.color}22` }]}>
            <Ionicons name={visual.icon} size={14} color={visual.color} />
            <Text style={[styles.statusText, { color: visual.color }]}>{label}</Text>
          </View>
        </View>

        {order.publicCode && <Text style={styles.orderCode}># {order.publicCode}</Text>}
        <Text style={styles.date}>{formatDate(order.createdAt, lang)}</Text>

        {order.deliveryDateText && (
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>{t('mobile.orders.delivery', 'Consegna')}: {order.deliveryDateText}</Text>
          </View>
        )}
        {order.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        )}
      </View>

      {/* Articoli */}
      <Text style={styles.sectionTitle}>{t('mobile.orders.articles', 'Articoli')} ({order.items.length})</Text>
      <View style={styles.itemsCard}>
        {order.items.map((item, idx) => (
          <View key={item.id} style={[styles.itemRow, idx < order.items.length - 1 && styles.itemBorder]}>
            <View style={styles.itemLeft}>
              <Text style={styles.itemName}>{item.productName}</Text>
              <Text style={styles.itemCode}>{item.productCode}{item.productUom ? ` · ${item.productUom}` : ''}</Text>
              {item.itemNote && <Text style={styles.itemNote}>{item.itemNote}</Text>}
            </View>
            <View style={styles.itemRight}>
              <Text style={styles.itemQty}>× {item.quantity}</Text>
              <Text style={styles.itemTotal}>{formatPrice(item.totalLineCents, order.currency)}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Totale */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>{t('mobile.orders.orderTotal', 'Totale ordine')}</Text>
        <Text style={styles.totalAmount}>{formatPrice(order.totalCents, order.currency)}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content:   { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: COLORS.error },

  headerCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  headerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  supplierName: { fontSize: 18, fontWeight: '800', color: COLORS.text, flex: 1, marginRight: SPACING.sm },
  statusBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  statusText:   { fontSize: 12, fontWeight: '700' },
  orderCode:    { fontSize: 13, color: COLORS.textSecondary, marginBottom: 2 },
  date:         { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  infoRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText:     { fontSize: 13, color: COLORS.textSecondary },
  notesBox:     { marginTop: SPACING.sm, backgroundColor: COLORS.background, borderRadius: RADIUS.sm, padding: SPACING.sm },
  notesText:    { fontSize: 13, color: COLORS.text },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },

  itemsCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  itemRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: SPACING.md },
  itemBorder:{ borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemLeft:  { flex: 1, marginRight: SPACING.sm },
  itemName:  { fontSize: 14, fontWeight: '600', color: COLORS.text },
  itemCode:  { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  itemNote:  { fontSize: 12, color: COLORS.accent, fontStyle: 'italic', marginTop: 2 },
  itemRight: { alignItems: 'flex-end' },
  itemQty:   { fontSize: 13, color: COLORS.textSecondary },
  itemTotal: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginTop: 2 },

  totalCard: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    padding: SPACING.md, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  totalLabel:  { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  totalAmount: { fontSize: 22, fontWeight: '900', color: COLORS.white },
});
