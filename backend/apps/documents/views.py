import os
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Document
from .serializers import DocumentSerializer, DocumentUploadSerializer
from drf_spectacular.utils import extend_schema

class DocumentUploadView(generics.CreateAPIView):
    parser_classes = (MultiPartParser, FormParser)
    serializer_class = DocumentUploadSerializer

    @extend_schema(request=DocumentUploadSerializer, responses=DocumentSerializer)
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            file_obj = serializer.validated_data['file']
            file_name = file_obj.name
            file_size = file_obj.size
            file_ext = os.path.splitext(file_name)[1][1:].lower()
            
            doc = Document.objects.create(
                file=file_obj,
                filename=file_name,
                file_type=file_ext,
                file_size=file_size
            )
            
            return Response(DocumentSerializer(doc).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DocumentDetailView(generics.RetrieveDestroyAPIView):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    lookup_field = 'pk'
