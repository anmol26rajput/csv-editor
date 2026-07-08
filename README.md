# Sarva 🚀

> **Open. Edit. Convert.** Any file, right in your browser.

**Sarva** is a modern, privacy-focused web app for editing **PDF, CSV, Excel (XLSX),
Word (DOCX), and text** files. No ads, no cloud storage — your files are processed and never sold.

---

## Architecture

Sarva is a monorepo with two independently deployable parts:

```
csv-editor/
├── frontend/   → Next.js 16 app (deploys to Vercel)
└── backend/    → Django REST API (deploys to Render + Supabase Postgres)
```

- **frontend/** — the UI and all in-browser editing (React 19, Tailwind, TipTap, pdf.js).
- **backend/** — file processing API (Django, pandas, PyMuPDF, python-docx, openpyxl).

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for full deploy instructions and the exact
environment variables each side needs.

---

## Features

| Tool | What it does |
| :--- | :--- |
| **PDF** | Merge, split, reorder, delete pages, edit text, convert to/from PDF |
| **CSV** | Inline cell editing, filtering, column removal, splitting, smart clean-up |
| **Excel (XLSX)** | View and edit spreadsheets, reorder sheets |
| **Word (DOCX)** | Rich-text editing with live preview and image management |
| **Text & code** | Edit Markdown, JSON, source, and logs in the browser |
| **Utilities** | Base64 encode/decode, JSON tools |

---

## Local development

### Prerequisites
- Node.js 18+
- Python 3.11+

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # then fill in values (a dev SECRET_KEY is fine)
python manage.py migrate
python manage.py runserver 8000
```

The API runs at `http://127.0.0.1:8000` (settings default to `config.settings.dev`).

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local         # points at http://127.0.0.1:8000 by default
npm run dev
```

The app runs at `http://localhost:3000`.

---

## Environment variables

Never commit real `.env` files — only the `.env.example` templates are tracked.

- `backend/.env.example` — Django + database + CORS config
- `frontend/.env.example` — API URL + public site URL

For production values and which keys go to Vercel vs. the backend host, see
**[DEPLOYMENT.md](DEPLOYMENT.md)**.

---

## Built with

- **Frontend:** Next.js 16, React 19, Tailwind CSS, TipTap, pdf.js
- **Backend:** Django REST Framework, pandas, PyMuPDF, python-docx, openpyxl
- **Database:** Supabase (Postgres)
- **Hosting:** Vercel (frontend) + Render (backend)
