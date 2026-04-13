import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, RefreshControl, TextInput, Image, Switch, Modal,
} from 'react-native';
import { Ionicons }        from '@expo/vector-icons';
import { useCart }         from '@/context/CartContext';
import { checkout }        from '@/api/orders';
import { getErrorMessage } from '@/api/client';
import { COLORS, SPACING, RADIUS } from '@/constants';
import type { Cart, CartItem, Availability } from '@/types';

// ─── helpers ────────────────────────────────────────────────────────────────
function fmt(cents: number, currency = 'CHF') {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

const AVAIL_GROUPS: { key: Availability | 'WEEKLY_RESTOCK'; label: string }[] = [
  { key: 'AVAILABLE',      label: 'PRONTA CONSEGNA'       },
  { key: 'COMING_SOON',    label: 'PRE-ORDINE (IN ARRIVO)'},
  { key: 'WEEKLY_RESTOCK', label: 'RIASSORTIMENTO'        },
  { key: 'ON_ORDER',       label: 'SU ORDINAZIONE'        },
];

function availDot(a?: Availability) {
  const color = a === 'AVAILABLE' ? '#22c55e' : a === 'COMING_SOON' || a === 'WEEKLY_RESTOCK' ? '#f59e0b' : '#ef4444';
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

// ─── CartItemRow ─────────────────────────────────────────────────────────────
function CartItemRow({ item, supplierId }: { item: CartItem; supplierId: string }) {
  const { updateItem } = useCart();
  const price = item.product.customerPriceCents ?? item.product.priceCents;
  const subtotal = price * item.quantity;

  function handleRemove() {
    Alert.alert('Rimuovi articolo', `Rimuovere "${item.product.name}" dal carrello?`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Rimuovi', style: 'destructive', onPress: () => updateItem(item.productId, supplierId, 0) },
    ]);
  }

  return (
    <View style={styles.itemRow}>
      {/* thumb + info */}
      <View style={styles.itemTop}>
        <View style={styles.itemThumb}>
          {item.product.imageUrl
            ? <Image source={{ uri: item.product.imageUrl }} style={styles.itemThumbImg} resizeMode="contain" />
            : <Ionicons name="cube-outline" size={22} color={COLORS.textSecondary} />}
        </View>

        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={3}>{item.product.name}</Text>
          <Text style={styles.itemCode}>Codice: {item.product.code}</Text>
          <View style={styles.itemPriceRow}>
            <Text style={styles.itemUnitPrice}>
              {fmt(price, item.product.currency)} / {item.product.uom ?? 'PZ'}
            </Text>
            {item.product.customerPriceCents != null && (
              <View style={styles.dedicatoBadge}>
                <Text style={styles.dedicatoText}>PREZZO DEDICATO</Text>
              </View>
            )}
          </View>
        </View>

        {/* subtotale */}
        <View style={styles.itemSubtotal}>
          <Text style={styles.subtotalLabel}>SUBTOTALE</Text>
          <Text style={styles.subtotalValue}>{fmt(subtotal, item.product.currency)}</Text>
        </View>
      </View>

      {/* Q.TÀ + Rimuovi */}
      <View style={styles.itemBottom}>
        <View style={styles.qtyRow}>
          <Text style={styles.qtyLabel}>Q.TÀ</Text>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => updateItem(item.productId, supplierId, Math.max(0, item.quantity - 1))}
          >
            <Ionicons name="remove" size={14} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.qtyValue}>{item.quantity}</Text>
          <TouchableOpacity
            style={[styles.qtyBtn, styles.qtyBtnAdd]}
            onPress={() => updateItem(item.productId, supplierId, item.quantity + 1)}
          >
            <Ionicons name="add" size={14} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }} />

        <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
          <Text style={styles.removeBtnText}>Rimuovi</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── DatePickerModal ──────────────────────────────────────────────────────────
const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                   'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const DAYS_HDR  = ['Lu','Ma','Me','Gi','Ve','Sa','Do'];

