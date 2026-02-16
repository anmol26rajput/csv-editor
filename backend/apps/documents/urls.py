from django.urls import path, re_path
from .views import DocumentUploadView, DocumentDetailView

urlpatterns = [
    re_path(r'^upload/?$', DocumentUploadView.as_view(), name='document-upload'),
    path('<uuid:pk>/', DocumentDetailView.as_view(), name='document-detail'),
]
