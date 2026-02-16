from django.urls import path
from .views import XLSXStructureView, XLSXReadView, XLSXSheetsView, XLSXReorderView

urlpatterns = [
    path('<uuid:file_id>/structure/', XLSXStructureView.as_view(), name='xlsx-structure'),
    path('<uuid:file_id>/read/', XLSXReadView.as_view(), name='xlsx-read'),
    path('<uuid:file_id>/sheets/', XLSXSheetsView.as_view(), name='xlsx-sheets'),
    path('reorder/', XLSXReorderView.as_view(), name='xlsx-reorder'),
]
