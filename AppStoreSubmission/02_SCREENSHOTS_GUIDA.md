# Guida Screenshot App Store — Hompra

## Dimensioni obbligatorie (aprile 2026)

Apple richiede screenshot per **almeno** questi due formati. Se fornisci solo il 6.9", viene comunque scalato — ma fornire entrambi dà un risultato più pulito.

| Display | Risoluzione (px, portrait) | Dispositivo di riferimento |
|---|---|---|
| **6.9" (obbligatorio)** | **1290 × 2796** | iPhone 16 Pro Max / 15 Pro Max |
| **6.5"/6.7" (obbligatorio)** | **1284 × 2778** oppure **1290 × 2796** | iPhone 14 Plus / 13 Pro Max |
| iPad 13" *(solo se supporti iPad)* | 2064 × 2752 | iPad Pro 13" M4 |

⚠️ `supportsTablet: true` è impostato in `app.json`, quindi Apple richiederà anche **screenshot iPad 13"** (2064 × 2752). Se vuoi evitarlo, imposta `supportsTablet: false` e ricostruisci (pubblichi solo iPhone).

**Numero:** minimo **3**, massimo **10** screenshot per formato.

---

## Come catturarli (metodo consigliato — Simulator)

1. Apri `HompraApp/ios/Hompra.xcworkspace` in Xcode.
2. Seleziona come destinazione: **iPhone 16 Pro Max** (per 6.9") → Run ▶
3. Naviga nell'app fino alla schermata da catturare.
4. In Simulator: **⌘ + S** → salva sul Desktop come PNG (risoluzione già corretta).
5. Ripeti cambiando destinazione a **iPhone 14 Plus** (per 6.7").
6. Se supporti iPad: destinazione **iPad Pro 13" M4**.

> Tip: dopo aver scelto il device nel simulatore, chiudi il "device bezel" da *File → Toggle Device Bezels* per ottenere screenshot puliti pixel-perfect.

---

## Schermate consigliate per Hompra (ordine narrativo)

Gli screenshot vendono l'app: mostra il valore nei primi 3, che sono gli unici visibili senza swipe.

| # | Schermata | Cosa mostrare | Caption suggerita |
|---|---|---|---|
| 1 | **Catalogo** | Griglia prodotti con immagini nitide, prezzi, 1–2 categorie visibili | "Il tuo catalogo sempre in tasca" |
| 2 | **Dettaglio prodotto** | Un prodotto con foto grande, descrizione, pulsante "Aggiungi" | "Tutto il prodotto in un tap" |
| 3 | **Carrello** | Carrello con 3-4 prodotti, totale ben visibile | "Ordina in pochi secondi" |
| 4 | **Conferma ordine** | Schermata di successo post-invio | "Conferma istantanea" |
| 5 | **Storico ordini** | Lista ordini precedenti con date e totali | "Tutti i tuoi ordini a portata di mano" |
| 6 | **Login / Profilo** *(opzionale)* | Schermata login o profilo cliente | "La tua area riservata" |

---

## Opzione "screenshot con mockup" (più professionale)

Se vuoi screenshot con cornice iPhone, titolo e sfondo colorato (molto più click-worthy), puoi usare gratis:

- **Screenshots.pro** (https://screenshots.pro) — template pronti
- **Mockuuups Studio** — free tier limitato
- **Figma** — template community "App Store Screenshots"

Carichi lo screenshot "grezzo" preso dal simulatore e ottieni un'immagine 1290×2796 completa.

---

## Dove salvare gli screenshot

Salva i file finali qui:

```
HompraApp/AppStoreSubmission/screenshots/
   ├── 6.9-iphone/
   │   ├── 01-catalogo.png
   │   ├── 02-dettaglio.png
   │   ├── 03-carrello.png
   │   └── ...
   ├── 6.7-iphone/
   │   └── ...
   └── ipad-13/
       └── ...  (solo se supportsTablet = true)
```

Poi li carichi su App Store Connect → iOS App → *[versione]* → sezione "App Previews and Screenshots" (un tab per ogni formato).

---

## Errori più comuni da evitare

- ❌ Screenshot con **status bar** con batteria scarica o operatore visibile — Apple lo accetta ma è poco pro. Usa la feature del simulatore: `xcrun simctl status_bar booted override --time "9:41" --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3`
- ❌ Contenuti **lorem ipsum** o dati di test visibili (es. "prodotto test 123") — Apple può rifiutare
- ❌ Menzionare **Android, Google Play o altre piattaforme** nello screenshot
- ❌ Promettere funzionalità non presenti nell'app
- ❌ Screenshot **non portrait** per un'app portrait-only (la tua è `orientation: portrait`)
