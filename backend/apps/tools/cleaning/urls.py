from django.urls import path, re_path
from .views import CleanFileView

urlpatterns = [
    re_path(r'^process/?$', CleanFileView.as_view(), name='clean-process'),
]
