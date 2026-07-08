from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from apps.documents.models import Document
from .services import XLSXService
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import serializers

class XLSXReadSerializer(serializers.Serializer):
    page = serializers.IntegerField(default=1)
    page_size = serializers.IntegerField(default=50)
    sheet_name = serializers.CharField(required=False)

class XLSXStructureView(APIView):
    def get(self, request, file_id):
        doc = get_object_or_404(Document, pk=file_id)
        if doc.file_type not in ['xlsx', 'xls']:
            return Response({'error': 'Invalid file type'}, status=status.HTTP_400_BAD_REQUEST)
            
        service = XLSXService()
        try:
            sheets = service.get_workbook_structure(doc.file.path)
            return Response({'sheets': sheets})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class XLSXReadView(APIView):
    @extend_schema(parameters=[XLSXReadSerializer])
    def get(self, request, file_id):
        doc = get_object_or_404(Document, pk=file_id)
        
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 50))
        sheet_name = request.query_params.get('sheet_name')
        
        service = XLSXService()
        try:
            result = service.read_sheet(doc.file.path, sheet_name, page, page_size)
            return Response(result)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class XLSXSheetsView(APIView):
    """Get sheet information for an XLSX file"""
    def get(self, request, file_id):
        doc = get_object_or_404(Document, pk=file_id)
        
        if doc.file_type not in ['xlsx', 'xls']:
            return Response({'error': 'File must be an XLSX/XLS'}, status=status.HTTP_400_BAD_REQUEST)
        
        service = XLSXService()
        
        try:
            sheet_info = service.get_sheet_info(doc.file.path)
            return Response(sheet_info)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class XLSXReorderSerializer(serializers.Serializer):
    file_id = serializers.UUIDField()
    sheet_order = serializers.ListField(
        child=serializers.IntegerField(min_value=0),
        help_text="List of sheet indices (0-indexed) in desired order"
    )

class XLSXReorderView(APIView):
    """Reorder sheets in an XLSX file"""
    @extend_schema(request=XLSXReorderSerializer)
    def post(self, request):
        serializer = XLSXReorderSerializer(data=request.data)
        if serializer.is_valid():
            file_id = serializer.validated_data['file_id']
            sheet_order = serializer.validated_data['sheet_order']
            
            doc = get_object_or_404(Document, pk=file_id)
            
            if doc.file_type not in ['xlsx', 'xls']:
                return Response({'error': 'File must be an XLSX/XLS'}, status=status.HTTP_400_BAD_REQUEST)
            
            service = XLSXService()
            
            # Temporary output
            import os
            from django.conf import settings
            from django.core.files import File
            
            output_filename = f"reordered_{doc.filename}"
            output_path = os.path.join(settings.MEDIA_ROOT, 'temp', output_filename)
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            try:
                service.reorder_sheets(doc.file.path, sheet_order, output_path)
                
                # Save as new Document
                new_doc = Document.objects.create(
                    filename=output_filename,
                    file_type=doc.file_type,
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

