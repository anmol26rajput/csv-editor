from django.contrib import admin
from .models import Document

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['name', 'file_type', 'uploaded_at', 'size', 'row_count', 'column_count']
    list_filter = ['uploaded_at', 'file_type']
    search_fields = ['name']
