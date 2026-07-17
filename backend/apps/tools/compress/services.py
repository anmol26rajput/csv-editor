import os
import shutil
import zipfile

import fitz

# Office files are already zip containers, so they get repacked rather than
# wrapped. epub/odt are deliberately excluded: their `mimetype` entry has to
# stay stored-uncompressed and first, which repacking would break.
ZIP_CONTAINER_EXTS = {'docx', 'xlsx', 'pptx'}


def _compress_pdf(src_path, out_path):
    doc = fitz.open(src_path)
    try:
        doc.save(
            out_path,
            garbage=4,          # drop orphaned objects
            clean=True,         # tidy content streams
            deflate=True,
            deflate_images=True,
            deflate_fonts=True,
        )
    finally:
        doc.close()


def _repack_container(src_path, out_path):
    # ponytail: repack only — entries are already deflated, so expect 2-6%. The
    # real win for image-heavy documents is re-encoding the embedded media in
    # word/media/*, which is lossy and needs a quality knob. Add if asked for.
    with zipfile.ZipFile(src_path) as zin, zipfile.ZipFile(out_path, 'w') as zout:
        for item in zin.infolist():
            zout.writestr(item, zin.read(item.filename), zipfile.ZIP_DEFLATED, 9)


def _zip_file(src_path, out_path, arcname):
    with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zout:
        zout.write(src_path, arcname)


def compress_file(src_path, filename, out_dir):
    """Shrink a file, keeping its own format where the format allows it.

    PDFs are re-saved, Office files repacked, anything else is zipped.
    Returns (output_path, output_filename, file_type).
    """
    base, ext = os.path.splitext(filename)
    ext = ext[1:].lower()

    if ext == 'pdf':
        out_name, file_type = f"{base}_compressed.pdf", 'pdf'
        shrink = _compress_pdf
    elif ext in ZIP_CONTAINER_EXTS:
        out_name, file_type = f"{base}_compressed.{ext}", ext
        shrink = _repack_container
    else:
        out_name, file_type = f"{base}.zip", 'zip'
        shrink = lambda s, o: _zip_file(s, o, filename)

    out_path = os.path.join(out_dir, out_name)
    shrink(src_path, out_path)

    # Re-encoding an already-optimised file can leave it bigger than it started;
    # never hand back a worse file than we were given. A zip wrapper is a format
    # change the caller asked for, so it stands either way.
    if file_type != 'zip' and os.path.getsize(out_path) >= os.path.getsize(src_path):
        shutil.copyfile(src_path, out_path)

    return out_path, out_name, file_type


def _demo():
    import tempfile

    with tempfile.TemporaryDirectory() as tmp:
        # Text-shaped files get zipped, and text really does shrink.
        csv_path = os.path.join(tmp, 'data.csv')
        with open(csv_path, 'w') as f:
            f.write('a,b,c\n' + '1,2,3\n' * 5000)
        out, name, file_type = compress_file(csv_path, 'data.csv', tmp)
        assert (name, file_type) == ('data.zip', 'zip'), (name, file_type)
        assert os.path.getsize(out) < os.path.getsize(csv_path)
        with zipfile.ZipFile(out) as z:
            assert z.namelist() == ['data.csv'], z.namelist()
            with open(csv_path, 'rb') as f:
                assert z.read('data.csv') == f.read()

        # Zip containers keep their extension and stay readable.
        docx_path = os.path.join(tmp, 'doc.docx')
        body = '<w:p>hello</w:p>' * 2000
        with zipfile.ZipFile(docx_path, 'w', zipfile.ZIP_STORED) as z:
            z.writestr('word/document.xml', body)
        out, name, file_type = compress_file(docx_path, 'doc.docx', tmp)
        assert (name, file_type) == ('doc_compressed.docx', 'docx'), (name, file_type)
        assert os.path.getsize(out) < os.path.getsize(docx_path)
        with zipfile.ZipFile(out) as z:
            assert z.read('word/document.xml').decode() == body

        # A PDF stays a readable PDF.
        pdf_path = os.path.join(tmp, 'doc.pdf')
        doc = fitz.open()
        doc.new_page().insert_text((72, 72), 'hello')
        doc.save(pdf_path)
        doc.close()
        out, name, file_type = compress_file(pdf_path, 'doc.pdf', tmp)
        assert (name, file_type) == ('doc_compressed.pdf', 'pdf'), (name, file_type)
        reopened = fitz.open(out)
        assert reopened.page_count == 1
        reopened.close()

        # An already-tight file is never returned bigger than it arrived.
        tight_path = os.path.join(tmp, 'tight.pdf')
        shutil.copyfile(out, tight_path)
        out, _, _ = compress_file(tight_path, 'tight.pdf', tmp)
        assert os.path.getsize(out) <= os.path.getsize(tight_path)

    print('ok')


if __name__ == '__main__':
    _demo()
