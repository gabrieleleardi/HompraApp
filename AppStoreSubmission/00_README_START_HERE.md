# Pubblicazione Hompra su App Store — Start Here

Questa cartella contiene **tutto** il materiale per pubblicare Hompra sull'Apple App Store. Leggi i file nell'ordine indicato.

## Stato del progetto (check fatti automaticamente)

| Voce | Stato | Note |
|---|---|---|
| App Expo/RN | ✅ | `com.hompra.app`, versione 1.0.0 |
| Cartella `ios/` generata | ✅ | Pronta per Xcode |
| Icona 1024×1024 PNG RGB | ✅ | `AppIcon-1024.png` in questa cartella |
| `Info.plist` configurato | ✅ | `ITSAppUsesNonExemptEncryption=false`, NSFaceIDUsageDescription presente |
| `supportsTablet: true` | ⚠️ | Apple richiederà **anche screenshot iPad 13"** — se non ti servono, metti `false` in `app.json` e rilancia `expo prebuild --clean` |
| Versione Info.plist = 1.0.0, Build = 2 | ⚠️ | Per la prima submit puoi riportare Build a 1 in Xcode, oppure lasciare 2 (entrambe vanno bene) |
| Account Apple Developer | ✅ | Confermato attivo |
| Record su App Store Connect | ✅ | Confermato creato |

## Ordine di lettura

1. **`01_METADATI_APP_STORE.md`** — testi da incollare in App Store Connect (nome, descrizione, keywords, categoria, copyright, note per reviewer)
2. **`02_SCREENSHOTS_GUIDA.md`** — quanti ne servono, come catturarli dal simulatore, schermate consigliate per Hompra
3. **`03_PRIVACY_POLICY.md`** — privacy policy pronta + tabella App Privacy da compilare su ASC
4. **`04_GUIDA_XCODE_ARCHIVE.md`** — procedura Archive → Upload → Submit passo-passo
5. **`AppIcon-1024.png`** — icona App Store pronta da caricare

## Tempi stimati

| Attività | Tempo |
|---|---|
| Preparare screenshot (6 schermate × 2-3 formati) | 1-2 h |
| Scrivere testi finali (riempire placeholder nei metadati) | 30 min |
| Pubblicare Privacy Policy online | 30 min |
| Creare account demo per i reviewer Apple | 15 min |
| Archive + upload build da Xcode | 30 min |
| Compilare pagina versione su App Store Connect | 1 h |
| Attesa review Apple | 24-72 h |

**Totale lavoro attivo: ~4-5 ore + attesa review.**

## Azioni bloccanti — devi farle tu

Queste le devi fare tu manualmente (per policy Apple e motivi di sicurezza non posso farle al posto tuo):

- [ ] Firmare gli **Agreements, Tax, Banking** su App Store Connect (senza questo, la submit fallisce)
- [ ] Pubblicare la **Privacy Policy** a un URL pubblico stabile
- [ ] Pubblicare una pagina di **Support URL** (anche statica o mailto:)
- [ ] Creare un **account demo** nel backend Hompra per i reviewer
- [ ] Verificare che il backend di produzione sia raggiungibile e funzionante durante la review
- [ ] Implementare l'**eliminazione account in-app** (obbligatorio per Apple Guideline 5.1.1(v)) — verifica se già presente nel menu profilo
- [ ] Catturare gli **screenshot** dal simulatore

## Prossimi passi consigliati

Quando hai tempo, dimmi:

1. se implementare (o verificare) la cancellazione account in-app
2. se generare una **pagina HTML statica** per la privacy policy da caricare sul tuo dominio
3. se vuoi che prepari un **account demo** e verifichi la API call di login
4. se vuoi una revisione dei testi marketing italiani/inglesi (se vuoi pubblicare in più lingue)

Buona pubblicazione! 🚀
