import { apiClient } from './client';
import type { CatalogResponse, Product, Supplier } from '@/types';

export async function getSuppliers(): Promise<Supplier[]> {
  const { data } = await apiClient.get<{ suppliers: Supplier[] }>('/suppliers');
  return data.suppliers;
}

export type CatalogFilters = {
  search?:       string;
  category?:     string;
  subcategory?:  string;
  availability?: string;   // 'AVAILABLE' | 'COMING_SOON' | 'ON_ORDER' | 'WEEKLY_RESTOCK'
  isNew?:        boolean;
  isPromo?:      boolean;
  isMine?:       boolean;
  page?:         number;
};

export async function getCatalog(
  supplierId: string,
  params?: CatalogFilters,
): Promise<CatalogResponse> {
  const { data } = await apiClient.get<CatalogResponse>('/catalog', {
    params: { supplierId, ...params },
  });
  return data;
}

export async function getProduct(
  supplierId: string,
  productId: string,
): Promise<{ product: Product; catalogDiscountPercent: number }> {
  const { data } = await apiClient.get<{ product: Product; catalogDiscountPercent?: number }>(
    '/catalog',
    { params: { supplierId, productId } },
  );
  return {
    product: data.product,
    catalogDiscountPercent: data.catalogDiscountPercent ?? 0,
  };
}
