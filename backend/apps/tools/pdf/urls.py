from django.urls import path, re_path
from .views import PDFMergeView, PDFSplitView, PDFReorderView, PDFPagesView

urlpatterns = [
    re_path(r'^merge/?$', PDFMergeView.as_view(), name='pdf-merge'),
    re_path(r'^split/?$', PDFSplitView.as_view(), name='pdf-split'),
    re_path(r'^reorder/?$', PDFReorderView.as_view(), name='pdf-reorder'),
    re_path(r'^pages/(?P<file_id>[0-9a-f-]+)/?$', PDFPagesView.as_view(), name='pdf-pages'),
]
