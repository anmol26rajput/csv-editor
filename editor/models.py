from django.db import models
from django.utils import timezone
import os

class CSVFile(models.Model):
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to='csv_files/')
    uploaded_at = models.DateTimeField(default=timezone.now)
    size = models.IntegerField(default=0)
    row_count = models.IntegerField(default=0)
    column_count = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return self.name
    
    def delete(self, *args, **kwargs):
        """Delete the file when the model is deleted"""
        if self.file:
            if os.path.isfile(self.file.path):
                os.remove(self.file.path)
        super().delete(*args, **kwargs)

