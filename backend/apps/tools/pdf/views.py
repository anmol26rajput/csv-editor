import os
import shutil
import zipfile
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.core.files import File
from apps.documents.models import Document
from .services import PDFService
from .serializers import PDFMergeSerializer, PDFSplitSerializer, PDFReorderSerializer
from drf_spectacular.utils import extend_schema

class PDFMergeView(APIView):
    @extend_schema(request=PDFMergeSerializer)
    def post(self, request):
        serializer = PDFMergeSerializer(data=request.data)
        if serializer.is_valid():
            file_ids = serializer.validated_data['file_ids']
            documents = Document.objects.filter(id__in=file_ids)
            
            if len(documents) != len(file_ids):
                return Response({'error': 'One or more files not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Sort documents based on input order if needed, currently naive
            # Ideally fetch and reorder based on file_ids index
            doc_map = {doc.id: doc for doc in documents}
            ordered_docs = [doc_map[fid] for fid in file_ids]
            
            file_paths = [doc.file.path for doc in ordered_docs]
            service = PDFService()
            
            # Temporary output
            output_filename = f"merged_{ordered_docs[0].filename}"
            output_path = os.path.join(settings.MEDIA_ROOT, 'temp', output_filename)
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            try:
                service.merge_pdfs(file_paths, output_path)
                
                # Save as new Document
                new_doc = Document.objects.create(
                    filename=output_filename,
                    file_type='pdf',
                    processing_status='completed'
                )
                with open(output_path, 'rb') as f:
                    new_doc.file.save(output_filename, File(f))
                
                # Cleanup temp
                if os.path.exists(output_path):
                    os.remove(output_path)
                    
                return Response({'id': new_doc.id, 'url': new_doc.file.url}, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PDFSplitView(APIView):
    @extend_schema(request=PDFSplitSerializer)
    def post(self, request):
        serializer = PDFSplitSerializer(data=request.data)
        if serializer.is_valid():
            file_id = serializer.validated_data['file_id']
            doc = get_object_or_404(Document, pk=file_id)
            
            service = PDFService()
            temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp', str(doc.id))
            os.makedirs(temp_dir, exist_ok=True)
            
            try:
                mode = serializer.validated_data.get('mode', 'all')
                page_number = serializer.validated_data.get('page_number')
                output_files = service.split_pdf(doc.file.path, temp_dir, mode=mode, page_number=page_number)
                
                # Zip the result if multiple pages
                zip_filename = f"{os.path.splitext(doc.filename)[0]}_split.zip"
                zip_path = os.path.join(settings.MEDIA_ROOT, 'temp', zip_filename)
                
                with zipfile.ZipFile(zip_path, 'w') as zipf:
                    for file in output_files:
                        zipf.write(file, os.path.basename(file))
                
                new_doc = Document.objects.create(
                   filename=zip_filename,
                   file_type='zip',
                   processing_status='completed'
                )
                with open(zip_path, 'rb') as f:
                    new_doc.file.save(zip_filename, File(f))

                # Cleanup
                shutil.rmtree(temp_dir)
                if os.path.exists(zip_path):
                    os.remove(zip_path)
                    
                return Response({'id': new_doc.id, 'url': new_doc.file.url}, status=status.HTTP_201_CREATED)

            except Exception as e:
                if os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir)
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PDFReorderView(APIView):
    @extend_schema(request=PDFReorderSerializer)
    def post(self, request):
        serializer = PDFReorderSerializer(data=request.data)
        if serializer.is_valid():
            file_id = serializer.validated_data['file_id']
            page_order = serializer.validated_data['page_order']
            
            doc = get_object_or_404(Document, pk=file_id)
            
            if doc.file_type != 'pdf':
                return Response({'error': 'File must be a PDF'}, status=status.HTTP_400_BAD_REQUEST)
            
            service = PDFService()
            
            # Temporary output
            output_filename = f"reordered_{doc.filename}"
            output_path = os.path.join(settings.MEDIA_ROOT, 'temp', output_filename)
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            try:
                service.reorder_pdf(doc.file.path, page_order, output_path)
                
                # Save as new Document
                new_doc = Document.objects.create(
                    filename=output_filename,
                    file_type='pdf',
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

class PDFPagesView(APIView):
    """Get page information for a PDF file"""
    def get(self, request, file_id):
        doc = get_object_or_404(Document, pk=file_id)
        
        if doc.file_type != 'pdf':
            return Response({'error': 'File must be a PDF'}, status=status.HTTP_400_BAD_REQUEST)
        
        service = PDFService()
        
        try:
            page_info = service.get_page_info(doc.file.path)
            return Response(page_info)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

