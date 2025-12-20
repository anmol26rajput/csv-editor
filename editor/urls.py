from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('api/upload/', views.upload_csv, name='upload_csv'),
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
]

