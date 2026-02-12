import os
import pypdf
from docx import Document as DocxDocument
from pptx import Presentation
from django.core.files.base import ContentFile
from django.conf import settings

def get_file_type(filename):
    ext = os.path.splitext(filename)[1].lower()
    if ext == '.csv':
        return 'csv'
    elif ext == '.pdf':
        return 'pdf'
    elif ext in ['.docx', '.doc']:
        return 'docx'
    elif ext in ['.pptx', '.ppt']:
        return 'pptx'
    return 'other'

def merge_pdfs(file_paths, output_path):
    merger = pypdf.PdfWriter()
    for path in file_paths:
        merger.append(path)
    merger.write(output_path)
    merger.close()
    return output_path

def split_pdf(file_path, output_dir, pages=None):
    reader = pypdf.PdfReader(file_path)
    output_files = []
    
    # If pages not specified, split each page
    if not pages:
        for i in range(len(reader.pages)):
            writer = pypdf.PdfWriter()
            writer.add_page(reader.pages[i])
            out_filename = f"page_{i+1}.pdf"
            out_path = os.path.join(output_dir, out_filename)
            with open(out_path, "wb") as f:
                writer.write(f)
            output_files.append(out_path)
    return output_files

def replace_text_docx(file_path, search_text, replace_text, output_path):
    doc = DocxDocument(file_path)
    for paragraph in doc.paragraphs:
        if search_text in paragraph.text:
            paragraph.text = paragraph.text.replace(search_text, replace_text)
    
    # Also check tables
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for paragraph in cell.paragraphs:
                    if search_text in paragraph.text:
                        paragraph.text = paragraph.text.replace(search_text, replace_text)
                        
    doc.save(output_path)
    return output_path

def replace_text_pptx(file_path, search_text, replace_text, output_path):
    prs = Presentation(file_path)
    for slide in prs.slides:
        for shape in slide.shapes:
            if hasattr(shape, "text"):
                if search_text in shape.text:
                    shape.text = shape.text.replace(search_text, replace_text)
    prs.save(output_path)
    prs.save(output_path)
    return output_path

def organize_pdf(file_path, page_config, output_path):
    """
    Reorder, rotate, and select pages from a PDF.
    page_config: List of dicts [{'page': 0, 'rotate': 90}, ...]
    Note: page_config uses 0-based indexing for internal logic, but frontend might send 1-based.
    """
    reader = pypdf.PdfReader(file_path)
    writer = pypdf.PdfWriter()
    
    for config in page_config:
        page_idx = config.get('original_page_number') - 1 # Convert 1-based to 0-based
        rotation = config.get('rotate', 0)
        
        if 0 <= page_idx < len(reader.pages):
            page = reader.pages[page_idx]
            if rotation:
                page.rotate(rotation)
            writer.add_page(page)
            
    with open(output_path, "wb") as f:
        writer.write(f)
    return output_path
