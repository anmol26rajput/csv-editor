"""Development settings — convenient, insecure. Never use in production."""

from .base import *  # noqa: F401,F403

DEBUG = True

# Throwaway key so local dev works without a .env; prod requires a real one.
if not SECRET_KEY:  # noqa: F405
    SECRET_KEY = "django-insecure-dev-only-do-not-use-in-production"

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"]

# Allow any local frontend origin during development.
CORS_ALLOW_ALL_ORIGINS = True
