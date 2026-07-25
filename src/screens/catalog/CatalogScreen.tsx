import React, {
  useEffect, useState, useCallback, useRef, useLayoutEffect, useMemo,
} from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, ScrollView,
  Modal, Image, Animated, Easing, Platform, Keyboard,
} from 'react-native';
import { useNavigation }            from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons }                 from '@expo/vector-icons';
import { getCatalog } from '@/api/catalog';
import { getSuppliers }             from '@/api/catalog';
import { useCart }                  from '@/context/CartContext';
import { useAuth }                  from '@/context/AuthContext';
import { useNotifications }         from '@/context/NotificationsContext';
import { getErrorMessage }          from '@/api/client';
import { useI18n }                  from '@/i18n/I18nContext';
import { COLORS, SPACING, RADIUS }  from '@/constants';
import type { Product, Supplier }   from '@/types';
import type { RootStackParamList }  from '@/navigation';
import {
  hasSaleMultiple,
  effectiveMultiple,
  snapQuantityToMultiple,
  stepUp,
  stepDown,
  formatPackLabel,
} from '@/lib/saleMultiple';
import { useDebouncedQty } from '@/hooks/useDebouncedQty';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const NAV_BG      = '#163a5f';
const PILL_ACTIVE = '#2563eb';

type StatusFilter = 'all' | 'mine' | 'available' | 'coming' | 'onorder' | 'new' | 'promo';

const STATUS_PILLS: { key: StatusFilter; labelKey: string; fallback: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all',       labelKey: 'mobile.catalog.allFilter',       fallback: 'Tutti',           icon: 'grid-outline'      },
  { key: 'mine',      labelKey: 'mobile.catalog.mine',            fallback: 'I miei Prodotti', icon: 'star-outline'      },
  { key: 'available', labelKey: 'mobile.catalog.availableFilter', fallback: 'Disponibili',     icon: 'checkmark-outline' },
  { key: 'coming',    labelKey: 'mobile.catalog.coming',          fallback: 'In Arrivo',       icon: 'car-outline'       },
  { key: 'onorder',   labelKey: 'mobile.catalog.onorder',         fallback: 'Su Ordinazione',  icon: 'time-outline'      },
  { key: 'new',       labelKey: 'mobile.catalog.newFilter',       fallback: 'Novità',          icon: 'pricetag-outline'  },
  { key: 'promo',     labelKey: 'mobile.catalog.promo',           fallback: 'Promo',           icon: 'pricetags-outline' },
];

