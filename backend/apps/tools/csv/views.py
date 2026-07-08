from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from apps.documents.models import Document
from .services import CSVService
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import serializers

class CSVReadSerializer(serializers.Serializer):
    file_id = serializers.UUIDField()
    page = serializers.IntegerField(default=1)
    page_size = serializers.IntegerField(default=50)

class CSVFilterSerializer(serializers.Serializer):
    file_id = serializers.UUIDField()
    column = serializers.CharField()
    value = serializers.CharField()
    operator = serializers.ChoiceField(choices=['contains', 'equals', 'startswith'], default='contains')

class CSVRemoveSerializer(serializers.Serializer):
    file_id = serializers.UUIDField()
    remove_type = serializers.ChoiceField(choices=['row', 'column', 'date', 'date_range'])
    # Dynamic targets
    column = serializers.CharField(required=False, allow_blank=True) # for column, date, date_range
    row_index = serializers.IntegerField(required=False, allow_null=True) # for row
    date_val = serializers.CharField(required=False, allow_blank=True) # for date
    start_date = serializers.CharField(required=False, allow_blank=True) # for date_range
    end_date = serializers.CharField(required=False, allow_blank=True) # for date_range

class CSVReadView(APIView):
    @extend_schema(parameters=[CSVReadSerializer])
    def get(self, request, file_id):
        doc = get_object_or_404(Document, pk=file_id)
        if doc.file_type not in ['csv', 'xlsx']: # Support both for preview
             return Response({'error': 'Invalid file type'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 50))
            
            service = CSVService()
            result = service.read_csv(doc.file.path, page=page, page_size=page_size)
            
            return Response(result)
        except Exception as e:
             return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CSVFilterView(APIView):
    @extend_schema(request=CSVFilterSerializer)
    def post(self, request):
        serializer = CSVFilterSerializer(data=request.data)
        if serializer.is_valid():
            file_id = serializer.validated_data['file_id']
            column = serializer.validated_data['column']
            value = serializer.validated_data['value']
            
            doc = get_object_or_404(Document, pk=file_id)
            service = CSVService()
            
            try:
                # Assuming filter saves to new file or returns simplified data
                # For v1, let's return filtered data preview
                df = service.filter_csv(doc.file.path, column, value)
                
                # Setup download (saving as new document)
                import os
                from django.core.files import File
                from io import StringIO
                
                output_buffer = StringIO()
                df.to_csv(output_buffer, index=False)
                output_buffer.seek(0)
                
                new_filename = f"filtered_{doc.filename}"
                new_doc = Document.objects.create(
                    filename=new_filename,
                    file_type='csv',
                    processing_status='completed'
                )
                from django.core.files.base import ContentFile
                new_doc.file.save(new_filename, ContentFile(output_buffer.getvalue().encode('utf-8')))
                
                return Response({'id': new_doc.id, 'match_count': len(df)}, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CSVRemoveView(APIView):
    @extend_schema(request=CSVRemoveSerializer)
    def post(self, request):
        serializer = CSVRemoveSerializer(data=request.data)
        if serializer.is_valid():
            file_id = serializer.validated_data['file_id']
            remove_type = serializer.validated_data['remove_type']
            
            # Additional validation handled in service or lightly here depending on type
            doc = get_object_or_404(Document, pk=file_id)
            service = CSVService()
            
            try:
                # Target data extraction
                target_data = {}
                if remove_type == 'row': target_data['row_index'] = serializer.validated_data.get('row_index')
                if remove_type == 'column': target_data['column'] = serializer.validated_data.get('column')
                if remove_type in ['date', 'date_range']:
                    target_data['column'] = serializer.validated_data.get('column')
                    if remove_type == 'date': target_data['date'] = serializer.validated_data.get('date_val')
                    if remove_type == 'date_range':
                        target_data['start_date'] = serializer.validated_data.get('start_date')
                        target_data['end_date'] = serializer.validated_data.get('end_date')

                df = service.remove_data(doc.file.path, remove_type, target_data)
                
                # Setup download (saving as new document)
                import os
                from django.core.files import File
                from io import StringIO
                
                output_buffer = StringIO()
                df.to_csv(output_buffer, index=False)
                output_buffer.seek(0)
                
                new_filename = f"removed_{remove_type}_{doc.filename}"
                new_doc = Document.objects.create(
                    filename=new_filename,
                    file_type='csv',
                    processing_status='completed'
                )
                from django.core.files.base import ContentFile
                new_doc.file.save(new_filename, ContentFile(output_buffer.getvalue().encode('utf-8')))
                
                return Response({'id': new_doc.id, 'match_count': len(df)}, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                import traceback
                traceback.print_exc()
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
