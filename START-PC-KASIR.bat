@echo off
setlocal
title Putri Collection - Point of Sale
cd /d "%~dp0"

set "PHP_EXE=%LOCALAPPDATA%\Microsoft\WinGet\Packages\PHP.PHP.8.4_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe"
if not exist "%PHP_EXE%" (
    echo [ERROR] PHP 8.4 dari WinGet tidak ditemukan.
    echo Jalankan: winget install --id PHP.PHP.8.4 --exact
    pause
    exit /b 1
)

echo ==================================================
echo              PUTRI COLLECTION POS
echo ==================================================
echo.

tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I "mysqld.exe" >NUL
if errorlevel 1 (
    echo [1/4] Menyalakan MySQL XAMPP...
    start "MySQL XAMPP" /MIN "D:\xampp\mysql_start.bat"
    timeout /t 3 /nobreak >NUL
) else (
    echo [1/4] MySQL XAMPP sudah aktif.
)

tasklist /FI "IMAGENAME eq httpd.exe" 2>NUL | find /I "httpd.exe" >NUL
if errorlevel 1 (
    echo [2/4] Menyalakan Apache XAMPP...
    start "Apache XAMPP" /MIN "D:\xampp\apache_start.bat"
    timeout /t 2 /nobreak >NUL
) else (
    echo [2/4] Apache XAMPP sudah aktif.
)

echo [3/4] Menyiapkan browser...
start "" cmd /c "timeout /t 2 /nobreak ^>NUL ^& start http://localhost:8000/pos"

echo [4/4] Menyalakan server Putri Collection...
echo.
echo Jangan tutup jendela ini selama aplikasi digunakan.
echo Tekan Ctrl+C untuk menghentikan server.
echo.

"%PHP_EXE%" artisan serve --host=localhost --port=8000

endlocal