function formatPrice(cents: number, currency = 'CHF') {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

// ─── ProductRow ──────────────────────────────────────────────────────────────
function ProductRow({
  product, supplierId, onPress, catalogDiscountPercent = 0,
}: {
  product: Product; supplierId: string; onPress: () => void;
  catalogDiscountPercent?: number;
}) {
  const { carts, updateItem } = useCart();
  const cart     = carts.find(c => c.supplierId === supplierId);
  const cartItem = cart?.items.find(i => i.productId === product.id);
  const serverQty = cartItem?.quantity ?? 0;
  const basePrice = product.customerPriceCents ?? product.priceCents;
  // Applica lo sconto catalogo solo se il prodotto NON ha già un prezzo dedicato
  const hasCatalogDiscount = catalogDiscountPercent > 0 && product.customerPriceCents == null;
  const discountAmount = hasCatalogDiscount
    ? Math.round(basePrice * catalogDiscountPercent / 100)
    : 0;
  const price = basePrice - discountAmount;

  // P1.2 · optimistic update + debounce 350ms (porting commit web 45b97702)
  const { qty: localQty, flushSoon, flushNow } = useDebouncedQty(
    serverQty,
    (n) => updateItem(product.id, supplierId, n),
  );

  // Editing locale per consentire input manuale del numero.
  const [editingQty, setEditingQty] = useState(false);
  const [qtyText, setQtyText] = useState(String(serverQty));
  useEffect(() => {
    if (!editingQty) setQtyText(String(localQty));
  }, [localQty, editingQty]);

  // F-18 · step a multipli quando product.saleMultiple >= 2, altrimenti +/-1
  function handleChange(delta: number) {
    const next = delta > 0
      ? stepUp(localQty, product.saleMultiple)
      : stepDown(localQty, product.saleMultiple);
    setQtyText(String(next));
    flushSoon(next);
  }

  function commitQty() {
    setEditingQty(false);
    const parsed = parseInt(qtyText, 10);
    const raw = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    // F-18 · snap floor sul saleMultiple (stessa logica server-side)
    const next = snapQuantityToMultiple(raw, product.saleMultiple);
    setQtyText(String(next));
    if (next !== localQty) flushNow(next);
  }

  const availColor = product.availability === 'AVAILABLE'
    ? '#22c55e'
    : product.availability === 'COMING_SOON' || product.availability === 'WEEKLY_RESTOCK'
    ? '#f59e0b'
    : '#ef4444';

  return (
    <TouchableOpacity style={styles.productCard} onPress={onPress} activeOpacity={0.75}>
      {/* Thumb con pallino disponibilità in alto a sinistra */}
      <View style={styles.productThumbWrap}>
        <View style={styles.productThumb}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.productThumbImg} resizeMode="contain" />
          ) : (
            <Ionicons name="cube-outline" size={26} color={COLORS.textSecondary} />
          )}
        </View>
        <View style={[styles.availDot, { backgroundColor: availColor }]} />
      </View>

      <View style={styles.productInfo}>
        <View style={styles.badgeRow}>
          {product.isNew   && <View style={[styles.badge, { backgroundColor: COLORS.accent }]}><Text style={styles.badgeText}>Nuovo</Text></View>}
          {product.isPromo && <View style={[styles.badge, { backgroundColor: COLORS.warning }]}><Text style={styles.badgeText}>Promo</Text></View>}
        </View>
        <Text style={styles.productName} numberOfLines={4}>{product.name}</Text>
        <View style={styles.productMeta}>
          <View style={styles.productCodeBadge}><Text style={styles.productCodeText}>#{product.code}</Text></View>
          {product.uom ? <Text style={styles.productUom}>· {product.uom}</Text> : null}
        </View>
        {hasCatalogDiscount ? (
          <View style={styles.priceRow}>
            <Text style={styles.productPriceOld}>{formatPrice(basePrice, product.currency)}</Text>
            <Text style={styles.productPriceDisc}>{formatPrice(price, product.currency)}</Text>
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>-{catalogDiscountPercent}%</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.productPrice}>{formatPrice(price, product.currency)}</Text>
        )}
        {/* F-18 · chip cartone (badge giallo allineato al web) */}
        {hasSaleMultiple(product.saleMultiple) && (
          <View style={styles.packBadge}>
            <Text style={styles.packBadgeText}>
              {formatPackLabel(product.saleMultiple, product.uom)} · {formatPrice(price * effectiveMultiple(product.saleMultiple), product.currency)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.qtyControl}>
        {localQty > 0 ? (
          <>
            <TouchableOpacity style={[styles.qtyBtn, styles.qtyBtnAdd]} onPress={() => handleChange(1)}>
              <Ionicons name="add" size={15} color="#fff" />
            </TouchableOpacity>
            <TextInput
              style={styles.qtyInput}
              value={qtyText}
              onChangeText={(v) => setQtyText(v.replace(/[^0-9]/g, ''))}
              onFocus={() => setEditingQty(true)}
              onBlur={commitQty}
              onSubmitEditing={() => { commitQty(); Keyboard.dismiss(); }}
              keyboardType="number-pad"
              returnKeyType="done"
              selectTextOnFocus
              maxLength={5}
            />
            <TouchableOpacity style={styles.qtyBtn} onPress={() => handleChange(-1)}>
              <Ionicons name="remove" size={15} color={COLORS.primary} />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={[styles.qtyBtn, styles.qtyBtnAdd]} onPress={() => handleChange(1)}>
            <Ionicons name="add" size={15} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── CatalogScreen ───────────────────────────────────────────────────────────
export default function CatalogScreen() {
  const navigation = useNavigation<Nav>();
  const { fetchCarts } = useCart();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const { t } = useI18n();

  const [suppliers,            setSuppliers]            = useState<Supplier[]>([]);
  const [activeSupplierId,     setActiveSupplierId]     = useState<string | null>(null);
  const [supplierModalVisible, setSupplierModalVisible] = useState(false);
  const [products,             setProducts]             = useState<Product[]>([]);
  const [categories,           setCategories]           = useState<string[]>([]);
  const [subcategories,        setSubcategories]        = useState<string[]>([]);
  const [activeCategory,       setActiveCategory]       = useState('');
  const [activeSubcategory,    setActiveSubcategory]    = useState('');
  const [statusFilter,         setStatusFilter]         = useState<StatusFilter>('all');
  const [search,               setSearch]               = useState('');
  const [page,                 setPage]                 = useState(1);
  const [total,                setTotal]                = useState(0);
  const [catalogDiscountPercent, setCatalogDiscountPercent] = useState(0);
  const [loading,              setLoading]              = useState(false);
  const [refreshing,           setRefreshing]           = useState(false);
  const [error,                setError]                = useState('');
  const [filterOpen,             setFilterOpen]             = useState(false);
  const [catPickerVisible,       setCatPickerVisible]       = useState(false);
  const [subcatPickerVisible,    setSubcatPickerVisible]    = useState(false);

  const filterAnim  = useRef(new Animated.Value(0)).current;
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Header dinamico ──────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const initials = (user?.name ?? user?.email ?? 'U')
      .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.supplierSelectorBtn} onPress={() => setSupplierModalVisible(true)}>
            <Ionicons name="lock-closed-outline" size={13} color={COLORS.textSecondary} />
            <Text style={styles.supplierSelectorText} numberOfLines={1}>{t('mobile.catalog.suppliers', 'I miei Fornitori')}</Text>
            <Ionicons name="chevron-down" size={12} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => navigation.navigate('Notifications' as any)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="notifications-outline" size={22} color={COLORS.primary} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Profile' as any)}>
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, user, t, unreadCount]);

  // ── Carica fornitori ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const list = await getSuppliers();
        setSuppliers(list);
        if (list.length === 1) {
          // Un solo fornitore: selezionalo direttamente
          setActiveSupplierId(list[0].id);
        } else if (list.length > 1) {
          // Più fornitori: apri il modale per scegliere (senza preferenze)
          setSupplierModalVisible(true);
        }
      } catch (e) { setError(getErrorMessage(e)); }
    })();
  }, []);

  // Converte lo statusFilter (pill) in parametri API
  function statusToApiParams(s: StatusFilter): Partial<{
    availability: string; isNew: boolean; isPromo: boolean; isMine: boolean;
  }> {
    switch (s) {
      case 'available': return { availability: 'AVAILABLE' };
      case 'coming':    return { availability: 'COMING_SOON,WEEKLY_RESTOCK' };
      case 'onorder':   return { availability: 'ON_ORDER' };
      case 'new':       return { isNew: true };
      case 'promo':     return { isPromo: true };
      case 'mine':      return { isMine: true };
      default:          return {};
    }
  }

  // ── Carica catalogo ──────────────────────────────────────────────────────
  const loadCatalog = useCallback(async (pageToLoad: number, reset = false) => {
    if (!activeSupplierId) return;
    setLoading(true);
    setError('');
    try {
      const data = await getCatalog(activeSupplierId, {
        search:      search.trim() || undefined,
        category:    activeCategory    || undefined,
        subcategory: activeSubcategory || undefined,
        ...statusToApiParams(statusFilter),
        page:        pageToLoad,
      });
      setProducts(prev => {
        if (reset) return data.products;
        const seen = new Set(prev.map(p => p.id));
        return [...prev, ...data.products.filter(p => !seen.has(p.id))];
      });
      setCategories(data.categories);
      setTotal(data.total);
      setCatalogDiscountPercent(data.catalogDiscountPercent ?? 0);
      if (reset) setPage(1);
      if (reset && activeCategory) {
        const subs = Array.from(new Set(
          data.products.filter(p => p.category === activeCategory && p.subcategory).map(p => p.subcategory as string)
        ));
        setSubcategories(subs);
      } else if (reset) {
        setSubcategories([]);
      }
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setLoading(false); setRefreshing(false); }
  }, [activeSupplierId, search, activeCategory, activeSubcategory, statusFilter]);

  // Ref sempre aggiornato a loadCatalog per poter chiamare l'ultima versione
  // senza dover rimettere loadCatalog nelle deps dei useEffect (eviterebbe doppie fetch).
  const loadCatalogRef = useRef(loadCatalog);
  useEffect(() => { loadCatalogRef.current = loadCatalog; }, [loadCatalog]);

  // Ricarica quando cambiano supplier, categoria, sottocategoria o filtro stato
  useEffect(() => {
    loadCatalogRef.current(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSupplierId, activeCategory, activeSubcategory, statusFilter]);

  // Filtro lato client come doppio controllo — anche se l'API filtra già,
  // riapplichiamo la regola per coerenza (e per funzionare se il backend
  // non è ancora stato aggiornato con i filtri server-side).
  const visibleProducts = useMemo(() => {
    switch (statusFilter) {
      case 'available': return products.filter(p => p.availability === 'AVAILABLE');
      case 'coming':    return products.filter(p => p.availability === 'COMING_SOON' || p.availability === 'WEEKLY_RESTOCK');
      case 'onorder':   return products.filter(p => p.availability === 'ON_ORDER');
      case 'new':       return products.filter(p => p.isNew);
      case 'promo':     return products.filter(p => p.isPromo);
      case 'mine':      return products.filter(p => p.customerPriceCents != null);
      default:          return products;
    }
  }, [products, statusFilter]);

  // Debounce sulla ricerca: non dipende da loadCatalog (usa il ref),
  // così cambi di statusFilter/categoria non ritriggerano la fetch ritardata.
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadCatalogRef.current(1, true), 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  useEffect(() => {
    if (activeSupplierId) fetchCarts(activeSupplierId);
  }, [activeSupplierId, fetchCarts]);

  function loadMore() {
    if (products.length < total && !loading) {
      const next = page + 1; setPage(next); loadCatalog(next, false);
    }
  }

  // ── Filter panel ─────────────────────────────────────────────────────────
  function toggleFilter() {
    const toValue = filterOpen ? 0 : 1;
    setFilterOpen(!filterOpen);
    Animated.timing(filterAnim, { toValue, duration: 220, easing: Easing.out(Easing.ease), useNativeDriver: false }).start();
  }

  function resetFilters() {
    setActiveCategory(''); setActiveSubcategory(''); setSubcategories([]);
    setFilterOpen(false);
    Animated.timing(filterAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  }

  // Il pannello è sempre una sola riga orizzontale: altezza fissa 86
  const panelHeight = filterAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, 86],
  });

  const activeSupplier = suppliers.find(s => s.id === activeSupplierId);

  return (
    <View style={styles.container}>

      {/* ── BANNER FORNITORE ── */}
      {activeSupplier && (
        <View style={styles.supplierBanner}>
          <View style={[styles.supplierLogo, { backgroundColor: activeSupplier.logoBgColor ?? COLORS.primary }]}>
            {activeSupplier.shopLogoUrl
              ? <Image source={{ uri: activeSupplier.shopLogoUrl }} style={styles.supplierLogoImg} resizeMode="contain" />
              : activeSupplier.imageUrl
              ? <Image source={{ uri: activeSupplier.imageUrl }} style={styles.supplierLogoImg} resizeMode="contain" />
              : <Text style={styles.supplierLogoFallback}>{activeSupplier.name.charAt(0).toUpperCase()}</Text>}
          </View>
          <View style={styles.supplierInfo}>
            <Text style={styles.supplierName}>{activeSupplier.name}</Text>
            <Text style={styles.supplierCount}>{total > 0 ? `${total} / ${total} ${t('mobile.catalog.articles', 'ARTICOLI')}` : `— ${t('mobile.catalog.articles', 'ARTICOLI')}`}</Text>
          </View>
        </View>
      )}

      {/* ── SEARCH BAR ── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('mobile.catalog.search', 'Cerca prodotto...')}
            placeholderTextColor={COLORS.textSecondary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── STATUS PILLS ── */}
      <View style={styles.statusBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusBarContent}>
          {STATUS_PILLS.map(pill => (
            <TouchableOpacity
              key={pill.key}
              style={[styles.statusPill, statusFilter === pill.key && styles.statusPillActive]}
              onPress={() => setStatusFilter(pill.key)}
              activeOpacity={0.75}
            >
              <Ionicons name={pill.icon} size={13} color={statusFilter === pill.key ? '#fff' : COLORS.textSecondary} />
              <Text style={[styles.statusPillText, statusFilter === pill.key && styles.statusPillTextActive]}>
                {t(pill.labelKey, pill.fallback)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── TOOLBAR ── */}
      <View style={styles.toolbar}>
        <Text style={styles.resultCount}>
          {statusFilter === 'all' ? total : visibleProducts.length} {t('mobile.catalog.products', 'prodotti').toLowerCase()}
        </Text>
        <TouchableOpacity style={[styles.filterBtn, filterOpen && styles.filterBtnOpen]} onPress={toggleFilter} activeOpacity={0.8}>
          <Ionicons name="options-outline" size={14} color={filterOpen ? PILL_ACTIVE : COLORS.text} />
          <Text style={[styles.filterBtnText, filterOpen && styles.filterBtnTextOpen]}>{t('mobile.catalog.filters', 'Filtri')}</Text>
          <Ionicons name={filterOpen ? 'chevron-up' : 'chevron-down'} size={12} color={filterOpen ? PILL_ACTIVE : COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* ── FILTER PANEL – stile sito: dropdown row ── */}
      <Animated.View style={[styles.filterPanel, { maxHeight: panelHeight, overflow: 'hidden' }]}>
        <View style={styles.filterInner}>
          {/* CATEGORIA dropdown */}
          <View style={styles.filterDropGroup}>
            <Text style={styles.filterGroupLabel}>{t('mobile.catalog.category', 'CATEGORIA')}</Text>
            <TouchableOpacity style={styles.filterDropBtn} onPress={() => setCatPickerVisible(true)} activeOpacity={0.75}>
              <Text style={styles.filterDropText} numberOfLines={1}>
                {activeCategory || t('mobile.catalog.allCategories', 'Tutte le categorie')}
              </Text>
              <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* SOTTOCATEGORIA dropdown */}
          <View style={styles.filterDropGroup}>
            <Text style={styles.filterGroupLabel}>{t('mobile.catalog.subcategory', 'SOTTOCATEGORIA')}</Text>
            <TouchableOpacity
              style={[styles.filterDropBtn, (!activeCategory || subcategories.length === 0) && styles.filterDropBtnDisabled]}
              onPress={() => activeCategory && subcategories.length > 0 && setSubcatPickerVisible(true)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterDropText, (!activeCategory || subcategories.length === 0) && { color: COLORS.textSecondary }]} numberOfLines={1}>
                {activeSubcategory || t('mobile.catalog.allSubcategories', 'Tutte le sottocategorie')}
              </Text>
              <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* AZIONE */}
          <View style={styles.filterDropAction}>
            <Text style={styles.filterGroupLabel}>{t('mobile.catalog.action', 'AZIONE')}</Text>
            <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
              <Text style={styles.resetBtnText}>{t('mobile.catalog.resetFilters', 'Resetta Filtri')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* ── PICKER MODAL – Categoria ── */}
      <Modal visible={catPickerVisible} animationType="slide" transparent onRequestClose={() => setCatPickerVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCatPickerVisible(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{t('mobile.catalog.category', 'CATEGORIA')}</Text>
          <TouchableOpacity
            style={[styles.pickerRow, !activeCategory && styles.pickerRowActive]}
            onPress={() => { setActiveCategory(''); setActiveSubcategory(''); setCatPickerVisible(false); }}
          >
            <Text style={[styles.pickerRowText, !activeCategory && styles.pickerRowTextActive]}>{t('mobile.catalog.allCategories', 'Tutte le categorie')}</Text>
            {!activeCategory && <Ionicons name="checkmark" size={16} color={PILL_ACTIVE} />}
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.pickerRow, activeCategory === cat && styles.pickerRowActive]}
              onPress={() => { setActiveCategory(cat); setActiveSubcategory(''); setCatPickerVisible(false); }}
            >
              <Text style={[styles.pickerRowText, activeCategory === cat && styles.pickerRowTextActive]}>{cat}</Text>
              {activeCategory === cat && <Ionicons name="checkmark" size={16} color={PILL_ACTIVE} />}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      {/* ── PICKER MODAL – Sottocategoria ── */}
      <Modal visible={subcatPickerVisible} animationType="slide" transparent onRequestClose={() => setSubcatPickerVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSubcatPickerVisible(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{t('mobile.catalog.subcategory', 'SOTTOCATEGORIA')}</Text>
          <TouchableOpacity
            style={[styles.pickerRow, !activeSubcategory && styles.pickerRowActive]}
            onPress={() => { setActiveSubcategory(''); setSubcatPickerVisible(false); }}
          >
            <Text style={[styles.pickerRowText, !activeSubcategory && styles.pickerRowTextActive]}>{t('mobile.catalog.allSubcategories', 'Tutte le sottocategorie')}</Text>
            {!activeSubcategory && <Ionicons name="checkmark" size={16} color={PILL_ACTIVE} />}
          </TouchableOpacity>
          {subcategories.map(sub => (
            <TouchableOpacity
              key={sub}
              style={[styles.pickerRow, activeSubcategory === sub && styles.pickerRowActive]}
              onPress={() => { setActiveSubcategory(sub); setSubcatPickerVisible(false); }}
            >
              <Text style={[styles.pickerRowText, activeSubcategory === sub && styles.pickerRowTextActive]}>{sub}</Text>
              {activeSubcategory === sub && <Ionicons name="checkmark" size={16} color={PILL_ACTIVE} />}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      {/* ── LISTA PRODOTTI ── */}
      {error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadCatalog(1, true)}>
            <Text style={styles.retryText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={visibleProducts}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ProductRow
              product={item}
              supplierId={activeSupplierId!}
              catalogDiscountPercent={catalogDiscountPercent}
              onPress={() => navigation.navigate('ProductDetail', { productId: item.id, supplierId: activeSupplierId! })}
            />
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadCatalog(1, true); }} tintColor={COLORS.primary} />}
          ListEmptyComponent={!loading ? (
            <View style={styles.center}>
              <Ionicons name="cube-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyText}>Nessun prodotto trovato</Text>
            </View>
          ) : null}
          ListFooterComponent={loading ? <ActivityIndicator color={COLORS.primary} style={{ padding: SPACING.md }} /> : null}
          contentContainerStyle={products.length === 0 ? { flex: 1 } : { paddingBottom: SPACING.lg }}
        />
      )}

      {/* ── MODAL FORNITORI ── */}
      <Modal visible={supplierModalVisible} animationType="slide" transparent onRequestClose={() => setSupplierModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSupplierModalVisible(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{t('mobile.catalog.suppliers', 'I miei Fornitori')}</Text>
          {suppliers.map(s => (
            <TouchableOpacity
              key={s.id}
              style={[styles.supplierRow, activeSupplierId === s.id && styles.supplierRowActive]}
              onPress={() => {
                setActiveSupplierId(s.id);
                setActiveCategory(''); setActiveSubcategory('');
                setSearch(''); setStatusFilter('all');
                setSupplierModalVisible(false);
              }}
              activeOpacity={0.75}
            >
              <View style={[styles.supplierRowLogo, { backgroundColor: s.logoBgColor ?? COLORS.primary }]}>
                {s.shopLogoUrl
                  ? <Image source={{ uri: s.shopLogoUrl }} style={styles.supplierRowLogoImg} resizeMode="contain" />
                  : s.imageUrl
                  ? <Image source={{ uri: s.imageUrl }} style={styles.supplierRowLogoImg} resizeMode="contain" />
                  : <Text style={styles.supplierLogoFallback}>{s.name.charAt(0)}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.supplierRowName}>{s.name}</Text>
                {s.city ? <Text style={styles.supplierRowCity}>{s.city}</Text> : null}
              </View>
              {activeSupplierId === s.id && <Ionicons name="checkmark-circle" size={20} color={PILL_ACTIVE} />}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  emptyText: { color: COLORS.textSecondary, marginTop: SPACING.sm, fontSize: 15 },
  errorText: { color: COLORS.error, textAlign: 'center', marginBottom: SPACING.md, marginTop: SPACING.sm },
  retryBtn:  { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg, paddingVertical: 10, borderRadius: RADIUS.md },
  retryText: { color: '#fff', fontWeight: '600' },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 4 },
  supplierSelectorBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, maxWidth: 180,
  },
  supplierSelectorText: { fontSize: 12, fontWeight: '600', color: COLORS.text, flexShrink: 1 },
  bellBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  bellBadge: {
    position: 'absolute', top: -1, right: -1,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.error, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: COLORS.surface,
  },
  bellBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  supplierBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 10, gap: 12,
  },
  supplierLogo: { width: 50, height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  supplierLogoImg: { width: '100%', height: '100%' },
  supplierLogoFallback: { color: '#fff', fontSize: 20, fontWeight: '800' },
  supplierInfo: { flex: 1 },
  supplierName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  supplierCount: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, fontWeight: '600', letterSpacing: 0.4 },
  supplierChangeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: 7, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  supplierChangeTxt: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },

  searchWrap: { backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.background, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },

  statusBar: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  statusBarContent: { paddingHorizontal: SPACING.md, paddingVertical: 9, gap: 7 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  statusPillActive: { backgroundColor: PILL_ACTIVE, borderColor: PILL_ACTIVE },
  statusPillText: { fontSize: 12.5, fontWeight: '500', color: COLORS.textSecondary },
  statusPillTextActive: { color: '#fff', fontWeight: '600' },

  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingTop: 10, paddingBottom: 4,
  },
  resultCount: { fontSize: 11.5, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  filterBtnOpen: { borderColor: PILL_ACTIVE },
  filterBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  filterBtnTextOpen: { color: PILL_ACTIVE },

  filterPanel: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterInner: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: SPACING.md, paddingVertical: 12, gap: 10,
  },
  filterGroupLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.7, color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 5 },
  // Dropdown stile sito
  filterDropGroup: { flex: 1, minWidth: 0 },
  filterDropBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 8,
    backgroundColor: COLORS.surface, paddingHorizontal: 11, paddingVertical: 9,
  },
  filterDropBtnDisabled: { opacity: 0.45 },
  filterDropText: { flex: 1, fontSize: 13, fontWeight: '500', color: COLORS.text, marginRight: 4 },
  filterDropAction: { flexShrink: 0 },
  resetBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  resetBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  // Picker rows (dentro i Modal)
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  pickerRowActive: { backgroundColor: '#f0f4ff', marginHorizontal: -4, paddingHorizontal: 8, borderRadius: 8, borderBottomWidth: 0 },
  pickerRowText: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  pickerRowTextActive: { color: PILL_ACTIVE, fontWeight: '700' },

  productCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md, marginTop: SPACING.sm,
    borderRadius: RADIUS.md, padding: 11,
    borderWidth: 1.5, borderColor: COLORS.border, gap: 10,
  },
  productThumbWrap: { position: 'relative', flexShrink: 0 },
  productThumb: {
    width: 56, height: 56, borderRadius: 10,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  productThumbImg: { width: '100%', height: '100%' },
  availDot: {
    position: 'absolute', top: -3, left: -3,
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 1.5, borderColor: COLORS.surface,
  },
  productInfo: { flex: 1, minWidth: 0 },
  badgeRow: { flexDirection: 'row', gap: 4, marginBottom: 2 },
  badge: { borderRadius: RADIUS.sm, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  productName: { fontSize: 13.5, fontWeight: '600', color: COLORS.text, lineHeight: 18 },
  productMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  productCodeBadge: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  productCodeText: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary },
  productUom: { fontSize: 11, color: COLORS.textSecondary },
  productPrice: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginTop: 4, letterSpacing: -0.3 },
  priceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  productPriceOld:  { fontSize: 12, color: COLORS.textSecondary, textDecorationLine: 'line-through' },
  productPriceDisc: { fontSize: 15, fontWeight: '700', color: COLORS.success, letterSpacing: -0.3 },
  discountBadge:    { backgroundColor: COLORS.success, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  discountBadgeText:{ color: '#fff', fontSize: 10, fontWeight: '800' },
  // F-18 · chip "cartone N PZ · CHF X" (badge giallo allineato al web)
  packBadge:        { backgroundColor: '#fef3c7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3, alignSelf: 'flex-start' },
  packBadgeText:    { color: '#92400e', fontSize: 10, fontWeight: '700' },

  qtyControl: { flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0 },
  qtyBtn: { width: 31, height: 31, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  qtyBtnAdd: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  qtyText: { minWidth: 18, textAlign: 'center', fontWeight: '700', fontSize: 14, color: COLORS.text },
  qtyInput: {
    minWidth: 42, textAlign: 'center', fontWeight: '700', fontSize: 13, color: COLORS.text,
    paddingHorizontal: 4, paddingVertical: 1,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 6,
    backgroundColor: COLORS.surface,
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: SPACING.md, paddingBottom: 40, paddingTop: 12, gap: 4,
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 10, paddingHorizontal: 4 },
  supplierRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.background, marginBottom: 8, gap: 12,
  },
  supplierRowActive: { borderColor: PILL_ACTIVE, backgroundColor: '#f0f4ff' },
  supplierRowLogo: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  supplierRowLogoImg: { width: '100%', height: '100%' },
  supplierRowName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  supplierRowCity: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
});