function DatePickerModal({ visible, value, onConfirm, onDismiss }: {
  visible:   boolean;
  value:     Date | null;
  onConfirm: (d: Date) => void;
  onDismiss: () => void;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState(() => value ?? today);
  const [selected, setSelected] = useState<Date | null>(value);

  useEffect(() => { if (visible) { setCursor(value ?? today); setSelected(value); } }, [visible]);

  const year  = cursor.getFullYear();
  const month = cursor.getMonth();

  function prevMonth() { setCursor(new Date(year, month - 1, 1)); }
  function nextMonth() { setCursor(new Date(year, month + 1, 1)); }

  // Build calendar grid — first weekday of month (Mon=0)
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mon-based
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete rows
  while (cells.length % 7 !== 0) cells.push(null);

  function isToday(d: number) {
    return year === today.getFullYear() && month === today.getMonth() && d === today.getDate();
  }
  function isSel(d: number) {
    return selected?.getFullYear() === year && selected?.getMonth() === month && selected?.getDate() === d;
  }
  function isPast(d: number) {
    const dt = new Date(year, month, d);
    dt.setHours(0,0,0,0); today.setHours(0,0,0,0);
    return dt < today;
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <TouchableOpacity style={dpStyles.overlay} activeOpacity={1} onPress={onDismiss} />
      <View style={dpStyles.sheet}>
        {/* Title */}
        <View style={dpStyles.sheetHeader}>
          <Text style={dpStyles.sheetTitle}>Data di Consegna</Text>
          <TouchableOpacity onPress={onDismiss}>
            <Ionicons name="close" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Month nav */}
        <View style={dpStyles.monthNav}>
          <TouchableOpacity style={dpStyles.navBtn} onPress={prevMonth}>
            <Ionicons name="chevron-back" size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={dpStyles.monthLabel}>{MONTHS_IT[month]} {year}</Text>
          <TouchableOpacity style={dpStyles.navBtn} onPress={nextMonth}>
            <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Day-of-week headers */}
        <View style={dpStyles.dowRow}>
          {DAYS_HDR.map(d => <Text key={d} style={dpStyles.dowCell}>{d}</Text>)}
        </View>

        {/* Day cells */}
        <View style={dpStyles.grid}>
          {cells.map((d, idx) => {
            if (!d) return <View key={`e${idx}`} style={dpStyles.cell} />;
            const past = isPast(d);
            const sel  = isSel(d);
            const tod  = isToday(d);
            return (
              <TouchableOpacity
                key={`d${idx}`}
                style={[dpStyles.cell, sel && dpStyles.cellSel, !sel && tod && dpStyles.cellToday]}
                onPress={() => !past && setSelected(new Date(year, month, d))}
                disabled={past}
                activeOpacity={0.7}
              >
                <Text style={[dpStyles.cellText, past && dpStyles.cellPast, sel && dpStyles.cellTextSel]}>{d}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Confirm */}
        <TouchableOpacity
          style={[dpStyles.confirmBtn, !selected && dpStyles.confirmBtnDisabled]}
          disabled={!selected}
          onPress={() => selected && onConfirm(selected)}
        >
          <Text style={dpStyles.confirmBtnText}>
            {selected
              ? `Conferma – ${selected.getDate().toString().padStart(2,'0')}/${(selected.getMonth()+1).toString().padStart(2,'0')}/${selected.getFullYear()}`
              : 'Seleziona una data'}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const dpStyles = StyleSheet.create({
  overlay:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: SPACING.md, paddingBottom: 36,
  },
  sheetHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle:   { fontSize: 16, fontWeight: '700', color: COLORS.text },
  monthNav:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn:       { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  monthLabel:   { fontSize: 15, fontWeight: '700', color: COLORS.text },
  dowRow:       { flexDirection: 'row', marginBottom: 4 },
  dowCell:      { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, paddingVertical: 4 },
  grid:         { flexDirection: 'row', flexWrap: 'wrap' },
  cell:         { width: `${100 / 7}%`, aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  cellSel:      { backgroundColor: '#163a5f', borderRadius: 100 },
  cellToday:    { borderWidth: 1.5, borderColor: '#163a5f', borderRadius: 100 },
  cellText:     { fontSize: 14, color: COLORS.text },
  cellTextSel:  { color: '#fff', fontWeight: '700' },
  cellPast:     { color: COLORS.border },
  confirmBtn: {
    marginTop: 14, backgroundColor: '#163a5f', borderRadius: RADIUS.md,
    paddingVertical: 14, alignItems: 'center',
  },
  confirmBtnDisabled: { backgroundColor: COLORS.textSecondary },
  confirmBtnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },
});

// ─── CartCard ────────────────────────────────────────────────────────────────
function CartCard({ cart }: { cart: Cart }) {
  const { clearSupplierCart, fetchCarts } = useCart();

  // Checkout state
  const [deliveryDate,    setDeliveryDate]    = useState<Date | null>(null);
  const [showDatePicker,  setShowDatePicker]  = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('Sede Principale');
  const [orderNote,       setOrderNote]       = useState('');
  const [acceptShipping,  setAcceptShipping]  = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');
  const [success,         setSuccess]         = useState(false);

  const deliveryDateStr = deliveryDate
    ? `${deliveryDate.getDate().toString().padStart(2,'0')}/${(deliveryDate.getMonth()+1).toString().padStart(2,'0')}/${deliveryDate.getFullYear()}`
    : '';

  // Calcoli (mock IVA 2.6%, shipping CHF 10 se sotto minimo)
  const MIN_ORDER   = 10000; // 100.00 CHF in cents
  const SHIPPING    = 1000;  // 10.00 CHF
  const netto       = cart.totalCents;
  const ivaRate     = 0.026;
  const iva         = Math.round(netto * ivaRate);
  const belowMin    = netto < MIN_ORDER;
  const shipping    = belowMin ? SHIPPING : 0;
  const total       = netto + iva + shipping;

  // Raggruppamento per disponibilità
  const grouped = AVAIL_GROUPS.map(g => ({
    label: g.label,
    key:   g.key,
    items: cart.items.filter(i => (i.product.availability ?? 'AVAILABLE') === g.key),
  })).filter(g => g.items.length > 0);

  async function handleCheckout() {
    if (belowMin && !acceptShipping) { setError('Accetta le spese di consegna per procedere.'); return; }
    setLoading(true); setError('');
    try {
      await checkout({ supplierId: cart.supplierId, notes: orderNote, deliveryDate: deliveryDateStr || undefined });
      setSuccess(true);
      await fetchCarts();
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setLoading(false); }
  }

  if (success) {
    return (
      <View style={[styles.card, { alignItems: 'center', padding: SPACING.xl, gap: SPACING.sm }]}>
        <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
        <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.success }}>
          Ordine inviato a {cart.supplier.name}!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* ── Header fornitore ── */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          {cart.supplier.shopLogoUrl || cart.supplier.imageUrl ? (
            <Image
              source={{ uri: cart.supplier.shopLogoUrl ?? cart.supplier.imageUrl! }}
              style={styles.supplierLogo}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.supplierLogoFallback, { backgroundColor: cart.supplier.logoBgColor ?? COLORS.primary }]}>
              <Text style={styles.supplierLogoFallbackText}>{cart.supplier.name.charAt(0)}</Text>
            </View>
          )}
          <Text style={styles.supplierName}>{cart.supplier.name}</Text>
        </View>
        <TouchableOpacity style={styles.svuotaBtn} onPress={() =>
          Alert.alert('Svuota carrello', `Rimuovere tutti gli articoli da ${cart.supplier.name}?`, [
            { text: 'Annulla', style: 'cancel' },
            { text: 'Svuota', style: 'destructive', onPress: () => clearSupplierCart(cart.supplierId) },
          ])
        }>
          <Ionicons name="trash-outline" size={14} color={COLORS.error} />
          <Text style={styles.svuotaText}>Svuota Carrello</Text>
        </TouchableOpacity>
      </View>

      {/* ── Articoli raggruppati per disponibilità ── */}
      {grouped.map(group => (
        <View key={group.key}>
          <View style={styles.groupHeader}>
            {availDot(group.key as Availability)}
            <Text style={styles.groupLabel}>{group.label}</Text>
          </View>
          {group.items.map(item => (
            <CartItemRow key={item.id} item={item} supplierId={cart.supplierId} />
          ))}
        </View>
      ))}

      {/* ── Riepilogo importi ── */}
      <View style={styles.summarySection}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Totale Merce (Netto):</Text>
          <Text style={styles.summaryValue}>{fmt(netto)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.ivaBadge}>
            <Text style={styles.ivaText}>IVA 2.6% (su {fmt(netto)})</Text>
          </View>
          <Text style={styles.summaryValue}>+ {fmt(iva)}</Text>
        </View>
        {shipping > 0 && (
          <View style={styles.summaryRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="car-outline" size={13} color={COLORS.error} />
              <Text style={[styles.summaryLabel, { color: COLORS.error }]}>Spese Consegna:</Text>
            </View>
            <Text style={[styles.summaryValue, { color: COLORS.error }]}>{fmt(shipping)}</Text>
          </View>
        )}
        <View style={[styles.summaryRow, { marginTop: 4 }]}>
          <Text style={styles.totalLabel}>Totale Ordine</Text>
          <Text style={styles.totalValue}>{fmt(total)}</Text>
        </View>
      </View>

      {/* ── Sede di consegna ── */}
      <View style={styles.checkoutSection}>
        <Text style={styles.checkoutSectionLabel}>SEDE DI CONSEGNA</Text>
        <TouchableOpacity style={styles.selectRow}>
          <Text style={styles.selectValue}>{deliveryAddress}</Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <Text style={[styles.checkoutSectionLabel, { marginTop: SPACING.md }]}>DATA DI CONSEGNA RICHIESTA</Text>
        <TouchableOpacity style={styles.selectRow} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={16} color={deliveryDate ? COLORS.primary : COLORS.textSecondary} />
          <Text style={[styles.selectValue, !deliveryDate && { color: COLORS.textSecondary }]}>
            {deliveryDateStr || 'Seleziona data di consegna'}
          </Text>
          <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <Text style={[styles.checkoutSectionLabel, { marginTop: SPACING.md }]}>NOTE ORDINE</Text>
        <TextInput
          style={styles.orderNoteInput}
          placeholder="Note per il fornitore..."
          placeholderTextColor={COLORS.textSecondary}
          value={orderNote}
          onChangeText={setOrderNote}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* ── Warning minimo ordine ── */}
      {belowMin && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Minimo d'ordine: <Text style={{ fontWeight: '700' }}>{fmt(MIN_ORDER)}</Text>.{'\n'}
            Mancano <Text style={{ fontWeight: '700' }}>{fmt(MIN_ORDER - netto)}</Text> per la spedizione gratuita.
          </Text>
          <View style={styles.acceptRow}>
            <Switch
              value={acceptShipping}
              onValueChange={setAcceptShipping}
              trackColor={{ false: '#fecaca', true: COLORS.primary }}
              thumbColor={acceptShipping ? '#fff' : '#f4f4f4'}
            />
            <Text style={styles.acceptText}>
              Accetto l'addebito di <Text style={{ fontWeight: '700' }}>{fmt(SHIPPING)}</Text> per le spese di consegna e confermo l'invio dell'ordine.
            </Text>
          </View>
        </View>
      )}

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* ── Bottone conferma ── */}
      <View style={styles.submitWrap}>
        <TouchableOpacity
          style={[styles.submitBtn, (loading || (belowMin && !acceptShipping)) && styles.submitBtnDisabled]}
          onPress={handleCheckout}
          disabled={loading || (belowMin && !acceptShipping)}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitBtnText}>
                {belowMin && !acceptShipping ? 'Accetta le spese per procedere' : 'Invia Ordine'}
              </Text>
          }
        </TouchableOpacity>
      </View>

      {/* ── Date picker ── */}
      <DatePickerModal
        visible={showDatePicker}
        value={deliveryDate}
        onConfirm={d => { setDeliveryDate(d); setShowDatePicker(false); }}
        onDismiss={() => setShowDatePicker(false)}
      />
    </View>
  );
}

