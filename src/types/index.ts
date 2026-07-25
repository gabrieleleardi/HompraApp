// ─────────────────────────────────────────────────────────
// TIPI CONDIVISI — rispecchiano il DB Prisma
// ─────────────────────────────────────────────────────────

export type UserRole = 'CUSTOMER' | 'SUPPLIER' | 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  id:           string;
  email:        string;
  name?:        string | null;
  role:         UserRole;
  buyerId?:     string | null;
  supplierSlug?: string | null;
  customerName?: string | null;
}

export type TaxMode = 'NET' | 'GROSS';

export interface Supplier {
  id:          string;
  slug:        string;
  name:        string;
  description?: string | null;
  imageUrl?:   string | null;
  shopLogoUrl?: string | null;
  logoBgColor?: string | null;
  city?:       string | null;
  phone?:      string | null;
  currency?:   string;             // valuta fornitore (da settingsJson.currency)
  taxMode?:    TaxMode;            // NET | GROSS
  minOrderCents?:     number;      // minimo ordine del cliente (per-buyer)
  shippingCostCents?: number;      // spese spedizione del cliente (per-buyer)
}

export type Availability = 'AVAILABLE' | 'COMING_SOON' | 'ON_ORDER' | 'WEEKLY_RESTOCK';

export interface Product {
  id:           string;
  code:         string;
  name:         string;
  category?:   string | null;
  subcategory?: string | null;
  uom?:         string | null;
  priceCents:   number;
  currency:     string;
  imageUrl?:    string | null;
  available:    boolean;
  isPromo:      boolean;
  isNew:        boolean;
  availability: Availability;
  notes?:       string | null;
  cutoffTime?:  string | null;
  restockRulesJson?: any;            // mappa giorno ordine → giorno arrivo (WEEKLY_RESTOCK)
  leadTimeDays?:     number | null;  // giorni di lead time (ON_ORDER)
  expectedArrival?:  string | null;  // data attesa ISO (COMING_SOON)
  taxRate?:          number | null;  // aliquota IVA (es. 2.6, 8.1)
  averageWeight?:    number | null;  // peso medio per unità (per prodotti a KG)
  saleMultiple?:     number | null;  // F-18 · null = vendita libera, >=2 = vincolo cartone
  customerPriceCents?: number | null; // prezzo dedicato se presente
}

export interface CartItem {
  id:        string;
  productId: string;
  quantity:  number;
  notes?:    string | null;
  product:   Pick<Product, 'id' | 'code' | 'name' | 'uom' | 'priceCents' | 'imageUrl' | 'currency' | 'availability' | 'isPromo' | 'cutoffTime' | 'restockRulesJson' | 'leadTimeDays' | 'expectedArrival' | 'taxRate' | 'averageWeight' | 'saleMultiple'> & {
    customerPriceCents?: number | null;
  };
}

export interface DeliveryRule {
  weekday:          string;  // 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'
  cutoffDay?:       string | null;
  cutoffTime?:      string | null;
  cutoffDaysBefore?: number | null;
}

export interface Cart {
  id:             string;
  supplierId:     string;
  supplier:       Pick<Supplier, 'id' | 'name' | 'slug' | 'imageUrl' | 'shopLogoUrl' | 'logoBgColor'>;
  items:          CartItem[];
  totalCents:     number;
  deliveryRules?: DeliveryRule[];
  discountPercent?:        number;  // sconto applicato sul totale ordine (0-100)
  catalogDiscountPercent?: number;  // sconto applicato sui prezzi di catalogo (0-100)
  // ─── dati commerciali del fornitore per questo buyer ───
  currency?:           string;   // valuta del fornitore (default 'CHF')
  taxMode?:            TaxMode;  // 'NET' (imponibile + IVA) | 'GROSS' (IVA inclusa)
  minOrderCents?:      number;   // minimo ordine del cliente
  shippingCostCents?:  number;   // spese di spedizione se sotto minimo
}

export type OrderStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'PRE_ORDER';

export interface OrderItem {
  id:             string;
  productCode:    string;
  productName:    string;
  productUom?:    string | null;
  quantity:       number;
  priceCents:     number;
  totalLineCents: number;
  itemNote?:      string | null;
}

export interface Order {
  id:              string;
  publicCode?:     string | null;
  supplierId:      string;
  status:          OrderStatus;
  totalCents:      number;
  currency:        string;
  notes?:          string | null;
  deliveryDateText?: string | null;
  // F-17b · data consegna confermata dal fornitore (ISO) + nota motivazione
  confirmedDeliveryDate?: string | null;
  confirmedDeliveryNote?: string | null;
  requestedDate?:         string | null;
  createdAt:       string;
  updatedAt:       string;
  items:           OrderItem[];
  supplier:        Pick<Supplier, 'id' | 'name' | 'slug' | 'imageUrl'>;
}

// ─── Notifiche ───────────────────────────────────────────

export type NotificationType =
  | 'ORDER_CONFIRMED'
  | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'ORDER_RECEIVED'
  | 'CONNECTION_APPROVED'
  | 'CONNECTION_REQUEST'
  | 'SECURITY_ALERT'
  | 'GENERIC'
  | string;

export interface AppNotification {
  id:        string;
  type:      NotificationType;
  title:     string;
  message:   string;
  link?:     string | null;
  payload?:  any | null;
  readAt?:   string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  total:         number;
  unreadCount:   number;
}

// ─── Risposte API ────────────────────────────────────────

export interface ApiError {
  error:   string;
  code?:   string;
  status?: number;
}

export interface LoginResponse {
  user:  User;
  token: string;
}

export interface CatalogResponse {
  products:   Product[];
  total:      number;
  categories: string[];
  catalogDiscountPercent?: number;  // sconto % applicato sui prezzi di catalogo
  discountPercent?:        number;  // sconto % applicato a fine ordine
}

export interface CartResponse {
  carts: Cart[];
}

export interface OrdersResponse {
  orders: Order[];
  total:  number;
}

export interface CheckoutResponse {
  order: Order;
}
