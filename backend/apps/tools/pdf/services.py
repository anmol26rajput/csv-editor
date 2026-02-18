import os
from pypdf import PdfWriter, PdfReader
from apps.tools.base import BaseFileService

class PDFService(BaseFileService):
    def merge_pdfs(self, file_paths, output_path):
        merger = PdfWriter()
        for path in file_paths:
            merger.append(path)
        merger.write(output_path)
        merger.close()
        return output_path

    def split_pdf(self, file_path, output_dir, mode='all', page_number=None):
        reader = PdfReader(file_path)
        output_files = []
        base_name = os.path.splitext(os.path.basename(file_path))[0]
        
        if mode == 'all':
            for i, page in enumerate(reader.pages):
                writer = PdfWriter()
                writer.add_page(page)
                output_filename = f"{base_name}_page_{i+1}.pdf"
                output_path = os.path.join(output_dir, output_filename)
                with open(output_path, "wb") as output_stream:
                    writer.write(output_stream)
                output_files.append(output_path)
        
        elif mode == 'at_page':
            if not page_number or page_number < 1 or page_number > len(reader.pages):
                raise ValueError(f"Invalid page number: {page_number}")
            
            # part 1: pages 0 to page_number-2
            # part 2: pages page_number-1 to end
            
            parts = [
                (range(0, page_number - 1), f"{base_name}_part1.pdf"),
                (range(page_number - 1, len(reader.pages)), f"{base_name}_part2.pdf")
            ]
            
            for page_range, filename in parts:
                if not page_range: continue # Skip empty parts if any (e.g. split at page 1)
                
                writer = PdfWriter()
                for i in page_range:
                    writer.add_page(reader.pages[i])
                
                output_path = os.path.join(output_dir, filename)
                with open(output_path, "wb") as output_stream:
                    writer.write(output_stream)
                output_files.append(output_path)

        return output_files

    def reorder_pdf(self, file_path, page_order, output_path):
        """
        Reorder PDF pages based on the given page order.
        
        Args:
            file_path: Path to the input PDF
            page_order: List of page indices (0-indexed) in the desired order
            output_path: Path for the output PDF
        
        Returns:
            output_path: Path to the reordered PDF
        """
        reader = PdfReader(file_path)
        writer = PdfWriter()
        
        # Validate page order
        total_pages = len(reader.pages)
        if len(page_order) != total_pages:
            raise ValueError(f"Page order length ({len(page_order)}) must match total pages ({total_pages})")
        
        if set(page_order) != set(range(total_pages)):
            raise ValueError("Page order must contain all page indices exactly once")
        
        # Add pages in the specified order
        for page_idx in page_order:
            writer.add_page(reader.pages[page_idx])
        
        # Write the reordered PDF
        with open(output_path, "wb") as output_stream:
            writer.write(output_stream)
        
        return output_path

    def get_page_info(self, file_path):
        """
        Get information about all pages in a PDF.
        
        Args:
            file_path: Path to the PDF file
        
        Returns:
            dict: Contains total_pages and list of page metadata
        """
        reader = PdfReader(file_path)
        total_pages = len(reader.pages)
        
        pages = []
        for i, page in enumerate(reader.pages):
            # Get page dimensions
            box = page.mediabox
            width = float(box.width)
            height = float(box.height)
            
            pages.append({
                'index': i,
                'page_number': i + 1,
                'width': width,
                'height': height,
                'rotation': page.get('/Rotate', 0)
            })
        
        return {
            'total_pages': total_pages,
            'pages': pages
        }

    def process(self, *args, **kwargs):
        pass
