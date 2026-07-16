import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, RefreshControl, TextInput, Image, Switch, Modal,
} from 'react-native';
import { Ionicons }        from '@expo/vector-icons';
import { useCart }         from '@/context/CartContext';
import { checkout }        from '@/api/orders';
import { getErrorMessage } from '@/api/client';
import { useI18n }         from '@/i18n/I18nContext';
import { COLORS, SPACING, RADIUS } from '@/constants';
import type { Cart, CartItem, Availability } from '@/types';
import {
  hasSaleMultiple,
  snapQuantityToMultiple,
  stepUp,
  stepDown,
  formatPackLabel,
} from '@/lib/saleMultiple';
import { useDebouncedQty } from '@/hooks/useDebouncedQty';

// ─── helpers ────────────────────────────────────────────────────────────────
function fmt(cents: number, currency = 'CHF') {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

function availDot(a?: Availability) {
  const color = a === 'AVAILABLE' ? '#22c55e' : a === 'COMING_SOON' || a === 'WEEKLY_RESTOCK' ? '#f59e0b' : '#ef4444';
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

// ─── logica disponibilità (replicata identica dal sito web) ─────────────────
const WEEKDAY_MAP_CART: Record<string, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };
const INDEX_TO_KEY_CART = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

function parseDay(val: any): string | null {
  if (!val) return null;
  const s = String(val).toUpperCase().trim();
  if (s.startsWith('LUN') || s === 'MON') return 'MON';
  if (s.startsWith('MAR') || s === 'TUE') return 'TUE';
  if (s.startsWith('MER') || s === 'WED') return 'WED';
  if (s.startsWith('GIO') || s === 'THU') return 'THU';
  if (s.startsWith('VEN') || s === 'FRI') return 'FRI';
  if (s.startsWith('SAB') || s === 'SAT') return 'SAT';
  if (s.startsWith('DOM') || s === 'SUN') return 'SUN';
  return null;
}

function isProductReady(p: CartItem['product'], targetDate: Date): boolean {
  const now = new Date();

  if (p.availability === 'AVAILABLE') return true;

  if (p.availability === 'WEEKLY_RESTOCK') {
    let rulesObj: any = p.restockRulesJson;
    if (typeof rulesObj === 'string') {
      try { rulesObj = JSON.parse(rulesObj); } catch {}
    }
    const normalizedRules: Record<string, string> = {};
    if (rulesObj) {
      Object.entries(rulesObj).forEach(([k, v]) => {
        const pk = parseDay(k); const pv = parseDay(v);
        if (pk && pv) normalizedRules[pk] = pv;
      });
    }
    const cutoff = p.cutoffTime || '11:00';
    const [cHH, cMM] = cutoff.split(':').map(Number);
    const cutoffToday = new Date(now); cutoffToday.setHours(cHH, cMM, 0, 0);
    let effectiveDayIdx = now.getDay();
    if (now >= cutoffToday) effectiveDayIdx = (effectiveDayIdx + 1) % 7;
    const arrivalDayKey = normalizedRules[INDEX_TO_KEY_CART[effectiveDayIdx]];
    if (arrivalDayKey) {
      const arrivalDayIdx = WEEKDAY_MAP_CART[arrivalDayKey];
      if (arrivalDayIdx !== undefined) {
        const arrivalDate = new Date(now);
        if (now >= cutoffToday) arrivalDate.setDate(arrivalDate.getDate() + 1);
        let safety = 0;
        while (arrivalDate.getDay() !== arrivalDayIdx && safety < 8) {
          arrivalDate.setDate(arrivalDate.getDate() + 1); safety++;
        }
        arrivalDate.setHours(0, 0, 0, 0);
        return targetDate >= arrivalDate;
      }
    }
    return false;
  }

  if (p.availability === 'ON_ORDER') {
    const leadDays = p.leadTimeDays ? Number(p.leadTimeDays) : 0;
    const arrivalDate = new Date(now);
    arrivalDate.setDate(arrivalDate.getDate() + leadDays);
    arrivalDate.setHours(0, 0, 0, 0);
    return targetDate >= arrivalDate;
  }

  if (p.availability === 'COMING_SOON' && p.expectedArrival) {
    const arrivalDate = new Date(p.expectedArrival);
    arrivalDate.setHours(0, 0, 0, 0);
    return targetDate >= arrivalDate;
  }

  return false;
}

// ─── CartItemRow ─────────────────────────────────────────────────────────────
function CartItemRow({ item, supplierId, catalogDiscountPercent = 0 }: {
  item: CartItem; supplierId: string; catalogDiscountPercent?: number;
}) {
  const { updateItem } = useCart();
  const { t } = useI18n();
  const basePrice = item.product.customerPriceCents ?? item.product.priceCents;
  // Applica sconto catalogo solo se il prodotto non ha prezzo dedicato
  const hasCatDisc = catalogDiscountPercent > 0 && item.product.customerPriceCents == null;
  const catDiscAmount = hasCatDisc ? Math.round(basePrice * catalogDiscountPercent / 100) : 0;
  const price = basePrice - catDiscAmount;

  // P1.2 · optimistic update + debounce 350ms (porting commit web 45b97702)
  const { qty: localQty, flushSoon, flushNow } = useDebouncedQty(
    item.quantity,
    (n) => updateItem(item.productId, supplierId, n),
  );
  const subtotal = price * localQty;

  // Editing locale della quantità: l'utente può digitare il numero a mano.
  const [editing, setEditing] = useState(false);
  const [qtyText, setQtyText] = useState(String(item.quantity));
  useEffect(() => {
    if (!editing) setQtyText(String(localQty));
  }, [localQty, editing]);

  function commitQty() {
    setEditing(false);
    const parsed = parseInt(qtyText, 10);
    const raw = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    // F-18 · snap floor sul saleMultiple
    const next = snapQuantityToMultiple(raw, item.product.saleMultiple);
    setQtyText(String(next));
    if (next !== localQty) flushNow(next);
  }

  function handleRemove() {
    const title   = t('mobile.cart.removeItem', 'Rimuovi articolo');
    const confirm = t('mobile.cart.removeConfirm', 'Rimuovere "{{name}}" dal carrello?')
      .replace('{{name}}', item.product.name);
    Alert.alert(title, confirm, [
      { text: t('mobile.cart.cancel', 'Annulla'), style: 'cancel' },
      { text: t('mobile.cart.remove', 'Rimuovi'), style: 'destructive', onPress: () => flushNow(0) },
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
          <Text style={styles.itemCode}>{t('mobile.cart.code', 'Codice')}: {item.product.code}</Text>
          <View style={styles.itemPriceRow}>
            <Text style={styles.itemUnitPrice}>
              {fmt(price, item.product.currency)} / {item.product.uom ?? 'PZ'}
            </Text>
            {item.product.customerPriceCents != null && (
              <View style={styles.dedicatoBadge}>
                <Text style={styles.dedicatoText}>PREZZO DEDICATO</Text>
              </View>
            )}
            {/* F-18 · chip "cartone N PZ" */}
            {hasSaleMultiple(item.product.saleMultiple) && (
              <View style={styles.packBadge}>
                <Text style={styles.packBadgeText}>
                  {formatPackLabel(item.product.saleMultiple, item.product.uom)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* subtotale */}
        <View style={styles.itemSubtotal}>
          <Text style={styles.subtotalLabel}>{t('mobile.cart.subtotal', 'SUBTOTALE')}</Text>
          <Text style={styles.subtotalValue}>{fmt(subtotal, item.product.currency)}</Text>
        </View>
      </View>

      {/* Q.TÀ + Rimuovi */}
      <View style={styles.itemBottom}>
        <View style={styles.qtyRow}>
          <Text style={styles.qtyLabel}>{t('mobile.cart.qty', 'Q.TÀ')}</Text>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => flushSoon(stepDown(localQty, item.product.saleMultiple))}
          >
            <Ionicons name="remove" size={14} color={COLORS.primary} />
          </TouchableOpacity>
          <TextInput
            style={styles.qtyInput}
            value={qtyText}
            onChangeText={(v) => setQtyText(v.replace(/[^0-9]/g, ''))}
            onFocus={() => setEditing(true)}
            onBlur={commitQty}
            onSubmitEditing={commitQty}
            keyboardType="number-pad"
            returnKeyType="done"
            selectTextOnFocus
            maxLength={5}
          />
          <TouchableOpacity
            style={[styles.qtyBtn, styles.qtyBtnAdd]}
            onPress={() => flushSoon(stepUp(localQty, item.product.saleMultiple))}
          >
            <Ionicons name="add" size={14} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }} />

        <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
          <Text style={styles.removeBtnText}>{t('mobile.cart.remove', 'Rimuovi')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── DatePickerModal ──────────────────────────────────────────────────────────
const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                   'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const DAYS_HDR  = ['Lu','Ma','Me','Gi','Ve','Sa','Do'];

const WEEKDAY_MAP: Record<string, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };
const WEEKDAY_REVERSE = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

function DatePickerModal({ visible, value, onConfirm, onDismiss, deliveryRules }: {
  visible:        boolean;
  value:          Date | null;
  onConfirm:      (d: Date) => void;
  onDismiss:      () => void;
  deliveryRules?: { weekday: string; cutoffDay?: string | null; cutoffTime?: string | null; cutoffDaysBefore?: number | null }[];
}) {
  const { t, dict } = useI18n();
  const MONTHS = (dict?.mobile?.cart?.datePicker?.months as string[]) || MONTHS_IT;
  const DAYS   = (dict?.mobile?.cart?.datePicker?.daysHdr as string[]) || DAYS_HDR;
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

  // Logica di validazione date con delivery rules (stessa del sito web)
  function isAllowed(d: number) {
    const dt = new Date(year, month, d);
    const now = new Date();
    const dayOfWeek = dt.getDay();
    const dayStr = WEEKDAY_REVERSE[dayOfWeek];

    // Se non ci sono regole, permetti Lun-Ven nel futuro
    if (!deliveryRules || deliveryRules.length === 0) {
      dt.setHours(0,0,0,0);
      const todayZero = new Date(); todayZero.setHours(0,0,0,0);
      return dayOfWeek >= 1 && dayOfWeek <= 5 && dt > todayZero;
    }

    // Cerca regola per questo giorno della settimana
    const rule = deliveryRules.find(r => r.weekday === dayStr);
    if (!rule) return false;

    // Cut-off: il giorno da cui parte il cut-off (default: giorno prima della consegna)
    const cutoffDayStr = rule.cutoffDay || WEEKDAY_REVERSE[(dayOfWeek + 6) % 7];
    const cutoffTimeStr = rule.cutoffTime || '15:00';
    const cutoffDayIdx = WEEKDAY_MAP[cutoffDayStr] ?? ((dayOfWeek + 6) % 7);

    // Quanti giorni indietro rispetto alla data di consegna
    let daysAgo = dayOfWeek - cutoffDayIdx;
    if (daysAgo < 0) daysAgo += 7;

    const cutoffDate = new Date(dt);
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
    const [hours, minutes] = cutoffTimeStr.split(':').map(Number);
    cutoffDate.setHours(hours, minutes, 0, 0);

    return now < cutoffDate;
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <TouchableOpacity style={dpStyles.overlay} activeOpacity={1} onPress={onDismiss} />
      <View style={dpStyles.sheet}>
        {/* Title */}
        <View style={dpStyles.sheetHeader}>
          <Text style={dpStyles.sheetTitle}>{t('mobile.cart.datePicker.title', 'Data di Consegna')}</Text>
          <TouchableOpacity onPress={onDismiss}>
            <Ionicons name="close" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Month nav */}
        <View style={dpStyles.monthNav}>
          <TouchableOpacity style={dpStyles.navBtn} onPress={prevMonth}>
            <Ionicons name="chevron-back" size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={dpStyles.monthLabel}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity style={dpStyles.navBtn} onPress={nextMonth}>
            <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Day-of-week headers */}
        <View style={dpStyles.dowRow}>
          {DAYS.map((d, i) => <Text key={`${d}-${i}`} style={dpStyles.dowCell}>{d}</Text>)}
        </View>

        {/* Day cells */}
        <View style={dpStyles.grid}>
          {cells.map((d, idx) => {
            if (!d) return <View key={`e${idx}`} style={dpStyles.cell} />;
            const allowed = isAllowed(d);
            const sel  = isSel(d);
            const tod  = isToday(d);
            return (
              <TouchableOpacity
                key={`d${idx}`}
                style={[dpStyles.cell, sel && dpStyles.cellSel, !sel && tod && dpStyles.cellToday]}
                onPress={() => allowed && setSelected(new Date(year, month, d))}
                disabled={!allowed}
                activeOpacity={0.7}
              >
                <Text style={[dpStyles.cellText, !allowed && dpStyles.cellPast, sel && dpStyles.cellTextSel]}>{d}</Text>
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
              ? `${t('mobile.cart.datePicker.confirm', 'Conferma')} – ${selected.getDate().toString().padStart(2,'0')}/${(selected.getMonth()+1).toString().padStart(2,'0')}/${selected.getFullYear()}`
              : t('mobile.cart.datePicker.selectDate', 'Seleziona una data')}
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
  const { t } = useI18n();

  // Checkout state
  const [deliveryDate,    setDeliveryDate]    = useState<Date | null>(null);
  const [showDatePicker,  setShowDatePicker]  = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState(t('mobile.cart.mainAddress', 'Sede Principale'));
  const [orderNote,       setOrderNote]       = useState('');
  const [acceptShipping,  setAcceptShipping]  = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');
  const [success,         setSuccess]         = useState(false);

  const deliveryDateStr = deliveryDate
    ? `${deliveryDate.getDate().toString().padStart(2,'0')}/${(deliveryDate.getMonth()+1).toString().padStart(2,'0')}/${deliveryDate.getFullYear()}`
    : '';

  // Sconti applicati per questo cliente su questo fornitore
  const catalogDiscountPercent = cart.catalogDiscountPercent ?? 0;
  const discountPercent        = cart.discountPercent        ?? 0;

  // ─── Dati commerciali dinamici (dal backend, non hardcoded) ───
  // taxMode default 'GROSS' per coerenza con CartClientWrapper.tsx del web
  const currency   = cart.currency          ?? 'CHF';
  const taxMode    = cart.taxMode           ?? 'GROSS';
  const MIN_ORDER  = cart.minOrderCents     ?? 0;
  const SHIPPING   = cart.shippingCostCents ?? 0;

  // Helper di formattazione legato alla valuta del carrello
  const f = (cents: number) => fmt(cents, currency);

  // Calcolo fiscale per aliquota IVA (replica CartClientWrapper.tsx lato web)
  const taxBreakdown: Record<number, { taxableCents: number; vatCents: number }> = {};

  cart.items.forEach((item) => {
    const basePrice = item.product.customerPriceCents ?? item.product.priceCents;
    const hasCatDisc = catalogDiscountPercent > 0 && item.product.customerPriceCents == null;
    const unitPrice = hasCatDisc
      ? basePrice - Math.round(basePrice * catalogDiscountPercent / 100)
      : basePrice;

    const isKg     = item.product.uom?.toUpperCase() === 'KG';
    const avgW     = item.product.averageWeight || 1.0;
    const lineTot  = isKg
      ? Math.round(unitPrice * avgW * item.quantity)
      : unitPrice * item.quantity;

    const rate = Number(item.product.taxRate ?? 0);
    if (!taxBreakdown[rate]) taxBreakdown[rate] = { taxableCents: 0, vatCents: 0 };

    if (taxMode === 'NET') {
      const vatCents = Math.round(lineTot * (rate / 100));
      taxBreakdown[rate].taxableCents += lineTot;
      taxBreakdown[rate].vatCents     += vatCents;
    } else {
      // GROSS: il prezzo contiene già l'IVA → scorporala
      const taxableCents = Math.round(lineTot / (1 + rate / 100));
      const vatCents     = lineTot - taxableCents;
      taxBreakdown[rate].taxableCents += taxableCents;
      taxBreakdown[rate].vatCents     += vatCents;
    }
  });

  const totalTaxableCents = Object.values(taxBreakdown).reduce((s, d) => s + d.taxableCents, 0);
  const totalVatCents     = Object.values(taxBreakdown).reduce((s, d) => s + d.vatCents,     0);

  // "netto" visualizzato in UI = imponibile prima di sconto
  const netto = totalTaxableCents;

  // Sconto ordine (% sull'imponibile)
  const discountAmount = discountPercent > 0
    ? Math.round(totalTaxableCents * discountPercent / 100)
    : 0;
  const taxableAfterDiscount = totalTaxableCents - discountAmount;

  // Riproporziona IVA dopo sconto
  const discountRatio      = totalTaxableCents > 0 ? taxableAfterDiscount / totalTaxableCents : 1;
  const iva                = Math.round(totalVatCents * discountRatio);
  const nettoAfterDiscount = taxableAfterDiscount;
  const subtotalAfterDiscount = taxableAfterDiscount + iva;

  const hasMinOrder       = MIN_ORDER > 0;
  const hasShippingOption = SHIPPING  > 0;
  const belowMin          = hasMinOrder && subtotalAfterDiscount > 0 && subtotalAfterDiscount < MIN_ORDER;
  const shipping          = (belowMin && hasShippingOption) ? SHIPPING : 0;
  const total             = subtotalAfterDiscount + shipping;

  // Raggruppamento in 2 gruppi (identico al sito web):
  // PRONTA CONSEGNA = prodotti disponibili alla data selezionata
  // PRE-ORDINE (IN ARRIVO) = prodotti non ancora disponibili per quella data
  const targetDate = new Date(deliveryDate ?? new Date());
  targetDate.setHours(0, 0, 0, 0);

  const availableItems: CartItem[] = [];
  const preOrderItems: CartItem[] = [];
  for (const item of cart.items) {
    if (isProductReady(item.product, targetDate)) availableItems.push(item);
    else preOrderItems.push(item);
  }

  const grouped = [
    { key: 'AVAILABLE' as Availability,   label: t('mobile.cart.readyDelivery', 'PRONTA CONSEGNA'),        items: availableItems },
    { key: 'COMING_SOON' as Availability, label: t('mobile.cart.preOrder',      'PRE-ORDINE (IN ARRIVO)'), items: preOrderItems },
  ].filter(g => g.items.length > 0);

  async function handleCheckout() {
    // Data di consegna obbligatoria: il web la richiede da sempre, ma qui era
    // saltabile → ordini arrivati al fornitore senza data (12 casi in prod).
    // Il backend accetta ancora ordini senza data (retro-compatibilità con le
    // versioni app già installate), quindi il gate sta qui.
    if (!deliveryDate) {
      setError(t('mobile.cart.selectDateErr', 'Seleziona la data di consegna per procedere.'));
      setShowDatePicker(true);
      return;
    }
    if (belowMin && !hasShippingOption) {
      setError(
        t('mobile.cart.belowMinNoShipping', "Minimo d'ordine non raggiunto. Aggiungi prodotti per procedere.")
      );
      return;
    }
    if (belowMin && hasShippingOption && !acceptShipping) {
      setError(t('mobile.cart.acceptShippingErr', 'Accetta le spese di consegna per procedere.'));
      return;
    }
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
          {t('mobile.cart.orderSent', 'Ordine inviato a')} {cart.supplier.name}!
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
        <TouchableOpacity style={styles.svuotaBtn} onPress={() => {
          const title = t('mobile.cart.clearCartTitle', 'Svuota carrello');
          const msg   = t('mobile.cart.clearCartMsg', 'Rimuovere tutti gli articoli da {{supplier}}?')
            .replace('{{supplier}}', cart.supplier.name);
          Alert.alert(title, msg, [
            { text: t('mobile.cart.cancel', 'Annulla'), style: 'cancel' },
            { text: t('mobile.cart.clear',  'Svuota'), style: 'destructive', onPress: () => clearSupplierCart(cart.supplierId) },
          ]);
        }}>
          <Ionicons name="trash-outline" size={14} color={COLORS.error} />
          <Text style={styles.svuotaText}>{t('mobile.cart.emptyCart', 'Svuota Carrello')}</Text>
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
            <CartItemRow
              key={item.id}
              item={item}
              supplierId={cart.supplierId}
              catalogDiscountPercent={cart.catalogDiscountPercent ?? 0}
            />
          ))}
        </View>
      ))}

      {/* ── Riepilogo importi ── */}
      <View style={styles.summarySection}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            {taxMode === 'NET'
              ? t('mobile.cart.netTotal',   'Totale Merce (Netto):')
              : t('mobile.cart.grossTotal', 'Totale Merce (Lordo):')}
          </Text>
          {/* In NET mostra solo l'imponibile; in GROSS mostra imponibile + IVA (già inclusa) */}
          <Text style={styles.summaryValue}>
            {f(taxMode === 'NET' ? totalTaxableCents : totalTaxableCents + totalVatCents)}
          </Text>
        </View>
        {discountPercent > 0 && (
          <View style={styles.summaryRow}>
            <View style={styles.discountBadgeCart}>
              <Text style={styles.discountBadgeCartText}>
                {t('mobile.cart.discountLabel', 'Sconto {{pct}}%').replace('{{pct}}', String(discountPercent))}
              </Text>
            </View>
            <Text style={[styles.summaryValue, { color: COLORS.success }]}>− {f(discountAmount)}</Text>
          </View>
        )}
        {/* IVA: una riga per aliquota.
            In NET è un addebito (+) che si somma al netto.
            In GROSS è solo informativa: l'IVA è già inclusa nel lordo. */}
        {(() => {
          const rates = Object.keys(taxBreakdown)
            .map(Number)
            .filter((r) => (taxBreakdown[r]?.vatCents ?? 0) > 0);
          if (rates.length === 0 || iva === 0) return null;
          const ratio = discountRatio;
          return rates.map((rate) => {
            const row = taxBreakdown[rate];
            const taxableAfter = Math.round(row.taxableCents * ratio);
            const vatAfter     = Math.round(row.vatCents     * ratio);
            return (
              <View key={`iva-${rate}`} style={styles.summaryRow}>
                <View style={styles.ivaBadge}>
                  <Text style={styles.ivaText}>
                    {t('mobile.cart.ivaLabel', 'IVA {{rate}}% (su {{net}})')
                      .replace('{{rate}}', String(rate))
                      .replace('{{net}}', f(taxableAfter))}
                  </Text>
                </View>
                <Text style={styles.summaryValue}>
                  {taxMode === 'NET' ? '+ ' : ''}{f(vatAfter)}
                </Text>
              </View>
            );
          });
        })()}
        {shipping > 0 && (
          <View style={styles.summaryRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="car-outline" size={13} color={COLORS.error} />
              <Text style={[styles.summaryLabel, { color: COLORS.error }]}>{t('mobile.cart.shippingCost', 'Spese Consegna:')}</Text>
            </View>
            <Text style={[styles.summaryValue, { color: COLORS.error }]}>{f(shipping)}</Text>
          </View>
        )}
        <View style={[styles.summaryRow, { marginTop: 4 }]}>
          <Text style={styles.totalLabel}>{t('mobile.cart.orderTotal', 'Totale Ordine')}</Text>
          <Text style={styles.totalValue}>{f(total)}</Text>
        </View>
      </View>

      {/* ── Sede di consegna ── */}
      <View style={styles.checkoutSection}>
        <Text style={styles.checkoutSectionLabel}>{t('mobile.cart.deliveryAddress', 'SEDE DI CONSEGNA')}</Text>
        <TouchableOpacity style={styles.selectRow}>
          <Text style={styles.selectValue}>{deliveryAddress}</Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <Text style={[styles.checkoutSectionLabel, { marginTop: SPACING.md }]}>{t('mobile.cart.deliveryDate', 'DATA DI CONSEGNA RICHIESTA')}</Text>
        <TouchableOpacity style={styles.selectRow} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={16} color={deliveryDate ? COLORS.primary : COLORS.textSecondary} />
          <Text style={[styles.selectValue, !deliveryDate && { color: COLORS.textSecondary }]}>
            {deliveryDateStr || t('mobile.cart.selectDate', 'Seleziona data di consegna')}
          </Text>
          <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <Text style={[styles.checkoutSectionLabel, { marginTop: SPACING.md }]}>{t('mobile.cart.orderNotes', 'NOTE ORDINE')}</Text>
        <TextInput
          style={styles.orderNoteInput}
          placeholder={t('mobile.cart.notesPh', 'Note per il fornitore...')}
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
            {t('mobile.cart.minOrder', "Minimo d'ordine:")} <Text style={{ fontWeight: '700' }}>{f(MIN_ORDER)}</Text>.{'\n'}
            {t('mobile.cart.missing', 'Mancano')} <Text style={{ fontWeight: '700' }}>{f(Math.max(0, MIN_ORDER - subtotalAfterDiscount))}</Text> {hasShippingOption
              ? t('mobile.cart.forFreeShipping', 'per la spedizione gratuita.')
              : t('mobile.cart.toReachMin', "per raggiungere il minimo d'ordine.")}
          </Text>
          {hasShippingOption && (
            <View style={styles.acceptRow}>
              <Switch
                value={acceptShipping}
                onValueChange={setAcceptShipping}
                trackColor={{ false: '#fecaca', true: COLORS.primary }}
                thumbColor={acceptShipping ? '#fff' : '#f4f4f4'}
              />
              <Text style={styles.acceptText}>
                {t('mobile.cart.acceptShipping1', "Accetto l'addebito di")} <Text style={{ fontWeight: '700' }}>{f(SHIPPING)}</Text> {t('mobile.cart.acceptShipping2', "per le spese di consegna e confermo l'invio dell'ordine.")}
              </Text>
            </View>
          )}
        </View>
      )}

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* ── Bottone conferma ── */}
      <View style={styles.submitWrap}>
        {(() => {
          const blockedNoShipping  = belowMin && !hasShippingOption;
          const blockedNotAccepted = belowMin && hasShippingOption && !acceptShipping;
          const isDisabled = loading || blockedNoShipping || blockedNotAccepted;
          const label = blockedNoShipping
            ? t('mobile.cart.minOrderNotReached', "Minimo d'ordine non raggiunto")
            : blockedNotAccepted
              ? t('mobile.cart.acceptShippingBtn', 'Accetta le spese per procedere')
              : t('mobile.cart.submitOrder', 'Invia Ordine');
          return (
            <TouchableOpacity
              style={[styles.submitBtn, isDisabled && styles.submitBtnDisabled]}
              onPress={handleCheckout}
              disabled={isDisabled}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>{label}</Text>}
            </TouchableOpacity>
          );
        })()}
      </View>

      {/* ── Date picker ── */}
      <DatePickerModal
        visible={showDatePicker}
        value={deliveryDate}
        onConfirm={d => { setDeliveryDate(d); setShowDatePicker(false); }}
        onDismiss={() => setShowDatePicker(false)}
        deliveryRules={cart.deliveryRules}
      />
    </View>
  );
}

