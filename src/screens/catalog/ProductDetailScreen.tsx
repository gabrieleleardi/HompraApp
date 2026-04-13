import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons }   from '@expo/vector-icons';
import { getCatalog } from '@/api/catalog';
import { useCart }    from '@/context/CartContext';
import { COLORS, SPACING, RADIUS } from '@/constants';
import type { Product } from '@/types';
import type { RootStackParamList } from '@/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

function formatPrice(cents: number, currency = 'CHF') {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

export default function ProductDetailScreen({ route }: Props) {
  const { productId, supplierId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { carts, updateItem } = useCart();

  const [product,  setProduct]  = useState<Product | null>(null);
  const [loading,  setLoading]  = useState(true);

  const cart     = carts.find((c) => c.supplierId === supplierId);
  const cartItem = cart?.items.find((i) => i.productId === productId);
  const qty      = cartItem?.quantity ?? 0;

  // Recupera i dati del prodotto cercandolo nel catalogo
  useEffect(() => {
    (async () => {
      try {
        const data = await getCatalog(supplierId, { page: 1 });
        const found = data.products.find((p) => p.id === productId);
        setProduct(found ?? null);
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
        <Text style={styles.errorText}>Prodotto non trovato.</Text>
      </View>
    );
  }

  const price = product.customerPriceCents ?? product.priceCents;

  const availabilityMap: Record<string, { label: string; color: string }> = {
    AVAILABLE:      { label: 'Disponibile',     color: COLORS.success },
    COMING_SOON:    { label: 'In arrivo',        color: COLORS.warning },
    ON_ORDER:       { label: 'Su ordinazione',   color: COLORS.warning },
    WEEKLY_RESTOCK: { label: 'Rifornimento sett.', color: COLORS.accent },
  };
  const avail = availabilityMap[product.availability] ?? { label: product.availability, color: COLORS.textSecondary };

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
          {product.isNew   && <View style={[styles.badge, { backgroundColor: COLORS.accent }]}><Text style={styles.badgeText}>Nuovo</Text></View>}
          {product.isPromo && <View style={[styles.badge, { backgroundColor: COLORS.warning }]}><Text style={styles.badgeText}>Promo</Text></View>}
          <View style={[styles.badge, { backgroundColor: avail.color }]}>
            <Text style={styles.badgeText}>{avail.label}</Text>
          </View>
        </View>

        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productCode}>Cod. {product.code}{product.uom ? ` · ${product.uom}` : ''}</Text>

        {product.category && (
          <Text style={styles.category}>{product.category}{product.subcategory ? ` › ${product.subcategory}` : ''}</Text>
        )}

        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(price, product.currency)}</Text>
          {product.customerPriceCents && product.customerPriceCents !== product.priceCents && (
            <Text style={styles.originalPrice}>{formatPrice(product.priceCents, product.currency)}</Text>
          )}
        </View>

        {product.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>{product.notes}</Text>
          </View>
        )}

        {product.cutoffTime && (
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>Ordine entro le {product.cutoffTime}</Text>
          </View>
        )}

        {/* Controllo quantità */}
        <View style={styles.qtySection}>
          <Text style={styles.qtyLabel}>Quantità</Text>
          <View style={styles.qtyControl}>
            <TouchableOpacity
              style={[styles.qtyBtn, qty === 0 && styles.qtyBtnDisabled]}
              onPress={() => qty > 0 && updateItem(productId, supplierId, qty - 1)}
              disabled={qty === 0}
            >
              <Ionicons name="remove" size={20} color={qty === 0 ? COLORS.border : COLORS.primary} />
            </TouchableOpacity>

            <Text style={styles.qtyText}>{qty}</Text>

            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => updateItem(productId, supplierId, qty + 1)}
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
              {qty} nel carrello · {formatPrice(price * qty, product.currency)}
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

  notesBox: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.md,
    borderLeftWidth: 3, borderLeftColor: COLORS.accent,
  },
  notesText: { color: COLORS.text, fontSize: 14, lineHeight: 20 },

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

  cartButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    padding: SPACING.md, marginTop: SPACING.md,
  },
  cartButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
});
