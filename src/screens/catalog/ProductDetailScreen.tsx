import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Image, TextInput,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons }   from '@expo/vector-icons';
import { getProduct } from '@/api/catalog';
import { useCart }    from '@/context/CartContext';
import { useI18n }    from '@/i18n/I18nContext';
import { COLORS, SPACING, RADIUS } from '@/constants';
import type { Product } from '@/types';
import type { RootStackParamList } from '@/navigation';
import {
  hasSaleMultiple,
  effectiveMultiple,
  snapQuantityToMultiple,
  stepUp,
  stepDown,
  formatPackLabel,
} from '@/lib/saleMultiple';
import { useDebouncedQty } from '@/hooks/useDebouncedQty';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

function formatPrice(cents: number, currency = 'CHF') {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

export default function ProductDetailScreen({ route }: Props) {
  const { productId, supplierId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { carts, updateItem } = useCart();
  const { t } = useI18n();

  const [product,  setProduct]  = useState<Product | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [catalogDiscountPercent, setCatalogDiscountPercent] = useState(0);

  const cart     = carts.find((c) => c.supplierId === supplierId);
  const cartItem = cart?.items.find((i) => i.productId === productId);
  const serverQty = cartItem?.quantity ?? 0;

  // P1.2 · optimistic update + debounce 350ms (porting commit web 45b97702)
  const { qty, flushSoon, flushNow } = useDebouncedQty(
    serverQty,
    (n) => updateItem(productId, supplierId, n),
  );

  // Editing locale della quantità per consentire l'input manuale del numero.
  const [editingQty, setEditingQty] = useState(false);
  const [qtyText, setQtyText] = useState(String(serverQty));
  useEffect(() => {
    if (!editingQty) setQtyText(String(qty));
  }, [qty, editingQty]);

  function commitQty() {
    setEditingQty(false);
    const parsed = parseInt(qtyText, 10);
    const raw = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    // F-18 · snap floor sul saleMultiple del prodotto (stessa logica server-side)
    const next = snapQuantityToMultiple(raw, product?.saleMultiple ?? null);
    setQtyText(String(next));
    if (next !== qty) flushNow(next);
  }

  // Recupera il singolo prodotto dal backend
  useEffect(() => {
    (async () => {
      try {
        const { product: p, catalogDiscountPercent: disc } = await getProduct(supplierId, productId);
        setProduct(p);
        setCatalogDiscountPercent(disc);
      } catch {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [productId, supplierId]);

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} />;
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{t('mobile.product.notFound', 'Prodotto non trovato.')}</Text>
      </View>
    );
  }

  const basePrice = product.customerPriceCents ?? product.priceCents;
  // Applica sconto catalogo solo se non c'è un prezzo dedicato
  const hasCatalogDiscount = catalogDiscountPercent > 0 && product.customerPriceCents == null;
  const discountAmount = hasCatalogDiscount ? Math.round(basePrice * catalogDiscountPercent / 100) : 0;
  const price = basePrice - discountAmount;

  // F-18 · vendita a multipli
  const hasMultiple = hasSaleMultiple(product.saleMultiple);
  const multiple    = effectiveMultiple(product.saleMultiple);
  const packPriceCents = hasMultiple ? price * multiple : 0;

  const availColorMap: Record<string, string> = {
    AVAILABLE:      COLORS.success,
    COMING_SOON:    COLORS.warning,
    ON_ORDER:       COLORS.warning,
    WEEKLY_RESTOCK: COLORS.accent,
  };
  const avail = {
    label: t(`mobile.product.availabilityLabels.${product.availability}`, product.availability),
    color: availColorMap[product.availability] ?? COLORS.textSecondary,
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Immagine prodotto */}
      <View style={styles.imagePlaceholder}>
        {product.imageUrl
          ? <Image source={{ uri: product.imageUrl }} style={styles.productImage} resizeMode="contain" />
          : <Ionicons name="cube-outline" size={72} color={COLORS.border} />}
      </View>

      <View style={styles.body}>
        {/* Badge */}
        <View style={styles.badgeRow}>
          {product.isNew   && <View style={[styles.badge, { backgroundColor: COLORS.accent }]}><Text style={styles.badgeText}>{t('mobile.product.new', 'Nuovo')}</Text></View>}
          {product.isPromo && <View style={[styles.badge, { backgroundColor: COLORS.warning }]}><Text style={styles.badgeText}>{t('mobile.product.promo', 'Promo')}</Text></View>}
          <View style={[styles.badge, { backgroundColor: avail.color }]}>
            <Text style={styles.badgeText}>{avail.label}</Text>
          </View>
        </View>

        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productCode}>{t('mobile.cart.code', 'Codice')}. {product.code}{product.uom ? ` · ${product.uom}` : ''}</Text>

        {product.category && (
          <Text style={styles.category}>{product.category}{product.subcategory ? ` › ${product.subcategory}` : ''}</Text>
        )}

        <View style={styles.priceRow}>
          {hasCatalogDiscount ? (
            <>
              <Text style={[styles.price, { color: COLORS.success }]}>{formatPrice(price, product.currency)}</Text>
              <Text style={styles.originalPrice}>{formatPrice(basePrice, product.currency)}</Text>
              <View style={styles.catDiscBadge}>
                <Text style={styles.catDiscBadgeText}>-{catalogDiscountPercent}%</Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.price}>{formatPrice(price, product.currency)}</Text>
              {product.customerPriceCents && product.customerPriceCents !== product.priceCents && (
                <Text style={styles.originalPrice}>{formatPrice(product.priceCents, product.currency)}</Text>
              )}
            </>
          )}
        </View>

        {/* F-18 · Chip vendita a multipli (cartone) */}
        {hasMultiple && (
          <View style={styles.packBadge}>
            <Ionicons name="cube-outline" size={14} color="#92400e" style={{ marginRight: 6 }} />
            <Text style={styles.packBadgeText}>
              {t('mobile.product.minQty', 'min')} {multiple} {(product.uom ?? 'PZ').toUpperCase()} · {formatPackLabel(product.saleMultiple, product.uom)} {formatPrice(packPriceCents, product.currency)}
            </Text>
          </View>
        )}

        {product.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>{product.notes}</Text>
          </View>
        )}

        {product.cutoffTime && (
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>{t('mobile.product.orderBefore', 'Ordine entro le {{time}}').replace('{{time}}', product.cutoffTime)}</Text>
          </View>
        )}

        {/* Controllo quantità */}
        <View style={styles.qtySection}>
          <Text style={styles.qtyLabel}>{t('mobile.product.qty', 'Quantità')}</Text>
          <View style={styles.qtyControl}>
            <TouchableOpacity
              style={[styles.qtyBtn, qty === 0 && styles.qtyBtnDisabled]}
              onPress={() => qty > 0 && flushSoon(stepDown(qty, product.saleMultiple))}
              disabled={qty === 0}
            >
              <Ionicons name="remove" size={20} color={qty === 0 ? COLORS.border : COLORS.primary} />
            </TouchableOpacity>

            <TextInput
              style={styles.qtyInput}
              value={qtyText}
              onChangeText={(v) => setQtyText(v.replace(/[^0-9]/g, ''))}
              onFocus={() => setEditingQty(true)}
              onBlur={commitQty}
              onSubmitEditing={commitQty}
              keyboardType="number-pad"
              returnKeyType="done"
              selectTextOnFocus
              maxLength={5}
            />

            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => flushSoon(stepUp(qty, product.saleMultiple))}
            >
              <Ionicons name="add" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {qty > 0 && (
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="cart" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
            <Text style={styles.cartButtonText}>
              {qty} {t('mobile.product.inCart', 'nel carrello')} · {formatPrice(price * qty, product.currency)}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content:   { paddingBottom: SPACING.xxl },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: COLORS.error },

  imagePlaceholder: {
    height: 220, backgroundColor: COLORS.surface,
    justifyContent: 'center', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  productImage: {
    width: '100%', height: '100%',
  },
  body:     { padding: SPACING.lg },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: SPACING.sm, flexWrap: 'wrap' },
  badge:    { borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:{ color: COLORS.white, fontSize: 11, fontWeight: '700' },

  productName:  { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  productCode:  { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },
  category:     { fontSize: 13, color: COLORS.accent, fontWeight: '600', marginBottom: SPACING.sm },
  priceRow:     { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: SPACING.md },
  price:        { fontSize: 28, fontWeight: '900', color: COLORS.primary },
  originalPrice:{ fontSize: 16, color: COLORS.textSecondary, textDecorationLine: 'line-through' },
  catDiscBadge: { backgroundColor: COLORS.success, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  catDiscBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  notesBox: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.md,
    borderLeftWidth: 3, borderLeftColor: COLORS.accent,
  },
  notesText: { color: COLORS.text, fontSize: 14, lineHeight: 20 },

  // F-18 · chip "min N · cartone CHF X" (allineato al badge giallo del web)
  packBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fef3c7', borderRadius: RADIUS.sm,
    paddingHorizontal: 10, paddingVertical: 6,
    marginBottom: SPACING.md,
    alignSelf: 'flex-start',
  },
  packBadgeText: { color: '#92400e', fontSize: 12, fontWeight: '700' },

  infoRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.sm },
  infoText: { color: COLORS.textSecondary, fontSize: 13 },

  qtySection: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.md, marginTop: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  qtyLabel:       { fontSize: 15, fontWeight: '600', color: COLORS.text },
  qtyControl:     { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qtyBtn:         { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  qtyBtnDisabled: { borderColor: COLORS.border },
  qtyText:        { fontSize: 20, fontWeight: '700', color: COLORS.text, minWidth: 28, textAlign: 'center' },
  qtyInput: {
    fontSize: 20, fontWeight: '700', color: COLORS.text,
    minWidth: 60, textAlign: 'center',
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
  },

  cartButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    padding: SPACING.md, marginTop: SPACING.md,
  },
  cartButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
});
