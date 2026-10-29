# BrandBench: Round 2 (full stack) - Team Brain_Stormers
Checks a post against a brand's approved rules **before** it goes public. Demo brand: FitNest (a made-up fitness app).

**Stack (from our Round 1 plan):** React + TypeScript (Vite) | Python FastAPI | PostgreSQL via SQLAlchemy | PyMuPDF, python-docx, Pillow, OpenCV, Tesseract | Pytest | Docker

## How it works
Pick or write a post -> three rule-based checkers (Voice and Messaging, Fact and Claims, Look and Accessibility) compare it with the FitNest rulebook -> findings show the phrase, reason, rule and suggested fix -> the creator accepts or dismisses each one (serious items need a written reason) -> a named person approves or sends it back (risky posts need a written reason).

## Run with Docker (PostgreSQL + app)
    docker compose up --build        # open http://localhost:8000

## Run without Docker (no database needed; data is kept in memory)
    cd backend && pip install -r requirements.txt && uvicorn main:app --reload     # API on :8000
    cd frontend && npm install && npm run dev                                      # UI on :5173
Open http://localhost:5173. Set DATABASE_URL (for example postgresql+psycopg://user:pass@host/db) to store submissions in PostgreSQL.

## Tests
    cd backend && python -m pytest

## What is built
Three checkers with plain-language findings | dated approved-facts list with stale flags | overall result from the original findings (dismissing a flag cannot lower it) | named human approval | summary charts | rulebook and About tabs | PDF, Word and image intake endpoint (`/api/check-file`).

## Not built yet
pgvector search over guideline documents, a language-model tone check (an optional hook exists; set ANTHROPIC_API_KEY, untested), real login, learning from dismissed findings, labelled accuracy tests. `/api/check-file` and OCR are untested and have no button in the UI yet. Checks use fixed patterns, so they miss problems that match no rule.

## Disclosures
Libraries: React, Vite, FastAPI, SQLAlchemy, PyMuPDF, python-docx, Pillow, OpenCV, pytesseract. Code written with AI assistance (Claude) and reviewed by the team.
