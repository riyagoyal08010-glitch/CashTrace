# CashTrace — SIH26184

**Predictive Analytics Framework for Cybercrime Complaints to Forecast Likely Cash-Withdrawal Locations, Enabling Generation of Actionable Intelligence for Timely and Proactive Cybercrime Intervention**

[![SIH 2026](https://img.shields.io/badge/Smart%20India%20Hackathon-2026-orange)]()
[![Problem Statement](https://img.shields.io/badge/PS-SIH26184-blue)]()
[![Theme](https://img.shields.io/badge/Theme-Blockchain%20%26%20Cybersecurity-informational)]()

| | |
|---|---|
| **Problem Statement ID** | SIH26184 |
| **Theme** | Blockchain & Cybersecurity |
| **Sponsoring Organization** | Ministry of Home Affairs |
| **Category** | Software |

---

## Table of contents

- [Background](#background)
- [Problem statement](#problem-statement)
- [Proposed solution](#proposed-solution)
- [System architecture](#system-architecture)
- [Technology stack](#technology-stack)
- [Repository structure](#repository-structure)
- [Data strategy](#data-strategy)
- [Evaluation and success metrics](#evaluation-and-success-metrics)
- [Expected outcomes and impact](#expected-outcomes-and-impact)
- [Limitations and future scope](#limitations-and-future-scope)
- [Contributing](#contributing)
- [License](#license)

---

## Background

India has seen a sharp rise in cybercrime and financial-fraud complaints in recent years, driven by phishing, investment scams, fake job offers, and social-engineering attacks. In the majority of these cases, once a victim transfers money, the funds are rapidly layered across a chain of "mule" bank accounts to obscure their origin, before finally being withdrawn as cash at an ATM or bank branch, or converted into an untraceable asset.

Law enforcement's current response is almost entirely reactive: investigators begin tracing the transaction chain only after a complaint is filed, by which point the funds have frequently already been withdrawn. There is no existing system that analyzes complaint and transaction data *in advance* to anticipate where and when a cash-out is likely to occur, which severely limits the window for intervention.

## Problem statement

Develop a predictive analytics framework that ingests cybercrime complaint and transaction data and forecasts the **probable cash-withdrawal location(s) and time window** for funds associated with a given complaint — generating actionable intelligence that enables law enforcement and financial institutions to intervene proactively rather than reactively.

## Proposed solution

The system is composed of five functional stages:

1. **Data ingestion and preparation**
   Complaint records, inter-account transaction data, and historical cash-withdrawal data (ATM/branch, geo-tagged) are cleaned, normalized, and joined into a unified dataset. A mule-account transaction graph is constructed, where nodes represent accounts and edges represent fund transfers, weighted by amount, timing, and velocity.

2. **Fund-flow tracing**
   Given a new complaint, the system traces the most probable path funds have taken through the mule-account graph, ranking candidate terminal ("cash-out") accounts by suspicion score derived from hop count, transfer velocity, account age, and historical fraud-association patterns.

3. **Cash-out location and time-window prediction**
   For each candidate terminal account, the system predicts the most likely physical withdrawal location(s) and the probable time window for withdrawal, using spatial clustering of historical withdrawal points combined with a trained classification/ranking model over account and behavioral features.

4. **Risk scoring and intelligence generation**
   Outputs from stages 2–3 are combined into a single, ranked intelligence report per complaint: top candidate locations, associated confidence scores, predicted time window, and the supporting evidence chain (account path, transaction history).

5. **Presentation and alerting**
   Predictions are surfaced through an investigator-facing dashboard (map-based visualization, case detail view) and, optionally, routed as alerts to relevant stakeholders (bank branches, cybercrime cells) ahead of the predicted withdrawal window.

## System architecture

```
Data sources → Data pipeline → ┌─ Fund-flow model ─┐ → Backend API → ┌─ Dashboard ─┐
                                └─ Geo-time model ──┘                └─ Alerts ────┘
```

| Layer | Responsibility |
|---|---|
| **Data sources** | Cybercrime complaint records, inter-account transaction logs, geo-tagged historical cash-withdrawal data |
| **Data pipeline** | Cleaning, normalization, graph construction, feature engineering |
| **Fund-flow model** | Graph-based tracing of probable fund movement to candidate cash-out accounts |
| **Geo-time model** | Spatial clustering and predictive modeling of withdrawal location and time window |
| **Backend API** | Model orchestration, risk scoring, serving of predictions |
| **Dashboard** | Investigator-facing visualization: withdrawal heatmaps, case detail, evidence chain |
| **Alerts** | Notification of predicted high-risk withdrawal events to relevant stakeholders |

## Technology stack

| Component | Technology |
|---|---|
| Data processing | Python, pandas, NumPy |
| Graph construction and analysis | NetworkX (prototype) / Neo4j (production-scale option) |
| Machine learning | scikit-learn, XGBoost |
| Spatial clustering | DBSCAN / HDBSCAN |
| Backend services | FastAPI |
| Database | PostgreSQL with PostGIS extension |
| Frontend | React, Leaflet / Mapbox GL |
| Containerization | Docker, Docker Compose |
| Version control / CI | Git, GitHub Actions |

## Repository structure

```
.
├── data-pipeline/       # Synthetic data generation, ETL, feature engineering
│   ├── ingestion/
│   ├── graph_builder/
│   └── features/
├── ml-models/           # Model training, evaluation, and inference code
│   ├── fund_flow/
│   └── geo_time/
├── backend/             # FastAPI service, database schema, model-serving layer
│   ├── app/
│   ├── schemas/
│   └── tests/
├── frontend/            # React dashboard application
│   ├── src/
│   └── public/
├── docs/                # API specification, architecture decisions, presentation assets
│   ├── api-spec.md
│   └── architecture.md
├── docker-compose.yml
└── README.md
```

## Data strategy

Real complaint and transaction data (e.g. from the National Cybercrime Reporting Portal) is not publicly accessible for prototyping. The project therefore uses a **synthetically generated dataset** designed to realistically emulate:

- Layered mule-account transaction chains (multiple hops, varying transfer amounts and timing)
- Geo-tagged historical ATM/branch withdrawal events with realistic spatial and temporal distributions
- Complaint metadata consistent with typical cybercrime-fraud case structures

This allows the modeling pipeline to be developed and demonstrated end-to-end without dependency on restricted government data sources, while remaining structurally representative of the real-world problem.

## Evaluation and success metrics

| Metric | Description |
|---|---|
| Top-k location accuracy | Whether the actual withdrawal location falls within the top-k predicted locations |
| Time-window accuracy | Whether the actual withdrawal falls within the predicted time window |
| Precision / recall on fund-flow tracing | Correctness of the traced path to the true cash-out account |
| Lead time | Time between prediction generation and predicted withdrawal event, indicating the actionable intervention window |

## Expected outcomes and impact

- Shifts cybercrime financial investigation from a reactive to a proactive posture
- Provides law enforcement with a ranked, evidence-backed set of locations and time windows for targeted intervention
- Reduces the average time-to-action on high-value cybercrime complaints
- Establishes a reusable framework (data pipeline, graph model, geospatial predictor) extensible to related financial-crime use cases

## Limitations and future scope

- Model performance is currently validated against synthetic data; deployment against real NCRP/bank data would require data-sharing agreements and additional validation
- Real-time integration with bank core-banking systems and law-enforcement case-management systems is out of scope for the current prototype
- Future work includes incorporating graph neural networks for fund-flow tracing and real-time streaming ingestion of transaction data

## Contributing

### Setting up the project in VS Code

1. **Install prerequisites**
   - [Git](https://git-scm.com/downloads)
   - [VS Code](https://code.visualstudio.com/)
   - [Python 3.10+](https://www.python.org/downloads/)
   - [Node.js 18+](https://nodejs.org/) (for the frontend)
   - [Docker Desktop](https://www.docker.com/products/docker-desktop/) (optional, for containerized local runs)

2. **Clone the repository**
   ```bash
   git clone https://github.com/riyagoyal08010-glitch/CashTrace.git
   cd CashTrace
   code .
   ```
   The last command opens the project directly in VS Code.

3. **Install recommended VS Code extensions**
   When you open the folder, VS Code will prompt you to install the workspace-recommended extensions (once `.vscode/extensions.json` is added). At minimum:
   - Python (Microsoft)
   - Pylance
   - ESLint
   - Prettier
   - Docker (Microsoft)
   - GitLens

4. **Set up the Python environment** (for `data-pipeline/` and `ml-models/`)
   ```bash
   python -m venv .venv
   source .venv/bin/activate      # on Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```
   In VS Code, select this interpreter via `Ctrl+Shift+P` → `Python: Select Interpreter` → `.venv`.

5. **Set up the backend** (`backend/`)
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```
   The API will be available at `http://localhost:8000`, with interactive docs at `http://localhost:8000/docs`.

6. **Set up the frontend** (`frontend/`)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

7. **Optional: run everything via Docker Compose**
   ```bash
   docker compose up --build
   ```

### Git workflow for beginners

If you haven't worked in a shared Git repository before, here's the mental model: GitHub holds the single "official" copy of the code. Each person clones it once to get their own full local copy. Nobody edits the online copy directly — everyone edits their local copy and syncs changes back and forth.

The day-to-day loop for each person, on every task:

1. **Pull** the latest changes before starting: `git pull origin main`. This keeps you from working on outdated code.
2. **Branch** off `main` for your task: `git checkout -b feature/<short-description>`. Your work-in-progress stays isolated from `main` and from everyone else's branches.
3. **Work normally** — edit files as you would on any solo project.
4. **Commit** checkpoints as you go: `git add .` then `git commit -m "..."`.
5. **Push** your branch: `git push origin feature/<short-description>`.
6. **Open a Pull Request (PR)** on GitHub proposing to merge your branch into `main`. A teammate reviews it, then it gets merged.
7. Repeat for the next task, always starting from a fresh `git pull origin main`.

**Why branches matter:** if everyone edited `main` directly and pushed at the same time, changes would constantly overwrite each other. Branches let all six of you work in parallel — on the data pipeline, models, backend, frontend — without colliding. Work only "meets" at merge time, and Git can usually combine non-overlapping changes automatically.

**What causes friction:**
- **Merge conflicts** happen when two people edit the *same lines* of the *same file*. Git flags this and asks you to manually choose which version to keep. This is rare if people mostly stay in their own module's files.
- **Forgetting to pull** before starting new work means you're branching off stale code, which causes avoidable conflicts later.
- **Shared files** (`docs/api-spec.md`, config files, `README.md` itself) are the most common conflict points since everyone touches them — coordinate changes to these in the team chat before editing.

### Branching rules

- `main` is protected by convention — no direct pushes, even though GitHub's enforced branch protection requires a paid plan on a private repo. Treat this as a team rule to follow regardless.
- Create a feature branch off `main` for every task: `feature/<short-description>` (e.g. `feature/geo-time-model`).
- Keep pull requests scoped to a single module or feature where possible.
- Open a PR into `main`, tag at least one teammate for review, and ensure the module's tests pass before merging.
- Rebase or merge `main` into your branch before opening a PR to avoid conflicts at integration time.

### Commit messages

Use short, imperative commit messages, optionally scoped by module:

```
feat(backend): add prediction endpoint
fix(ml-models): correct DBSCAN epsilon tuning
docs: update architecture diagram
```

### Code style

- Python: format with `black`, lint with `ruff` or `flake8`.
- JavaScript/React: format with `prettier`, lint with `eslint` (config to be added to `frontend/`).
- Add or update the relevant module's README when introducing a new dependency or changing setup steps.

## License

To be determined by the team / institution prior to public release.
