from django.urls import path, re_path
from .views import (
    DocxPreviewView, 
    DocxReplaceView, 
    DocxImagesView,
    DocxAddImageView,
    DocxReplaceImageView,
    DocxRemoveImageView,
    DocxPagesView,
    DocxReorderView
)

urlpatterns = [
    path('<uuid:file_id>/preview/', DocxPreviewView.as_view(), name='docx-preview'),
    path('<uuid:file_id>/images/', DocxImagesView.as_view(), name='docx-images'),
    path('<uuid:file_id>/pages/', DocxPagesView.as_view(), name='docx-pages'),
    re_path(r'^replace/?$', DocxReplaceView.as_view(), name='docx-replace'),
    re_path(r'^reorder/?$', DocxReorderView.as_view(), name='docx-reorder'),
    re_path(r'^images/add/?$', DocxAddImageView.as_view(), name='docx-add-image'),
    re_path(r'^images/replace/?$', DocxReplaceImageView.as_view(), name='docx-replace-image'),
    re_path(r'^images/remove/?$', DocxRemoveImageView.as_view(), name='docx-remove-image'),
]
