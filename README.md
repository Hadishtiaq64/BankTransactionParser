# Smart Transaction Categorizer 🧠💰

An AI-powered full-stack web application that automatically categorizes bank transactions and detects spending anomalies using Claude Sonnet 4.6.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (React)                   │
│  ┌───────────┐ ┌────────────┐ ┌──────────────────┐  │
│  │ CSV Upload│ │  Dashboard │ │  Anomaly Cards   │  │
│  │ (Dropzone)│ │  (Recharts)│ │  (LLM Insights)  │  │
│  └───────────┘ └────────────┘ └──────────────────┘  │
│         Vite + TypeScript + Tailwind CSS v4          │
└──────────────────────┬──────────────────────────────┘
                       │ REST API (JSON)
                       │ Port 5173 → proxy → 8000
┌──────────────────────┴──────────────────────────────┐
│                Backend (FastAPI + Python)             │
│  ┌──────────────┐  ┌─────────────────────────────┐  │
│  │ CSV Parser   │  │ Categorization Service       │  │
│  │ (stdlib csv) │  │  ├─ LLM (Claude Sonnet 4.6) │  │
│  └──────────────┘  │  └─ Keyword Fallback         │  │
│  ┌──────────────┐  └─────────────────────────────┘  │
│  │ Anomaly      │  ┌─────────────────────────────┐  │
│  │ Detection    │  │ SQLite Database               │  │
│  │ (mean + 2σ)  │  │ (SQLAlchemy async)            │  │
│  └──────────────┘  └─────────────────────────────┘  │
│          Python 3.11+ / Uvicorn ASGI                 │
└──────────────────────────────────────────────────────┘
```

## Features

- **CSV Upload**: Drag-and-drop bank transaction CSV files
- **AI Categorization**: Automatically categorizes transactions into 8 categories using Claude Sonnet 4.6
- **Anomaly Detection**: Flags unusually large transactions using statistical analysis (mean + 2σ)
- **LLM Explanations**: Plain-language explanations for each anomaly powered by AI
- **Interactive Dashboard**: Pie/bar charts, sortable transaction table, anomaly cards
- **Keyword Fallback**: Works without an API key using rule-based categorization

## Categories

| Category | Examples |
|----------|----------|
| 🛒 Groceries | Loblaws, No Frills, Metro, Sobeys, Costco |
| 🍽️ Dining | Tim Hortons, McDonald's, Uber Eats, Skip the Dishes |
| 🚗 Transport | Presto, Uber Trips, Petro-Canada, Shell |
| 📱 Subscriptions | Netflix, Spotify, Apple, Amazon Prime |
| 💡 Utilities | Toronto Hydro, Enbridge, Rogers, Bell |
| 🎬 Entertainment | Cineplex, Steam, Xbox |
| 💰 Income | Payroll deposits, E-transfers received |
| 📦 Other | Everything else |

## Prerequisites

- **Python 3.11+** (for the backend)
- **Node.js 18+** and **npm** (for the frontend)
- **Anthropic API Key** (optional — the app falls back to keyword categorization without it)

## Setup & Running

### 1. Backend

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate       # macOS/Linux
.\venv\Scripts\activate        # Windows PowerShell

# Install dependencies
pip install -r requirements.txt

# Set your API key (optional)
export ANTHROPIC_API_KEY=sk-ant-api03-...   # macOS/Linux
$env:ANTHROPIC_API_KEY="sk-ant-api03-..."   # Windows PowerShell

# Run the FastAPI server
uvicorn app.main:app --reload --port 8000
```

The backend starts at `http://localhost:8000`. API docs available at `http://localhost:8000/docs`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts at `http://localhost:5173` and proxies API requests to the backend.

### 3. Try It Out

1. Open `http://localhost:5173` in your browser
2. Upload the included `sample_transactions.csv` file
3. Explore the dashboard — see your spending breakdown and flagged anomalies!

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/transactions/upload` | Upload a CSV file |
| `GET` | `/api/transactions` | List all transactions |
| `GET` | `/api/transactions/summary` | Category spending breakdown |
| `GET` | `/api/transactions/anomalies` | Flagged anomalies with explanations |
| `DELETE` | `/api/transactions` | Delete all transactions |
| `GET` | `/health` | Health check |

Interactive API docs (Swagger UI) are available at `/docs` when the backend is running.

## How LLM Categorization Works

### Prompt Engineering

Transactions are sent to Claude in **batches of 15** to minimize API calls. The system prompt constrains the model to respond with only valid category names:

```
You are a bank transaction categorizer. For each transaction description provided,
assign exactly ONE category from this list:
- Groceries, Subscriptions, Transport, Dining, Utilities, Entertainment, Income, Other

Respond with ONLY the category names, one per line, in the same order as the input.
```

### Anomaly Detection

1. Transactions are grouped by category
2. For each category, compute the **mean** and **standard deviation** of amounts
3. Transactions exceeding **mean + 2σ** are flagged as anomalies
4. For each flagged transaction, Claude generates a one-sentence explanation

### Fallback Mode

When no `ANTHROPIC_API_KEY` is configured, the app uses a keyword-based categorizer that maps known merchant names to categories. This ensures the app is fully functional for demos and testing.

## Running Tests

```bash
cd backend
python -m pytest tests/ -v
```

Tests cover:
- **Categorizer**: Keyword matching for all 8 categories, case insensitivity, negative-amount income detection
- **Anomaly Detector**: Mean/stddev calculations, threshold detection, edge cases (single item, equal amounts), multi-category detection

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Charts | Recharts |
| Backend | FastAPI, Python 3.13, Uvicorn |
| Database | SQLite (SQLAlchemy async) |
| AI | Anthropic Claude Sonnet 4.6 (official SDK) |
| Testing | pytest |

## Switching to PostgreSQL

The SQLAlchemy models work with PostgreSQL by changing one line in `backend/app/database.py`:

```python
# SQLite (default, zero config):
DATABASE_URL = "sqlite+aiosqlite:///./transactions.db"

# PostgreSQL:
DATABASE_URL = "postgresql+asyncpg://user:pass@localhost:5432/txdb"
```

Then install the async driver: `pip install asyncpg`.

## Project Structure

```
├── backend/
│   ├── requirements.txt
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app + CORS + lifespan
│   │   ├── database.py          # SQLAlchemy async engine
│   │   ├── models.py            # Transaction ORM model
│   │   ├── schemas.py           # Pydantic response models
│   │   ├── routes.py            # API endpoints
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── csv_parser.py    # CSV parsing
│   │       ├── llm_client.py    # Anthropic Claude client
│   │       ├── categorizer.py   # LLM + keyword categorization
│   │       └── anomaly_detector.py  # Mean + 2σ detection
│   └── tests/
│       ├── __init__.py
│       ├── test_categorizer.py
│       └── test_anomaly_detector.py
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       ├── index.css
│       ├── api/transactionApi.ts
│       ├── components/
│       │   ├── AnomalyList.tsx
│       │   ├── CsvUpload.tsx
│       │   ├── Dashboard.tsx
│       │   ├── SpendingChart.tsx
│       │   └── TransactionTable.tsx
│       └── types/index.ts
├── sample_transactions.csv
└── README.md
```
