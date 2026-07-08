from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from apps.documents.models import Document
from .services import CleaningService
from drf_spectacular.utils import extend_schema
from rest_framework import serializers

class CleaningOperationSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=[
        'deduplicate', 'fillna', 'drop_missing', 'drop_cols', 'rename_cols', 'standardize_header'
    ])
    params = serializers.DictField(required=False, default={})

class CleanFileSerializer(serializers.Serializer):
    file_id = serializers.UUIDField()
    operations = serializers.ListField(child=CleaningOperationSerializer())

class CleanFileView(APIView):
    @extend_schema(request=CleanFileSerializer)
    def post(self, request):
        serializer = CleanFileSerializer(data=request.data)
        if serializer.is_valid():
            file_id = serializer.validated_data['file_id']
            operations = serializer.validated_data['operations']
            
            doc = get_object_or_404(Document, pk=file_id)
            service = CleaningService()
            
            try:
                # Determine file type based on extension if not stored specifically (though model has file_type)
                # doc.file_type is reliable
                output_path = service.clean_file(doc.file.path, doc.file_type, operations)
                
                # Create result document
                import os
                from django.core.files import File
                filename = os.path.basename(output_path)
                
                new_doc = Document.objects.create(
                    filename=filename,
                    file_type=doc.file_type,
                    processing_status='completed'
                )
                with open(output_path, 'rb') as f:
                    new_doc.file.save(filename, File(f))
                
                if os.path.exists(output_path):
                     os.remove(output_path)
                     
                return Response({'id': new_doc.id, 'file': new_doc.file.url}, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
