# Report — Multipli su app mobile + gap rispetto al web

Data: 2026-06-03
App esaminata: `HompraApp` (React Native + Expo, singolo codebase per iOS e Android)
Web: `hompra/apps/web` (Next.js)

---

## 1. Problema multipli sulle app (iOS e Android)

### Diagnosi

HompraApp è **un unico codebase React Native**: non esiste codice specifico iOS o Android per il selettore quantità (verificato — nessun `Platform.OS` in `CartScreen.tsx`, `CatalogScreen.tsx`, `ProductDetailScreen.tsx`). Quindi qualunque malfunzionamento dei multipli si manifesta in modo **identico su entrambe le piattaforme**.

Il "cart.da 2pz" visto nello screenshot iOS è scritto dal fornitore nel campo `product.notes` (testo libero): è un workaround, non una vera regola di vendita.

### Causa radice

Il web (commit `6f6ebf39`, 2026-05-27) ha introdotto la feature **F-18 "vendita a multipli"** con `Product.saleMultiple` (int, opzionale). La logica è:

- helper `lib/saleMultiple.ts` (snap-up, snap-down, stepUp, stepDown, badge "cartone N PZ")
- stepper UI che salta direttamente a `saleMultiple` al primo +1 e poi va a multipli
- snap-floor server-side difensivo su add/update qty in `actions/cart.ts` **e** in `/api/mobile/cart/items/route.ts`

**HompraApp non sa nulla di tutto questo.** Verificato:

- `src/types/index.ts` → l'interfaccia `Product` NON ha `saleMultiple`
- nessun riferimento a `saleMultiple` nel codice app (grep vuoto)
- `src/screens/catalog/ProductDetailScreen.tsx` → stepper +/- a passo 1, input manuale libero da 0 a 99999
- `src/screens/catalog/CatalogScreen.tsx` (ProductRow) → idem
- `src/context/CartContext.tsx` → `updateItem(productId, supplierId, qty)` invia la qty grezza al server

### Conseguenza visibile per l'utente

- L'API mobile **`/api/mobile/cart/items`** chiama `snapQuantityToMultiple()` server-side (riga 69, route.ts). Quindi se l'utente digita 3 su un prodotto con `saleMultiple=6`, il server scrive 6. Se digita 7, il server scrive 6 (floor). **Ma l'app mostra ancora la quantità che l'utente ha digitato finché non rifrescia il carrello.** L'utente vede "scattare" la quantità a un valore diverso da quello inserito, senza spiegazione → percepito come bug.
- L'API mobile **`/api/mobile/catalog`** NON espone `saleMultiple` nel SELECT dei prodotti né nel mapping di risposta (verificato: nessuna occorrenza nel file). Quindi l'app non potrebbe nemmeno costruire un badge "cartone 6 PZ" anche volendo.
- L'API mobile **`/api/mobile/cart`** non include `saleMultiple` nei `CartItem.product` ritornati al client.

### Cosa serve per chiudere il gap multipli

| Livello | Modifica | Esito |
|---|---|---|
| Backend `/api/mobile/catalog` | Aggiungere `saleMultiple: true` al SELECT e al mapping output | Mobile riceve il multiplo |
| Backend `/api/mobile/cart` | Aggiungere `saleMultiple` nel SELECT di `product` dentro `items` | Carrello mostra il vincolo |
| Mobile `types/index.ts` | Aggiungere `saleMultiple?: number \| null` su `Product` e nel `Pick<>` di `CartItem.product` | Tipizzazione |
| Mobile (porting) `src/lib/saleMultiple.ts` | Copia 1:1 di `apps/web/src/lib/saleMultiple.ts` (file pure-TS, nessuna dipendenza) | Stessa logica client/server |
| Mobile `ProductDetailScreen.tsx` | Usare `stepUp`/`stepDown` invece di `qty ± 1`; `commitQty` con `snapQuantityToMultiple`; badge "min N {uom} · cartone CHF X.XX" | UX allineata al web |
| Mobile `CatalogScreen.tsx` (ProductRow) | Stesso trattamento sul mini-stepper della card | Stesso comportamento da lista |
| Mobile `CartScreen.tsx` (riga carrello) | Stepper a multipli + chip "cartone N PZ" | Allineato al web `CartItemRow` |

Costo stimato: ~½ giornata (file `saleMultiple.ts` già scritto, basta portarlo).

---

## 2. Altre modifiche web non applicate alle app

Ultimo commit `HompraApp`: **2026-05-05** (bump android v1.0.2).
Commit web rilevanti dopo questa data:

### F-17b — Data consegna confermata dal fornitore
**Commit:** `6f6ebf39` (2026-05-27).
**Cosa fa sul web:** il fornitore in fase di conferma ordine può confermare/modificare la data di consegna richiesta dal cliente; nuovi campi `Order.confirmedDeliveryDate` e `confirmedDeliveryNote`; admin/account order detail li mostrano in formato `DD/MM/YYYY + giorno`.
**Stato mobile:**
- API mobile orders (`/api/mobile/orders` e `/api/mobile/orders/[orderId]`) **NON espone `confirmedDeliveryDate`** (verificato, nessuna occorrenza).
- App `OrdersScreen` / `OrderDetailScreen` → non mostra la data confermata.
**Gap:** sia backend mobile sia UI dell'app.

