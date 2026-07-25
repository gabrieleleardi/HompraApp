# Screenshot App Store — Versione Finale

10 screenshot a **1290×2796** (iPhone 6.9"/6.7") ricostruiti dagli screen reali dell'app con **dati inventati** per non esporre informazioni interne/clienti.

## Mapping dati reali → dati inventati

| Campo reale | Sostituito con |
|---|---|
| Cliente `Gabriele Leardi` / `GL` | `Marco Bianchi` / `MB` |
| Email `gabrieleleardi@gmail.com` | `marco.bianchi@ristorante.ch` |
| Azienda cliente `Gabriele Leardi` | `Ristorante Verde Srl` |
| Fornitori `BASIC SA`, `PRO SA`, `Ristorfoods Switzerland`, `STARTER SA` | `GusTo SA`, `Cucina Pro`, `Alpina Food SA`, `Fresca Distribuzione` |
| Località `S.Antonino` | `Bellinzona` |
| Ambiente `Sviluppo` | `Produzione` |
| Ordini tutti `Annullato` (errore test data) | Mix realistico: `Consegnato` / `Spedito` / `Confermato` |
| Codici ordine `ORD-D8A166` | Invariati (già generici) |
| Prodotti (vini, acciughe, cappello) | Invariati (sono prodotti generici food-service) |

## Contenuto degli screen

| # | File | Descrizione |
|---|---|---|
| 01 | `01_login.png` | Schermata di accesso con logo Hompra |
| 02 | `02_fornitori.png` | Selezione fornitore (bottom sheet) dal catalogo |
| 03 | `03_catalogo.png` | Catalogo prodotti con filtri e pulsanti "+" |
| 04 | `04_dettaglio_prodotto.png` | Dettaglio vino con prezzo, sconto e selettore quantità |
| 05 | `05_carrello.png` | Carrello con 2 prodotti (pronta consegna + pre-ordine) |
| 06 | `06_carrello_checkout.png` | Carrello — sezione sede/data/note + warning minimo ordine |
| 07 | `07_ordini.png` | Lista ordini con filtri stato e pillole colorate |
| 08 | `08_dettaglio_ordine.png` | Dettaglio ordine con articoli e totale |
| 09 | `09_profilo.png` | Profilo con avatar, account, lingua e legenda |
| 10 | `10_profilo_info.png` | Profilo scorrinato: lingua, legenda, info app, logout |

## Upload su App Store Connect

Consigliato caricare **6-8 dei 10** (Apple permette max 10 per formato). Ordine narrativo suggerito per massimizzare la conversione:

1. `03_catalogo.png` — il valore principale ("catalogo in tasca")
2. `04_dettaglio_prodotto.png` — esperienza prodotto
3. `05_carrello.png` — facilità d'uso
4. `07_ordini.png` — storico ordini
5. `08_dettaglio_ordine.png` — trasparenza
6. `09_profilo.png` — multi-lingua, account

Skip suggeriti per App Store: `01_login`, `02_fornitori`, `06_carrello_checkout`, `10_profilo_info` (meno "vendibili" come prima impressione, ma li tieni come backup o per TestFlight).

## Cartelle

- `6.9-iphone/` — iPhone 6.9" (iPhone 16 Pro Max / 15 Pro Max) — OBBLIGATORIO
- `6.7-iphone/` — iPhone 6.7" (iPhone 14 Plus / 13 Pro Max) — OBBLIGATORIO (stessi file, Apple accetta 1290×2796 anche per 6.7")

## Nota

Gli screen nella cartella parent `screenshots/6.9-iphone/` e `6.7-iphone/` sono i **vecchi mockup marketing** (con caption in alto e cornice phone). Questi in `final/` sono invece **riproduzioni fedeli dell'app reale** con dati inventati — molto più in linea con le linee guida Apple "Guideline 2.3.3" (screenshot che rappresentano accuratamente l'esperienza dell'app).

**Raccomandazione:** usa questi `final/` per la submission.
