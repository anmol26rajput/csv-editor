from django.conf import settings
from django.core.servers.basehttp import get_internal_wsgi_application
import os
import django
import traceback

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')


try:
    django.setup()
    print("Django setup success")
    app = get_internal_wsgi_application()
    print("WSGI App loaded successfully:", app)
except Exception:
    traceback.print_exc()
