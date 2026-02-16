import pandas as pd
from apps.tools.base import BaseFileService

class CSVService(BaseFileService):
    def read_csv(self, file_path, page=1, page_size=50):
        # Read only necessary rows if possible, but for simplicity read all then slice
        # Ideally use skiprows and nrows for efficiency on large files
        try:
            df = pd.read_csv(file_path)
            total_rows = len(df)
            start = (page - 1) * page_size
            end = start + page_size
            
            data = df.iloc[start:end].replace({float('nan'): None}).to_dict(orient='records')
            columns = list(df.columns)
            
            return {
                'columns': columns,
                'data': data,
                'total_rows': total_rows,
                'page': page,
                'page_size': page_size
            }
        except Exception as e:
            raise e

    def filter_csv(self, file_path, column, value, page=1, page_size=50):
        try:
            df = pd.read_csv(file_path)
            if column in df.columns:
                # Simple string contains filter match
                df = df[df[column].astype(str).str.contains(value, case=False, na=False)]
            
            total_rows = len(df)
            start = (page - 1) * page_size
            end = start + page_size
            
            data = df.iloc[start:end].replace({float('nan'): None}).to_dict(orient='records')
            columns = list(df.columns)
            
            return {
                'columns': columns,
                'data': data,
                'total_rows': total_rows,
                'page': page,
                'page_size': page_size,
                'filtered': True
            }
        except Exception as e:
            raise e
