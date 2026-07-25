/* --- src/lib/saleMultiple.ts ---
   F-18 · Helper condivisi per la "vendita a multipli" (porting 1:1 dal web).
   Vedi apps/web/src/lib/saleMultiple.ts per la documentazione completa.

   Un prodotto può avere `saleMultiple` (intero >= 2). Quando valorizzato:
   - il primo +1 dal carrello salta direttamente a `saleMultiple`
   - successivi +1 / -1 step a `saleMultiple` (es. 6, 12, 18, 24...)
   - edit manuale arrotonda GIÙ al multiplo precedente:
       * qty = 0       → 0 (= rimuovi)
       * 0 < qty < N   → N (= primo multiplo)
       * qty >= N      → floor(qty / N) * N

   Stesso helper viene usato dal client (stepper) e dal server (validazione
   POST /api/mobile/cart/items) per garantire coerenza fra UI e DB. */

/** Vero se il prodotto è vincolato a multipli (saleMultiple >= 2). */
export function hasSaleMultiple(saleMultiple: number | null | undefined): boolean {
  return typeof saleMultiple === 'number' && Number.isFinite(saleMultiple) && saleMultiple >= 2;
}

/**
 * Restituisce il multiplo effettivo per il prodotto.
 * - null/undefined/1/<=0/NaN → 1 (vendita libera)
 * - >=2 → il valore esatto
 */
export function effectiveMultiple(saleMultiple: number | null | undefined): number {
  return hasSaleMultiple(saleMultiple) ? Math.floor(saleMultiple as number) : 1;
}

/**
 * Snap-to-multiple della quantità (vedi tabella nei commenti del file).
 * Sicuro per input non numerici (NaN, negativi).
 */
export function snapQuantityToMultiple(
  qty: number,
  saleMultiple: number | null | undefined,
): number {
  const m = effectiveMultiple(saleMultiple);
  if (!Number.isFinite(qty) || qty <= 0) return 0;
  if (m <= 1) return Math.floor(qty);
  if (qty < m) return m;
  return Math.floor(qty / m) * m;
}

/**
 * Step "+" dal carrello: aggiunge UN multiplo, con snap intelligente quando
 * la qty corrente è "in mezzo" (es. qty legacy non-multipla).
 */
export function stepUp(qty: number, saleMultiple: number | null | undefined): number {
  const m = effectiveMultiple(saleMultiple);
  if (m <= 1) return Math.max(0, Math.floor(qty)) + 1;
  if (!Number.isFinite(qty) || qty <= 0) return m;
  if (qty < m) return m;
  if (qty % m === 0) return qty + m;
  return (Math.floor(qty / m) + 1) * m;
}

/**
 * Step "-" dal carrello: rimuove UN multiplo, con snap intelligente per
 * qty non-multiple.
 */
export function stepDown(qty: number, saleMultiple: number | null | undefined): number {
  const m = effectiveMultiple(saleMultiple);
  if (m <= 1) return Math.max(0, Math.floor(qty) - 1);
  if (!Number.isFinite(qty) || qty <= 0) return 0;
  if (qty < m) return 0;
  if (qty % m === 0) return qty - m;
  return Math.floor(qty / m) * m;
}

/**
 * Formato leggibile del "cartone" = N {uom maiuscolo}.
 * Esempio (uom="pz", multiple=6) → "cartone 6 PZ"
 */
export function formatPackLabel(
  saleMultiple: number | null | undefined,
  uom: string | null | undefined,
): string {
  const m = effectiveMultiple(saleMultiple);
  const u = (uom ?? 'pz').toUpperCase();
  return `cartone ${m} ${u}`;
}
