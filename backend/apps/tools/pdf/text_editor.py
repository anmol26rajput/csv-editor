"""Inline PDF text editing: read text spans with geometry, apply replacements.

Editing works by redacting the original span's rectangle and re-inserting the
new text at the same baseline with Helvetica (fontsize/color preserved).
Scanned pages fall back to Tesseract OCR (when installed): recognized words are
offered as spans, and edits blank the underlying image pixels before inserting
the replacement text.
"""
import os
import shutil

import fitz  # PyMuPDF

# The web process may be launched with a minimal PATH that misses Homebrew /
# common Linux install dirs, so make sure the tesseract binary is discoverable.
_EXTRA_BIN_DIRS = ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin']
for _d in _EXTRA_BIN_DIRS:
    if os.path.isdir(_d) and _d not in os.environ.get('PATH', '').split(os.pathsep):
        os.environ['PATH'] = os.environ.get('PATH', '') + os.pathsep + _d


def ocr_available():
    return shutil.which('tesseract') is not None


def _tessdata():
    try:
        td = fitz.get_tessdata()
        if td:
            return td
    except Exception:
        pass
    # Fall back to known tessdata locations if PyMuPDF can't resolve one
    for candidate in (
        os.getenv('TESSDATA_PREFIX'),
        '/opt/homebrew/share/tessdata',
        '/usr/local/share/tessdata',
        '/usr/share/tessdata',
        '/usr/share/tesseract-ocr/5/tessdata',
    ):
        if candidate and os.path.isdir(candidate):
            return candidate
    return None


def _collect_spans(page, textpage=None, is_ocr=False, start_id=0):
    spans = []
    span_id = start_id
    data = page.get_text('dict', textpage=textpage) if textpage else page.get_text('dict')
    for block in data['blocks']:
        if block.get('type') != 0:  # text blocks only
            continue
        for line in block['lines']:
            for span in line['spans']:
                if not span['text'].strip():
                    continue
                spans.append({
                    'id': span_id,
                    'text': span['text'],
                    'bbox': list(span['bbox']),
                    'origin': list(span['origin']),
                    'size': span['size'],
                    'color': span['color'],
                    'font': span['font'],
                    'ocr': is_ocr,
                })
                span_id += 1
    return spans


def get_text_spans(input_path, page_number):
    with fitz.open(input_path) as doc:
        if page_number < 0 or page_number >= doc.page_count:
            raise ValueError(f"Page {page_number + 1} does not exist (document has {doc.page_count} pages)")

        page = doc[page_number]
        spans = _collect_spans(page)
        used_ocr = False
        can_ocr = ocr_available()

        # Scanned page: no text layer but there is page content — try OCR
        if not spans and can_ocr:
            try:
                textpage = page.get_textpage_ocr(dpi=300, full=True, tessdata=_tessdata())
                spans = _collect_spans(page, textpage=textpage, is_ocr=True)
                used_ocr = bool(spans)
            except Exception:
                pass  # OCR failure degrades to "no editable text"

        return {
            'page': page_number,
            'total_pages': doc.page_count,
            'width': page.rect.width,
            'height': page.rect.height,
            'spans': spans,
            'ocr': used_ocr,
            'ocr_available': can_ocr,
        }


def apply_text_edits(input_path, edits, output_path):
    """edits: [{page, bbox, origin, text, size, color}] — empty text deletes the span."""
    doc = fitz.open(input_path)
    try:
        by_page = {}
        for edit in edits:
            by_page.setdefault(int(edit['page']), []).append(edit)

        for page_number, page_edits in by_page.items():
            if page_number < 0 or page_number >= doc.page_count:
                raise ValueError(f"Page {page_number + 1} does not exist")
            page = doc[page_number]

            for edit in page_edits:
                page.add_redact_annot(fitz.Rect(edit['bbox']))
            # OCR edits live inside a scanned image: blank those pixels so the
            # replacement text is not drawn over the old raster text.
            has_ocr_edit = any(edit.get('ocr') for edit in page_edits)
            page.apply_redactions(
                images=fitz.PDF_REDACT_IMAGE_PIXELS if has_ocr_edit else fitz.PDF_REDACT_IMAGE_NONE
            )

            for edit in page_edits:
                text = str(edit.get('text', ''))
                if not text.strip():
                    continue  # deletion: redaction already removed the original
                color_int = int(edit.get('color', 0))
                color = (
                    (color_int >> 16 & 255) / 255,
                    (color_int >> 8 & 255) / 255,
                    (color_int & 255) / 255,
                )
                bbox = edit['bbox']
                origin = edit.get('origin') or [bbox[0], bbox[3]]
                page.insert_text(
                    fitz.Point(origin[0], origin[1]),
                    text,
                    fontsize=float(edit.get('size', 11)),
                    fontname='helv',
                    color=color,
                )

        doc.save(output_path, garbage=3, deflate=True)
    finally:
        doc.close()
    return output_path
