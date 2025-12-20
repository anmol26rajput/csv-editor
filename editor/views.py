import os
import pandas as pd
import json
from django.conf import settings
from django.http import JsonResponse, FileResponse, HttpResponse
from django.core.files.base import ContentFile
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.shortcuts import render, get_object_or_404
from .models import CSVFile
import traceback


def csv_file_to_dict(csv_file):
    """Convert CSVFile model instance to dictionary"""
    return {
        'id': csv_file.id,
        'name': csv_file.name,
        'file': csv_file.file.url if csv_file.file else None,
        'uploaded_at': csv_file.uploaded_at.isoformat(),
        'size': csv_file.size,
        'row_count': csv_file.row_count,
        'column_count': csv_file.column_count,
    }


def home(request):
    """Serve the main HTML page"""
    return render(request, 'editor/index.html')


@csrf_exempt
@require_http_methods(["POST"])
def upload_csv(request):
    """Upload one or multiple CSV files"""
    try:
        files = request.FILES.getlist('files')
        if not files:
            return JsonResponse({'error': 'No files provided'}, status=400)
        
        uploaded_files = []
        for file in files:
            if not file.name.endswith('.csv'):
                continue
            
            # Read CSV to get metadata (seek back to start after reading)
            df = pd.read_csv(file)
            file.seek(0)  # Reset file pointer for Django to save
            
            csv_file = CSVFile.objects.create(
                name=file.name,
                file=file,
                size=file.size,
                row_count=len(df),
                column_count=len(df.columns)
            )
            uploaded_files.append(csv_file_to_dict(csv_file))
        
        return JsonResponse({'files': uploaded_files}, status=201)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@require_http_methods(["GET"])
def list_files(request):
    """List all uploaded CSV files"""
    files = CSVFile.objects.all()
    files_data = [csv_file_to_dict(f) for f in files]
    return JsonResponse({'files': files_data})


