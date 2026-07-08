"""
Production settings.

Requires the following environment variables to be set on the host:
  SECRET_KEY, ALLOWED_HOSTS, CORS_ALLOWED_ORIGINS, CSRF_TRUSTED_ORIGINS,
  DATABASE_URL (Supabase Postgres), and DJANGO_SETTINGS_MODULE=config.settings.prod
"""

from .base import *  # noqa: F401,F403

DEBUG = False

if not SECRET_KEY:  # noqa: F405
    raise RuntimeError("SECRET_KEY environment variable must be set in production.")

if not ALLOWED_HOSTS:  # noqa: F405
    raise RuntimeError("ALLOWED_HOSTS environment variable must be set in production.")

# --- HTTPS / proxy ---------------------------------------------------------
# Platforms like Render/Railway/Fly terminate TLS and forward this header.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)  # noqa: F405

# --- HSTS ------------------------------------------------------------------
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 365  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# --- Cookies / headers -----------------------------------------------------
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SESSION_COOKIE_HTTPONLY = True

# CORS is restricted to the explicit frontend origins from the environment
# (set CORS_ALLOWED_ORIGINS / CSRF_TRUSTED_ORIGINS on the host).
CORS_ALLOW_ALL_ORIGINS = False
