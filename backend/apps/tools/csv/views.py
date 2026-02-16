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
            # For now using CSVService for both, assuming standardized path or simple read
            # In real app, we might convert xlsx to csv first or use pandas directly
            
            df = service.read_csv(doc.file.path, nrows=1000) # Limit total rows read for performance in v1
            
            total_rows = len(df)
            start = (page - 1) * page_size
            end = start + page_size
            
            data = df.iloc[start:end].replace({float('nan'): None}).to_dict(orient='records')
            columns = list(df.columns)
            
            return Response({
                'columns': columns,
                'data': data,
                'total_rows': total_rows,
                'page': page,
                'page_size': page_size
            })
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
