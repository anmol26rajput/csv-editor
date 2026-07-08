from django.urls import path, re_path
from .views import (
    PDFMergeView, PDFSplitView, PDFReorderView, PDFPagesView,
    PDFConvertView, PDFToPDFView, PDFTextSpansView, PDFEditTextView,
)

urlpatterns = [
    re_path(r'^merge/?$', PDFMergeView.as_view(), name='pdf-merge'),
    re_path(r'^split/?$', PDFSplitView.as_view(), name='pdf-split'),
    re_path(r'^reorder/?$', PDFReorderView.as_view(), name='pdf-reorder'),
    re_path(r'^pages/(?P<file_id>[0-9a-f-]+)/?$', PDFPagesView.as_view(), name='pdf-pages'),
    re_path(r'^convert/?$', PDFConvertView.as_view(), name='pdf-convert'),
    re_path(r'^to-pdf/?$', PDFToPDFView.as_view(), name='pdf-to-pdf'),
    re_path(r'^text-spans/(?P<file_id>[0-9a-f-]+)/?$', PDFTextSpansView.as_view(), name='pdf-text-spans'),
    re_path(r'^edit-text/?$', PDFEditTextView.as_view(), name='pdf-edit-text'),
]
