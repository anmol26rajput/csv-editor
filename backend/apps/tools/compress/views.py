import os
import shutil

from django.conf import settings
from django.core.files import File
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from apps.documents.models import Document
from .services import compress_file
from .serializers import CompressSerializer


class CompressView(APIView):
    """Shrink any uploaded document and return it as a new document."""

    @extend_schema(request=CompressSerializer)
    def post(self, request):
        serializer = CompressSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        doc = get_object_or_404(Document, pk=serializer.validated_data['file_id'])
        temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp', f"compress_{doc.id}")
        os.makedirs(temp_dir, exist_ok=True)

        try:
            original_size = os.path.getsize(doc.file.path)
            output_path, output_filename, file_type = compress_file(doc.file.path, doc.filename, temp_dir)
            compressed_size = os.path.getsize(output_path)

            new_doc = Document.objects.create(
                filename=output_filename,
                file_type=file_type,
                file_size=compressed_size,
                processing_status='completed',
            )
            with open(output_path, 'rb') as f:
                new_doc.file.save(output_filename, File(f))

            return Response({
                'id': new_doc.id,
                'url': request.build_absolute_uri(new_doc.file.url),
                'filename': output_filename,
                'file_type': file_type,
                'original_size': original_size,
                'compressed_size': compressed_size,
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)
