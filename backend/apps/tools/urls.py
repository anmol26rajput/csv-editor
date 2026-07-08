from django.urls import path, include

urlpatterns = [
    path('pdf/', include('apps.tools.pdf.urls')),
    path('csv/', include('apps.tools.csv.urls')),
    path('docx/', include('apps.tools.docx.urls')),
    path('xlsx/', include('apps.tools.xlsx.urls')),
    path('clean/', include('apps.tools.cleaning.urls')),
]
