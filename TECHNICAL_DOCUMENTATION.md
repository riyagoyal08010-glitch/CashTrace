# CashTrace — Technical Documentation

**Smart India Hackathon 2026 · Problem Statement SIH26184**
**Team TraceX · Team ID 182770**

> Development of a Predictive Analytics Framework for Cybercrime Complaints to Forecast Likely Cash Withdrawal Locations in Advance, Enabling Generation of Actionable Intelligence for Timely and Proactive Cybercrime Intervention.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Problem Background](#2-problem-background)
3. [System Architecture](#3-system-architecture)
4. [Data Layer](#4-data-layer)
5. [Graph Layer & Temporal Safety](#5-graph-layer--temporal-safety)
6. [Feature Engineering](#6-feature-engineering)
7. [Data Validation](#7-data-validation)
8. [Train / Validation / Test Splitting](#8-train--validation--test-splitting)
9. [Machine Learning Models](#9-machine-learning-models)
10. [Evaluation Framework](#10-evaluation-framework)
11. [Backend API](#11-backend-api)
12. [Frontend (Dashboard)](#12-frontend-dashboard)
13. [Technology Stack](#13-technology-stack)
14. [Repository Structure](#14-repository-structure)
15. [Setup & Installation](#15-setup--installation)
16. [Development Workflow](#16-development-workflow)
17. [Known Limitations](#17-known-limitations)
18. [Future Work](#18-future-work)
19. [References](#19-references)

---

## 1. Overview

CashTrace is a predictive analytics system that answers one question:

> **Given a cybercrime complaint filed *before* the fraudulent money is cashed out, can we predict where and when it will be withdrawn — before it happens?**

Today, cybercrime financial investigation is almost entirely reactive: by the time investigators trace a fraudulent transaction chain, the money has typically already been withdrawn as cash and is untraceable. CashTrace inverts this by combining graph-based fund-flow tracing with geospatial-temporal prediction to generate **actionable intelligence** — a ranked list of likely cash-out locations and time windows — while there is still time to act.

The system is built and validated as a full pipeline: synthetic data generation → leakage-safe graph construction → feature engineering → two prediction models → a serving API → an investigator-facing dashboard. Every stage has been tested and verified against ground truth before being handed off to the next.

---

## 2. Problem Background

Cybercrime and financial-fraud complaints have risen sharply in India, driven by phishing, investment scams, fake job offers, and social engineering. In most cases:

1. A victim is deceived into transferring money.
2. Funds are rapidly layered across a chain of "mule" bank accounts to obscure their origin.
3. The funds are withdrawn as cash at an ATM or bank branch, or converted to an untraceable asset.

Investigators currently begin tracing the transaction chain only *after* a complaint is filed — by which point cash-out has frequently already occurred. There is no existing system that analyzes complaint and transaction data **in advance** to anticipate where and when a cash-out is likely, which severely limits the window for intervention.

### 2.1 Why This Is a Genuinely Hard Prediction Problem

Early in development, we validated a critical structural fact about this problem using our own transaction graph: **only ~17% of true cash-out accounts are reachable via known transactions at the moment a complaint is filed.** Most of the mule chain simply hasn't happened yet.

This rules out a naive approach (graph traversal / shortest-path search) as a complete solution. CashTrace's fund-flow model must **predict** likely future mule-account behavior from partial information and historical patterns — not just look up an already-existing path. This is precisely why the problem is a legitimate machine learning task rather than a database query.

---

## 3. System Architecture

CashTrace is organized into five logical tiers:

```
Data Sources
      │
      ▼
Point-in-Time Transaction Graph  (leakage-safe snapshot)
      │
      ├─────────────────┐
      ▼                 ▼
Fund-Flow Model    Geo-Time Model
      │                 │
      └─────────┬───────┘
                ▼
        Backend API (FastAPI)
                │
      ┌─────────┴─────────┐
      ▼                   ▼
Investigator Dashboard   Alerts
```

| Layer | Responsibility |
|---|---|
| **Data sources** | Synthetic complaint, transaction, and withdrawal records (see §4) |
| **Transaction graph** | A temporally-safe graph queried exactly as it looked at complaint-filing time (see §5) |
| **Fund-flow model** | Ranks likely cash-out accounts from a victim's transaction trail |
| **Geo-time model** | Predicts withdrawal location and time window |
| **Backend API** | Orchestrates both models, computes risk scores, serves predictions |
| **Dashboard / Alerts** | Investigator-facing visualization and notification |

### 3.1 Per-Complaint Processing Workflow

For a single complaint, the system executes seven steps:

1. **Complaint filed** — victim account identified, reported amount captured.
2. **Query transaction graph** — fetch the victim's account history *as of the complaint's filing time only*.
3. **Trace fund flow** — rank candidate cash-out accounts.
4. **Predict location and time** — for each candidate, forecast withdrawal location and window.
5. **Score and generate report** — combine both models into a ranked intelligence report.
6. **Push to dashboard** — investigator reviews the report.
7. **Alert if high-risk** — notify relevant bank branches / cybercrime cells ahead of the predicted window.

---

## 4. Data Layer

Real cybercrime/banking data (e.g. from the National Cybercrime Reporting Portal) is not publicly available for prototyping. CashTrace therefore uses a **purpose-built synthetic data generator** (`data-pipeline/generate_synthetic_data.py`) that produces five linked tables designed to be structurally realistic.

### 4.1 Schema

**`accounts.csv`**

| Column | Type | Description |
|---|---|---|
| `account_id` | string | Unique account identifier |
| `holder_name` | string | Synthetic name |
| `bank` | string | One of 10 major Indian banks |
| `opened_date` | date | Account opening date |
| `is_mule` | bool | Whether this account was used in a fraud chain |
| `is_victim` | bool | Whether this account was defrauded |

**`transactions.csv`**

| Column | Type | Description |
|---|---|---|
| `transaction_id` | string | Unique transaction identifier |
| `from_account` | string | Sender account ID |
| `to_account` | string | Receiver account ID |
| `amount` | float | Transfer amount |
| `timestamp` | datetime | When the transfer occurred |

**`complaints.csv`**

| Column | Type | Description |
|---|---|---|
| `complaint_id` | string | Unique complaint identifier |
| `victim_account` | string | The defrauded account |
| `reported_amount` | float | Amount reported by the victim |
| `first_transaction_timestamp` | datetime | When the fraud began |
| `filed_timestamp` | datetime | When the complaint was filed |
| `state` | string | Complaint's associated state/region |
| `is_predictive_case` | bool | Whether the complaint was filed *before* cash-out (see §4.2) |
| `true_cashout_account` | string | Ground truth — the account that ultimately cashed out |
| `true_withdrawal_event` | string | Ground truth — the corresponding withdrawal event ID |

**`locations.csv`**

| Column | Type | Description |
|---|---|---|
| `location_id` | string | Unique location identifier |
| `name` | string | Bank/ATM name |
| `type` | string | `ATM` or `Bank Branch` |
| `city` | string | One of 10 major Indian cities |
| `latitude`, `longitude` | float | Geo-coordinates |

**`withdrawal_events.csv`**

| Column | Type | Description |
|---|---|---|
| `event_id` | string | Unique withdrawal event identifier |
| `account_id` | string | Account that withdrew |
| `location_id` | string | Where the withdrawal occurred |
| `amount` | float | Withdrawal amount |
| `timestamp` | datetime | When the withdrawal occurred |
| `is_fraud_linked` | bool | Whether this withdrawal is part of a fraud chain |
| `ring_id` | string / null | Which fraud ring this withdrawal belongs to, if any |

### 4.2 Temporal Correctness — The Predictive-Case Design

An early version of the generator had a critical bug: complaints were filed *after* the cash-out withdrawal, which would make any model trained on it learn to "predict" something that had already happened. This was identified and fixed. The corrected design:

- **~85% of complaints** (`is_predictive_case = True`) are filed 0.5–24 hours after the fraud starts (representing realistic victim reporting speed), with the actual cash-out happening a further 2–48 hours later — a genuine future event.
- **~15% of complaints** are filed *after* the cash-out already occurred — a realistic "too late to act" cohort, excluded from model training/evaluation.

This was verified with an automated cross-check: for every complaint, the `is_predictive_case` flag was confirmed to exactly match the true timestamp ordering, with zero mismatches across the full dataset.

### 4.3 Geographic Realism — Fraud Rings

Withdrawal locations are not uniformly random. The generator creates **12 "rings"** — small geographic clusters of 3–7 nearby ATMs/branches within one city — and each fraud case draws its cash-out location from an assigned ring ~90% of the time (10% is an intentional "off-pattern" case). On a 500-complaint test run, this produced 500 fraud withdrawals concentrated across 12 rings, reused 40–55 times each — giving the geo-time model's clustering step genuine, learnable spatial signal rather than noise.

### 4.4 Dataset Size (Default Parameters)

| File | Rows | Size |
|---|---|---|
| `accounts.csv` | ~4,750 | ~308 KB |
| `transactions.csv` | ~9,750 | ~772 KB |
| `complaints.csv` | 500 | ~52 KB |
| `locations.csv` | 150 | ~16 KB |
| `withdrawal_events.csv` | ~4,500 | ~380 KB |

Scaling guidance: `n_complaints` cannot exceed `n_background_accounts` (each complaint needs a unique victim). The generator raises a clear error if this constraint is violated, rather than failing with an opaque pandas error.

---

## 5. Graph Layer & Temporal Safety

`data-pipeline/graph_builder.py` is the shared infrastructure both prediction models are built on top of.

### 5.1 Core Functions

- **`load_data(data_dir)`** — loads all five CSVs with dates parsed correctly.
- **`build_transaction_graph(data)`** — builds a `networkx.MultiDiGraph`: accounts are nodes, transactions are edges (a multigraph is used because the same pair of accounts can transact more than once).
- **`graph_as_of(graph, cutoff_timestamp)`** — **the critical safety function.** Returns a subgraph containing only edges with `timestamp <= cutoff_timestamp`. This is the "what would we have known at this point in time" view.
- **`get_reachable_accounts(subgraph, victim_account, max_hops)`** — returns all accounts reachable downstream from the victim within `max_hops`, using only the temporally-filtered subgraph.
- **`get_complaint_context(complaint_row, graph, max_hops)`** — convenience wrapper returning `(victim_account, cutoff_time, subgraph, candidate_accounts)` in one call.

### 5.2 Why This Matters

Every model and feature-engineering function in CashTrace is required to query the graph via `graph_as_of()`, never the full graph. This is what prevents **leakage** — accidentally letting a model see the future.

On a validation run against 420 predictive-case complaints:
- **Full graph:** 4,791 accounts, 9,791 transactions.
- **True cash-out account reachable at complaint time: 72/420 (17.1%).**
- **Average candidate accounts per complaint: 39.1.**

This confirms the fund-flow model cannot rely on reachability alone (see §2.1 and §9.1).

---

## 6. Feature Engineering

`data-pipeline/feature_engineering.py` builds the features consumed by both models. This module went through a deliberate reconciliation process (documented below) because two independently-developed versions of it existed with different leakage properties.

### 6.1 The Leakage Issue and Its Resolution

A richer, independently-built version of this module computed account-level statistics (transaction velocity, burstiness, geospatial spread, hop distance) by aggregating over **all** transactions/withdrawals in the dataset, regardless of complaint filing time — a leak its own docstrings flagged but did not fix.

**Resolution:** the underlying aggregation logic was kept (it added real value: passthrough ratio, transaction burstiness, geospatial home-distance), but every aggregation is now computed on a **cutoff-filtered slice** of transactions/withdrawals (`timestamp <= filed_timestamp`) per complaint, computed directly and efficiently for the single account that matters (the victim), rather than via a full-table groupby repeated per complaint (which was also a performance problem — the original approach timed out at 300+ seconds; the fixed version runs in seconds).

### 6.2 Feature Set (ML-Ready)

Output: `features/complaint_features_pointintime.csv` — one row per predictive-case complaint.

| Feature | Description |
|---|---|
| `reported_amount`, `log_reported_amount` | Victim's reported fraud amount |
| `hour_of_day`, `day_of_week`, `is_weekend` | Timing of the first fraudulent transaction |
| `reporting_delay_hours` | Time between first transaction and complaint filing |
| `num_candidate_accounts` | Accounts reachable from victim as of complaint time |
| `state` | Complaint's associated region |
| `victim_flow_total_out/n_out/total_in/n_in/passthrough_ratio` | Victim's own transaction behavior, as of cutoff |
| `victim_temporal_account_age_days/active_span_hours/hours_since_last_txn/out_txn_burstiness` | Victim's account timing patterns, as of cutoff |
| `victim_geo_n_withdrawals/n_unique_locations/n_unique_cities/avg_dist_from_home_km` | Victim's own (legitimate) withdrawal history, as of cutoff |

### 6.3 Ground Truth Targets (Never Used as Input)

Output: `features/complaint_ground_truth_targets.csv` — kept strictly separate from the feature file.

| Column | Description |
|---|---|
| `true_cashout_account` | The actual answer the fund-flow model is evaluated against |
| `hours_to_withdrawal` | Time from complaint filing to actual cash-out |
| `cashout_lat`, `cashout_lon`, `cashout_city` | Actual withdrawal location |
| `victim_to_cashout_hops` | Graph distance, computed using the **full, final** graph (legitimate for post-hoc evaluation, never for model input) |

### 6.4 Defensive Tooling

`assert_no_suffix_collision()` guards against a specific, previously-encountered failure mode: pandas silently renaming colliding merge columns to `<col>_x` / `<col>_y` instead of erroring, which turns into a `KeyError` several scripts downstream instead of a clear message at the merge site.

### 6.5 Verification

Both leakage-safety claims were independently verified, not just asserted:
- **Zero leaked columns** confirmed present in the ML-ready feature file.
- **Manual recomputation** of `victim_flow_n_out` for 20 random complaints against a direct query of raw transactions matched the pipeline's output exactly (0 mismatches).

---

## 7. Data Validation

`data-pipeline/data_validation.py` runs automatically after any dataset regeneration, checking six categories:

| Check | What it verifies |
|---|---|
| **Schema** | All required columns present in all five tables |
| **Nulls** | No unexpected nulls in critical fields |
| **Duplicate keys** | No duplicate primary keys in any table |
| **Referential integrity** | Every foreign key (account, location, event reference) resolves to an existing row |
| **Value sanity** | No non-positive amounts, valid lat/lon ranges |
| **Temporal logic** | Re-verifies the leakage fix (§4.2) across the **entire** dataset — not just spot-checked samples |

On the current dataset, all six checks pass. This suite is meant to run before every model-training pass, catching regressions if the generator is ever modified.

---

## 8. Train / Validation / Test Splitting

`data-pipeline/time_split.py` provides `time_based_split()`.

**Why not a random split?** The real evaluation question is "can this model predict a genuinely future event," not "can it interpolate within a shuffled dataset." A random split could let a model train on complaints filed *after* some test-set complaints — a subtler form of the same leakage problem already fixed once.

**Method:** complaints are sorted by `filed_timestamp` and split chronologically — training data is always earlier than validation/test data. The split also filters to `is_predictive_case == True` only.

**Verified output** (500-complaint dataset, 70/15/15 split): 294 train / 63 val / 63 test complaints, with an automated assertion confirming **zero temporal overlap** between any two splits.

Both the fund-flow and geo-time model owners are required to import this function rather than writing their own, so their reported accuracy numbers are comparable to each other.

---

## 9. Machine Learning Models

### 9.1 Fund-Flow Model

**Goal:** given a victim account and the partial transaction graph visible at complaint time, rank likely cash-out accounts.

**Why it can't be pure graph search:** as established in §2.1 and §5.2, ~83% of true cash-out accounts are *not yet reachable* at complaint time. The model must therefore combine:
- Structural features from whatever partial chain is visible (hop count so far, accounts already touched).
- Statistical/behavioral features learned from historical **completed** fraud cases in the training set (e.g. victims from a given bank, with a given reported amount, tend to correlate with certain downstream account characteristics).

**Baseline approach:** a weighted graph-traversal heuristic combined with a classifier over the shared feature set (§6.2), predicting the likelihood that a given reachable account — or a given mule ring — is on the eventual path to cash-out. A graph neural network is a stretch goal if time allows.

**Evaluation:** top-k accuracy — does the true cash-out account (or its ring) appear in the model's top-k ranked candidates?

### 9.2 Geo-Time Model

**Goal:** given a (predicted or partially known) cash-out account, predict the withdrawal location and time window.

**Approach:**
- **DBSCAN** clusters historical fraud withdrawal locations — directly exploiting the 12-ring structure validated in §4.3.
- **XGBoost** takes account/victim features (bank, state, reported amount, and the ring the fund-flow model points toward) and predicts which cluster and time window is most likely.

**Output shape** (matches the backend's `PredictionCandidate` schema exactly):
```json
{
  "location_id": "...",
  "location_name": "...",
  "city": "...",
  "latitude": 0.0,
  "longitude": 0.0,
  "confidence": 0.0,
  "predicted_window_start": "...",
  "predicted_window_end": "..."
}
```

### 9.3 Model Interdependence

The two models are not independent: the fund-flow model's output (a likely cash-out account or ring) becomes an **input feature** to the geo-time model. This is why both models share the same graph-loading and feature-engineering infrastructure (§5, §6) before splitting into model-specific work.

---

## 10. Evaluation Framework

`data-pipeline/evaluation.py` defines the metrics both models are scored against — imported, not reimplemented, by both model owners so results are comparable.

| Metric | Function | Description |
|---|---|---|
| Fund-flow top-k accuracy | `fund_flow_top_k_accuracy()` | Fraction of complaints where the true cash-out account is within the top-k ranked candidates |
| Geo-time top-k accuracy | `geo_time_top_k_accuracy()` | Same idea, for predicted vs. true withdrawal location |
| Time-window accuracy | `time_window_accuracy()` | Whether the true withdrawal timestamp falls within a predicted window |
| Lead time | `lead_time_stats()` | Mean/median hours between complaint filing and the start of the predicted window — the practical "how much warning" metric |

### 10.1 Baseline Sanity Check

Before either real model existed, the framework was validated against a random baseline (random candidate ranking, random location selection) to confirm the metrics compute correctly:

- Fund-flow top-1/3/5 accuracy: ~0.0 (expected — consistent with the 17% reachability finding)
- Geo-time top-k accuracy: ~0.0 (expected — random selection among ~150 locations)
- Time-window accuracy: 1.0 — flagged as **not meaningful**, since the baseline's window range was deliberately set to match the generator's own lead-time distribution; this metric only becomes meaningful once a model predicts a genuinely narrower window.

Both real models must be compared against this documented random baseline to demonstrate they are learning something beyond chance.

---

## 11. Backend API

Built with **FastAPI**, currently backed by **mocked predictions** so the API is usable end-to-end before either ML model is trained.

### 11.1 Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/complaints` | Submit a new complaint |
| `GET` | `/complaints/{complaint_id}` | Fetch a complaint |
| `GET` | `/predictions/{complaint_id}` | Get ranked cash-out predictions for a complaint |

### 11.2 Architecture

```
API routes (FastAPI)
        │
Pydantic schemas (request/response validation)
        │
   ┌────┴────┐
ComplaintService   PredictionService
        │
Model client layer (loads trained model artifacts)
        │
   ┌────┴────┐
SQLAlchemy (Postgres+PostGIS)   Alerts dispatcher
```

### 11.3 Data Model

SQLAlchemy models in `backend/app/models.py` mirror the synthetic dataset schema exactly (`Account`, `Transaction`, `Location`, `Complaint`, `WithdrawalEvent`), so real data slots into the same shape the models were trained against without transformation.

### 11.4 The Mock-to-Real Model Swap

`backend/app/services/prediction_service.py`'s `predict()` function currently fabricates plausible-looking candidates (2–3 ATMs, descending confidence, a 1–24 hour window). This was deliberately built with the exact input/output shape the real models will use:

```python
def predict(complaint_id: str, reported_amount: float) -> PredictionResponse:
    ...
```

Once the fund-flow and geo-time models are trained, this is the **only function that needs to change** — its signature and `PredictionResponse` return shape stay identical, so no other part of the backend, frontend, or API contract needs to move.

### 11.5 Verified Behavior

An end-to-end smoke test was run: create a complaint → fetch it back → get a prediction → confirmed a working, correctly-shaped response with descending confidence scores across candidates.

Default local development uses a SQLite file (`cashtrace.db`), avoiding the need for a Postgres install during early development. `DATABASE_URL` can be set to a real Postgres+PostGIS connection string for production use.

---

## 12. Frontend (Dashboard)

**Status:** planned, not yet built.

**Technology:** React with Leaflet/Mapbox for map visualization.

**Planned features:**
- Map-based heatmap of predicted withdrawal hotspots per complaint.
- Case list / detail view showing ranked candidates, confidence scores, and predicted windows.
- Consumes the backend's `/predictions/{complaint_id}` endpoint — the frontend does not need to know or care whether it is talking to the mock or the real trained models, since the response shape is identical either way.

---

## 13. Technology Stack

| Layer | Technology |
|---|---|
| Data processing | Python, pandas, NumPy |
| Graph construction | NetworkX |
| Machine learning | scikit-learn, XGBoost |
| Spatial clustering | DBSCAN |
| Backend | FastAPI, SQLAlchemy |
| Database | PostgreSQL + PostGIS (SQLite for local dev) |
| Frontend | React, Leaflet |
| Containerization | Docker, Docker Compose |
| Version control | Git, GitHub |

---

## 14. Repository Structure

```
.
├── data-pipeline/
│   ├── generate_synthetic_data.py       # §4
│   ├── graph_builder.py                 # §5
│   ├── feature_engineering.py           # §6
│   ├── data_validation.py               # §7
│   ├── time_split.py                    # §8
│   ├── evaluation.py                    # §10
│   └── data/                            # generated CSVs (gitignored)
├── ml-models/
│   ├── fund_flow/                       # §9.1
│   └── geo_time/                        # §9.2
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── routers/
│   │   │   ├── health.py
│   │   │   ├── complaints.py
│   │   │   └── predictions.py
│   │   └── services/
│   │       └── prediction_service.py    # §11.4
│   ├── requirements.txt
│   └── README.md
├── frontend/                             # §12
├── docs/
│   ├── api-spec.md
│   └── TECHNICAL_DOCUMENTATION.md        # this file
├── .vscode/
│   └── extensions.json
├── .gitignore
├── requirements.txt
└── README.md
```

---

## 15. Setup & Installation

### 15.1 Prerequisites

- Git, VS Code
- Python 3.10+
- Node.js 18+ (frontend)
- Docker Desktop (optional, for containerized local runs)

### 15.2 Clone and Open

```bash
git clone https://github.com/riyagoyal08010-glitch/CashTrace.git
cd CashTrace
code .
```

### 15.3 Python Environment

```bash
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 15.4 Generate the Dataset

```bash
cd data-pipeline
python generate_synthetic_data.py --n-complaints 500
python data_validation.py     # confirm all six checks pass
```

### 15.5 Run the Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```
API docs: `http://localhost:8000/docs`

### 15.6 Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

### 15.7 Full Stack via Docker Compose

```bash
docker compose up --build
```

---

## 16. Development Workflow

### 16.1 Branching

`main` is treated as protected by team convention (GitHub's enforced branch protection requires a paid plan on a private repo, so this is agreed upon rather than technically enforced). Feature branches: `feature/<short-description>`, merged via pull request.

### 16.2 Parallel Workstreams

The project is structured so that once shared infrastructure (§5–§8) exists, three tracks proceed in parallel with minimal blocking:

- **Fund-flow model** — depends only on the shared graph/feature/split/evaluation infrastructure.
- **Geo-time model** — same dependency, plus the fund-flow model's output shape (agreed upon early).
- **Backend** — depends only on an agreed API contract and the dataset schema; builds against mocked predictions until real models are ready, then swaps in with a single-function change (§11.4).

### 16.3 Testing Discipline

Every module in this project was built with an accompanying verification step before being considered complete:
- The dataset generator's temporal ordering was cross-checked against actual timestamps, not assumed correct.
- The graph builder's reachability claim was measured, not estimated.
- The feature engineering leakage fix was verified via manual recomputation on a random sample.
- The evaluation framework was sanity-checked against a random baseline before either real model existed.

This discipline should continue for the fund-flow and geo-time models: report accuracy only after comparing against the documented random baseline.

---

## 17. Known Limitations

- **Synthetic data only.** Model performance is validated against a purpose-built synthetic dataset, not real NCRP or bank data. Real-world deployment would require data-sharing agreements and re-validation.
- **Sparse graph reachability.** Only ~17% of true cash-out accounts are reachable via known transactions at complaint time — an inherent difficulty of the problem, not a bug, but one that bounds how much pure graph-based reasoning can contribute versus statistical prediction.
- **No real-time integration.** Real-time ingestion of live bank transaction streams and integration with law-enforcement case-management systems is out of scope for this prototype.
- **Time-window accuracy metric caveat.** As documented in §10.1, this metric can be misleadingly high if a model's predicted window is too wide; narrow, well-calibrated windows should be the actual goal.

## 18. Future Work

- Graph neural network for fund-flow tracing, as a successor to the baseline heuristic/classifier approach.
- Real-time streaming ingestion of transaction data.
- Expanded synthetic data realism: richer fraud-vs-legitimate transaction distributions, mule-account behavioral archetypes, and transaction velocity patterns.
- Integration testing against real (anonymized, permissioned) financial-crime datasets, if and when available through appropriate channels.

## 19. References

1. Jensen, M. et al., "SynthAML: A synthetic data set to benchmark anti-money laundering methods," *Scientific Data*, vol. 10, 2023.
2. Schmidt, J., Pasadakis, D., Sathe, M., and Schenk, O., "GAMLNet: A graph based framework for the detection of money laundering," *IEEE Swiss Conference on Data Science (SDS)*, 2024.
3. Karim, M. R., Hermsen, F., et al., "Scalable Semi-Supervised Graph Learning Techniques for Anti Money Laundering," *IEEE Access*, vol. 12, 2024, pp. 50012–50029.
4. Ekizoglu, B. and Demiriz, A., "Fuzzy Rule-Based Analysis of Spatio-Temporal ATM Usage Data for Fraud Detection and Prevention," *International Conference on Fuzzy Systems and Knowledge Discovery*, 2015.
5. Chen, T. and Guestrin, C., "XGBoost: A Scalable Tree Boosting System," *Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining*, 2016, pp. 785–794.

---


