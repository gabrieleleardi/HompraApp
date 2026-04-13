# Hompra App — React Native (Expo)

App mobile per clienti Hompra: login, catalogo prodotti, carrello e storico ordini.

## Setup

### 1. Installa le dipendenze

```bash
cd HompraApp
npm install
```

### 2. Configura l'URL del backend

Apri `src/constants/index.ts` e sostituisci:

```ts
export const BASE_URL = __DEV__
  ? 'http://192.168.1.X:3000'   // ← il tuo IP locale (ifconfig | grep inet)
  : 'https://tuodominio.com';
```

> ⚠️ Non usare `localhost` — il simulatore iOS usa un network separato dalla tua macchina.

### 3. Aggiungi le route mobile al backend Next.js

Le cartelle in `hompra/apps/web/src/app/api/mobile/` sono già pronte.
Assicurati che il server Next.js sia in esecuzione con `npm run dev`.

### 4. Genera i file nativi (per Xcode / Android Studio)

```bash
npx expo prebuild --clean
```

Questo crea le cartelle `ios/` e `android/`.

### 5. Apri in Xcode

```bash
open ios/HompraApp.xcworkspace
```

Oppure esegui direttamente da terminale:

```bash
npx expo run:ios      # simulatore
npx expo run:android  # emulatore Android
```

### 6. Sviluppo rapido con Expo Go

```bash
npx expo start
```

Scansiona il QR con l'app **Expo Go** (iOS/Android).

---

## Struttura

```
HompraApp/
├── App.tsx                    # Root con Provider
├── src/
│   ├── api/                   # Client HTTP + endpoint per auth/catalog/cart/orders
│   ├── constants/             # Colori, spaziature, URL base
│   ├── context/               # AuthContext, CartContext
│   ├── navigation/            # Stack + Tab navigator
│   ├── screens/
│   │   ├── auth/LoginScreen
│   │   ├── catalog/CatalogScreen + ProductDetailScreen
│   │   ├── cart/CartScreen
│   │   ├── orders/OrdersScreen + OrderDetailScreen
│   │   └── profile/ProfileScreen
│   └── types/                 # Tipi TypeScript condivisi
```

## Route backend aggiunte

| Metodo | Path | Descrizione |
|--------|------|-------------|
| POST | `/api/mobile/auth/login` | Login → restituisce token |
| POST | `/api/mobile/auth/logout` | Logout |
| GET  | `/api/mobile/auth/me` | Utente corrente |
| GET  | `/api/mobile/suppliers` | Fornitori del buyer |
| GET  | `/api/mobile/catalog` | Prodotti con filtri e paginazione |
| GET  | `/api/mobile/cart` | Carrello |
| POST | `/api/mobile/cart/items` | Aggiorna articolo carrello |
| DELETE | `/api/mobile/cart` | Svuota carrello |
| GET  | `/api/mobile/orders` | Storico ordini |
| POST | `/api/mobile/orders/checkout` | Conferma ordine |
| GET  | `/api/mobile/orders/:id` | Dettaglio ordine |
