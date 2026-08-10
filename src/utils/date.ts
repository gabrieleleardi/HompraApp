/**
 * Parsing/format robusto della data di consegna (`deliveryDateText`).
 *
 * Il campo è salvato sull'ordine come stringa libera e nel DB coesistono due
 * formati storici:
 *   - ISO `YYYY-MM-DD`  → ordini web e app dalla versione con fix
 *   - `DD/MM/YYYY`      → ordini app precedenti al fix (formato europeo)
 *
 * Passare queste stringhe a `new Date(...)` è inaffidabile: "11/08/2026"
 * (11 agosto) viene letto come formato USA MM/DD → 8 novembre. Questo parser
 * riconosce esplicitamente i due formati e costruisce la data con i componenti
 * locali (nessuno shift di timezone).
 *
 * Ritorna `null` per testo libero non-data (es. "Data da confermare").
 */
export function parseDeliveryDateText(raw?: string | null): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();

  // ISO: YYYY-MM-DD (eventuale "T..." ignorato).
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Europeo: DD/MM/YYYY (o con . o -), anno a 4 cifre in coda.
  const eu = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/);
  if (eu) {
    const d = new Date(Number(eu[3]), Number(eu[2]) - 1, Number(eu[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/** ISO civile `YYYY-MM-DD` dai componenti locali (no retrodatazione UTC). */
export function toISODateLocal(d: Date | null): string {
  if (!d || Number.isNaN(d.getTime())) return '';
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Data consegna pronta per il display. Se `raw` è una data valida (ISO o
 * DD/MM/YYYY) la formatta con la locale passata; altrimenti restituisce il raw
 * così com'è (es. "Data da confermare"), senza perdere informazione.
 */
export function formatDeliveryDate(raw?: string | null, localeKey = 'it-IT'): string {
  if (!raw) return '';
  const d = parseDeliveryDateText(raw);
  if (!d) return String(raw);
  return d.toLocaleDateString(localeKey, { day: '2-digit', month: '2-digit', year: 'numeric' });
}
