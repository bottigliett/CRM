# Report Andamento Aziendale — Mismo Studio

**Data estrazione:** (generato dal CRM)
**Periodo analizzato:** ottobre 2024 – ottobre 2026 (~24 mesi)
**Fonti:** database `crm_dashboard` — tabelle `invoices`, `transactions`, `tasks`, `events`, `projects`
**Esclusioni richieste:** DIEFFE BROS SRL e MISMO (hanno comunque €0 di fatture, quindi non impattano i ricavi).

> ⚠️ Nota sulla qualità dei dati: vedi sezione 10. Le ore "effettive" (`tasks.actual_hours`) sono tutte a 0; le ore disponibili sono le **ore stimate** dei task e le **durate degli eventi di calendario**. Il conto economico (income) registrato non coincide con le fatture incassate.

---

## 1. Quadro generale (sintesi)

| Indicatore | Valore |
|---|---|
| Fatture **incassate** (PAID) | **€ 52.837,50** (138 fatture) |
| Fatture **emesse non pagate** (ISSUED) | € 4.363,00 (12 fatture) |
| Fatture in **bozza** (DRAFT) | € 1.134,00 (6 fatture) |
| Costi totali registrati | **€ 31.621,71** (395 movimenti) |
| **Margine lordo** (incassato − costi) | **€ 21.215,79** |
| **EBITDA (approssimativo)** | **€ 23.227,47** |
| Clienti con almeno una fattura pagata | 28 |
| Ore tracciate (eventi calendario) | ~1.278 ore |
| Ore stimate (task) | ~734 ore |

L'azienda ha un trend **in forte crescita nel 2026**: quasi il 70% dei ricavi incassati arriva nel 2026 (gen–ott).

---

## 2. Ricavi (fatture incassate)

### Per anno
| Anno | Fatture | Incassato |
|---|---|---|
| 2024 (solo dicembre) | 1 | € 2.150,00 |
| 2025 | 25 | € 14.187,50 |
| 2026 (gen–ott) | 112 | € 36.500,00 |
| **Totale** | **138** | **€ 52.837,50** |

### Top 10 clienti per incassato
| Cliente | Incassato | % |
|---|---|---|
| ValeDent (Serimedical) | € 5.515,50 | 10,4% |
| Tecnorete Villafranca | € 5.159,00 | 9,8% |
| Studio Bardolino SRL | € 4.590,00 | 8,7% |
| Industriale Cremona SRL | € 4.253,00 | 8,0% |
| Immobiliare Villafranca (Alexandru Adam) | € 4.151,00 | 7,9% |
| MAD Sas (Tomasetto) | € 2.534,00 | 4,8% |
| PagheSolution | € 2.389,00 | 4,5% |
| Industriale Crema | € 2.317,00 | 4,4% |
| Immobiliare Vigasio | € 2.310,00 | 4,4% |
| Marco Frezza | € 2.150,00 | 4,1% |

I primi 5 clienti = ~45% del fatturato. Concentrazione media; i clienti "industriali" (Cremona/Crema/Piacenza/Desenzano/Castiglione/Brixia) insieme valgono ~€15.000 (28%) ma sono i più pesanti in ore (vedi §6).

---

## 3. Costi e spese generali

### Per categoria (tutto il periodo)
| Categoria | Importo |
|---|---|
| Stipendi | € 14.356,46 |
| Affitto | € 9.941,50 |
| Varie | € 1.384,29 |
| Utenze | € 1.329,19 |
| Software | € 1.184,06 |
| Tasse | € 1.045,43 |
| Fornitori | € 665,69 |
| Marketing/Pubblicità | € 353,13 |
| Viaggi | € 274,72 |
| Hardware | € 99,00 |
| Altro Costo | € 21,99 |
| *(anomalia: "Altri Ricavi" come uscita)* | € 966,25 |
| **Totale** | **€ 31.621,71** |

**Stipendi + Affitto = € 24.297,96 = 77% dei costi.** I due costi dominanti sono il personale/compensi e l'affitto.

I principali percipienti (campo "fornitore"): Stefano Costato ~€7.169, Davide Marangoni ~€7.037, Francesca Miazzi ~€5.500, Anna Bonzanini ~€4.241.

### Per anno
| Anno | Uscite |
|---|---|
| 2024 | € 8.316,56 |
| 2025 | € 11.454,00 |
| 2026 (gen–set) | € 11.851,15 |

---

## 4. EBITDA e margine

EBITDA = Ricavi − Costi operativi (escludendo **Tasse** €1.045,43 e la **migrazione contabile** €966,25 che non è un costo operativo reale).