// ─── CartScreen ──────────────────────────────────────────────────────────────
export default function CartScreen() {
  const { carts, isLoading, fetchCarts } = useCart();

  useEffect(() => { fetchCarts(); }, []);

  if (isLoading && carts.length === 0) {
    return <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={carts.length === 0 ? styles.emptyContainer : { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchCarts} tintColor={COLORS.primary} />}
    >
      {carts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={64} color={COLORS.border} />
          <Text style={styles.emptyTitle}>Carrello vuoto</Text>
          <Text style={styles.emptySubtitle}>Aggiungi prodotti dal catalogo</Text>
        </View>
      ) : (
        carts.map(cart => <CartCard key={cart.id} cart={cart} />)
      )}
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.background },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState:     { alignItems: 'center', gap: SPACING.sm },
  emptyTitle:     { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySubtitle:  { fontSize: 14, color: COLORS.textSecondary },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
  },

  // Header
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  supplierLogo: { width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  supplierLogoFallback: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  supplierLogoFallbackText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  supplierName: { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1 },
  svuotaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 7, borderWidth: 1, borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  svuotaText: { fontSize: 12, fontWeight: '600', color: COLORS.error },

  // Group
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  groupLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 0.6, textTransform: 'uppercase' },
  dot: { width: 8, height: 8, borderRadius: 4 },

  // Item row
  itemRow: {
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  itemTop: { flexDirection: 'row', gap: 10 },
  itemThumb: {
    width: 56, height: 56, borderRadius: 8,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexShrink: 0,
  },
  itemThumbImg: { width: '100%', height: '100%' },
  itemInfo: { flex: 1, gap: 2 },
  itemName: { fontSize: 13, fontWeight: '600', color: COLORS.text, lineHeight: 18 },
  itemCode: { fontSize: 11, color: COLORS.textSecondary },
  itemPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' },
  itemUnitPrice: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  dedicatoBadge: { backgroundColor: '#dcfce7', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  dedicatoText:  { fontSize: 9, fontWeight: '800', color: '#16a34a', letterSpacing: 0.4 },
  itemSubtotal: { alignItems: 'flex-end', gap: 2, flexShrink: 0 },
  subtotalLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase' },
  subtotalValue: { fontSize: 14, fontWeight: '700', color: COLORS.primary },

  itemBottom: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  qtyRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyLabel:  { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase', marginRight: 4 },
  qtyBtn:    { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  qtyBtnAdd: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  qtyValue:  { fontSize: 14, fontWeight: '700', color: COLORS.text, minWidth: 20, textAlign: 'center' },
  removeBtn:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  removeBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },

  // Summary
  summarySection: {
    padding: SPACING.md, gap: 8,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  summaryRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 13, color: COLORS.textSecondary },
  summaryValue: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  ivaBadge:     { backgroundColor: `${COLORS.border}88`, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  ivaText:      { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },
  totalLabel:   { fontSize: 14, fontWeight: '700', color: COLORS.text },
  totalValue:   { fontSize: 22, fontWeight: '900', color: COLORS.primary, letterSpacing: -0.5 },

  // Checkout
  checkoutSection: { padding: SPACING.md, gap: 4, borderTopWidth: 1, borderTopColor: COLORS.border },
  checkoutSectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 5 },
  selectRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: COLORS.surface, gap: 6,
  },
  selectValue: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '500' },
  orderNoteInput: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: COLORS.text, backgroundColor: COLORS.surface,
    minHeight: 72, textAlignVertical: 'top',
  },

  // Warning minimo
  warningBox: {
    margin: SPACING.md, padding: SPACING.md,
    backgroundColor: '#fef3c7', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: '#fde68a', gap: 10,
  },
  warningText: { fontSize: 13, color: '#92400e', lineHeight: 18 },
  acceptRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  acceptText:  { flex: 1, fontSize: 12, color: '#78350f', lineHeight: 17 },

  errorBox: { marginHorizontal: SPACING.md, padding: 10, backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' },
  errorText: { fontSize: 13, color: COLORS.error },

  submitWrap: { padding: SPACING.md },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: 14, alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: COLORS.textSecondary },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
