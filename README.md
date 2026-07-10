# Roo AI

Meeting reconciliation engine — React + TypeScript frontend, FastAPI backend.

## Project Structure

```
rooai/
├── frontend/   # React + TypeScript + Vite
├── backend/    # FastAPI (Python)
└── supabase/   # Edge functions
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs at `http://localhost:5173`.

## Backend

```bash
cd backend
uvicorn api:app --reload --port 8000
```

Runs at `http://localhost:8000`.

## Other Frontend Commands

| Command | Description |
|---|---|
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Lint source files |
