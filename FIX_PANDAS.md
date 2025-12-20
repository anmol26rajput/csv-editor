# Fix for Pandas Installation Issue

## Problem
Pandas 2.1.3 is trying to build from source on Python 3.13 and failing due to compilation errors.

## Solution

The `requirements.txt` has been updated to use `pandas>=2.2.0` which has pre-built wheels for Python 3.13.

### Option 1: Re-run Setup (Recommended)
```bash
setup.bat
```

### Option 2: Manual Fix

If setup still fails, try these steps:

1. **Activate virtual environment:**
   ```bash
   venv\Scripts\activate
   ```

2. **Upgrade pip:**
   ```bash
   python -m pip install --upgrade pip
   ```

3. **Install dependencies one by one:**
   ```bash
   pip install Django==4.2.7
   pip install pandas
   pip install python-decouple==3.8
   pip install Pillow
   ```

4. **Or install without version pinning:**
   ```bash
   pip install Django pandas python-decouple Pillow
   ```

5. **Run migrations:**
   ```bash
   python manage.py migrate
   ```

6. **Start server:**
   ```bash
   python manage.py runserver
   ```

### Option 3: Use Python 3.11 or 3.12 (Alternative)

If you continue having issues, you can use Python 3.11 or 3.12 which have better compatibility:

1. Install Python 3.11 or 3.12
2. Create new virtual environment with that Python version:
   ```bash
   py -3.11 -m venv venv
   ```
3. Then run setup.bat again

---

**Note:** The updated `requirements.txt` should work with Python 3.13. If you still encounter issues, the manual installation steps above should resolve them.

