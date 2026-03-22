# Cépage V5 — Projet

## Stack
React 19 + TypeScript + Vite 7 | Python Flask + SQLite + Neon PostgreSQL | Windows

## Fichiers importants
- Frontend : `ESSAIS SITE/src/App.tsx` (~5400 lignes, monolithe) · pages/ · lib/events.ts
- Backend : `app.py` (blueprints) · `backend.py` · `auth.py` · `auth_db.py`
- Config : `.env` (JWT_SECRET_KEY, SMTP_*, ADMIN_EMAIL, TURNSTILE_SECRET_KEY, APP_URL)
- Launch : `demarrer.bat` → backend :5000 + Vite :5173
- Scrapers : `scrape_exposants.py` (Vignerons Indép.) · `scrape_medoc.py` (Portes Ouvertes)

## Architecture
- `ESSAIS SITE/public/exposants-{eventId}.json` — données Mode Balade par événement
- `ESSAIS SITE/src/lib/events.ts` — catalogue statique des événements
- `routes/` — blueprints Flask : auth, visite, events_admin, search

## Règles de développement
- Ne jamais committer automatiquement
- Ne pas over-engineering — pas d'abstraction prématurée
- BDD SQLite en UTF-8 — lire sans text_factory
- Python : `/c/Users/damie/AppData/Local/Programs/Python/Python312/python` (`py` est cassé)
- Windows UTF-8 console : `sys.stdout.reconfigure(encoding='utf-8')` ou `io.TextIOWrapper`

## Agents disponibles (~/.claude/agents/)
- engineering-frontend-developer, engineering-code-reviewer, engineering-software-architect
- engineering-backend-architect, engineering-database-optimizer, etc.
