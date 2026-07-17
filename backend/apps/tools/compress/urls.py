from django.urls import re_path
from .views import CompressView

urlpatterns = [
    re_path(r'^$', CompressView.as_view(), name='compress'),
]
