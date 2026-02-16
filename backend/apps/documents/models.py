import uuid
import os
from django.db import models
from django.utils import timezone
from datetime import timedelta

def daily_upload_path(instance, filename):
    return f"documents/{instance.id}/{filename}"

class Document(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file = models.FileField(upload_to=daily_upload_path)
    filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50) # csv, pdf, docx, xlsx
    file_size = models.BigIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    processing_status = models.CharField(max_length=50, default='pending') # pending, processing, completed, failed
    
    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=24) # Auto-delete after 24h
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.file:
            if os.path.isfile(self.file.path):
                os.remove(self.file.path)
        super().delete(*args, **kwargs)

    def __str__(self):
        return self.filename
