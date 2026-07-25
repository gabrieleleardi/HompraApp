# Guida Android Studio — Build AAB firmato e upload su Play Console

Procedura passo-passo per compilare la build di produzione Hompra e caricarla su Google Play.

---

## ⚠️ Primo alert importante — targetSdkVersion

Il tuo `android/build.gradle` ha:
```gradle
targetSdkVersion = 34
```

**Da 31 agosto 2025**, Google Play richiede `targetSdkVersion ≥ 35` per nuove app pubblicate. Siamo ad aprile 2026: **devi bumpare a 35** prima della submission.

### Fix rapido

Apri `HompraApp/android/gradle.properties` e aggiungi (se non c'è) oppure modifica:

```properties
android.targetSdkVersion=35
android.compileSdkVersion=35
android.buildToolsVersion=35.0.0
android.minSdkVersion=24
```

Poi rigenera:
```bash
cd HompraApp
npx expo prebuild --clean --platform android
cd android && ./gradlew clean && cd ..
```

---

## Pre-requisiti

| Requisito | Come verificare |
|---|---|
| Android Studio ≥ Koala (2024.1.1) | Android Studio → Help → About |
| JDK 17 (bundled con Android Studio) | `java -version` |
| Android SDK Platform 35 installato | Android Studio → SDK Manager → SDK Platforms |
| Build Tools 35.0.0 installati | Android Studio → SDK Manager → SDK Tools |
| Google Play Console account attivo | https://play.google.com/console |

---

## Step 1 — Crea upload keystore (UNA SOLA VOLTA — non perderlo!)

Google Play usa **Play App Signing**: tu firmi con un *upload keystore* (che puoi perdere e rigenerare), Google firma con la *app signing key* (immutabile).

```bash
cd ~/percorso/a/HompraApp/android/app

keytool -genkey -v \
  -keystore hompra-upload.keystore \
  -alias hompra-upload \
  -keyalg RSA -keysize 2048 \
  -validity 10000
```

Ti chiederà:
- Password keystore → **scegli e conserva** (es. in 1Password)
- Password key alias → di solito uguale alla keystore
- Nome, organizzazione, città, stato, paese → dati reali tuoi

🚨 **Backup!** Salva `hompra-upload.keystore` + password in almeno 2 posti (1Password + disco esterno). Se perdi l'upload keystore, puoi chiedere a Google di resettarlo (ma ci vogliono 1-2 settimane).

---

## Step 2 — Configura gradle per la firma

Crea `~/percorso/a/HompraApp/android/gradle.properties` (se non esiste) e aggiungi **fuori dal git**:

```properties
HOMPRA_UPLOAD_STORE_FILE=hompra-upload.keystore
HOMPRA_UPLOAD_KEY_ALIAS=hompra-upload
HOMPRA_UPLOAD_STORE_PASSWORD=la-tua-password
HOMPRA_UPLOAD_KEY_PASSWORD=la-tua-password
```

⚠️ **Verifica che `gradle.properties` sia in `.gitignore`** — non committare MAI le password.

Poi modifica `android/app/build.gradle`, nel blocco `android { ... }`:

```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('HOMPRA_UPLOAD_STORE_FILE')) {
                storeFile file(HOMPRA_UPLOAD_STORE_FILE)
                storePassword HOMPRA_UPLOAD_STORE_PASSWORD
                keyAlias HOMPRA_UPLOAD_KEY_ALIAS
                keyPassword HOMPRA_UPLOAD_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            ...
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
        }
    }
}
```

---

## Step 3 — Imposta versionCode e versionName

Apri `HompraApp/app.json` e verifica:

```json
{
  "expo": {
    "version": "1.0.0",
    "android": {
      "package": "com.hompra.app",
      "versionCode": 1
    }
  }
}
```

💡 **Regola d'oro:** `versionCode` deve essere **sempre crescente** — per ogni build caricata su Play (anche se rigetti una versione) devi incrementarlo di +1. Non può tornare indietro.

Poi rilancia `npx expo prebuild --clean --platform android` per propagare i valori a `android/app/build.gradle`.

---

## Step 4 — Genera AAB firmato

Dalla root del progetto:

```bash
cd ~/percorso/a/HompraApp

# assicurati deps installate
npm install

# prebuild pulito
npx expo prebuild --clean --platform android

# build AAB release (non APK!)
cd android
./gradlew bundleRelease
```

Durata: 5-15 minuti (prima volta) / 2-5 minuti (successive).

Output:
```
android/app/build/outputs/bundle/release/app-release.aab
```

### Verifica firma

```bash
jarsigner -verify -verbose -certs app/build/outputs/bundle/release/app-release.aab
```

Deve mostrare `jar verified` e il CN del tuo upload keystore.

### Verifica versionCode

```bash
unzip -p app/build/outputs/bundle/release/app-release.aab BundleConfig.pb > /dev/null  # should not error
# o usa bundletool per ispezionare
```

Oppure più facile: `./gradlew bundleRelease` stampa il versionCode in output.

---

## Step 5 — Crea l'app in Play Console

Se non l'hai già fatto:

1. https://play.google.com/console → **Create app**
2. App name: **Hompra**
3. Default language: **Italian – IT**
4. App or game: **App**
5. Free or paid: **Free**
6. Accept declarations (Play policies, US export)

Play Console crea la scheda con package name che associerà automaticamente quando carichi il primo AAB.

---

## Step 6 — Carica l'AAB in Closed Testing

⚠️ **Account personal:** Google Play dal 2023 richiede a chi apre un account "Personal" di completare **Closed testing** con almeno **12 tester per 14 giorni consecutivi** prima di poter pubblicare in Production. Vedi `05_CLOSED_TESTING.md` per i dettagli.

Procedura upload AAB:

1. Play Console → **Hompra** → **Testing → Closed testing** (sidebar sinistra)
2. Se non esiste, clicca **Create track**
3. Tab **Releases** → **Create new release**
4. **App signing by Google Play** → lascia attivo (Play gestirà la signing key di produzione)
5. **App bundles** → **Upload** → trascina `app-release.aab`
6. **Release name** → 1.0.0 (1) — generato automaticamente da Play
7. **Release notes** → incolla:
   ```
   <it-IT>Prima release di Hompra per Android. Catalogo, carrello e ordini.</it-IT>
   <en-US>First Android release of Hompra. Catalog, cart and orders.</en-US>
   ```
8. **Review** e **Save**
9. Tab **Testers** → aggiungi email dei tester (vedi `05_CLOSED_TESTING.md`)
10. **Start rollout to Closed testing**

Stato: **In review** (1-3 giorni) → **Available to testers**.

---

## Step 7 — Testare l'app

I tester ricevono un link di opt-in tipo:
```
https://play.google.com/apps/testing/com.hompra.app
```

Cliccano "Become a tester" → installano da Play Store (marcata "Early access"). Usano l'app normalmente per 14+ giorni.

---

## Step 8 — Promuovere a Production (dopo 14 giorni)

Quando hai completato i 14 giorni di testing con 12+ tester:

1. Play Console → **Hompra** → **Production** (sidebar)
2. **Create new release**
3. In alto a destra: **Promote release from Closed testing** → seleziona la release 1.0.0 (1)
4. Compila tutti i campi mancanti (vedi checklist in `01_METADATI_PLAY_STORE.md`)
5. **Start rollout to Production**

Stato: **In review** (24-72h) → **Published**.

---

## Errori comuni e soluzioni

| Errore | Soluzione |
|---|---|
| `Your app must target Android API level 35 or higher` | Bumpare `targetSdkVersion` in gradle.properties → rebuild |
| `Version code 1 has already been used` | Incrementa `versionCode` in app.json → prebuild → rebuild |
| `The APK must be signed with the same certificates as the previous version` | Stai usando una keystore diversa — recupera quella originale o chiedi reset a Google |
| `Missing 64-bit version` | Già risolto: Expo genera automaticamente arm64-v8a |
| `Your app contains exposed Google Maps API keys` | Usa variabili d'ambiente, non committare chiavi |
| `Declared permission <x> not used` | Rimuovi dal `AndroidManifest.xml` o aggiungi la dichiarazione d'uso |
| `SDK policy violation — data safety form incomplete` | Completa Data Safety form (`02_DATA_SAFETY.md`) |
| `Privacy policy URL is not publicly accessible` | Pubblica la privacy policy a un URL raggiungibile senza login |
| `New apps must use Play App Signing` | In Play Console → App integrity → opt-in a Play App Signing |

---

## Script helper: `build-android.sh`

Salva questo script nella root del progetto per automatizzare i build futuri:

```bash
#!/bin/bash
set -e

echo "📦 Prebuild Android..."
npx expo prebuild --clean --platform android

echo "🔨 Building signed AAB..."
cd android
./gradlew clean
./gradlew bundleRelease

AAB="app/build/outputs/bundle/release/app-release.aab"
if [ -f "$AAB" ]; then
  SIZE=$(du -h "$AAB" | cut -f1)
  echo "✅ AAB built: $AAB ($SIZE)"
  echo "Upload questo file su Play Console → Testing/Production → Create release"
else
  echo "❌ Build failed: AAB not found"
  exit 1
fi
```

Uso: `chmod +x build-android.sh && ./build-android.sh`
