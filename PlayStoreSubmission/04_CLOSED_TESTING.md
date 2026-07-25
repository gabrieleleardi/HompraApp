# Closed Testing — Requisito obbligatorio per account Personal

🚨 **IMPORTANTE:** Tu hai un account **Personal**. Google Play dal 14 novembre 2023 richiede a questi account di:

1. **Iscrivere almeno 12 tester** a un track "Closed testing"
2. **Mantenerli opted-in per ≥ 14 giorni consecutivi**
3. **Raccogliere feedback** prima di essere eleggibili per Production

Senza questo, il pulsante **"Promote to Production"** è disabilitato.

---

## Cosa conta come "tester attivo"

Un tester è valido se:

- ✅ Ha cliccato il link di opt-in (web o Play Store)
- ✅ Risulta "Accepted" in Play Console → Testers
- ✅ **Rimane opted-in** per tutti i 14 giorni (non deve fare opt-out)

Non è richiesto che:
- installi effettivamente l'app (bonus se lo fa, ma non obbligatorio)
- apra l'app
- lasci un feedback

---

## Checklist setup Closed Testing

### 1. Crea una Google Group (consigliato)

Più facile che gestire la lista email manualmente. Vai su https://groups.google.com → Crea gruppo:

- Nome: `Hompra Beta Testers`
- Email: `hompra-beta-testers@googlegroups.com`
- Visibility: Private
- Who can join: Invited users only

### 2. Invita 12+ tester al gruppo

Email che puoi usare:
- Il tuo account Google secondario
- Account Google di famigliari/amici (con consenso)
- Account Google dei tuoi agenti commerciali
- Account Google dei primi 3-5 clienti pilota
- Tester remunerati via TestFairy, BetaFamily, Pollfish (se non hai contatti a sufficienza)

🚨 **IMPORTANTE:** non usare account "throwaway" generati appositamente — Google può rilevarli (stesso IP, creati in sequenza) e invalidare il test. Usa account reali con cronologia.

### 3. Aggiungi il gruppo in Play Console

Play Console → **Hompra → Testing → Closed testing → [la tua track] → Testers tab**:

- **Email list** → aggiungi `hompra-beta-testers@googlegroups.com`
- **Feedback URL or email** → `supporto@hompra.com`

### 4. Invia il link di opt-in

Il link si trova in Play Console → Closed testing → **Testers → How testers join your test**:

```
https://play.google.com/apps/testing/com.hompra.app
```

Manda questo link via email ai tester con un testo tipo:

```
Ciao,

Sto testando la mia nuova app Hompra su Android e mi serve il tuo
aiuto per completare la fase di closed testing richiesta da Google
prima della pubblicazione ufficiale.

È solo questione di cliccare questo link con il tuo account Google:

👉 https://play.google.com/apps/testing/com.hompra.app

Poi clicchi "Become a tester". Non devi installare l'app se non
vuoi — basta che il tuo opt-in rimanga attivo per 14 giorni.

Grazie mille!
Gabri
```

### 5. Monitora il conteggio

Play Console → Testing → Closed testing → **Testers tab** mostra:
- Total testers
- Opt-in status

Aspetta che **Total testers ≥ 12** e che tutti siano "opted in".

### 6. Nota la data di inizio

Il countdown di 14 giorni parte **dal momento in cui il 12° tester opta-in**.

Se dopo 14 giorni hai ancora 12+ tester opted-in:
- Play Console sblocca l'opzione **"Promote to Production"**
- Puoi procedere con la submission

Se un tester fa opt-out durante i 14 giorni:
- Il conteggio **non si resetta** ma scende sotto 12
- Devi aggiungerne uno nuovo e aspettare che arrivi a 12 opted-in stabili per 14 giorni

---

## Piano consigliato (timeline realistica)

| Giorno | Attività |
|---|---|
| **D0** | Build AAB, crea track Closed testing, carica la release |
| **D0-D2** | Review Google della release (automatica, di solito 1-3 giorni) |
| **D2** | Invia email ai 12 tester con link di opt-in |
| **D2-D4** | Raccogli opt-in — monitora conteggio |
| **D4** | Raggiunto il 12° opt-in: inizia countdown 14 giorni |
| **D4-D18** | I tester restano opted-in. Raccogli feedback spontaneo. |
| **D18** | Requisito sbloccato. Vai a Production → Promote release → compila store listing → Submit for review |
| **D18-D21** | Google review produzione (24-72h) |
| **D21** | 🎉 App live sul Play Store! |

**Totale tempo minimo: ~3 settimane** dalla prima submit AAB al live.

---

## Cosa mostrare ai tester (opzionale ma consigliato)

Per ottenere feedback utile (che Google valuta positivamente), puoi chiedere ai tester di:

1. Installare l'app
2. Fare login con un account demo che fornisci tu
3. Provare 3 flussi: sfogliare catalogo → aggiungere al carrello → inviare ordine
4. Compilare un breve form di feedback (Google Form)

**Template form:**

```
1. Da 1 a 5, quanto è facile trovare un prodotto? (1=difficile, 5=facilissimo)
2. Da 1 a 5, quanto è chiara la schermata del carrello?
3. Hai notato bug o crash? (testo libero)
4. Cosa miglioreresti? (testo libero)
5. Sistema/versione Android usato: (es. Samsung S23 / Android 14)
```

Raccogliere almeno 3-5 risposte con contenuto (non solo "tutto ok") aiuta a dimostrare a Google che hai fatto testing serio, e migliora la qualità della 1.0.0.

---

## Alternative per arrivare velocemente a 12 tester

Se non trovi 12 persone:

1. **Firebase App Distribution** (pre-fase) — distribuisci APK ai tuoi tester reali per testing prima ancora di caricare su Play, poi convertili in closed tester Play
2. **Servizi a pagamento:**
   - **BetaFamily** (da ~$50 per test) — pool di tester Android verificati
   - **TestFairy** / **Firebase App Distribution**
   - **r/androiddev** community swap (offri testing reciproco)
3. **LinkedIn:** post "cerco tester Android per la mia nuova app B2B" — spesso 20+ persone rispondono in un giorno

---

## FAQ

**Q: Posso iniziare il closed testing prima di avere la store listing completa?**
R: Sì. Puoi caricare l'AAB in Closed testing con informazioni minime. La store listing completa serve solo per la Production.

**Q: Se aggiorno l'app durante i 14 giorni, il countdown si resetta?**
R: No. Il countdown guarda solo il mantenimento dei 12 tester opted-in, non la stabilità della release.

**Q: Posso avere più di un account Developer Google?**
R: Tecnicamente sì, ma Google rileva pattern e può sospendere entrambi se il collegamento è evidente. Non farlo per bypassare il 14-day requirement.

**Q: Serve anche un "Internal testing" track?**
R: No, non è obbligatorio. Internal testing è utile per team interni (max 100 tester, nessun delay), ma non soddisfa il requirement 14-day. Devi usare **Closed testing**.

**Q: Posso convertire l'account Personal in Organization per skippare il 14-day?**
R: Sì, ma richiede un D-U-N-S number (numero identificativo aziendale, Bradstreet) e 1-2 settimane per la verifica. Vale la pena se hai già una società legale; altrimenti spendi quel tempo facendo i 14 giorni di testing.
