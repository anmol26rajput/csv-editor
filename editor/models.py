from django.db import models
from django.utils import timezone
import os

class Document(models.Model):
    FILE_TYPES = [
        ('csv', 'CSV'),
        ('xlsx', 'Excel'),
        ('pdf', 'PDF'),
        ('docx', 'Word Document'),
        ('pptx', 'PowerPoint'),
        ('other', 'Other')
    ]

    name = models.CharField(max_length=255)
    file = models.FileField(upload_to='documents/')
    file_type = models.CharField(max_length=10, choices=FILE_TYPES, default='csv')
    uploaded_at = models.DateTimeField(default=timezone.now)
    size = models.IntegerField(default=0)
    
    # CSV/Excel specific fields (nullable now)
    row_count = models.IntegerField(null=True, blank=True)
    column_count = models.IntegerField(null=True, blank=True)
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        # Auto-detect file type based on extension
        ext = os.path.splitext(self.file.name)[1].lower()
        if ext == '.csv':
            self.file_type = 'csv'
        elif ext == '.xlsx':
            self.file_type = 'xlsx'
        elif ext == '.pdf':
            self.file_type = 'pdf'
        elif ext in ['.docx', '.doc']:
            self.file_type = 'docx'
        elif ext in ['.pptx', '.ppt']:
            self.file_type = 'pptx'
        else:
            self.file_type = 'other'
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Delete the file when the model is deleted"""
        if self.file:
            if os.path.isfile(self.file.path):
                os.remove(self.file.path)
        super().delete(*args, **kwargs)

