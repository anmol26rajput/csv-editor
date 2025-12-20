@echo off
echo ========================================
echo CSV Editor - Setup Script
echo ========================================
echo.

echo Step 1: Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo Error creating virtual environment!
    pause
    exit /b 1
)

echo.
echo Step 2: Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Step 3: Upgrading pip...
python -m pip install --upgrade pip

echo.
echo Step 4: Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo Error installing dependencies!
    echo Trying alternative: installing without version pinning...
    pip install Django pandas python-decouple Pillow
    if errorlevel 1 (
        echo Error installing dependencies!
        pause
        exit /b 1
    )
)

echo.
echo Step 5: Creating migrations for editor app...
python manage.py makemigrations

echo.
echo Step 6: Running database migrations...
python manage.py migrate
if errorlevel 1 (
    echo Error running migrations!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Starting Django development server...
echo Open your browser and navigate to: http://127.0.0.1:8000/
echo.
echo Press Ctrl+C to stop the server
echo.
python manage.py runserver

