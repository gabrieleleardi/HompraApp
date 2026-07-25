# Pubblicazione Hompra su Google Play Store — Start Here

Tutto il materiale per pubblicare Hompra su Google Play. Molto del lavoro fatto per iOS è riutilizzabile (privacy policy, screenshots, descrizione). Qui ci sono solo gli elementi Android-specifici.

## Stato del progetto (check fatti)

| Voce | Stato | Note |
|---|---|---|
| Cartella `android/` generata | ✅ | Pronta per Android Studio |
| applicationId | ✅ | `com.hompra.app` |
| versionCode / versionName | ✅ | `1` / `1.0.0` |
| targetSdkVersion | ⚠️ | **34 — DEVE passare a 35** (obbligatorio da Aug 2025). Vedi `03_GUIDA_ANDROID_STUDIO.md` |
| compileSdkVersion | ✅ | 35 |
| minSdkVersion | ✅ | 24 (Android 7+) |
| Icona 512×512 Play Store | ✅ | `PlayIcon-512.png` |
| Feature graphic 1024×500 | ✅ | `FeatureGraphic-1024x500.png` |
| Screenshot phone | ✅ | Riutilizzo da `AppStoreSubmission/screenshots/final/6.9-iphone/` |
| Account Google Play Console | ✅ | Personal, attivo |
| Closed testing (14 giorni, 12 tester) | ❌ | **Bloccante** — devi completarlo prima di Production |

## Ordine di lettura

1. **`01_METADATI_PLAY_STORE.md`** — testi e scelte per la store listing (app name, descrizioni, categoria, content rating)
2. **`02_DATA_SAFETY.md`** — risposte al form Data Safety di Play (equivalente di App Privacy Apple)
3. **`03_GUIDA_ANDROID_STUDIO.md`** — creazione keystore, firma, build AAB, upload
4. **`04_CLOSED_TESTING.md`** — requisito 14 giorni + 12 tester (bloccante per account Personal)
5. **`PlayIcon-512.png`** — icona Play Store
6. **`FeatureGraphic-1024x500.png`** — banner grande Play Store

## Asset condivisi con iOS (riutilizzo)

| Asset | Dove trovarlo |
|---|---|
| Privacy Policy | `AppStoreSubmission/03_PRIVACY_POLICY.md` — stessa policy vale per Play |
| Screenshot app | `AppStoreSubmission/screenshots/final/6.9-iphone/` — Play accetta 1290×2796 e li scala |
| Descrizione app (testo base) | `AppStoreSubmission/01_METADATI_APP_STORE.md` sezione "Descrizione" — ho già fatto una variante Play in `01_METADATI_PLAY_STORE.md` |
| Account demo per reviewer | Stesso account demo creato per Apple va bene anche per Google |

## Timeline realistica (account Personal)

| Attività | Tempo |
|---|---|
| Bumpare targetSdk a 35, prebuild, rebuild | 1 h |
| Creare upload keystore + configurare signing | 30 min |
| Prima build AAB firmato | 30 min |
| Creare app in Play Console + caricare AAB in Closed testing | 1 h |
| Attesa review Closed testing | 1-3 giorni |
| Invitare 12 tester + attendere opt-in | 2-4 giorni |
| **Closed testing attivo (14 giorni consecutivi con 12 opted-in)** | **14 giorni** |
| Compilare store listing completa + Data Safety + Content rating | 2 h |
| Promote to Production + review Google | 24-72 h |

**Totale: ~3 settimane** dal primo upload alla live.

## Azioni bloccanti — devi farle tu

- [ ] Bumpare `targetSdkVersion` a 35 in `android/gradle.properties` e ricostruire
- [ ] Creare **upload keystore** `hompra-upload.keystore` e conservarlo in 2 posti (1Password + backup)
- [ ] Aggiungere credenziali keystore in `android/gradle.properties` (fuori da git)
- [ ] Verificare `gradle.properties` è in `.gitignore`
- [ ] Pubblicare Privacy Policy a URL stabile (lo stesso di Apple)
- [ ] Creare app in Play Console
- [ ] Compilare Data Safety form secondo `02_DATA_SAFETY.md`
- [ ] Compilare Content Rating questionnaire (risposta "Sì" ad alcol per via dei vini)
- [ ] Reclutare 12 tester reali (Google Group)
- [ ] Inviare link di opt-in ai tester
- [ ] Verificare implementazione in-app di "Elimina account" (requisito Play 2024)

## Note importanti

**Screenshots:** Play Store accetta screenshot iPhone 1290×2796 — non serve ri-generare per Android. Se vuoi screenshot che mostrino UI Material Design (Android-native), dovresti rebuildare l'app su emulatore Android (non mockup) — ma per la prima release i tuoi mockup esistenti vanno benissimo.

**Delete account in-app:** dal 2024 Play richiede un flusso in-app per eliminare l'account. Verifica che `ProfileScreen.tsx` abbia questo pulsante, altrimenti è bloccante in review.

**Ads:** hai dichiarato "No ads". Se in futuro aggiungi AdMob o similar, devi aggiornare questa dichiarazione.

**App content rating:** il risultato atteso è PEGI 12 / Teen per via dei riferimenti all'alcol nel catalogo (vini). Questo limita l'audience target a 12+.

## Tools utili

- **Bundletool** (per ispezionare AAB): `brew install bundletool` — genera APK da AAB per test locali
- **Play Console app** (Android): monitora review, crash e reviews da mobile
- **Android Studio Profiler**: verifica performance prima della release

Buona pubblicazione! 🚀