### F-17 — Conferma ordine avanzata con modifiche fornitore
**Commit:** `10ea43d6` + hotfix `70c52abb`. Il fornitore può sostituire/modificare righe (`SUBSTITUTED`). Il web filtra le righe SUBSTITUTED nel `ConfirmOrderDialog`.
**Stato mobile:** la lista ordini mobile non mostra né lo stato di modifica linea né le note di sostituzione. Da verificare se sono casi che il cliente mobile deve vedere.

### F-19 / F-19b — Fatturazione automatica supplier + i18n fattura
**Commit:** `13a892fd`, `fdcf7db6`, `d390ff41`. Lato admin/fornitore. **Nessun impatto sull'app cliente.**

### Notifiche Metis27 + endpoint stats
**Commit:** `6d4de920`. Webhook server-side. **Nessun impatto diretto sull'app**, ma se vogliamo statistiche di engagement mobile va abilitato anche lì.

### Upload immagini via R2 presigned URL
**Commit:** `14293023`. Lato admin/fornitore. **Nessun impatto sull'app cliente.**

### Pannello demo fornitore + shop pubblico
**Commit:** `8ee78fb4` + serie demo. **Nessun impatto sull'app cliente** (vetrina web pubblica).

### i18n — Spagnolo e Portoghese
**Commit:** `16b433b8` + `3bf9cd1f` (LanguageSelector con UK/ES/PT).
**Stato mobile:** `src/i18n/` non aggiornato per ES e PT (da verificare i file di traduzione). Se il pubblico target ne ha bisogno, va portato anche sull'app.

### feat(shop): optimistic update + debounce sul selettore quantità
**Commit:** `45b97702`. UX miglioramento sullo stepper qty del web.
**Stato mobile:** lo stepper mobile usa già `localQty` + `updateItem` async ma SENZA debounce. Su connessioni lente o tap rapidi può fare N chiamate API. Vale la pena allineare.

---

## 3. Priorità suggerita

### 🔴 P0 — saleMultiple (F-18) · blocker · da fare subito

È l'unica voce che oggi produce un comportamento **percepito come bug** dall'utente (qty digitata ≠ qty salvata dopo refresh). Tutto il resto è "in più". Ordine di esecuzione obbligato:

| Step | Cosa | Dove | Stima | Bloccante per |
|---|---|---|---|---|
| P0.1 | Aggiungere `saleMultiple: true` al SELECT prodotti e al mapping di output | `apps/web/src/app/api/mobile/catalog/route.ts` (entrambi i rami: `productId` e lista) | 10 min | P0.4-P0.6 |
| P0.2 | Aggiungere `saleMultiple: true` nel SELECT di `items.product` | `apps/web/src/app/api/mobile/cart/route.ts` | 5 min | P0.6 |
| P0.3 | Aggiungere `saleMultiple?: number \| null` su `Product` e nel `Pick<>` di `CartItem.product` | `HompraApp/src/types/index.ts` | 5 min | P0.4-P0.6 |
| P0.4 | Copia 1:1 dell'helper (pure TS, zero dipendenze) come `HompraApp/src/lib/saleMultiple.ts` | sorgente `apps/web/src/lib/saleMultiple.ts` | 5 min | P0.5-P0.7 |
| P0.5 | Stepper a multipli + chip "min N · cartone CHF X.XX" + commit con `snapQuantityToMultiple` | `HompraApp/src/screens/catalog/ProductDetailScreen.tsx` | ~1h | — |
| P0.6 | Stepper a multipli sulla card prodotto in lista (`ProductRow`) | `HompraApp/src/screens/catalog/CatalogScreen.tsx` | ~45 min | — |
| P0.7 | Stepper a multipli sulla riga carrello + chip "cartone N PZ" | `HompraApp/src/screens/cart/CartScreen.tsx` | ~45 min | — |
| P0.8 | Smoke test su iOS e Android: qty 1→snap a m, qty=m+1→snap a m, stepUp/stepDown coerenti | dispositivo o simulator | ~30 min | — |

**Totale P0 ≈ ½ giornata.** Una volta finito, il "bug multipli" segnalato sparisce su entrambe le piattaforme contemporaneamente (codebase unico).

### 🟡 P1 — Allineamenti utili ma non urgenti

| # | Intervento | Stima | Note |
|---|---|---|---|
| P1.1 | Esporre `confirmedDeliveryDate` nelle API mobile orders + mostrarla in OrdersScreen / OrderDetail | ~2h | F-17b — il cliente vede quando il fornitore conferma la consegna |
| P1.2 | Debounce stepper qty mobile (allineamento `45b97702`) | ~1h | Migliora reattività su rete lenta. Ha senso farlo nello stesso passaggio di P0.5-P0.7 |

### 🟢 P2 — Nice to have

| # | Intervento | Stima | Note |
|---|---|---|---|
| P2.1 | i18n ES + PT su mobile | ~1h se traduzioni già pronte | Solo se serve quel mercato |
| P2.2 | UI per righe SUBSTITUTED su OrderDetail mobile | da definire | Dipende da scelta prodotto |

---

## 4. Conferma diagnosi rapida

Per riprodurre il "bug" multipli senza modifiche:

1. Sul web admin, su un prodotto qualunque del catalogo del fornitore Ristorfoods, impostare `saleMultiple = 2`.
2. Dall'app (iOS o Android), aprire quel prodotto e inserire qty 3 → tap aggiorna → al refresh la qty diventa 2 (snap floor 3→2).
3. Inserire qty 5 → diventa 4.
4. Inserire qty 1 → diventa 2 (sotto al multiplo → primo multiplo).

Questo conferma che il backend già fa il snap, ma l'app non comunica la regola all'utente.

Quando mi dai l'ok decido cosa portare e in che ordine.
