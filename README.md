# CSV Editor - Web Application

A powerful web-based CSV editor built with Django that allows you to edit, merge, split, filter, and preprocess CSV files with AI assistance.

## Features

- 📤 **Upload Multiple CSV Files** - Drag and drop or browse to upload CSV files
- ✏️ **Edit CSV Files** - Inline cell editing with pagination support
- 🔀 **Merge CSV Files** - Merge multiple files by concatenation or joining on a column
- ✂️ **Split CSV Files** - Split files by number of rows or by column values
- 🔍 **Filter CSV Files** - Apply multiple filter conditions (equals, contains, greater than, less than, null checks)
- 🤖 **AI Preprocessing** - Analyze files and auto-fix common issues:
  - Detect and fill missing values
  - Remove duplicate rows
  - Data type detection and suggestions
  - Column naming suggestions
- 📥 **Download Files** - Download processed or original files
- 📊 **File Management** - View file information, row/column counts, and manage uploaded files

## Installation

### Prerequisites

- Python 3.8 or higher
- pip (Python package installer)

### Setup Steps

1. **Clone or download this repository**

2. **Create a virtual environment (recommended)**

   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment**

   On Windows:
   ```bash
   venv\Scripts\activate
   ```

   On macOS/Linux:
   ```bash
   source venv/bin/activate
   ```

4. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

5. **Run migrations**

   ```bash
   python manage.py migrate
   ```

6. **Create a superuser (optional, for admin access)**

   ```bash
   python manage.py createsuperuser
   ```

7. **Run the development server**

   ```bash
   python manage.py runserver
   ```

8. **Access the application**

   Open your browser and navigate to:
   ```
   http://127.0.0.1:8000/
   ```

## Usage

### Uploading Files

1. Click "Browse Files" or drag and drop CSV files onto the upload area
2. Multiple files can be selected at once
3. Uploaded files will appear in the "Uploaded Files" section

### Editing CSV Files

1. Click "Edit" on any uploaded file
2. Click on any cell to edit it inline
3. Press Enter to save or Escape to cancel
4. Use pagination controls to navigate through large files

### Merging Files

1. Click "Merge Files" button
2. Select the files you want to merge (checkbox)
3. Choose merge type:
   - **Concatenate**: Stacks files vertically
   - **Join**: Merges files horizontally based on a join column
4. Provide output file name
5. Click "Merge Files"

### Splitting Files

1. Click "Split File" button
2. Select the file to split
3. Choose split type:
   - **By Number of Rows**: Split into files with specified number of rows
   - **By Column Value**: Split into separate files for each unique value in a column
4. Provide output prefix
5. Click "Split File"

### Filtering Files

1. Click "Filter File" button
2. Select the file to filter
3. Add filter conditions:
   - Select column
   - Choose operator (equals, contains, greater than, less than, not null, is null)
   - Enter value (if applicable)
4. Add multiple conditions as needed
5. Provide output file name
6. Click "Apply Filter"

### AI Preprocessing

1. Click "AI Preprocess" button
2. Select the file to analyze
3. Choose action:
   - **Analyze Only**: Shows suggestions without making changes
   - **Clean with Auto-fix**: Automatically fixes issues and creates a cleaned file
4. Review the analysis results
5. If auto-fix was selected, download the cleaned file

## Project Structure

```
csv-editor/
├── csv_editor/          # Django project settings
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── editor/              # Main application
│   ├── models.py        # Database models
│   ├── views.py         # API views and endpoints
│   ├── urls.py          # URL routing
│   └── serializers.py   # API serializers
├── templates/           # HTML templates
│   └── editor/
│       └── index.html
├── static/              # Static files
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── main.js
├── media/               # Uploaded files (created automatically)
│   └── csv_files/
├── manage.py
├── requirements.txt
└── README.md
```

## API Endpoints

- `GET /` - Home page
- `POST /api/upload/` - Upload CSV files
- `GET /api/files/` - List all files
- `GET /api/files/<id>/` - Get file information
- `GET /api/files/<id>/data/` - Get paginated file data
- `POST /api/files/<id>/edit/` - Edit a cell
- `POST /api/merge/` - Merge files
- `POST /api/files/<id>/split/` - Split a file
- `POST /api/files/<id>/filter/` - Filter a file
- `POST /api/files/<id>/ai-preprocess/` - AI preprocessing
- `GET /api/files/<id>/download/` - Download a file
- `DELETE /api/files/<id>/delete/` - Delete a file

## Technologies Used

- **Backend**: Django 4.2, Django REST Framework
- **Data Processing**: Pandas
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Database**: SQLite (default, can be changed in settings.py)

## Notes

- The application uses SQLite by default. For production, consider using PostgreSQL or MySQL.
- Large CSV files may take time to process. Consider increasing server timeout if needed.
- The AI preprocessing uses rule-based analysis. For advanced AI features, you can integrate OpenAI API or other ML services.

## License

This project is open source and available for personal and commercial use.

## Support

For issues or questions, please create an issue in the repository.

