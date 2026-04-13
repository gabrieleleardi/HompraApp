import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation }     from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons }          from '@expo/vector-icons';
import { getOrders }         from '@/api/orders';
import { COLORS, SPACING, RADIUS } from '@/constants';
import type { Order } from '@/types';
import type { RootStackParamList } from '@/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function formatPrice(cents: number, currency = 'CHF') {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
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

function OrderCard({ order, onPress }: { order: Order; onPress: () => void }) {
  const status = STATUS_CONFIG[order.status] ?? { label: order.status, color: COLORS.textSecondary, icon: 'help-outline' };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.supplierName}>{order.supplier.name}</Text>
          {order.publicCode && <Text style={styles.orderCode}># {order.publicCode}</Text>}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${status.color}18` }]}>
          <Ionicons name={status.icon as any} size={13} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
        <View style={styles.right}>
          <Text style={styles.itemCount}>{order.items.length} art.</Text>
          <Text style={styles.total}>{formatPrice(order.totalCents, order.currency)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function OrdersScreen() {
  const navigation  = useNavigation<Nav>();
  const [orders,    setOrders]    = useState<Order[]>([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [loading,   setLoading]   = useState(false);
  const [refreshing,setRefreshing]= useState(false);
  const [error,     setError]     = useState('');

  const load = useCallback(async (reset = false) => {
    setLoading(true);
    setError('');
    try {
      const currentPage = reset ? 1 : page;
      const data = await getOrders(currentPage);
      setOrders((prev) => reset ? data.orders : [...prev, ...data.orders]);
      setTotal(data.total);
      if (reset) setPage(1);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Errore caricamento ordini.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page]);

  useEffect(() => { load(true); }, []);

  function loadMore() {
    if (orders.length < total && !loading) {
      setPage((p) => p + 1);
      load(false);
    }
  }

  return (
    <FlatList
      data={orders}
      keyExtractor={(o) => o.id}
      renderItem={({ item }) =>
        <OrderCard
          order={item}
          onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
        />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(true); }}
          tintColor={COLORS.primary}
        />
      }
      contentContainerStyle={orders.length === 0 ? styles.emptyContainer : { padding: SPACING.md, gap: SPACING.sm }}
      ListEmptyComponent={
        loading ? null : (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyTitle}>{error || 'Nessun ordine'}</Text>
            <Text style={styles.emptySubtitle}>I tuoi ordini appariranno qui</Text>
          </View>
        )
      }
      ListFooterComponent={loading ? <ActivityIndicator color={COLORS.primary} style={{ padding: SPACING.md }} /> : null}
    />
  );
}

const styles = StyleSheet.create({
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState:     { alignItems: 'center', gap: SPACING.sm },
  emptyTitle:     { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySubtitle:  { fontSize: 14, color: COLORS.textSecondary },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md,
  },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  cardLeft:     { flex: 1, marginRight: SPACING.sm },
  supplierName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  orderCode:    { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
  statusText:  { fontSize: 12, fontWeight: '600' },

  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date:       { fontSize: 13, color: COLORS.textSecondary },
  right:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemCount:  { fontSize: 13, color: COLORS.textSecondary },
  total:      { fontSize: 16, fontWeight: '800', color: COLORS.primary },
});
