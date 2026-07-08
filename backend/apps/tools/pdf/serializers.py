from rest_framework import serializers

class PDFMergeSerializer(serializers.Serializer):
    file_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False
    )

class PDFSplitSerializer(serializers.Serializer):
    file_id = serializers.UUIDField()
    mode = serializers.ChoiceField(choices=['all', 'at_page', 'extract'], default='all')
    page_number = serializers.IntegerField(required=False, min_value=1)
    selected_pages = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        help_text="List of page numbers (1-indexed) to extract"
    )

    def validate(self, data):
        mode = data.get('mode')
        if mode == 'at_page' and not data.get('page_number'):
            raise serializers.ValidationError({"page_number": "Page number is required when mode is 'at_page'"})
        if mode == 'extract' and not data.get('selected_pages'):
            raise serializers.ValidationError({"selected_pages": "Selected pages are required when mode is 'extract'"})
        return data

class PDFConvertSerializer(serializers.Serializer):
    file_id = serializers.UUIDField()
    target_format = serializers.CharField()

    def validate_target_format(self, value):
        from .converters import SUPPORTED_FORMATS
        value = value.lower()
        if value not in SUPPORTED_FORMATS:
            raise serializers.ValidationError(
                f"Unsupported format '{value}'. Supported: {', '.join(SUPPORTED_FORMATS)}"
            )
        return value

class PDFToPDFSerializer(serializers.Serializer):
    file_id = serializers.UUIDField()

class PDFTextEditSerializer(serializers.Serializer):
    file_id = serializers.UUIDField()
    edits = serializers.ListField(child=serializers.DictField(), allow_empty=False)

    def validate_edits(self, value):
        for edit in value:
            if 'page' not in edit or 'bbox' not in edit or 'text' not in edit:
                raise serializers.ValidationError("Each edit needs 'page', 'bbox' and 'text'")
            if not isinstance(edit['bbox'], list) or len(edit['bbox']) != 4:
                raise serializers.ValidationError("'bbox' must be a list of 4 numbers")
        return value

class PDFReorderSerializer(serializers.Serializer):
    file_id = serializers.UUIDField()
    page_order = serializers.ListField(
        child=serializers.IntegerField(min_value=0),
        allow_empty=False,
        help_text="List of page indices (0-indexed) in the desired order"
    )
