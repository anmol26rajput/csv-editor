import pandas as pd
from apps.tools.base import BaseFileService

class CSVService(BaseFileService):
    def get_dataframe(self, file_path):
        if str(file_path).endswith('.xlsx') or str(file_path).endswith('.xls'):
            return pd.read_excel(file_path)
        return pd.read_csv(file_path)

    def process(self, *args, **kwargs):
        pass

    def read_csv(self, file_path, page=1, page_size=50):
        # Read only necessary rows if possible, but for simplicity read all then slice
        # Ideally use skiprows and nrows for efficiency on large files
        try:
            df = self.get_dataframe(file_path)
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

    def filter_csv(self, file_path, column, value):
        try:
            df = self.get_dataframe(file_path)
            if column in df.columns:
                # Simple string contains filter match
                df = df[df[column].astype(str).str.contains(value, case=False, na=False)]
            return df
        except Exception as e:
            raise e

    def remove_data(self, file_path, remove_type, target_data):
        try:
            df = self.get_dataframe(file_path)
            
            if remove_type == 'row':
                index = target_data.get('row_index')
                if index is not None and 0 <= index < len(df):
                    df = df.drop(df.index[index])
                    
            elif remove_type == 'column':
                col = target_data.get('column')
                if col in df.columns:
                    df = df.drop(columns=[col])
                    
            elif remove_type == 'date':
                col = target_data.get('column')
                target_dt = pd.to_datetime(target_data.get('date'))
                
                if col and col in df.columns:
                    temp_dates = pd.to_datetime(df[col], errors='coerce')
                    df = df[~(temp_dates == target_dt)]
                else:
                    # Search across all columns
                    mask = pd.Series(False, index=df.index)
                    for c in df.columns:
                        temp_dates = pd.to_datetime(df[c], errors='coerce')
                        mask = mask | (temp_dates == target_dt)
                    df = df[~mask]
                    
            elif remove_type == 'date_range':
                col = target_data.get('column')
                if col and col in df.columns:
                    temp_dates = pd.to_datetime(df[col], errors='coerce')
                    start_dt = pd.to_datetime(target_data.get('start_date'))
                    end_dt = pd.to_datetime(target_data.get('end_date'))
                    df = df[~((temp_dates >= start_dt) & (temp_dates <= end_dt))]
                else:
                    # Search across all columns
                    start_dt = pd.to_datetime(target_data.get('start_date'))
                    end_dt = pd.to_datetime(target_data.get('end_date'))
                    mask = pd.Series(False, index=df.index)
                    for c in df.columns:
                        temp_dates = pd.to_datetime(df[c], errors='coerce')
                        mask = mask | ((temp_dates >= start_dt) & (temp_dates <= end_dt))
                    df = df[~mask]
                        
            return df
        except Exception as e:
            raise e
