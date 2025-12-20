# Quick Start Guide

## 🚀 Next Steps to Run Your CSV Editor

### Option 1: Automated Setup (Windows)
Run the setup script:
```bash
setup.bat
```

### Option 2: Manual Setup

#### Step 1: Create Virtual Environment
```bash
python -m venv venv
```

#### Step 2: Activate Virtual Environment

**Windows:**
```bash
venv\Scripts\activate
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

#### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

#### Step 4: Run Database Migrations
```bash
python manage.py migrate
```

#### Step 5: Create Admin User (Optional)
```bash
python manage.py createsuperuser
```
This allows you to access Django admin at `/admin/`

#### Step 6: Start the Development Server
```bash
python manage.py runserver
```

#### Step 7: Open in Browser
Navigate to: **http://127.0.0.1:8000/**

---

## ✅ What You Should See

1. **Home Page**: A beautiful CSV editor interface
2. **Upload Area**: Drag & drop or browse to upload CSV files
3. **Action Buttons**: Merge, Split, Filter, and AI Preprocess options

---

## 🧪 Test the Application

1. **Upload a CSV file** - Click "Browse Files" or drag & drop
2. **Edit a file** - Click "Edit" on any uploaded file
3. **Try merging** - Upload 2+ files and click "Merge Files"
4. **Test filtering** - Click "Filter File" and add conditions
5. **AI Preprocessing** - Click "AI Preprocess" to analyze files

---

## 📝 Important Notes

- **Database**: SQLite database (`db.sqlite3`) will be created automatically
- **Media Files**: Uploaded CSV files will be stored in `media/csv_files/`
- **Static Files**: CSS and JavaScript are in the `static/` folder
- **Port**: Default port is 8000. If busy, use `python manage.py runserver 8080`

---

## 🐛 Troubleshooting

### Issue: "Module not found"
**Solution**: Make sure virtual environment is activated and dependencies are installed

### Issue: "Port already in use"
**Solution**: Use a different port: `python manage.py runserver 8080`

### Issue: "No such table" error
**Solution**: Run migrations: `python manage.py migrate`

### Issue: Static files not loading
**Solution**: Make sure `STATICFILES_DIRS` is set correctly in `settings.py` (already configured)

---

## 🎯 What's Working

✅ All views converted to pure Django function-based views  
✅ No Django REST Framework dependency  
✅ File upload, edit, merge, split, filter functionality  
✅ AI preprocessing features  
✅ Modern, responsive UI  
✅ All API endpoints working  

---

## 📚 Next Development Steps (Optional)

1. **Add Authentication**: User login/registration
2. **Add CSRF Protection**: Remove `@csrf_exempt` and add proper CSRF tokens
3. **Add File Size Limits**: Prevent uploading very large files
4. **Add Progress Bars**: For long-running operations
5. **Add Export Options**: Export to Excel, JSON, etc.
6. **Add Real AI Integration**: Connect to OpenAI API for advanced preprocessing

---

**Ready to go!** Just run the setup steps above and start using your CSV editor! 🎉