@require_http_methods(["GET"])
def get_file_info(request, file_id):
    """Get information about a specific CSV file"""
    try:
        csv_file = get_object_or_404(CSVFile, id=file_id)
        df = pd.read_csv(csv_file.file.path)
        
        return JsonResponse({
            'id': csv_file.id,
            'name': csv_file.name,
            'columns': list(df.columns),
            'row_count': len(df),
            'column_count': len(df.columns),
            'sample_data': df.head(10).to_dict('records'),
            'data_types': df.dtypes.astype(str).to_dict(),
            'null_counts': df.isnull().sum().to_dict(),
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@require_http_methods(["GET"])
def get_file_data(request, file_id):
    """Get paginated CSV data"""
    try:
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 100))
        
        csv_file = get_object_or_404(CSVFile, id=file_id)
        df = pd.read_csv(csv_file.file.path)
        
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
    """Edit a specific cell in the CSV"""
    try:
        csv_file = get_object_or_404(CSVFile, id=file_id)
        data = json.loads(request.body)
        
        df = pd.read_csv(csv_file.file.path)
        
        row_index = int(data.get('row_index'))
        column = data.get('column')
        value = data.get('value')
        
        df.at[row_index, column] = value
        df.to_csv(csv_file.file.path, index=False)
        
        # Update row count
        csv_file.row_count = len(df)
        csv_file.save()
        
        return JsonResponse({'success': True, 'new_value': value})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def merge_files(request):
    """Merge multiple CSV files"""
    try:
        data = json.loads(request.body)
        file_ids = data.get('file_ids', [])
        merge_type = data.get('merge_type', 'concat')  # 'concat' or 'join'
        join_column = data.get('join_column', None)
        output_name = data.get('output_name', 'merged_file.csv')
        
        if not file_ids or len(file_ids) < 2:
            return JsonResponse({'error': 'At least 2 files required for merging'}, status=400)
        
        csv_files = CSVFile.objects.filter(id__in=file_ids)
        if csv_files.count() != len(file_ids):
            return JsonResponse({'error': 'One or more files not found'}, status=404)
        
        dataframes = []
        for csv_file in csv_files:
            df = pd.read_csv(csv_file.file.path)
            dataframes.append(df)
        
        if merge_type == 'concat':
            merged_df = pd.concat(dataframes, ignore_index=True)
        elif merge_type == 'join':
            if not join_column:
                return JsonResponse({'error': 'join_column required for join merge'}, status=400)
            merged_df = dataframes[0]
            for df in dataframes[1:]:
                merged_df = pd.merge(merged_df, df, on=join_column, how='outer')
        
        # Save merged file using ContentFile
        output_buffer = merged_df.to_csv(index=False)
        output_bytes = output_buffer.encode('utf-8')
        output_file = ContentFile(output_bytes, name=output_name)
        
        # Create CSVFile record
        merged_file = CSVFile(
            name=output_name,
            row_count=len(merged_df),
            column_count=len(merged_df.columns)
        )
        merged_file.file.save(output_name, output_file, save=True)
        merged_file.size = merged_file.file.size
        merged_file.save()
        
        return JsonResponse({
            'success': True,
            'file': csv_file_to_dict(merged_file),
            'row_count': len(merged_df),
            'column_count': len(merged_df.columns)
        })
    except Exception as e:
        return JsonResponse({'error': str(e), 'traceback': traceback.format_exc()}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def split_file(request, file_id):
    """Split a CSV file into multiple files"""
    try:
        csv_file = get_object_or_404(CSVFile, id=file_id)
        data = json.loads(request.body)
        df = pd.read_csv(csv_file.file.path)
        
        split_type = data.get('split_type', 'rows')  # 'rows' or 'column'
        split_value = data.get('split_value')
        output_prefix = data.get('output_prefix', 'split_file')
        
        created_files = []
        
        if split_type == 'rows':
            # Split by number of rows per file
            chunk_size = int(split_value)
            num_chunks = (len(df) + chunk_size - 1) // chunk_size
            
            for i in range(num_chunks):
                start = i * chunk_size
                end = start + chunk_size
                chunk_df = df.iloc[start:end]
                
                output_name = f'{output_prefix}_{i+1}.csv'
                output_buffer = chunk_df.to_csv(index=False)
                output_bytes = output_buffer.encode('utf-8')
                output_file = ContentFile(output_bytes, name=output_name)
                
                split_file_obj = CSVFile(
                    name=output_name,
                    row_count=len(chunk_df),
                    column_count=len(chunk_df.columns)
                )
                split_file_obj.file.save(output_name, output_file, save=True)
                split_file_obj.size = split_file_obj.file.size
                split_file_obj.save()
                created_files.append(csv_file_to_dict(split_file_obj))
        
        elif split_type == 'column':
            # Split by column value (e.g., group by a column)
            column_name = split_value
            if column_name not in df.columns:
                return JsonResponse({'error': f'Column {column_name} not found'}, status=400)
            
            for value, group_df in df.groupby(column_name):
                safe_value = str(value).replace('/', '_').replace('\\', '_')
                output_name = f'{output_prefix}_{safe_value}.csv'
                output_buffer = group_df.to_csv(index=False)
                output_bytes = output_buffer.encode('utf-8')
                output_file = ContentFile(output_bytes, name=output_name)
                
                split_file_obj = CSVFile(
                    name=output_name,
                    row_count=len(group_df),
                    column_count=len(group_df.columns)
                )
                split_file_obj.file.save(output_name, output_file, save=True)
                split_file_obj.size = split_file_obj.file.size
                split_file_obj.save()
                created_files.append(csv_file_to_dict(split_file_obj))
        
        return JsonResponse({
            'success': True,
            'files': created_files,
            'count': len(created_files)
        })
    except Exception as e:
        return JsonResponse({'error': str(e), 'traceback': traceback.format_exc()}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def filter_file(request, file_id):
    """Filter CSV file based on conditions"""
    try:
        csv_file = get_object_or_404(CSVFile, id=file_id)
        data = json.loads(request.body)
        df = pd.read_csv(csv_file.file.path)
        
        filters = data.get('filters', [])
        output_name = data.get('output_name', 'filtered_file.csv')
        
        filtered_df = df.copy()
        
        for filter_condition in filters:
            column = filter_condition.get('column')
            operator = filter_condition.get('operator')  # 'equals', 'contains', 'greater', 'less', 'not_null'
            value = filter_condition.get('value')
            
            if column not in filtered_df.columns:
                continue
            
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
        
        # Save filtered file using ContentFile
        output_buffer = filtered_df.to_csv(index=False)
        output_bytes = output_buffer.encode('utf-8')
        output_file = ContentFile(output_bytes, name=output_name)
        
        # Create CSVFile record
        filtered_file = CSVFile(
            name=output_name,
            row_count=len(filtered_df),
            column_count=len(filtered_df.columns)
        )
        filtered_file.file.save(output_name, output_file, save=True)
        filtered_file.size = filtered_file.file.size
        filtered_file.save()
        
        return JsonResponse({
            'success': True,
            'file': csv_file_to_dict(filtered_file),
            'original_rows': len(df),
            'filtered_rows': len(filtered_df)
        })
    except Exception as e:
        return JsonResponse({'error': str(e), 'traceback': traceback.format_exc()}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def ai_preprocess(request, file_id):
    """AI-powered preprocessing suggestions and auto-fix"""
    try:
        csv_file = get_object_or_404(CSVFile, id=file_id)
        data = json.loads(request.body)
        df = pd.read_csv(csv_file.file.path)
        
        preprocessing_type = data.get('type', 'analyze')  # 'analyze', 'clean', 'suggest_columns'
        auto_fix = data.get('auto_fix', False)
        
        suggestions = []
        
        if preprocessing_type == 'analyze' or preprocessing_type == 'clean':
            # Detect missing values
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
            
            # Detect duplicate rows
            duplicates = df.duplicated().sum()
            if duplicates > 0:
                suggestions.append({
                    'type': 'duplicates',
                    'count': int(duplicates),
                    'suggestion': f'Found {duplicates} duplicate rows. Consider removing them.'
                })
            
            # Detect data type issues
            for col in df.columns:
                if df[col].dtype == 'object':
                    # Try to convert to numeric if possible
                    try:
                        pd.to_numeric(df[col], errors='raise')
                        suggestions.append({
                            'type': 'data_type',
                            'column': col,
                            'current_type': 'object',
                            'suggested_type': 'numeric',
                            'suggestion': f'Column "{col}" appears to be numeric but is stored as text'
                        })
                    except:
                        pass
            
            if auto_fix and preprocessing_type == 'clean':
                # Auto-fix missing values with median/mean for numeric, mode for categorical
                for col in df.columns:
                    if df[col].isnull().sum() > 0:
                        if pd.api.types.is_numeric_dtype(df[col]):
                            df[col].fillna(df[col].median(), inplace=True)
                        else:
                            df[col].fillna(df[col].mode()[0] if len(df[col].mode()) > 0 else '', inplace=True)
                
                # Remove duplicates
                df = df.drop_duplicates()
                
                # Save cleaned file using ContentFile
                output_name = f'cleaned_{csv_file.name}'
                output_buffer = df.to_csv(index=False)
                output_bytes = output_buffer.encode('utf-8')
                output_file = ContentFile(output_bytes, name=output_name)
                
                cleaned_file = CSVFile(
                    name=output_name,
                    row_count=len(df),
                    column_count=len(df.columns)
                )
                cleaned_file.file.save(output_name, output_file, save=True)
                cleaned_file.size = cleaned_file.file.size
                cleaned_file.save()
                
                return JsonResponse({
                    'success': True,
                    'suggestions': suggestions,
                    'file': csv_file_to_dict(cleaned_file),
                    'actions_taken': ['Filled missing values', 'Removed duplicates']
                })
        
        elif preprocessing_type == 'suggest_columns':
            # Suggest column operations (rename, split, combine)
            for col in df.columns:
                # Check if column name has multiple words that could be split
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
@require_http_methods(["DELETE"])
def delete_file(request, file_id):
    """Delete a CSV file"""
    try:
        csv_file = get_object_or_404(CSVFile, id=file_id)
        csv_file.delete()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@require_http_methods(["GET"])
def download_file(request, file_id):
    """Download a CSV file"""
    try:
        csv_file = get_object_or_404(CSVFile, id=file_id)
        response = FileResponse(open(csv_file.file.path, 'rb'), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{csv_file.name}"'
        return response
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
