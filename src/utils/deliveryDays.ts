/* --- src/utils/deliveryDays.ts ---
 * Filtra i giorni di consegna sulla sede selezionata (gemello del web
 * apps/web/src/lib/orders/deliveryDays.ts). Righe della sede se presenti,
 * altrimenti il set "Generale" (buyerLocationId null). */

export function pickDeliveryRulesForLocation<T extends { buyerLocationId?: string | null }>(
  allRules: T[] | undefined,
  buyerLocationId?: string | null,
): T[] {
  const rules = allRules ?? [];
  if (buyerLocationId) {
    const forLoc = rules.filter((r) => r.buyerLocationId === buyerLocationId);
    if (forLoc.length > 0) return forLoc;
  }
  return rules.filter((r) => r.buyerLocationId == null);
}
