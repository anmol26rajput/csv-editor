from rest_framework import serializers

class PDFMergeSerializer(serializers.Serializer):
    file_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False
    )

class PDFSplitSerializer(serializers.Serializer):
    file_id = serializers.UUIDField()

class PDFReorderSerializer(serializers.Serializer):
    file_id = serializers.UUIDField()
    page_order = serializers.ListField(
        child=serializers.IntegerField(min_value=0),
        allow_empty=False,
        help_text="List of page indices (0-indexed) in the desired order"
    )
