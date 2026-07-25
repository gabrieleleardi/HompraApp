/* --- src/hooks/useDebouncedQty.ts ---
   Porting del pattern usato sul web in AddToCart.tsx (commit 45b97702).

   Optimistic update + debounce 350ms sul selettore quantità del carrello.

   Comportamento:
   - setLocalQty(n) aggiorna la UI all'istante (nessuna attesa rete)
   - flushSoon() schedula una chiamata al server dopo `delay` ms
   - tap rapidi consecutivi vengono coalescati in UNA sola chiamata
   - se una chiamata è in volo e arriva un nuovo valore, si attende il
     completamento e poi si invia il valore finale (evita race condition)
   - in caso di errore la qty locale viene ripristinata all'ultimo valore
     sincronizzato (lastSyncedQty)
   - cleanup del timer al dismount per evitare update su componenti morti
*/
import { useEffect, useRef, useState } from 'react';

type Updater = (qty: number) => Promise<void> | void;

export function useDebouncedQty(serverQty: number, updater: Updater, delay = 350) {
  // Qty mostrata all'utente (optimistic).
  const [qty, setQty] = useState(serverQty);

  // Ultimo valore noto al server (rollback in caso di errore).
  const lastSyncedRef = useRef(serverQty);
  // Valore in attesa di essere inviato (coda).
  const pendingRef    = useRef<number | null>(null);
  // True mentre c'è una chiamata in volo.
  const inFlightRef   = useRef(false);
  // Timer del debounce.
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True se il componente è montato (no setState dopo unmount).
  const mountedRef    = useRef(true);

  // Sincronizza con cambi del server (es. dopo fetchCarts) SOLO se non
  // abbiamo modifiche locali in attesa: altrimenti l'utente starebbe
  // ancora cliccando e perderemmo i suoi tap.
  useEffect(() => {
    if (pendingRef.current === null && !inFlightRef.current) {
      lastSyncedRef.current = serverQty;
      setQty(serverQty);
    }
  }, [serverQty]);

  useEffect(() => () => {
    mountedRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  async function flush() {
    if (pendingRef.current === null) return;
    if (inFlightRef.current) return; // un'altra esecuzione sta già drenando la coda
    inFlightRef.current = true;
    try {
      // Drena la coda fino a quando non si stabilizza.
      while (pendingRef.current !== null) {
        const next = pendingRef.current;
        pendingRef.current = null;
        await updater(next);
        if (mountedRef.current) {
          lastSyncedRef.current = next;
        }
      }
    } catch (err) {
      // Rollback ottimistico → ultimo valore noto al server.
      if (mountedRef.current) {
        setQty(lastSyncedRef.current);
      }
      pendingRef.current = null;
      // eslint-disable-next-line no-console
      console.warn('[useDebouncedQty] sync failed, rolled back', err);
    } finally {
      inFlightRef.current = false;
    }
  }

  function flushSoon(next: number) {
    // Optimistic UI update immediato.
    setQty(next);
    pendingRef.current = next;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, delay);
  }

  /** Per onBlur/onSubmit dell'input: invia subito senza attendere il timer. */
  function flushNow(next: number) {
    setQty(next);
    pendingRef.current = next;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    void flush();
  }

  return { qty, setQty, flushSoon, flushNow };
}
