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
  customerPriceCents?: number | null; // prezzo dedicato se presente
}

export interface CartItem {
  id:        string;
  productId: string;
  quantity:  number;
  notes?:    string | null;
  product:   Pick<Product, 'id' | 'code' | 'name' | 'uom' | 'priceCents' | 'imageUrl' | 'currency' | 'availability' | 'isPromo'> & {
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
  createdAt:       string;
  updatedAt:       string;
  items:           OrderItem[];
  supplier:        Pick<Supplier, 'id' | 'name' | 'slug' | 'imageUrl'>;
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
