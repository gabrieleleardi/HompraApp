# Guida: Archive e Upload con Xcode

Questa è la procedura passo-passo per compilare la build di produzione e caricarla su App Store Connect.

---

## Pre-requisiti

| Requisito | Come verificare |
|---|---|
| Mac con macOS recente | — |
| Xcode ≥ 15.4 (meglio 16.x nel 2026) | `xcodebuild -version` |
| CocoaPods installato | `pod --version` |
| Account Apple Developer aggiunto a Xcode | Xcode → Settings → Accounts |
| Agreements su App Store Connect firmati | https://appstoreconnect.apple.com → Agreements, Tax, Banking |

---

## Step 0 — Verifica progetto (una sola volta)

```bash
cd ~/percorso/a/HompraApp

# Pulisci node_modules se necessario
npm install

# Rigenera cartelle native (se hai modificato app.json)
npx expo prebuild --clean

# Installa i pods iOS
cd ios
pod install
cd ..
```

---

## Step 1 — Apri il workspace in Xcode

```bash
open ios/Hompra.xcworkspace
```

⚠️ **Sempre `.xcworkspace`**, mai `.xcodeproj` — altrimenti i Pods non vengono caricati.

---

## Step 2 — Configurazione firma

1. Seleziona il progetto **Hompra** nel Project Navigator (icona blu in alto)
2. Target **Hompra** → tab **Signing & Capabilities**
3. Spunta **Automatically manage signing**
4. **Team:** seleziona il tuo team Apple Developer (apparirà "Gabri Leardi — Personal Team" o il nome della tua organizzazione)
5. **Bundle Identifier:** deve essere `com.hompra.app` (deve corrispondere esattamente a quello registrato su App Store Connect)
6. Xcode creerà automaticamente un **Provisioning Profile** con firma `Apple Distribution`

Se vedi errori rossi qui, di solito è perché:
- il bundle ID non è registrato nel tuo account → vai su https://developer.apple.com/account/resources/identifiers/list → "+" → App ID → inserisci `com.hompra.app`
- Agreements non firmati → vai su App Store Connect e firmali

---

## Step 3 — Imposta versione e build number

Nello stesso pannello del target Hompra → tab **General** → sezione **Identity**:

| Campo | Valore per la prima release |
|---|---|
| **Version** (CFBundleShortVersionString) | **1.0.0** |
| **Build** (CFBundleVersion) | **1** *(oppure il prossimo numero mai usato su ASC)* |

💡 **Regola d'oro:** il numero di build deve essere **sempre maggiore** del più alto già caricato su App Store Connect, anche se la Version è uguale. Se carichi di nuovo con lo stesso build number, Apple rifiuta con errore ITMS-90062.

---

## Step 4 — Seleziona destinazione "Any iOS Device"

Nella barra in alto dove scegli lo schema/destinazione:

```
Scheme: Hompra    Destination: Any iOS Device (arm64)
```

⚠️ Non "iPhone 16 simulator" — non puoi fare archive su un simulatore.

---

## Step 5 — Archive

Menu Xcode → **Product → Archive**

Durata: 3-8 minuti (Expo + React Native bundling).

Se la build fallisce con errori JS (es. "Unable to resolve module..."), esegui prima:

```bash
cd ~/percorso/a/HompraApp
npx expo prebuild --clean
cd ios && pod install && cd ..
```

E riprova.

Al termine si apre automaticamente la finestra **Organizer** con l'archivio nella lista.

---

## Step 6 — Validate (opzionale ma consigliato)

Nella finestra Organizer, con il tuo archivio selezionato:

**Validate App** → segui il wizard:
- Distribution: **App Store Connect**
- Destination: **Upload**
- Signing: **Automatically manage signing**

Apple effettua un check preliminare senza caricare nulla. Se passa, procedi allo step 7.

Errori comuni nello Validate:
| Errore | Soluzione |
|---|---|
| `Missing compliance` | Aggiungi `ITSAppUsesNonExemptEncryption=false` in Info.plist ✅ (già presente) |
| `Invalid bundle ID` | Controlla che `com.hompra.app` sia creato su developer.apple.com |
| `Missing icons` | Rigenera le icone con `expo prebuild --clean` |

---

## Step 7 — Distribute App (upload su App Store Connect)

Nella finestra Organizer → **Distribute App**:

1. Destination: **App Store Connect**
2. Method: **Upload**
3. App Thinning: **None** (default)
4. Spunta **Upload your app's symbols** (per crash reports leggibili)
5. Signing: **Automatically manage signing**
6. Review finale → **Upload**

Durata upload: 5-20 minuti a seconda della connessione.

Al termine: ✅ "App uploaded successfully".

---

## Step 8 — Processing su App Store Connect

Vai su https://appstoreconnect.apple.com → My Apps → **Hompra** → iOS App.

La build apparirà nella sezione **Builds** con stato:
- **Processing** (10-30 minuti) → non è ancora selezionabile
- **Ready to Submit** → puoi allegarla alla versione

Durante il processing, Apple invia un'email al tuo account se trova problemi (es. API non pubbliche, missing privacy keys).

---

## Step 9 — Compila la pagina della versione 1.0.0

Nella sezione **iOS App 1.0.0** (stato "Prepare for Submission"), riempi:

1. **Screenshots** → carica quelli preparati (vedi `02_SCREENSHOTS_GUIDA.md`)
2. **Promotional Text / Description / Keywords / Support URL / Marketing URL** → da `01_METADATI_APP_STORE.md`
3. **Build** → sezione "Build" in basso → "+" → seleziona la build appena caricata
4. **General App Information:**
   - Copyright: `© 2026 [Ragione Sociale]`
   - Primary Category: **Shopping**
   - Secondary Category: **Business**
5. **App Review Information** → credenziali demo + note (vedi template in `01_METADATI_APP_STORE.md` sezione 8)
6. **Version Release:**
   - ✅ "Automatically release this version" — oppure manuale se vuoi decidere tu
7. Sidebar sinistra → **App Privacy** → compila secondo il template in `03_PRIVACY_POLICY.md` appendice
8. Sidebar sinistra → **App Information** → "Age Rating" → Edit → compila il questionario (per Hompra tutte risposte "No/None" → 4+)
9. Sidebar sinistra → **Pricing and Availability** → Free + countries

---

## Step 10 — Submit for Review

In alto a destra sulla pagina della versione → **Add for Review** → **Submit to App Review**.

Stato: **Waiting for Review** → **In Review** → **Pending Developer Release** (se manuale) o **Ready for Sale** (se automatica).

**Tempi medi di review (aprile 2026):** 24-72 ore.

---

## Dopo la review: gestione rifiuti

Se Apple respinge, nel **Resolution Center** trovi il motivo. Problemi più comuni per app come Hompra:

| Motivo rifiuto | Soluzione |
|---|---|
| **4.2 Minimum Functionality** — "l'app sembra una webview" | Assicurati che le schermate native siano effettivamente native (la tua è RN, quindi OK) |
| **5.1.1(v) Account Deletion** — mancante | Implementa un pulsante "Elimina account" in-app, non solo via email |
| **2.1 Demo Credentials** — non funzionano | Verifica che l'account demo `demo-apple@hompra.it` sia attivo prima di ri-submittare |
| **4.0 Design** — "screenshot non rappresentano l'app" | Rifai gli screenshot con contenuto reale |
| **5.1.2 Data Use and Sharing** — privacy policy non raggiungibile | Verifica che l'URL sia pubblico e carichi senza login |

Dopo aver risolto → **Resubmit** dalla stessa pagina (non serve ricaricare la build se il problema è solo nei metadati).
