import mammoth
from docx import Document as DocxDocument
from docx.shared import Inches
from docx.oxml import parse_xml
import os
import base64
from io import BytesIO
from PIL import Image

class DocxService:
    def convert_to_html(self, file_path):
        """Converts DOCX to HTML for preview."""
        with open(file_path, "rb") as docx_file:
            result = mammoth.convert_to_html(docx_file)
            return result.value  # The generated HTML

    def replace_text(self, file_path, replacements):
        """
        Replaces text in DOCX file while preserving formatting.
        replacements: dict of old_text -> new_text
        Returns path to new file.
        """
        doc = DocxDocument(file_path)
        
        # Replace in paragraphs
        for paragraph in doc.paragraphs:
            for old_text, new_text in replacements.items():
                if old_text in paragraph.text:
                    # Preserve formatting by replacing in runs
                    for run in paragraph.runs:
                        if old_text in run.text:
                            run.text = run.text.replace(old_text, new_text)

        # Replace in tables
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for paragraph in cell.paragraphs:
                        for old_text, new_text in replacements.items():
                            if old_text in paragraph.text:
                                for run in paragraph.runs:
                                    if old_text in run.text:
                                        run.text = run.text.replace(old_text, new_text)
        
        output_dir = os.path.dirname(file_path)
        filename = os.path.basename(file_path)
        new_filename = f"edited_{filename}"
        output_path = os.path.join(output_dir, new_filename)
        
        doc.save(output_path)
        return output_path

    def extract_images(self, file_path):
        """
        Extracts all images from DOCX file.
        Returns list of dicts with image data and metadata.
        """
        doc = DocxDocument(file_path)
        images = []
        
        # Extract images from document relationships
        for rel in doc.part.rels.values():
            if "image" in rel.target_ref:
                try:
                    image_data = rel.target_part.blob
                    # Get image format from content type
                    content_type = rel.target_part.content_type
                    ext = content_type.split('/')[-1]
                    if ext == 'jpeg':
                        ext = 'jpg'
                    
                    # Convert to base64 for frontend
                    image_base64 = base64.b64encode(image_data).decode('utf-8')
                    
                    # Get image dimensions
                    img = Image.open(BytesIO(image_data))
                    width, height = img.size
                    
                    images.append({
                        'id': rel.rId,
                        'data': f"data:{content_type};base64,{image_base64}",
                        'format': ext,
                        'size': len(image_data),
                        'width': width,
                        'height': height,
                        'filename': f"image_{len(images) + 1}.{ext}"
                    })
                except Exception as e:
                    print(f"Error extracting image: {e}")
                    continue
        
        return images

    def add_image(self, file_path, image_file, position='end', width_inches=None):
        """
        Adds an image to the DOCX file.
        position: 'start', 'end', or paragraph index
        width_inches: width in inches (maintains aspect ratio)
        Returns path to new file.
        """
        doc = DocxDocument(file_path)
        
        # Determine where to add the image
        if position == 'start':
            paragraph = doc.paragraphs[0].insert_paragraph_before()
        elif position == 'end':
            paragraph = doc.add_paragraph()
        else:
            # Insert at specific paragraph index
            try:
                idx = int(position)
                if idx < len(doc.paragraphs):
                    paragraph = doc.paragraphs[idx].insert_paragraph_before()
                else:
                    paragraph = doc.add_paragraph()
            except (ValueError, IndexError):
                paragraph = doc.add_paragraph()
        
        # Add the image
        run = paragraph.add_run()
        if width_inches:
            run.add_picture(image_file, width=Inches(width_inches))
        else:
            run.add_picture(image_file, width=Inches(4))  # Default 4 inches
        
        output_dir = os.path.dirname(file_path)
        filename = os.path.basename(file_path)
        new_filename = f"with_image_{filename}"
        output_path = os.path.join(output_dir, new_filename)
        
        doc.save(output_path)
        return output_path

    def replace_image(self, file_path, image_id, new_image_file):
        """
        Replaces an existing image in the DOCX file.
        image_id: relationship ID of the image to replace
        new_image_file: path or file object of new image
        Returns path to new file.
        """
        doc = DocxDocument(file_path)
        
        # Find and replace the image in relationships
        for rel in doc.part.rels.values():
            if rel.rId == image_id and "image" in rel.target_ref:
                # Read new image data
                if isinstance(new_image_file, str):
                    with open(new_image_file, 'rb') as f:
                        new_image_data = f.read()
                else:
                    new_image_data = new_image_file.read()
                
                # Replace the image data
                rel.target_part._blob = new_image_data
                break
        
        output_dir = os.path.dirname(file_path)
        filename = os.path.basename(file_path)
        new_filename = f"replaced_image_{filename}"
        output_path = os.path.join(output_dir, new_filename)
        
        doc.save(output_path)
        return output_path

    def remove_image(self, file_path, image_id):
        """
        Removes an image from the DOCX file.
        image_id: relationship ID of the image to remove
        Returns path to new file.
        """
        doc = DocxDocument(file_path)
        
        # Find all inline shapes (images) and remove the one with matching rId
        for paragraph in doc.paragraphs:
            for run in paragraph.runs:
                # Check if run contains an image
                if run._element.xpath('.//a:blip'):
                    for blip in run._element.xpath('.//a:blip'):
                        embed_id = blip.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
                        if embed_id == image_id:
                            # Remove the entire run containing the image
                            run._element.getparent().remove(run._element)
                            break
        
        # Also check tables
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for paragraph in cell.paragraphs:
                        for run in paragraph.runs:
                            if run._element.xpath('.//a:blip'):
                                for blip in run._element.xpath('.//a:blip'):
                                    embed_id = blip.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
                                    if embed_id == image_id:
                                        run._element.getparent().remove(run._element)
                                        break
        
        output_dir = os.path.dirname(file_path)
        filename = os.path.basename(file_path)
        new_filename = f"removed_image_{filename}"
        output_path = os.path.join(output_dir, new_filename)
        
        doc.save(output_path)
        return output_path

    def get_page_info(self, file_path):
        """
        Get page information from DOCX file.
        Returns page count and structure based on page breaks.
        """
        doc = DocxDocument(file_path)
        
        # Count page breaks in the document
        page_breaks = 0
        total_paragraphs = len(doc.paragraphs)
        
        for paragraph in doc.paragraphs:
            # Check for hard page breaks
            if paragraph._element.xpath('.//w:br[@w:type="page"]'):
                page_breaks += 1
        
        # Minimum 1 page, plus any page breaks found
        total_pages = page_breaks + 1
        
        pages = []
        current_page = 1
        page_content_start = 0
        
        for idx, paragraph in enumerate(doc.paragraphs):
            has_page_break = bool(paragraph._element.xpath('.//w:br[@w:type="page"]'))
            
            if has_page_break or idx == len(doc.paragraphs) - 1:
                pages.append({
                    'index': current_page - 1,
                    'page_number': current_page,
                    'paragraph_start': page_content_start,
                    'paragraph_end': idx,
                    'paragraph_count': idx - page_content_start + 1
                })
                
                if has_page_break:
                    current_page += 1
                    page_content_start = idx + 1
        
        return {
            'total_pages': total_pages,
            'pages': pages,
            'total_paragraphs': total_paragraphs
        }

    def reorder_pages(self, file_path, page_order, output_path):
        """
        Reorder pages in a DOCX file based on page breaks.
        
        Args:
            file_path: Path to input DOCX
            page_order: List of page indices (0-indexed) in desired order
            output_path: Path for output DOCX
        
        Returns:
            output_path: Path to reordered DOCX
        """
        doc = DocxDocument(file_path)
        page_info = self.get_page_info(file_path)
        
        total_pages = page_info['total_pages']
        pages = page_info['pages']
        
        # Validate page order
        if len(page_order) != total_pages:
            raise ValueError(f"Page order length ({len(page_order)}) must match total pages ({total_pages})")
        
        if set(page_order) != set(range(total_pages)):
            raise ValueError("Page order must contain all page indices exactly once")
        
        # Create new document
        new_doc = DocxDocument()
        
        # Copy styles and settings from original
        new_doc.styles._element[:] = doc.styles._element[:]
        
        # Reorder pages
        for page_idx in page_order:
            page = pages[page_idx]
            
            # Copy paragraphs from this page
            for para_idx in range(page['paragraph_start'], page['paragraph_end'] + 1):
                if para_idx < len(doc.paragraphs):
                    original_para = doc.paragraphs[para_idx]
                    new_para = new_doc.add_paragraph()
                    
                    # Copy paragraph properties and content
                    new_para._element[:] = original_para._element[:]
            
            # Add page break after each page except the last
            if page_idx != page_order[-1]:
                new_doc.add_page_break()
        
        new_doc.save(output_path)
        return output_path
