import os
import pandas as pd
import json
import traceback
from django.conf import settings
from django.http import JsonResponse, FileResponse, HttpResponse
from django.core.files.base import ContentFile
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.shortcuts import render, get_object_or_404
from .models import Document
from .utils import get_file_type, merge_pdfs, split_pdf, replace_text_docx, replace_text_pptx

def document_to_dict(doc):
    """Convert Document model instance to dictionary"""
    return {
        'id': doc.id,
        'name': doc.name,
        'file': doc.file.url if doc.file else None,
        'file_type': doc.file_type,
        'uploaded_at': doc.uploaded_at.isoformat(),
        'size': doc.size,
        'row_count': doc.row_count,
        'column_count': doc.column_count,
    }


def home(request):
    """Serve the main HTML page"""
    return render(request, 'editor/index.html')


@csrf_exempt
@require_http_methods(["POST"])
def upload_document(request):
    """Upload one or multiple files (CSV, PDF, DOCX, PPTX)"""
    try:
        files = request.FILES.getlist('files')
        if not files:
            return JsonResponse({'error': 'No files provided'}, status=400)
        
        uploaded_files = []
        for file in files:
            ext = os.path.splitext(file.name)[1].lower()
            
            # Initial Document creation
            doc = Document(
                name=file.name,
                file=file,
                size=file.size
            )
            
            # CSV/Excel Specific Logic
            if ext == '.csv':
                try:
                    df = pd.read_csv(file)
                    doc.row_count = len(df)
                    doc.column_count = len(df.columns)
                    file.seek(0)  # Reset pointer
                except Exception:
                    pass
            elif ext == '.xlsx':
                try:
                    df = pd.read_excel(file)
                    doc.row_count = len(df)
                    doc.column_count = len(df.columns)
                    file.seek(0)
                except Exception:
                    pass
            
            doc.save() # save() method in model handles file_type detection too
            uploaded_files.append(document_to_dict(doc))
        
        return JsonResponse({'files': uploaded_files}, status=201)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@require_http_methods(["GET"])
def list_files(request):
    """List all uploaded files"""
    files = Document.objects.all()
    files_data = [document_to_dict(f) for f in files]
    return JsonResponse({'files': files_data})


@require_http_methods(["GET"])
def get_file_info(request, file_id):
    """Get information about a specific file"""
    try:
        doc = get_object_or_404(Document, id=file_id)
        
        response_data = document_to_dict(doc)
        
        # CSV/Excel Specific Info
        if doc.file_type in ['csv', 'xlsx']:
            try:
                if doc.file_type == 'csv':
                    df = pd.read_csv(doc.file.path)
                else:
                    df = pd.read_excel(doc.file.path)
                
                response_data.update({
                    'columns': list(df.columns),
                    'sample_data': df.head(10).to_dict('records'),
                    'data_types': df.dtypes.astype(str).to_dict(),
                    'null_counts': df.isnull().sum().to_dict(),
                })
            except Exception as e:
                response_data['error'] = f"Error reading data: {str(e)}"
        
        return JsonResponse(response_data)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@require_http_methods(["GET"])
