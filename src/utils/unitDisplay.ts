/* --- src/utils/unitDisplay.ts ---
 * Visualizzazione unità d'ordine vs unità di prezzo (gemella del web
 * apps/web/src/lib/pricing/unitDisplay.ts).
 *
 * Prodotti a peso (uom=KG): si ordinano a pezzo/confezione ma il prezzo è al kg.
 * Il totale resta prezzo × averageWeight × quantità. Qui solo le etichette:
 * quantità in PZ/CONF, prezzo "/ kg", peso totale stimato.
 */

export type UnitInfo = {
  uom?: string | null;
  orderUnit?: string | null;
  averageWeight?: number | null;
};

export function isWeightPriced(uom?: string | null): boolean {
  return (uom ?? '').trim().toUpperCase() === 'KG';
}

export function orderUnitLabel(p: UnitInfo): string {
  const explicit = (p.orderUnit ?? '').trim();
  if (explicit) return explicit.toUpperCase();
  if (isWeightPriced(p.uom)) return 'PZ';
  return (p.uom ?? 'PZ').trim().toUpperCase() || 'PZ';
}

export function priceUnitSuffix(uom?: string | null): string {
  return isWeightPriced(uom) ? '/ kg' : '';
}

export function estimatedWeightKg(p: UnitInfo, qty: number): number | null {
  if (!isWeightPriced(p.uom)) return null;
  const w = p.averageWeight && p.averageWeight > 0 ? p.averageWeight : 1;
  return qty * w;
}

export function formatKg(kg: number): string {
  const rounded = Math.round(kg * 1000) / 1000;
  return String(rounded).replace('.', ',');
}
