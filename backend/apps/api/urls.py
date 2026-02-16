from django.urls import path, include

urlpatterns = [
    path('documents/', include('apps.documents.urls')),
    path('tools/', include('apps.tools.urls')),
]
