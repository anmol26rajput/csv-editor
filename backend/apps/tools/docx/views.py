from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from apps.documents.models import Document
from .services import DocxService
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from django.core.files.uploadedfile import InMemoryUploadedFile

class DocxReplaceSerializer(serializers.Serializer):
    file_id = serializers.UUIDField()
    replacements = serializers.DictField(
        child=serializers.CharField(),
        help_text="Dictionary of text to find and replace (e.g., {'Old': 'New'})"
    )

class DocxAddImageSerializer(serializers.Serializer):
    file_id = serializers.UUIDField()
    image = serializers.ImageField()
    position = serializers.CharField(default='end', help_text="'start', 'end', or paragraph index")
    width_inches = serializers.FloatField(required=False, help_text="Image width in inches")

class DocxReplaceImageSerializer(serializers.Serializer):
    file_id = serializers.UUIDField()
    image_id = serializers.CharField(help_text="Relationship ID of image to replace")
    image = serializers.ImageField()

class DocxRemoveImageSerializer(serializers.Serializer):
    file_id = serializers.UUIDField()
    image_id = serializers.CharField(help_text="Relationship ID of image to remove")

class DocxPreviewView(APIView):
    def get(self, request, file_id):
        doc = get_object_or_404(Document, pk=file_id)
        if doc.file_type != 'docx':
            return Response({'error': 'Invalid file type'}, status=status.HTTP_400_BAD_REQUEST)
            
        service = DocxService()
        try:
            html_content = service.convert_to_html(doc.file.path)
            return Response({'html': html_content})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DocxReplaceView(APIView):
    @extend_schema(request=DocxReplaceSerializer)
    def post(self, request):
        serializer = DocxReplaceSerializer(data=request.data)
        if serializer.is_valid():
            file_id = serializer.validated_data['file_id']
            replacements = serializer.validated_data['replacements']
            
            doc = get_object_or_404(Document, pk=file_id)
            service = DocxService()
            
            try:
                output_path = service.replace_text(doc.file.path, replacements)
                
                # Create result document
                import os
                from django.core.files import File
                filename = os.path.basename(output_path)
                
                new_doc = Document.objects.create(
                    filename=filename,
                    file_type='docx',
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

class DocxImagesView(APIView):
    """List all images in a DOCX file"""
    def get(self, request, file_id):
        doc = get_object_or_404(Document, pk=file_id)
        if doc.file_type != 'docx':
            return Response({'error': 'Invalid file type'}, status=status.HTTP_400_BAD_REQUEST)
        
        service = DocxService()
        try:
            images = service.extract_images(doc.file.path)
            return Response({'images': images})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DocxAddImageView(APIView):
    """Add a new image to a DOCX file"""
    @extend_schema(request=DocxAddImageSerializer)
    def post(self, request):
        serializer = DocxAddImageSerializer(data=request.data)
        if serializer.is_valid():
            file_id = serializer.validated_data['file_id']
            image_file = serializer.validated_data['image']
            position = serializer.validated_data.get('position', 'end')
            width_inches = serializer.validated_data.get('width_inches')
            
            doc = get_object_or_404(Document, pk=file_id)
            service = DocxService()
            
            try:
                output_path = service.add_image(doc.file.path, image_file, position, width_inches)
                
                # Create result document
                import os
                from django.core.files import File
                filename = os.path.basename(output_path)
                
                new_doc = Document.objects.create(
                    filename=filename,
                    file_type='docx',
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

class DocxReplaceImageView(APIView):
    """Replace an existing image in a DOCX file"""
    @extend_schema(request=DocxReplaceImageSerializer)
    def post(self, request):
        serializer = DocxReplaceImageSerializer(data=request.data)
        if serializer.is_valid():
            file_id = serializer.validated_data['file_id']
            image_id = serializer.validated_data['image_id']
            new_image = serializer.validated_data['image']
            
            doc = get_object_or_404(Document, pk=file_id)
            service = DocxService()
            
            try:
                output_path = service.replace_image(doc.file.path, image_id, new_image)
                
                # Create result document
                import os
                from django.core.files import File
                filename = os.path.basename(output_path)
                
                new_doc = Document.objects.create(
                    filename=filename,
                    file_type='docx',
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

class DocxRemoveImageView(APIView):
    """Remove an image from a DOCX file"""
    @extend_schema(request=DocxRemoveImageSerializer)
    def post(self, request):
        serializer = DocxRemoveImageSerializer(data=request.data)
        if serializer.is_valid():
            file_id = serializer.validated_data['file_id']
            image_id = serializer.validated_data['image_id']
            
            doc = get_object_or_404(Document, pk=file_id)
            service = DocxService()
            
            try:
                output_path = service.remove_image(doc.file.path, image_id)
                
                # Create result document
                import os
                from django.core.files import File
                filename = os.path.basename(output_path)
                
                new_doc = Document.objects.create(
                    filename=filename,
                    file_type='docx',
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

class DocxPagesView(APIView):
    """Get page information for a DOCX file"""
    def get(self, request, file_id):
        doc = get_object_or_404(Document, pk=file_id)
        
        if doc.file_type != 'docx':
            return Response({'error': 'File must be a DOCX'}, status=status.HTTP_400_BAD_REQUEST)
        
        service = DocxService()
        
        try:
            page_info = service.get_page_info(doc.file.path)
            return Response(page_info)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DocxReorderSerializer(serializers.Serializer):
    file_id = serializers.UUIDField()
    page_order = serializers.ListField(
        child=serializers.IntegerField(min_value=0),
        help_text="List of page indices (0-indexed) in desired order"
    )

class DocxReorderView(APIView):
    """Reorder pages in a DOCX file"""
    @extend_schema(request=DocxReorderSerializer)
    def post(self, request):
        serializer = DocxReorderSerializer(data=request.data)
        if serializer.is_valid():
            file_id = serializer.validated_data['file_id']
            page_order = serializer.validated_data['page_order']
            
            doc = get_object_or_404(Document, pk=file_id)
            
            if doc.file_type != 'docx':
                return Response({'error': 'File must be a DOCX'}, status=status.HTTP_400_BAD_REQUEST)
            
            service = DocxService()
            
            # Temporary output
            import os
            from django.conf import settings
            from django.core.files import File
            
            output_filename = f"reordered_{doc.filename}"
            output_path = os.path.join(settings.MEDIA_ROOT, 'temp', output_filename)
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            try:
                service.reorder_pages(doc.file.path, page_order, output_path)
                
                # Save as new Document
                new_doc = Document.objects.create(
                    filename=output_filename,
                    file_type='docx',
                    processing_status='completed'
                )
                with open(output_path, 'rb') as f:
                    new_doc.file.save(output_filename, File(f))
                
                # Cleanup temp
                if os.path.exists(output_path):
                    os.remove(output_path)
                    
                return Response({'id': new_doc.id, 'url': new_doc.file.url}, status=status.HTTP_201_CREATED)
            except ValueError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

