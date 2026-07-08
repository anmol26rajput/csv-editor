import os
import shutil
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.core.files import File
from apps.documents.models import Document
from apps.documents.serializers import DocumentSerializer
from .services import PDFService
from .converters import convert_pdf, convert_to_pdf, TO_PDF_SOURCE_EXTS
from .serializers import (
    PDFMergeSerializer, PDFSplitSerializer, PDFReorderSerializer,
    PDFConvertSerializer, PDFToPDFSerializer,
)
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

                return Response({'id': new_doc.id, 'url': request.build_absolute_uri(new_doc.file.url)}, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PDFSplitView(APIView):
    def post(self, request):
        # Allow either direct file upload or file_id
        file_obj = request.FILES.get('file')
        file_id = request.data.get('file_id')
        
        mode = request.data.get('mode', 'all')
        page_number = request.data.get('page_number')
        
        # Parse selected_pages from form-data (often a comma-separated string)
        selected_pages_raw = request.data.get('selected_pages')
        selected_pages = []
        if selected_pages_raw:
            if isinstance(selected_pages_raw, str):
                try:
                    selected_pages = [int(p.strip()) for p in selected_pages_raw.split(',') if p.strip().isdigit()]
                except Exception:
                    pass
            elif isinstance(selected_pages_raw, list):
                selected_pages = [int(p) for p in selected_pages_raw]

        if not file_obj and not file_id:
            return Response({"error": "Must provide either 'file' or 'file_id'"}, status=status.HTTP_400_BAD_REQUEST)

        service = PDFService()
        
        # Determine source file path
        temp_input_dir = None
        if file_obj:
            source_filename = file_obj.name
            doc_id_str = "direct_upload"
            temp_input_dir = os.path.join(settings.MEDIA_ROOT, 'temp', 'input_' + str(uuid.uuid4()))
            os.makedirs(temp_input_dir, exist_ok=True)
            source_path = os.path.join(temp_input_dir, source_filename)
            with open(source_path, 'wb+') as dest:
                for chunk in file_obj.chunks():
                    dest.write(chunk)
        else:
            doc = get_object_or_404(Document, pk=file_id)
            source_path = doc.file.path
            source_filename = doc.filename
            doc_id_str = str(doc.id)

        temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp', doc_id_str + "_output_" + str(uuid.uuid4()))
        os.makedirs(temp_dir, exist_ok=True)
        
        try:
            if mode == 'extract':
                if not selected_pages:
                    raise ValueError("selected_pages is required for extract mode")
                output_files = service.extract_pages(source_path, temp_dir, selected_pages=selected_pages)
            elif mode == 'remove':
                if not selected_pages:
                    raise ValueError("selected_pages is required for remove mode")
                total_pages = service.get_page_info(source_path)['total_pages']
                pages_to_keep = [p for p in range(1, total_pages + 1) if p not in selected_pages]
                if not pages_to_keep:
                    raise ValueError("Cannot remove all pages from the document.")
                output_files = service.extract_pages(source_path, temp_dir, selected_pages=pages_to_keep)
            elif mode == 'all':
                output_files = service.split_pdf(source_path, temp_dir, mode='all')
            else:
                if not page_number:
                    raise ValueError("page_number is required for at_page mode")
                output_files = service.split_pdf(source_path, temp_dir, mode=mode, page_number=int(page_number))
            
            service = PDFService()
            temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp', str(doc.id))
            os.makedirs(temp_dir, exist_ok=True)
            
            try:
                mode = serializer.validated_data.get('mode', 'all')
                page_number = serializer.validated_data.get('page_number')
                output_files = service.split_pdf(doc.file.path, temp_dir, mode=mode, page_number=page_number)

                # Save each split output as its own Document
                new_docs = []
                for output_file in output_files:
                    filename = os.path.basename(output_file)
                    new_doc = Document.objects.create(
                        filename=filename,
                        file_type='pdf',
                        file_size=os.path.getsize(output_file),
                        processing_status='completed'
                    )
                    with open(output_file, 'rb') as f:
                        new_doc.file.save(filename, File(f))
                    new_docs.append(new_doc)

        except Exception as e:
            if temp_input_dir and os.path.exists(temp_input_dir):
                shutil.rmtree(temp_input_dir)
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)

                return Response(
                    DocumentSerializer(new_docs, many=True, context={'request': request}).data,
                    status=status.HTTP_201_CREATED
                )

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

                return Response({'id': new_doc.id, 'url': request.build_absolute_uri(new_doc.file.url)}, status=status.HTTP_201_CREATED)
            except ValueError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PDFConvertView(APIView):
    @extend_schema(request=PDFConvertSerializer)
    def post(self, request):
        serializer = PDFConvertSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        file_id = serializer.validated_data['file_id']
        target_format = serializer.validated_data['target_format']

        doc = get_object_or_404(Document, pk=file_id)
        if doc.file_type != 'pdf':
            return Response({'error': 'File must be a PDF'}, status=status.HTTP_400_BAD_REQUEST)

        temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp', f"convert_{doc.id}")
        os.makedirs(temp_dir, exist_ok=True)

        try:
            output_path, file_type = convert_pdf(doc.file.path, temp_dir, target_format)
            output_filename = os.path.basename(output_path)

            new_doc = Document.objects.create(
                filename=output_filename,
                file_type=file_type,
                file_size=os.path.getsize(output_path),
                processing_status='completed'
            )
            with open(output_path, 'rb') as f:
                new_doc.file.save(output_filename, File(f))

            return Response({
                'id': new_doc.id,
                'url': request.build_absolute_uri(new_doc.file.url),
                'filename': output_filename,
                'file_type': file_type,
            }, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)

class PDFToPDFView(APIView):
    """Convert an uploaded non-PDF document or image into a PDF."""
    @extend_schema(request=PDFToPDFSerializer)
    def post(self, request):
        serializer = PDFToPDFSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        doc = get_object_or_404(Document, pk=serializer.validated_data['file_id'])
        if doc.file_type == 'pdf':
            return Response({'error': 'File is already a PDF'}, status=status.HTTP_400_BAD_REQUEST)
        if doc.file_type not in TO_PDF_SOURCE_EXTS:
            return Response(
                {'error': f"Cannot convert '.{doc.file_type}' files to PDF"},
                status=status.HTTP_400_BAD_REQUEST
            )

        temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp', f"topdf_{doc.id}")
        os.makedirs(temp_dir, exist_ok=True)

        try:
            output_path = convert_to_pdf(doc.file.path, temp_dir)
            output_filename = os.path.basename(output_path)

            new_doc = Document.objects.create(
                filename=output_filename,
                file_type='pdf',
                file_size=os.path.getsize(output_path),
                processing_status='completed'
            )
            with open(output_path, 'rb') as f:
                new_doc.file.save(output_filename, File(f))

            return Response({
                'id': new_doc.id,
                'url': request.build_absolute_uri(new_doc.file.url),
                'filename': output_filename,
                'file_type': 'pdf',
            }, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)

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

