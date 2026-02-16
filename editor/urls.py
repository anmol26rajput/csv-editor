from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('api/upload/', views.upload_document, name='upload_document'),
    path('api/files/', views.list_files, name='list_files'),
    path('api/files/<int:file_id>/', views.get_file_info, name='get_file_info'),
    path('api/files/<int:file_id>/data/', views.get_file_data, name='get_file_data'),
    path('api/files/<int:file_id>/edit/', views.edit_cell, name='edit_cell'),
    path('api/files/<int:file_id>/delete/', views.delete_file, name='delete_file'),
    path('api/files/<int:file_id>/download/', views.download_file, name='download_file'),
    path('api/merge/', views.merge_files, name='merge_files'),
    path('api/files/<int:file_id>/split/', views.split_file, name='split_file'),
    path('api/files/<int:file_id>/filter/', views.filter_file, name='filter_file'),
    path('api/files/<int:file_id>/ai-preprocess/', views.ai_preprocess, name='ai_preprocess'),
    path('api/files/<int:file_id>/find-replace/', views.find_replace, name='find_replace'),
    path('api/files/<int:file_id>/organize-pdf/', views.organize_pdf_view, name='organize_pdf'),
    path('api/files/<int:file_id>/docx-content/', views.get_docx_content, name='get_docx_content'),
    path('api/files/<int:file_id>/update-docx-text/', views.update_docx_text, name='update_docx_text'),
    path('api/files/<int:file_id>/upload-docx-image/', views.upload_docx_image, name='upload_docx_image'),
    path('api/files/<int:file_id>/organize-docx/', views.organize_docx_view, name='organize_docx'),
    path('api/merge-docx/', views.merge_docx_view, name='merge_docx'),
]

