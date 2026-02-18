from rest_framework import serializers

class PDFMergeSerializer(serializers.Serializer):
    file_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False
    )

class PDFSplitSerializer(serializers.Serializer):
    file_id = serializers.UUIDField()
    mode = serializers.ChoiceField(choices=['all', 'at_page'], default='all')
    page_number = serializers.IntegerField(required=False, min_value=1)

    def validate(self, data):
        if data.get('mode') == 'at_page' and not data.get('page_number'):
            raise serializers.ValidationError({"page_number": "Page number is required when mode is 'at_page'"})
        return data

class PDFReorderSerializer(serializers.Serializer):
    file_id = serializers.UUIDField()
    page_order = serializers.ListField(
        child=serializers.IntegerField(min_value=0),
        allow_empty=False,
        help_text="List of page indices (0-indexed) in the desired order"
    )
