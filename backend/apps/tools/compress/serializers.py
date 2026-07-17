from rest_framework import serializers

class CompressSerializer(serializers.Serializer):
    file_id = serializers.UUIDField()
