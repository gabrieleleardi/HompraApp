# Data Safety Form — Hompra (Google Play)

Google Play richiede di dichiarare quali dati raccogli e come li usi. Devi compilare in **Play Console → Policy → App content → Data safety**. Queste sono le risposte corrette per Hompra.

---

## Step 1 — Data collection and security

### Does your app collect or share any of the required user data types?
**✅ Yes**

### Is all of the user data collected by your app encrypted in transit?
**✅ Yes** *(tutta la comunicazione passa via HTTPS/TLS tra app e backend)*

### Do you provide a way for users to request that their data is deleted?
**✅ Yes** *(via email a privacy@hompra.com e/o dalla sezione Profilo → Elimina account in-app)*

⚠️ **Bloccante:** verifica che esista un meccanismo di eliminazione account **in-app** prima di rispondere "Yes" — Google ha rinforzato questo requisito nel 2024.

---

## Step 2 — Data types collected

Per ogni categoria seleziona **Collected** (e non "Shared" — non condividete con terze parti) con queste risposte:

### PERSONAL INFO

| Data type | Collected? | Purposes | Processing |
|---|---|---|---|
| **Name** | ✅ Collected | App functionality, Account management | Required (non può essere opt-out) |
| **Email address** | ✅ Collected | App functionality, Account management, Communication | Required |
| **User IDs** | ✅ Collected | App functionality, Account management, Analytics | Required |
| **Address** | ✅ Collected | App functionality (consegna ordini) | Required |
| **Phone number** | ✅ Collected | App functionality | Required |

### FINANCIAL INFO

| Data type | Collected? |
|---|---|
| **User payment info** | ❌ Not collected (pagamento offline) |
| **Purchase history** | ✅ Collected — Purposes: App functionality, Account management |

### LOCATION

| Data type | Collected? |
|---|---|
| **Approximate location** | ❌ Not collected |
| **Precise location** | ❌ Not collected |

### APP ACTIVITY

| Data type | Collected? | Purposes |
|---|---|---|
| **App interactions** | ✅ Collected | Analytics, App functionality |
| **In-app search history** | ❌ Not collected |
| **Other actions** | ❌ Not collected |

### APP INFO AND PERFORMANCE

| Data type | Collected? | Purposes |
|---|---|---|
| **Crash logs** | ✅ Collected | Analytics |
| **Diagnostics** | ✅ Collected | Analytics |

### DEVICE OR OTHER IDs

| Data type | Collected? | Purposes |
|---|---|---|
| **Device or other IDs** | ✅ Collected | Analytics, App functionality |

### MESSAGES / PHOTOS / AUDIO / FILES / CONTACTS / CALENDAR / HEALTH

**❌ Not collected** (nessuna di queste categorie)

---

## Step 3 — Data usage and handling

Per ciascun dato dichiarato sopra, rispondi:

| Domanda | Risposta per Hompra |
|---|---|
| **Is this data collected, shared, or both?** | Collected only (never shared) |
| **Is this data processed ephemerally?** | No (persistito sul backend) |
| **Is this data required, or can users choose whether it's collected?** | Required — l'app non funziona senza |
| **What is this data used for?** | App functionality + Account management + Analytics (solo per crash/diagnostics) |

### Data sharing — sharing con chi?

❌ **Hompra non condivide dati con terze parti a scopi commerciali.**

I processori tecnici (hosting, database, email transazionali) sono considerati "Service providers" e NON vanno dichiarati come data sharing in Data Safety (sono coperti da contratto DPA).

---

## Step 4 — Security practices

| Domanda | Risposta |
|---|---|
| **Is all user data encrypted in transit?** | ✅ Yes (TLS/HTTPS) |
| **Do you follow Families Policy?** | N/A (app B2B, non per bambini) |
| **Have you committed to the Play Families Policy?** | No |
| **Has your app been independently validated against a global security standard?** | No (salvo non abbiate SOC 2, ISO 27001, etc.) |

---

## Step 5 — Preview & publish

Dopo aver compilato tutto, Google mostra una **preview** di come apparirà la sezione "Data safety" sulla scheda app. Deve mostrare:

✅ *This app may collect these data types: Personal info, Financial info, App activity, App info and performance, Device or other IDs*
✅ *Data is encrypted in transit*
✅ *You can request that data be deleted*

**Salva e invia** → la dichiarazione diventa parte della tua submission.

---

## Mapping con la Privacy Policy

Le risposte qui sopra **devono coincidere** con quanto dichiarato nella Privacy Policy pubblica (`AppStoreSubmission/03_PRIVACY_POLICY.md`). Google confronta e se trova incoerenze può bloccare la pubblicazione.

| Data Safety (Play) | Privacy Policy |
|---|---|
| Name, Email, Address, Phone | Art. 2 — Dati forniti dall'utente |
| User IDs | Art. 2 — Dati raccolti automaticamente |
| Purchase history | Art. 2 — "Ordini effettuati e relativi dettagli" |
| Crash logs, Diagnostics | Art. 2 — "Log tecnici di errore" |
| Device IDs | Art. 2 — "Identificativo del dispositivo" |

✅ Allineamento OK con la privacy policy già preparata.

---

## Errori comuni che fanno bloccare l'app

| ❌ Errore | ✅ Soluzione |
|---|---|
| Dichiari "Not collected" ma l'app raccoglie email per login | Corretto: dichiara Email |
| Non dichiari crash logs | Se l'app crasha, Android invia i crash a te via Play Console: dichiara |
| Dichiari "Shared" per i dati passati al database | Il DB è un service provider, NON data sharing |
| Privacy Policy link morto / richiede login | Deve essere pubblico, raggiungibile da URL diretto |
| Non implementi delete account in-app ma rispondi "Yes" al prompt | Bloccante — Google può rigettare in review |
