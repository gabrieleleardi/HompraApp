# Privacy Policy — Hompra

> Questa è una **bozza-template conforme GDPR e App Store guidelines**. Prima di pubblicarla devi:
>
> 1. Sostituire ogni `[PLACEHOLDER]` con i dati reali
> 2. Farla rivedere da un legale/DPO se tratti dati particolari
> 3. Pubblicarla a un URL pubblico stabile (es. `https://hompra.it/privacy`)
> 4. Inserire quell'URL in App Store Connect e nella sezione `Info.plist` se necessario

---

## Privacy Policy di Hompra

**Ultimo aggiornamento:** 15 aprile 2026

La presente informativa descrive come **[RAGIONE SOCIALE HOMPRA]** (di seguito "noi", "Hompra") raccoglie e tratta i dati personali degli utenti dell'applicazione mobile Hompra (di seguito "l'App"), in conformità al Regolamento UE 2016/679 (GDPR).

### 1. Titolare del trattamento

**[RAGIONE SOCIALE HOMPRA]**
Sede legale: [INDIRIZZO COMPLETO]
P.IVA: [PARTITA IVA]
Email: [privacy@hompra.it]
PEC: [pec@hompra.it]

### 2. Dati personali raccolti

L'App raccoglie e tratta i seguenti dati:

**Dati forniti direttamente dall'utente:**
- Indirizzo email e credenziali di accesso
- Nome, cognome, ragione sociale
- Indirizzo di consegna e fatturazione
- Numero di telefono
- Ordini effettuati e relativi dettagli

**Dati raccolti automaticamente:**
- Identificativo del dispositivo e del sistema operativo (per funzionamento tecnico)
- Log tecnici di errore (per diagnostica)

L'App **non** utilizza tracker pubblicitari di terze parti, **non** utilizza l'IDFA (Identifier for Advertisers) e **non** vende dati a terzi.

### 3. Finalità del trattamento

I dati sono trattati per:

a) **Erogazione del servizio** — permettere l'accesso all'account cliente, la visualizzazione del catalogo e l'invio degli ordini (base giuridica: esecuzione del contratto, art. 6.1.b GDPR)

b) **Adempimenti fiscali e contabili** — fatturazione, conservazione documentale (base giuridica: obbligo di legge, art. 6.1.c GDPR)

c) **Supporto clienti** — rispondere a richieste di assistenza (base giuridica: legittimo interesse, art. 6.1.f GDPR)

d) **Sicurezza e prevenzione frodi** — log di accesso, diagnostica errori (base giuridica: legittimo interesse, art. 6.1.f GDPR)

### 4. Modalità e luogo del trattamento

I dati sono trattati con strumenti elettronici, con misure di sicurezza adeguate a prevenirne la perdita, l'uso illecito o l'accesso non autorizzato. I dati sono conservati su server situati in **[Unione Europea / specificare provider, es. AWS Francoforte, Vercel EU]**.

### 5. Destinatari dei dati

I dati possono essere comunicati a:

- **Fornitori di servizi tecnici** (hosting, database, invio email transazionali) nominati Responsabili del Trattamento ex art. 28 GDPR. In particolare:
  - **[PROVIDER HOSTING, es. Vercel Inc.]** — hosting applicativo
  - **[PROVIDER DATABASE, es. Supabase / PostgreSQL hosting]** — database
  - **[PROVIDER EMAIL, es. Resend / SendGrid]** — email transazionali
- **Apple Inc.** (crash reporting di sistema, se abilitato)
- **Autorità competenti** su richiesta legittima

I dati **non** sono trasferiti al di fuori dello Spazio Economico Europeo salvo quanto coperto da clausole contrattuali standard (SCC) approvate dalla Commissione UE.

### 6. Periodo di conservazione

- Dati account: per la durata del rapporto + 10 anni (obblighi fiscali)
- Log tecnici: massimo 12 mesi
- Ordini: 10 anni (obblighi fiscali italiani)

### 7. Diritti dell'utente

Ai sensi degli artt. 15-22 GDPR hai diritto di:

- accedere ai tuoi dati
- ottenerne la rettifica o cancellazione
- limitarne o opporti al trattamento
- alla portabilità
- proporre reclamo al Garante Privacy (www.garanteprivacy.it)

Per esercitare questi diritti: **[privacy@hompra.it]**.

### 8. Eliminazione account

Puoi richiedere l'eliminazione del tuo account scrivendo a **[privacy@hompra.it]** oppure direttamente dalla sezione "Profilo → Elimina account" dell'App. L'eliminazione verrà processata entro 30 giorni, fatti salvi i dati che dobbiamo conservare per obblighi di legge (fatturazione).

> ⚠️ **Apple richiede** che l'app fornisca un meccanismo in-app per eliminare l'account (Guideline 5.1.1(v)). Se non è ancora implementato, è **bloccante** per la review.

### 9. Minori

L'App è destinata esclusivamente a maggiorenni (clienti business). Non raccogliamo consapevolmente dati di minori.

### 10. Modifiche

Ci riserviamo di modificare questa policy; la data in alto indica l'ultimo aggiornamento. Le modifiche rilevanti saranno comunicate in-app.

---

## Appendice: Apple "App Privacy" (da compilare in App Store Connect)

Quando in App Store Connect compili la sezione **App Privacy → Data Types**, per Hompra dichiara:

| Categoria | Dato | Raccolto | Collegato all'utente | Usato per tracking |
|---|---|---|---|---|
| Contact Info | Name | ✅ | ✅ | ❌ |
| Contact Info | Email Address | ✅ | ✅ | ❌ |
| Contact Info | Phone Number | ✅ | ✅ | ❌ |
| Contact Info | Physical Address | ✅ | ✅ | ❌ |
| Identifiers | User ID | ✅ | ✅ | ❌ |
| Purchases | Purchase History | ✅ | ✅ | ❌ |
| Usage Data | Product Interaction | ✅ | ✅ | ❌ |
| Diagnostics | Crash Data | ✅ | ❌ | ❌ |
| Diagnostics | Performance Data | ✅ | ❌ | ❌ |

**Data Use (per ogni dato sopra):** *App Functionality* + *Analytics* (se applicabile) + *Developer's Advertising or Marketing* ❌

**Tracking:** ❌ NO (non usiamo IDFA, non facciamo pubblicità cross-app)
