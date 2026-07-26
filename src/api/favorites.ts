import { apiClient } from './client';

/**
 * F-21 · Preferiti del cliente.
 * Backend: /api/mobile/favorites (scope Buyer).
 */

/** Lista degli id prodotto preferiti del buyer (opz. filtrata per fornitore). */
export async function getFavoriteIds(supplierId?: string): Promise<string[]> {
  const { data } = await apiClient.get<{ productIds: string[] }>('/favorites', {
    params: supplierId ? { supplierId } : undefined,
  });
  return data.productIds ?? [];
}

/** Toggle del preferito. Ritorna lo stato risultante. */
export async function toggleFavorite(productId: string): Promise<boolean> {
  const { data } = await apiClient.post<{ isFavorite: boolean }>('/favorites', { productId });
  return !!data.isFavorite;
}
