import pandas as pd
import os
from apps.tools.base import BaseFileService

class CleaningService(BaseFileService):
    def process(self, *args, **kwargs):
        pass

    def load_dataframe(self, file_path, file_type):
        if file_type == 'csv':
            return pd.read_csv(file_path)
        elif file_type in ['xlsx', 'xls']:
            return pd.read_excel(file_path)
        else:
            raise ValueError(f"Unsupported file type for cleaning: {file_type}")

    def save_dataframe(self, df, original_path, suffix="_clean"):
        base, ext = os.path.splitext(original_path)
        new_path = f"{base}{suffix}{ext}"
        
        if ext.lower() == '.csv':
            df.to_csv(new_path, index=False)
        else:
            df.to_excel(new_path, index=False)
            
        return new_path

    def clean_file(self, file_path, file_type, operations):
        """
        operations: list of dicts { 'type': 'deduplicate'|'fillna'|'drop_cols'|'rename_cols', 'params': {} }
        """
        df = self.load_dataframe(file_path, file_type)
        
        for op in operations:
            op_type = op.get('type')
            params = op.get('params', {})
            
            if op_type == 'deduplicate':
                subset = params.get('subset', None) # List of columns to check
                df.drop_duplicates(subset=subset, inplace=True)
            
            elif op_type == 'fillna':
                value = params.get('value', '')
                method = params.get('method', None) # 'ffill', 'bfill'
                cols = params.get('columns', None) # Specific columns or all
                
                if cols:
                    if method:
                        df[cols] = df[cols].fillna(method=method)
                    else:
                        df[cols] = df[cols].fillna(value)
                else:
                    if method:
                        df.fillna(method=method, inplace=True)
                    else:
                        df.fillna(value, inplace=True)

            elif op_type == 'drop_missing':
                 axis = params.get('axis', 0) # 0 for rows, 1 for columns
                 how = params.get('how', 'any') # 'any' or 'all'
                 subset = params.get('subset', None)
                 df.dropna(axis=axis, how=how, subset=subset, inplace=True)

            elif op_type == 'drop_cols':
                cols = params.get('columns', [])
                df.drop(columns=cols, errors='ignore', inplace=True)
                
            elif op_type == 'rename_cols':
                mapping = params.get('mapping', {})
                df.rename(columns=mapping, inplace=True)

            elif op_type == 'standardize_header':
                # Lowercase and replace spaces with underscores
                df.columns = df.columns.str.lower().str.replace(' ', '_')

        return self.save_dataframe(df, file_path)
