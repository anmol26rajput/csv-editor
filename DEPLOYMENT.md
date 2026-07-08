# Deployment Guide

Sarva is two independently deployed pieces:

| Part | Tech | Deploys to | Database |
| :--- | :--- | :--- | :--- |
| `frontend/` | Next.js 16 | **Vercel** | — |
| `backend/`  | Django REST | **Render** (Web Service) | **Supabase Postgres** |

> **Note:** Supabase provides the **Postgres database** only — it does not run
> Django. The Django backend runs on Render and connects to Supabase via
> `DATABASE_URL`.

---

## 🔐 Environment variables — what goes where

### Backend — Render Web Service → Environment

| Key | Example | Notes |
| :--- | :--- | :--- |
| `DJANGO_SETTINGS_MODULE` | `config.settings.prod` | **Required.** Loads the secure production settings. |
| `SECRET_KEY` | *(60+ random chars)* | **Required.** Generate a fresh one (see below). Never reuse the dev key. |
| `DEBUG` | `False` | Keep off in production. |
| `ALLOWED_HOSTS` | `your-backend.onrender.com` | Comma-separated hostnames, no scheme. |
| `DATABASE_URL` | `postgresql://postgres.xxxx:PASSWORD@aws-...pooler.supabase.com:5432/postgres` | Supabase → Settings → Database → Connection string. Prefer the **Session pooler** (port 5432). URL-encode special chars in the password. |
| `DB_SSL_REQUIRE` | `True` | Supabase requires SSL. Keep `True`. |
| `CORS_ALLOWED_ORIGINS` | `https://your-app.vercel.app` | Your frontend origin(s). Comma-separated. |
| `CSRF_TRUSTED_ORIGINS` | `https://your-app.vercel.app` | Same as above. |
| `PYTHON_VERSION` | `3.11.9` | Pins the Python runtime on Render. |
| `SECURE_SSL_REDIRECT` | `True` | Optional; already defaults to `True` in prod. |

### Frontend — Vercel Project → Settings → Environment Variables

| Key | Example | Notes |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://your-backend.onrender.com` | Backend base URL. No trailing `/api/v1`. |
| `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` | Your public domain — drives canonical URLs, `sitemap.xml`, `robots.txt`, and social cards. **Set this or SEO links point at the placeholder.** |

> `NEXT_PUBLIC_*` variables are **exposed to the browser** — never put a secret in one.

---

## 🚀 Steps

### 1. Database — Supabase
1. Create a Supabase project.
2. Go to **Settings → Database → Connection string** and copy the
   **Session pooler** URL (port `5432`). It is migration-friendly, unlike the
   transaction pooler (port `6543`).
3. Use it as `DATABASE_URL` on the Render web service, and keep `DB_SSL_REQUIRE=True`.

### 2. Backend — Render Web Service
- **Root Directory:** `backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:**
  ```bash
  python manage.py migrate --noinput && python manage.py collectstatic --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
  ```
  The `--bind 0.0.0.0:$PORT` is **required** — Render injects `$PORT` and only
  reaches the app on `0.0.0.0`.
- Set all backend env vars above.

### 3. Frontend — Vercel
- **Root Directory:** `frontend`
- Framework preset: Next.js (auto-detected)
- Set both `NEXT_PUBLIC_*` env vars above.
- Deploy.

### 4. Post-deploy SEO
- Submit `https://<your-domain>/sitemap.xml` in Google Search Console.
- Confirm `https://<your-domain>/robots.txt` is reachable.

---

## ⚠️ Security: rotate the Supabase password

The Supabase database password was previously kept in plaintext in `backend/.env`.
Even though `.env` is git-ignored, treat it as compromised: reset it in
**Supabase → Settings → Database → Reset database password**, then update
`DATABASE_URL` (URL-encode special characters: `?`→`%3F`, `,`→`%2C`, `*`→`%2A`, `@`→`%40`).

Generate a fresh production Django secret key with:

```bash
python -c "from secrets import choice; import string; print(''.join(choice(string.ascii_letters+string.digits) for _ in range(60)))"
```

Use a **different** key in production than in local development, and never commit
`.env` — commit only `.env.example`.
