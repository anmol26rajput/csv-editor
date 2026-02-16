from rest_framework import serializers
from .models import Document

class DocumentSerializer(serializers.ModelSerializer):
    size_bytes = serializers.IntegerField(source='file_size', read_only=True)
    url = serializers.FileField(source='file', read_only=True)

    class Meta:
        model = Document
        fields = ['id', 'filename', 'file_type', 'size_bytes', 'uploaded_at', 'expires_at', 'processing_status', 'url']
        read_only_fields = ['id', 'uploaded_at', 'expires_at', 'processing_status']

class DocumentUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    
    def validate_file(self, value):
        # restrict max size 10MB
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("File too large. Max size is 10MB.")
        return value
