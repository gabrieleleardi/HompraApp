import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput, ScrollView,
} from 'react-native';
import { useNavigation }     from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons }          from '@expo/vector-icons';
import { getOrders }         from '@/api/orders';
import { useI18n, type Lang } from '@/i18n/I18nContext';
import { COLORS, SPACING, RADIUS } from '@/constants';
import type { Order } from '@/types';
import type { RootStackParamList } from '@/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const LOCALE_MAP: Record<Lang, string> = { it: 'it-IT', fr: 'fr-CH', de: 'de-CH', en: 'en-GB', es: 'es-ES', pt: 'pt-PT' };

function formatPrice(cents: number, currency = 'CHF') {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string, lang: Lang) {
  return new Date(iso).toLocaleDateString(LOCALE_MAP[lang] ?? 'it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

type IoniconsName = keyof typeof Ionicons.glyphMap;

// Config solo per colore e icona; il label viene da dict
const STATUS_VISUAL: Record<string, { color: string; icon: IoniconsName }> = {
  PENDING:   { color: '#d97706',           icon: 'time-outline'            },
  CONFIRMED: { color: COLORS.success,       icon: 'checkmark-circle-outline' },
  SHIPPED:   { color: '#4338ca',           icon: 'bicycle-outline'         },
  DELIVERED: { color: COLORS.primary,       icon: 'checkmark-done-outline'  },
  CANCELLED: { color: COLORS.textSecondary, icon: 'close-circle-outline'    },
  DRAFT:     { color: COLORS.textSecondary, icon: 'document-outline'        },
  PRE_ORDER: { color: COLORS.accent,        icon: 'calendar-outline'        },
};

function OrderCard({ order, onPress }: { order: Order; onPress: () => void }) {
  const { lang, t } = useI18n();
  const visual = STATUS_VISUAL[order.status] ?? { color: COLORS.textSecondary, icon: 'help-outline' as IoniconsName };
  const label  = t(`mobile.orders.status.${order.status}`, order.status);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.supplierName}>{order.supplier.name}</Text>
          {order.publicCode && <Text style={styles.orderCode}># {order.publicCode}</Text>}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${visual.color}18` }]}>
          <Ionicons name={visual.icon} size={13} color={visual.color} />
          <Text style={[styles.statusText, { color: visual.color }]}>{label}</Text>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <Text style={styles.date}>{formatDate(order.createdAt, lang)}</Text>
        <View style={styles.right}>
          <Text style={styles.itemCount}>{order.items.length} {t('mobile.orders.items', 'art.')}</Text>
          <Text style={styles.total}>{formatPrice(order.totalCents, order.currency)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function OrdersScreen() {
  const navigation  = useNavigation<Nav>();
  const { t }       = useI18n();
  const [orders,    setOrders]    = useState<Order[]>([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [loading,   setLoading]   = useState(false);
  const [refreshing,setRefreshing]= useState(false);
  const [error,     setError]     = useState('');

  // Filtri
  const [searchText,     setSearchText]     = useState('');
  const [statusFilter,   setStatusFilter]   = useState('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string | null>(null);

  const STATUS_FILTERS = useMemo(() => [
    { key: 'ALL',       label: t('mobile.orders.all', 'Tutti') },
    { key: 'PENDING',   label: t('mobile.orders.status.PENDING', 'In attesa') },
    { key: 'CONFIRMED', label: t('mobile.orders.status.CONFIRMED', 'Confermato') },
    { key: 'SHIPPED',   label: t('mobile.orders.status.SHIPPED', 'Spedito') },
    { key: 'DELIVERED', label: t('mobile.orders.status.DELIVERED', 'Consegnato') },
    { key: 'CANCELLED', label: t('mobile.orders.status.CANCELLED', 'Annullato') },
    { key: 'PRE_ORDER', label: t('mobile.orders.status.PRE_ORDER', 'Pre-ordine') },
  ], [t]);

  const load = useCallback(async (reset = false) => {
    setLoading(true);
    setError('');
    try {
      const currentPage = reset ? 1 : page;
      const data = await getOrders(currentPage);
      setOrders((prev) => reset ? data.orders : [...prev, ...data.orders]);
      setTotal(data.total);
      if (reset) setPage(1);
    } catch (e) {
      setError((e as any)?.response?.data?.error ?? t('mobile.orders.loadError', 'Errore caricamento ordini.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, t]);

  useEffect(() => { load(true); }, []);

  function loadMore() {
    if (orders.length < total && !loading) {
      setPage((p) => p + 1);
      load(false);
    }
  }

  // Lista fornitori unici per il filtro
  const suppliers = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach(o => map.set(o.supplierId, o.supplier.name));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [orders]);

  // Ordini filtrati
  const filteredOrders = useMemo(() => {
    let result = orders;
    if (statusFilter !== 'ALL') result = result.filter(o => o.status === statusFilter);
    if (supplierFilter)         result = result.filter(o => o.supplierId === supplierFilter);
    if (searchText.trim()) {
      const q = searchText.toLowerCase().trim();
      result = result.filter(o =>
        o.supplier.name.toLowerCase().includes(q) ||
        o.publicCode?.toLowerCase().includes(q) ||
        o.items.some(i => i.productName.toLowerCase().includes(q))
      );
    }
    return result;
  }, [orders, statusFilter, supplierFilter, searchText]);

  const activeFilters = (statusFilter !== 'ALL' ? 1 : 0) + (supplierFilter ? 1 : 0) + (searchText.trim() ? 1 : 0);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Barra ricerca */}
      <View style={styles.searchBar}>
        <View style={styles.searchInput}>
          <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchTextInput}
            placeholder={t('mobile.orders.searchPh', 'Cerca ordine, fornitore, prodotto...')}
            placeholderTextColor={COLORS.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filtri stato */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={styles.filtersRow}
      >
        {STATUS_FILTERS.map(f => {
          const active = statusFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setStatusFilter(active ? 'ALL' : f.key)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Filtro fornitore (se ci sono più fornitori) */}
      {suppliers.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={styles.filtersRow}
        >
          {suppliers.map(s => {
            const active = supplierFilter === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.filterChip, active && styles.filterChipActiveSecondary]}
                onPress={() => setSupplierFilter(active ? null : s.id)}
              >
                <Ionicons
                  name="storefront-outline"
                  size={12}
                  color={active ? '#fff' : COLORS.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {s.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Contatore risultati quando ci sono filtri attivi */}
      {activeFilters > 0 && (
        <View style={styles.resultCount}>
          <Text style={styles.resultCountText}>
            {filteredOrders.length} {filteredOrders.length === 1
              ? t('mobile.orders.found1', 'ordine trovato')
              : t('mobile.orders.foundN', 'ordini trovati')}
          </Text>
          <TouchableOpacity onPress={() => { setStatusFilter('ALL'); setSupplierFilter(null); setSearchText(''); }}>
            <Text style={styles.clearFilters}>{t('mobile.orders.clearFilters', 'Pulisci filtri')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Lista ordini */}
      <FlatList
        data={filteredOrders}
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
        contentContainerStyle={filteredOrders.length === 0 ? styles.emptyContainer : { padding: SPACING.md, gap: SPACING.sm }}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color={COLORS.border} />
              <Text style={styles.emptyTitle}>
                {error || (activeFilters > 0
                  ? t('mobile.orders.noFilterResults', 'Nessun ordine trovato')
                  : t('mobile.orders.empty', 'Nessun ordine'))}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeFilters > 0
                  ? t('mobile.orders.tryChangeFilters', 'Prova a cambiare i filtri')
                  : t('mobile.orders.emptySub', 'I tuoi ordini appariranno qui')}
              </Text>
            </View>
          )
        }
        ListFooterComponent={loading ? <ActivityIndicator color={COLORS.primary} style={{ padding: SPACING.md }} /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState:     { alignItems: 'center', gap: SPACING.sm },
  emptyTitle:     { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySubtitle:  { fontSize: 14, color: COLORS.textSecondary },

  // Ricerca
  searchBar: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    height: 42,
    gap: 8,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: 0,
  },

  // Filtri
  filtersRow: {
    paddingLeft: SPACING.md,
    paddingRight: SPACING.xl,
    paddingVertical: SPACING.sm,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 34,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipActiveSecondary: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  filterChipText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: '#fff',
  },

  // Contatore risultati
  resultCount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  resultCountText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  clearFilters: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '700',
  },

  // Card
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