def get_file_data(request, file_id):
    """Get paginated CSV data (CSV Only)"""
    try:
        doc = get_object_or_404(Document, id=file_id)
        if doc.file_type not in ['csv', 'xlsx']:
            return JsonResponse({'error': 'Only CSV and Excel files supported for grid view'}, status=400)

        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 100))
        
        if doc.file_type == 'csv':
            df = pd.read_csv(doc.file.path)
        else:
            df = pd.read_excel(doc.file.path)
        
        start = (page - 1) * page_size
        end = start + page_size
        
        total_rows = len(df)
        total_pages = (total_rows + page_size - 1) // page_size
        
        return JsonResponse({
            'data': df.iloc[start:end].to_dict('records'),
            'columns': list(df.columns),
            'total_rows': total_rows,
            'total_pages': total_pages,
            'current_page': page,
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def edit_cell(request, file_id):
    """Edit a specific cell in the CSV (CSV Only)"""
    try:
        doc = get_object_or_404(Document, id=file_id)
        if doc.file_type not in ['csv', 'xlsx']:
            return JsonResponse({'error': 'Only CSV and Excel files supported for editing'}, status=400)

        data = json.loads(request.body)
        
        if doc.file_type == 'csv':
            df = pd.read_csv(doc.file.path)
        else:
            df = pd.read_excel(doc.file.path)
        
        row_index = int(data.get('row_index'))
        column = data.get('column')
        value = data.get('value')
        
        df.at[row_index, column] = value
        
        if doc.file_type == 'csv':
            df.to_csv(doc.file.path, index=False)
        else:
            df.to_excel(doc.file.path, index=False)
        
        doc.row_count = len(df)
        doc.save()
        
        return JsonResponse({'success': True, 'new_value': value})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def merge_files(request):
    """Merge multiple files (CSV or PDF)"""
    try:
        data = json.loads(request.body)
        file_ids = data.get('file_ids', [])
        output_name = data.get('output_name', 'merged_file')
        
        if not file_ids or len(file_ids) < 2:
            return JsonResponse({'error': 'At least 2 files required for merging'}, status=400)
        
        docs = Document.objects.filter(id__in=file_ids)
        if docs.count() != len(file_ids):
            return JsonResponse({'error': 'One or more files not found'}, status=404)
        
        # Check if all files are of same type
        # Preserve order from file_ids
        docs_dict = {d.id: d for d in docs}
        # Re-construct docs list in the order of file_ids
        ordered_docs = []
        for fid in file_ids:
             if fid in docs_dict:
                 ordered_docs.append(docs_dict[fid])
        docs = ordered_docs
        
        if not docs:
             return JsonResponse({'error': 'No valid files found'}, status=404)

        first_type = docs[0].file_type
        if any(d.file_type != first_type for d in docs):
            return JsonResponse({'error': 'All files must be of the same type to merge'}, status=400)
        
        if first_type == 'csv':
            return merge_csv_files(docs, data, output_name)
        elif first_type == 'pdf':
            return merge_pdf_files(docs, output_name)
        else:
            return JsonResponse({'error': f'Merging not supported for {first_type} files'}, status=400)

    except Exception as e:
        return JsonResponse({'error': str(e), 'traceback': traceback.format_exc()}, status=400)

def merge_csv_files(docs, data, output_name):
    merge_type = data.get('merge_type', 'concat')
    join_column = data.get('join_column', None)
    
    if not output_name.endswith('.csv'):
        output_name += '.csv'

    dataframes = [pd.read_csv(d.file.path) for d in docs]
    
    if merge_type == 'concat':
        merged_df = pd.concat(dataframes, ignore_index=True)
    elif merge_type == 'join':
        if not join_column:
            return JsonResponse({'error': 'join_column required for join merge'}, status=400)
        merged_df = dataframes[0]
        for df in dataframes[1:]:
            merged_df = pd.merge(merged_df, df, on=join_column, how='outer')
    
    # Save
    output_buffer = merged_df.to_csv(index=False)
    output_bytes = output_buffer.encode('utf-8')
    output_file = ContentFile(output_bytes, name=output_name)
    
    merged_doc = Document(
        name=output_name,
        row_count=len(merged_df),
        column_count=len(merged_df.columns),
        file_type='csv'
    )
    merged_doc.file.save(output_name, output_file, save=True)
    merged_doc.size = merged_doc.file.size
    merged_doc.save()
    
    return JsonResponse({
        'success': True,
        'file': document_to_dict(merged_doc),
        'row_count': len(merged_df)
    })

def merge_pdf_files(docs, output_name):
    if not output_name.endswith('.pdf'):
        output_name += '.pdf'
        
    file_paths = [d.file.path for d in docs]
    # Create a temporary output path
    import tempfile
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
        tmp_path = tmp.name
    
    try:
        merge_pdfs(file_paths, tmp_path)
        
        # Read back to save to Django Storage
        with open(tmp_path, 'rb') as f:
            pdf_content = f.read()
            
        merged_doc = Document(name=output_name, file_type='pdf')
        merged_doc.file.save(output_name, ContentFile(pdf_content), save=True)
        merged_doc.size = merged_doc.file.size
        merged_doc.save()
        
        return JsonResponse({
            'success': True,
            'file': document_to_dict(merged_doc)
        })
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@csrf_exempt
@require_http_methods(["POST"])
def split_file(request, file_id):
    """Split a file (CSV or PDF)"""
    try:
        doc = get_object_or_404(Document, id=file_id)
        data = json.loads(request.body)
        output_prefix = data.get('output_prefix', 'split')
        
        if doc.file_type == 'csv':
            return split_csv_file(doc, data, output_prefix)
        elif doc.file_type == 'pdf':
            return split_pdf_file(doc, data, output_prefix)
        else:
            return JsonResponse({'error': f'Splitting not supported for {doc.file_type} files'}, status=400)
            
    except Exception as e:
        return JsonResponse({'error': str(e), 'traceback': traceback.format_exc()}, status=400)

def split_csv_file(doc, data, output_prefix):
    df = pd.read_csv(doc.file.path)
    split_type = data.get('split_type', 'rows')
    split_value = data.get('split_value')
    created_files = []
    
    if split_type == 'rows':
        chunk_size = int(split_value)
        num_chunks = (len(df) + chunk_size - 1) // chunk_size
        
        for i in range(num_chunks):
            start = i * chunk_size
            end = start + chunk_size
            chunk_df = df.iloc[start:end]
            
            output_name = f'{output_prefix}_{i+1}.csv'
            output_buffer = chunk_df.to_csv(index=False)
            output_file = ContentFile(output_buffer.encode('utf-8'), name=output_name)
            
            split_doc = Document(
                name=output_name,
                row_count=len(chunk_df),
                column_count=len(chunk_df.columns),
                file_type='csv'
            )
            split_doc.file.save(output_name, output_file, save=True)
            split_doc.size = split_doc.file.size
            split_doc.save()
            created_files.append(document_to_dict(split_doc))
            
    elif split_type == 'column':
        column_name = split_value
        if column_name not in df.columns:
            return JsonResponse({'error': f'Column {column_name} not found'}, status=400)
        
        for value, group_df in df.groupby(column_name):
            safe_value = str(value).replace('/', '_').replace('\\', '_')
            output_name = f'{output_prefix}_{safe_value}.csv'
            output_buffer = group_df.to_csv(index=False)
            output_file = ContentFile(output_buffer.encode('utf-8'), name=output_name)
            
            split_doc = Document(
                name=output_name,
                row_count=len(group_df),
                column_count=len(group_df.columns),
                file_type='csv'
            )
            split_doc.file.save(output_name, output_file, save=True)
            split_doc.size = split_doc.file.size
            split_doc.save()
            created_files.append(document_to_dict(split_doc))
            
    return JsonResponse({
        'success': True,
        'files': created_files,
        'count': len(created_files)
    })

def split_pdf_file(doc, data, output_prefix):
    # For now, split into single pages
    # Future: Support custom ranges
    
    import tempfile
    with tempfile.TemporaryDirectory() as temp_dir:
        output_paths = split_pdf(doc.file.path, temp_dir)
        
        created_files = []
        for path in output_paths:
            filename = os.path.basename(path)
            # Prepend user prefix? filename is page_X.pdf from utils
            final_name = f"{output_prefix}_{filename}"
            
            with open(path, 'rb') as f:
                content = f.read()
            
            split_doc = Document(name=final_name, file_type='pdf')
            split_doc.file.save(final_name, ContentFile(content), save=True)
            split_doc.size = split_doc.file.size
            split_doc.save()
            created_files.append(document_to_dict(split_doc))
            
    return JsonResponse({
        'success': True,
        'files': created_files,
        'count': len(created_files)
    })


@csrf_exempt
@require_http_methods(["POST"])
def filter_file(request, file_id):
    """Filter CSV file (CSV Only)"""
    # Reuse existing logic but check for CSV type
    try:
        doc = get_object_or_404(Document, id=file_id)
        if doc.file_type != 'csv':
            return JsonResponse({'error': 'Filtering only supported for CSVs'}, status=400)
            
        # ... logic is same as before, just using doc instead of csv_file
        data = json.loads(request.body)
        df = pd.read_csv(doc.file.path)
        
        filters = data.get('filters', [])
        output_name = data.get('output_name', 'filtered_file.csv')
        
        filtered_df = df.copy()
        
        for filter_condition in filters:
            column = filter_condition.get('column')
            operator = filter_condition.get('operator')
            value = filter_condition.get('value')
            
            if column not in filtered_df.columns:
                continue
            
            # ... (Insert content of existing filter logic here) ...
            # For brevity in this rewrite, assuming we paste the logic back
            # I will use the logic I read previously
            
            if operator == 'equals':
                filtered_df = filtered_df[filtered_df[column] == value]
            elif operator == 'contains':
                filtered_df = filtered_df[filtered_df[column].astype(str).str.contains(str(value), na=False)]
            elif operator == 'greater':
                 filtered_df = filtered_df[filtered_df[column] > float(value)]
            elif operator == 'less':
                 filtered_df = filtered_df[filtered_df[column] < float(value)]
            elif operator == 'not_null':
                 filtered_df = filtered_df[filtered_df[column].notna()]
            elif operator == 'is_null':
                 filtered_df = filtered_df[filtered_df[column].isna()]
            elif operator == 'date_equals':
                try:
                    filtered_df[column] = pd.to_datetime(filtered_df[column], errors='coerce')
                    filter_date = pd.to_datetime(value, errors='coerce')
                    if pd.notna(filter_date):
                        filtered_df = filtered_df[filtered_df[column].dt.date == filter_date.date()]
                except: continue
            elif operator == 'date_before':
                try:
                    filtered_df[column] = pd.to_datetime(filtered_df[column], errors='coerce')
                    filter_date = pd.to_datetime(value, errors='coerce')
                    if pd.notna(filter_date):
                        filtered_df = filtered_df[filtered_df[column] < filter_date]
                except: continue
            elif operator == 'date_after':
                try:
                    filtered_df[column] = pd.to_datetime(filtered_df[column], errors='coerce')
                    filter_date = pd.to_datetime(value, errors='coerce')
                    if pd.notna(filter_date):
                        filtered_df = filtered_df[filtered_df[column] > filter_date]
                except: continue
            elif operator == 'date_remove':
                try:
                    filtered_df[column] = pd.to_datetime(filtered_df[column], errors='coerce')
                    filter_date = pd.to_datetime(value, errors='coerce')
                    if pd.notna(filter_date):
                         filtered_df = filtered_df[
                            (filtered_df[column].dt.date != filter_date.date()) | 
                            (filtered_df[column].isna())
                        ]
                except: continue
            elif operator == 'date_range_remove':
                try:
                    start_str, end_str = value.split(',')
                    filtered_df[column] = pd.to_datetime(filtered_df[column], errors='coerce')
                    start_date = pd.to_datetime(start_str, errors='coerce')
                    end_date = pd.to_datetime(end_str, errors='coerce')
                    if pd.notna(start_date) and pd.notna(end_date):
                        filtered_df = filtered_df[
                            ~((filtered_df[column] >= start_date) & (filtered_df[column] <= end_date)) | 
                            (filtered_df[column].isna())
                        ]
                except: continue
            elif operator == 'date_list_remove':
                try:
                    date_strs = [d.strip() for d in value.split(',')]
                    dates_to_remove = set()
                    for d_str in date_strs:
                        dt = pd.to_datetime(d_str, errors='coerce')
                        if pd.notna(dt):
                            dates_to_remove.add(dt.date())
                    if dates_to_remove:
                        filtered_df[column] = pd.to_datetime(filtered_df[column], errors='coerce')
                        mask = filtered_df[column].apply(
                            lambda x: x.date() not in dates_to_remove if pd.notna(x) else True
                        )
                        filtered_df = filtered_df[mask]
                except: continue

        output_buffer = filtered_df.to_csv(index=False)
        output_file = ContentFile(output_buffer.encode('utf-8'), name=output_name)
        
        filtered_doc = Document(
            name=output_name,
            row_count=len(filtered_df),
            column_count=len(filtered_df.columns),
            file_type='csv'
        )
        filtered_doc.file.save(output_name, output_file, save=True)
        filtered_doc.size = filtered_doc.file.size
        filtered_doc.save()
        
        return JsonResponse({
            'success': True,
            'file': document_to_dict(filtered_doc),
            'original_rows': len(df),
            'filtered_rows': len(filtered_df)
        })
    except Exception as e:
        return JsonResponse({'error': str(e), 'traceback': traceback.format_exc()}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def ai_preprocess(request, file_id):
    """AI preprocessing (CSV Only)"""
    try:
        doc = get_object_or_404(Document, id=file_id)
        if doc.file_type != 'csv':
            return JsonResponse({'error': 'AI features only available for CSVs currently'}, status=400)

        data = json.loads(request.body)
        df = pd.read_csv(doc.file.path)
        
        preprocessing_type = data.get('type', 'analyze')
        auto_fix = data.get('auto_fix', False)
        
        suggestions = []
        
        if preprocessing_type == 'analyze' or preprocessing_type == 'clean':
            # Missing values
            null_counts = df.isnull().sum()
            for col, count in null_counts.items():
                if count > 0:
                    percentage = (count / len(df)) * 100
                    suggestions.append({
                        'type': 'missing_values',
                        'column': col,
                        'count': int(count),
                        'percentage': round(percentage, 2),
                        'suggestion': f'Consider filling {count} missing values in column "{col}"'
                    })
            
            # Duplicates
            duplicates = df.duplicated().sum()
            if duplicates > 0:
                suggestions.append({
                    'type': 'duplicates',
                    'count': int(duplicates),
                    'suggestion': f'Found {duplicates} duplicate rows. Consider removing them.'
                })
            
            # Data Types
            for col in df.columns:
                if df[col].dtype == 'object':
                    try:
                        pd.to_numeric(df[col], errors='raise')
                        suggestions.append({
                            'type': 'data_type',
                            'column': col,
                            'current_type': 'object',
                            'suggested_type': 'numeric',
                            'suggestion': f'Column "{col}" appears to be numeric but is stored as text'
                        })
                    except: pass
            
            if auto_fix and preprocessing_type == 'clean':
                for col in df.columns:
                    if df[col].isnull().sum() > 0:
                        if pd.api.types.is_numeric_dtype(df[col]):
                            df[col].fillna(df[col].median(), inplace=True)
                        else:
                            df[col].fillna(df[col].mode()[0] if len(df[col].mode()) > 0 else '', inplace=True)
                
                df = df.drop_duplicates()
                
                output_name = f'cleaned_{doc.name}'
                output_buffer = df.to_csv(index=False)
                output_file = ContentFile(output_buffer.encode('utf-8'), name=output_name)
                
                cleaned_doc = Document(
                    name=output_name,
                    row_count=len(df),
                    column_count=len(df.columns),
                    file_type='csv'
                )
                cleaned_doc.file.save(output_name, output_file, save=True)
                cleaned_doc.size = cleaned_doc.file.size
                cleaned_doc.save()
                
                return JsonResponse({
                    'success': True,
                    'suggestions': suggestions,
                    'file': document_to_dict(cleaned_doc),
                    'actions_taken': ['Filled missing values', 'Removed duplicates']
                })
        
        elif preprocessing_type == 'suggest_columns':
             for col in df.columns:
                if '_' in col or ' ' in col:
                    suggestions.append({
                        'type': 'column_name',
                        'column': col,
                        'suggestion': f'Consider renaming "{col}" for clarity'
                    })
        
        return JsonResponse({
            'success': True,
            'suggestions': suggestions,
            'auto_fix_available': preprocessing_type == 'analyze'
        })
    except Exception as e:
        return JsonResponse({'error': str(e), 'traceback': traceback.format_exc()}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def find_replace(request, file_id):
    """Find and Replace text in Docx or PPTX"""
    try:
        doc = get_object_or_404(Document, id=file_id)
        if doc.file_type not in ['docx', 'pptx']:
            return JsonResponse({'error': 'Find & Replace only supported for Word and PowerPoint'}, status=400)

        data = json.loads(request.body)
        find_text = data.get('find_text')
        replace_text = data.get('replace_text')
        output_name = data.get('output_name', f'modified_{doc.name}')
        
        if not find_text:
            return JsonResponse({'error': 'Find text is required'}, status=400)
            
        # Create temp output path
        import tempfile
        import shutil
        
        # We need to copy the original file to a temp location to modify it
        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{doc.file_type}') as tmp_out:
            tmp_output_path = tmp_out.name
            
        # Copy original file to temp path first (to have a base to modify, or just pass original path)
        # Actually our utils take input path and save to output path
        
        if doc.file_type == 'docx':
            replace_text_docx(doc.file.path, find_text, replace_text, tmp_output_path)
        elif doc.file_type == 'pptx':
            replace_text_pptx(doc.file.path, find_text, replace_text, tmp_output_path)
            
        # Read back and save
        with open(tmp_output_path, 'rb') as f:
            content = f.read()
            
        modified_doc = Document(name=output_name, file_type=doc.file_type)
        modified_doc.file.save(output_name, ContentFile(content), save=True)
        modified_doc.size = modified_doc.file.size
        modified_doc.save()
        
        # Cleanup
        if os.path.exists(tmp_output_path):
            os.remove(tmp_output_path)
            
        return JsonResponse({
            'success': True,
            'file': document_to_dict(modified_doc)
        })

    except Exception as e:
        return JsonResponse({'error': str(e), 'traceback': traceback.format_exc()}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def organize_pdf_view(request, file_id):
    """Reorder, Rotate, Delete PDF pages"""
    try:
        doc = get_object_or_404(Document, id=file_id)
        if doc.file_type != 'pdf':
            return JsonResponse({'error': 'Only PDF files can be organized'}, status=400)

        data = json.loads(request.body)
        pages_config = data.get('pages', []) # List of { original_page_number: 1, rotate: 90 }
        output_name = data.get('output_name', f'organized_{doc.name}')
        
        if not pages_config:
            return JsonResponse({'error': 'Page configuration is required'}, status=400)

        import tempfile
        
        # Create temp output path
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_out:
            tmp_output_path = tmp_out.name
            
        organize_pdf(doc.file.path, pages_config, tmp_output_path)
        
        # Read back and save
        with open(tmp_output_path, 'rb') as f:
            content = f.read()
            
        new_doc = Document(name=output_name, file_type='pdf')
        new_doc.file.save(output_name, ContentFile(content), save=True)
        new_doc.size = new_doc.file.size
        new_doc.save()
        
        # Cleanup
        if os.path.exists(tmp_output_path):
            os.remove(tmp_output_path)

        return JsonResponse({
            'success': True,
            'file': document_to_dict(new_doc)
        })

    except Exception as e:
        return JsonResponse({'error': str(e), 'traceback': traceback.format_exc()}, status=400)


@csrf_exempt
@require_http_methods(["DELETE"])
def delete_file(request, file_id):
    """Delete a file"""
    try:
        doc = get_object_or_404(Document, id=file_id)
        doc.delete()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@require_http_methods(["GET"])
def download_file(request, file_id):
    """Download a file"""
    try:
        doc = get_object_or_404(Document, id=file_id)
        response = FileResponse(open(doc.file.path, 'rb'))
        response['Content-Disposition'] = f'attachment; filename="{doc.name}"'
        return response
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@require_http_methods(["GET"])
def get_docx_content(request, file_id):
    """Get DOCX content: HTML for preview and paragraphs for editing"""
    try:
        doc = get_object_or_404(Document, id=file_id)
        if doc.file_type != 'docx':
            return JsonResponse({'error': 'Not a DOCX file'}, status=400)
            
        from .utils import docx_to_html, get_docx_paragraphs
        
        html_content = docx_to_html(doc.file.path)
        paragraphs = get_docx_paragraphs(doc.file.path)
        
        return JsonResponse({
            'html': html_content,
            'paragraphs': paragraphs
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["POST"])
def update_docx_text(request, file_id):
    """Update a specific paragraph in DOCX"""
    try:
        doc = get_object_or_404(Document, id=file_id)
        if doc.file_type != 'docx':
            return JsonResponse({'error': 'Not a DOCX file'}, status=400)
            
        data = json.loads(request.body)
        index = int(data.get('index'))
        text = data.get('text')
        
        from .utils import update_docx_paragraph
        
        success = update_docx_paragraph(doc.file.path, index, text)
        if success:
            return JsonResponse({'success': True})
        else:
            return JsonResponse({'error': 'Failed to update paragraph'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["POST"])
def upload_docx_image(request, file_id):
    """Upload and append image to DOCX"""
    try:
        doc = get_object_or_404(Document, id=file_id)
        if doc.file_type != 'docx':
            return JsonResponse({'error': 'Not a DOCX file'}, status=400)
            
        image = request.FILES.get('image')
        if not image:
            return JsonResponse({'error': 'No image provided'}, status=400)
            
        from .utils import add_image_to_docx
        
        add_image_to_docx(doc.file.path, image)
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["POST"])
def organize_docx_view(request, file_id):
    """Reorder/Delete pages in DOCX"""
    try:
        doc = get_object_or_404(Document, id=file_id)
        if doc.file_type != 'docx':
            return JsonResponse({'error': 'Not a DOCX file'}, status=400)
            
        data = json.loads(request.body)
        pages_config = data.get('pages') # List of {original_page_number: 1}
        output_name = data.get('output_name', f'organized_{doc.name}')
        
        if not pages_config:
            return JsonResponse({'error': 'Page configuration is required'}, status=400)

        import tempfile
        from .utils import organize_docx_pages
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as tmp_out:
            tmp_output_path = tmp_out.name
            
        result_path = organize_docx_pages(doc.file.path, pages_config, tmp_output_path)
        
        if not result_path:
             return JsonResponse({'error': 'Failed to organize document'}, status=500)
        
        # Read back and save
        with open(tmp_output_path, 'rb') as f:
            content = f.read()
            
        new_doc = Document(name=output_name, file_type='docx')
        new_doc.file.save(output_name, ContentFile(content), save=True)
        new_doc.size = new_doc.file.size
        new_doc.save()
        
        if os.path.exists(tmp_output_path):
            os.remove(tmp_output_path)

        return JsonResponse({
            'success': True,
            'file': document_to_dict(new_doc)
        })

    except Exception as e:
        import traceback
        return JsonResponse({'error': str(e), 'traceback': traceback.format_exc()}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def merge_docx_view(request):
    """Merge multiple DOCX files"""
    try:
        data = json.loads(request.body)
        file_ids = data.get('file_ids', [])
        output_name = data.get('output_name', 'merged.docx')

        if len(file_ids) < 2:
            return JsonResponse({'error': 'At least two files are required for merging'}, status=400)

        docs = Document.objects.filter(id__in=file_ids, file_type='docx')
        # Maintain order
        docs_map = {d.id: d for d in docs}
        ordered_docs = [docs_map[fid] for fid in file_ids if fid in docs_map]
        
        if len(ordered_docs) < 2:
            return JsonResponse({'error': 'Invalid files provided'}, status=400)
            
        file_paths = [d.file.path for d in ordered_docs]
        
        import tempfile
        from .utils import merge_docx_files
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as tmp_out:
            tmp_output_path = tmp_out.name
            
        merge_docx_files(file_paths, tmp_output_path)
        
        with open(tmp_output_path, 'rb') as f:
            content = f.read()
            
        merged_doc = Document(name=output_name, file_type='docx')
        merged_doc.file.save(output_name, ContentFile(content), save=True)
        merged_doc.size = merged_doc.file.size
        merged_doc.save()
        
        if os.path.exists(tmp_output_path):
            os.remove(tmp_output_path)

        return JsonResponse({
            'success': True,
            'file': document_to_dict(merged_doc)
        })

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
