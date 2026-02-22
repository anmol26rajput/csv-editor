from django.urls import path, re_path
from .views import CSVReadView, CSVFilterView, CSVRemoveView

urlpatterns = [
    path('<uuid:file_id>/read/', CSVReadView.as_view(), name='csv-read'),
    re_path(r'^filter/?$', CSVFilterView.as_view(), name='csv-filter'),
    re_path(r'^remove/?$', CSVRemoveView.as_view(), name='csv-remove'),
]
