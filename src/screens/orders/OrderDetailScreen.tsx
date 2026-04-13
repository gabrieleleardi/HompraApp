import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getOrder }  from '@/api/orders';
import { COLORS, SPACING, RADIUS } from '@/constants';
import type { Order } from '@/types';
import type { RootStackParamList } from '@/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderDetail'>;

function formatPrice(cents: number, currency = 'CHF') {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  PENDING:   { label: 'In attesa',   color: '#d97706', icon: 'time-outline' },
  CONFIRMED: { label: 'Confermato',  color: COLORS.success, icon: 'checkmark-circle-outline' },
  SHIPPED:   { label: 'Spedito',     color: '#4338ca', icon: 'bicycle-outline' },
  DELIVERED: { label: 'Consegnato',  color: COLORS.primary, icon: 'checkmark-done-outline' },
  CANCELLED: { label: 'Annullato',   color: COLORS.textSecondary, icon: 'close-circle-outline' },
  DRAFT:     { label: 'Bozza',       color: COLORS.textSecondary, icon: 'document-outline' },
  PRE_ORDER: { label: 'Pre-ordine',  color: COLORS.accent, icon: 'calendar-outline' },
};

export default function OrderDetailScreen({ route }: Props) {
  const { orderId } = route.params;
  const [order,   setOrder]   = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await getOrder(orderId);
        setOrder(data);
      } catch (e: any) {
        setError(e?.response?.data?.error ?? 'Errore caricamento ordine.');
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} />;

  if (error || !order) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'Ordine non trovato.'}</Text>
      </View>
    );
  }

  const status = STATUS_CONFIG[order.status] ?? { label: order.status, color: COLORS.textSecondary, icon: 'help-outline' };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text style={styles.supplierName}>{order.supplier.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${status.color}22` }]}>
            <Ionicons name={status.icon as any} size={14} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {order.publicCode && <Text style={styles.orderCode}># {order.publicCode}</Text>}
        <Text style={styles.date}>{formatDate(order.createdAt)}</Text>

        {order.deliveryDateText && (
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>Consegna: {order.deliveryDateText}</Text>
          </View>
        )}
        {order.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        )}
      </View>

      {/* Articoli */}
      <Text style={styles.sectionTitle}>Articoli ({order.items.length})</Text>
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
        <Text style={styles.totalLabel}>Totale ordine</Text>
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