// ─── CartScreen ──────────────────────────────────────────────────────────────
export default function CartScreen() {
  const { carts, isLoading, fetchCarts } = useCart();
  const { t } = useI18n();

  useEffect(() => { fetchCarts(); }, [fetchCarts]);

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
          <Text style={styles.emptyTitle}>{t('mobile.cart.empty', 'Carrello vuoto')}</Text>
          <Text style={styles.emptySubtitle}>{t('mobile.cart.emptySub', 'Aggiungi prodotti dal catalogo')}</Text>
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
  // F-18 · chip "cartone N PZ" sulla riga carrello
  packBadge:     { backgroundColor: '#fef3c7', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  packBadgeText: { fontSize: 9, fontWeight: '800', color: '#92400e', letterSpacing: 0.3 },
  itemSubtotal: { alignItems: 'flex-end', gap: 2, flexShrink: 0 },
  subtotalLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase' },
  subtotalValue: { fontSize: 14, fontWeight: '700', color: COLORS.primary },

  itemBottom: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  qtyRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyLabel:  { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase', marginRight: 4 },
  qtyBtn:    { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  qtyBtnAdd: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  qtyValue:  { fontSize: 14, fontWeight: '700', color: COLORS.text, minWidth: 20, textAlign: 'center' },
  qtyInput: {
    fontSize: 14, fontWeight: '700', color: COLORS.text,
    minWidth: 44, textAlign: 'center',
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 6,
    backgroundColor: COLORS.surface,
  },
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
  discountBadgeCart:     { backgroundColor: `${COLORS.success}22`, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 4 },
  discountBadgeCartText: { color: COLORS.success, fontSize: 12, fontWeight: '700' },
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
