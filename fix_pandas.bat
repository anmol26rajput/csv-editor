@echo off
echo ========================================
echo Fixing Pandas Installation
echo ========================================
echo.

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Upgrading pip...
python -m pip install --upgrade pip

echo.
echo Installing pandas (latest version with Python 3.13 support)...
pip install --upgrade pandas

echo.
echo Installing other dependencies...
pip install Django==4.2.7 python-decouple==3.8 Pillow

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Now run: python manage.py migrate
echo Then: python manage.py runserver
echo.
pause