- Costi operativi = 31.621,71 − 1.045,43 − 966,25 = **€ 29.610,03**
- **EBITDA ≈ € 23.227,47** (~44% del fatturato incassato)
- Margine lordo semplice (incassato − tutte le uscite) = **€ 21.215,79**

> Il margine ~40-44% è sano, ma va letto con cautela: il conto "income" registrato in Finance Tracker (€31.762) è inferiore di ~€21.000 alle fatture incassate (€52.837). Significa che **non tutte le entrate vengono registrate a banco** (o si registrano solo in fatturazione). Consiglio di riconciliare (vedi §10).

---

## 5. Andamento mensile (fatture incassate)

| Mese | Incassato |
|---|---|
| 2024-12 | € 2.150 |
| 2025-01 | € 1.547 |
| 2025-02 | € 2.490 |
| 2025-03 | € 1.547 |
| 2025-04 | € 1.159 |
| 2025-05 | € 469 |
| 2025-06 | € 1.465 |
| 2025-07 | € 469 |
| 2025-08 | € 469 |
| 2025-09 | € 469 |
| 2025-10 | € 1.583 |
| 2025-11 | € 2.052 |
| 2025-12 | € 469 |
| 2026-01 | € 2.001 |
| 2026-02 | € 4.281 |
| 2026-03 | € 4.459 |
| 2026-04 | € 4.442 |
| 2026-05 | € 5.359 |
| 2026-06 | € 5.507 |
| 2026-07 | € 4.940 |
| 2026-08 | € 2.823 |
| 2026-09 | € 2.688 |

Passaggio da una media di ~€900/mese nel 2025 a ~€4.000–5.500/mese nel 2026.

---

## 6. Clienti: ricavi vs ore (efficienza)

Legenda: `ore eventi` = ore effettive di calendario attribuite al cliente; `€/h` = incassato diviso ore eventi (indice di redditività del tempo).

| Cliente | Incassato | Ore eventi | Ore stimate task | €/ora (eventi) |
|---|---|---|---|---|
| ValeDent | € 5.515,50 | 27,4 | 27,5 | € 201,3 |
| Tecnorete Villafranca | € 5.159,00 | — | — | — |
| Studio Bardolino | € 4.590,00 | 117,5 | 68 | € 39,1 |
| Industriale Cremona | € 4.253,00 | 126,6 | 124,5 | € 33,6 |
| Imm. Villafranca (Adam) | € 4.151,00 | 86,3 | 47,5 | € 48,1 |
| MAD Sas | € 2.534,00 | 42,8 | 49,5 | € 59,2 |
| PagheSolution | € 2.389,00 | 30,3 | 2,5 | € 78,8 |
| Industriale Crema | € 2.317,00 | 34,6 | 13,5 | € 67,0 |
| Imm. Vigasio | € 2.310,00 | 8,0 | 29,5 | € 288,8 |
| Marco Frezza | € 2.150,00 | — | — | — |
| Tecnomanerbio | € 2.128,00 | 62,8 | 43 | € 33,9 |
| Studio Industriale | € 2.128,00 | 28,0 | 12,5 | € 76,0 |
| Imm. Valpo | € 1.925,00 | 44,3 | 94,5 | € 43,5 |
| Imm. Castel D'Azzano | € 1.925,00 | 67,8 | 72 | € 28,4 |
| Industriale Piacenza | € 1.628,00 | 40,7 | 29 | € 40,0 |
| Industriale Castiglione | € 1.189,00 | 16,4 | 14 | € 72,5 |
| Brixia Industriale | € 1.189,00 | 33,3 | 13,5 | € 35,7 |
| Imm. Pescantina | € 1.155,00 | 22,2 | 25 | € 52,0 |
| Imm. Centro Storico | € 1.155,00 | 13,6 | 6 | € 84,9 |
| Industriale Desenzano | € 939,00 | 36,6 | 19 | € 25,7 |
| Alessandro Acquaviva | € 690,00 | 1,0 | 0 | € 690,0 |
| ValpoStay | € 500,00 | — | — | — |
| MC Solutions | € 449,00 | 1,5 | — | € 299,3 |

**Lettura:** i clienti con **€/ora più bassi** (che "rendono" meno per ogni ora investita) sono nell'ordine:
**Industriale Desenzano (€25,7/h), Castel D'Azzano (€28,4/h), Industriale Cremona (€33,6/h), Tecnomanerbio (€33,9/h), Brixia (€35,7/h), Studio Bardolino (€39,1/h), Piacenza (€40/h)**.

Sono quasi tutti i progetti **"industriali" (capannoni)** e i clienti storici con tante ore tracciate.

---

## 7. Quale processo richiede più tempo

