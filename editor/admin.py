from django.contrib import admin
from .models import CSVFile

@admin.register(CSVFile)
class CSVFileAdmin(admin.ModelAdmin):
    list_display = ['name', 'uploaded_at', 'size', 'row_count', 'column_count']
    list_filter = ['uploaded_at']
    search_fields = ['name']