Ore tracciate per categoria evento (escluse DIEFFE/MISMO):

| Categoria | Ore | Eventi |
|---|---|---|
| **Design (Stefano)** | **365,0** | 242 |
| Social | 204,5 | 166 |
| Personale Davide | 157,3 | 101 |
| Appuntamenti clienti | 154,3 | 53 |
| Personale Giulia | 141,3 | 79 |
| Personale Nicole | 112,2 | 57 |
| Interno | 63,4 | 63 |
| Personale Andrea | 22,9 | 34 |
| Amministrazione | 14,5 | 20 |
| Call/Chiamate | 7,0 | 12 |
| Marketing | 6,5 | 5 |
| Sviluppo | 2,8 | 3 |
| Altro/NULL | 12,0 | 5 |

**Il processo più oneroso è la Design (365 ore, di Stefano)** — il lavoro creativo di post-produzione/grafica. Seguono **Social (204,5h)** e **Appuntamenti clienti (154,3h)**.

Le categorie "Personale Davide/Giulia/Nicole/Andrea" (433h totali) sono **tempo interno/personale**, non fatturabile: andrebbe separato per misurare la vera produttività.

---

## 8. Dove si stanno perdendo soldi

1. **Fatture emesse non incassate: € 4.363** (12 fatture). Di queste, ~**€ 2.270 sono scadute** da tempo, tra cui:
   - Industriale Cremona (Nicola Gervasi) `#262025` €365 — **scaduta da 282 giorni**;
   - Immobiliare Pescantina: 3× €385 scadute da 87/56/25 giorni;
   - Industriale Piacenza e Desenzano: 4× €250 scadute da 11 giorni.
   → Serve un **processo di recupero crediti** su questi incassi.

2. **Clienti/linee sottoprezzate** (vedi §6): i progetti **industriali** (Cremona, Crema, Piacenza, Desenzano, Castiglione, Brixia) richiedono molte ore ma hanno €/ora tra i più bassi. In particolare:
   - Industriale Cremona: €3.300 di budget a fronte di ~200h stimate → **€16,5/ora stimata**;
   - PagheSolution: €80 per 8h → **€10/ora**.

3. **Anomalia contabile:** €966,25 registrati come **uscita** nella categoria "Altri Ricavi" ("Balance migration to another region") — non è un costo operativo, va riclassificato.

4. **Riconciliazione mancante:** il Finance Tracker registra solo ~€22.795 come "Fatture Clienti" contro €52.837 di fatture incassate. O mancano ~€30k di entrate a banco, oppure parte del fatturato non è tracciato nei flussi di cassa.

---

## 9. Quanto alzare i prezzi (raccomandazioni)

Basato sul confronto €/ora e sul fatto che il lavoro "Design" (il cuore del valore) è 365h/anno:

1. **PagheSolution**: da €80 → **€300–400** (attualmente €10/h stimata) o eliminare la linea se non strategica.
2. **Linea industriale (capannoni)** — Cremona, Crema, Piacenza, Desenzano, Castiglione, Brixia, Manerbio:
   - I progetti da €1.500–€3.300 per 80–200h vanno portati a **€4.000–€6.000** (obiettivo €40–50/ora stimata).
   - In particolare **Industriale Cremona** (€16,5/h) andrebbe **raddoppiato** (~€6.000+).
3. **Studio Bardolino** e altri storici con tante ore e €/ora ~€35-40: aumentare del **20-30%** nei rinnovi.
4. **Canoni ricorrenti** (molti clienti a €469/mese): valutare un ritocco a **€549–599/mese** per i nuovi, mantenendo i vecchi a €469.
5. **ValeDent e MC Solutions** (€200-300/h) sono già ben prezzati: sono il modello da replicare (servizio ad alto valore, poche ore).

Regola pratica emersa dai dati: sotto **€35/ora** tracciata il cliente non è profittevole; puntare a **€50–70/ora** sul lavoro a progetto.

---

## 10. Qualità dati e azioni consigliate

1. **`tasks.actual_hours` è sempre 0** → le "ore lavorate" si deducono solo da stime ed eventi. Iniziare a registrare le ore effettive nei task.
2. **Riconciliare incassi:** allineare le entrate del Finance Tracker alle fatture PAID (manca ~€30k di tracciamento).
3. **Riclassificare** la voce €966,25 "Altri Ricavi" (uscita) e unificare la categoria duplicata ("Altri Ricavi" vs `"Altri Ricavi"` con virgolette).
4. **Separare il tempo interno** ("Personale Davide/Giulia/Nicole/Andrea", 433h) da quello fatturabile per misurare la produttività reale.

---

*Report generato interrogando direttamente il database del CRM (MySQL).*
