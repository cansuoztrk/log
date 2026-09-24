@echo off
setlocal
rem AI Kripto Bot - Windows baslatici. Asil isi baslat.py yapar.
chcp 65001 >nul
title AI Kripto Bot
cd /d "%~dp0"

set "PY="
call :try py -3
if not defined PY call :try python
if not defined PY call :try python3
if not defined PY goto :nopython

%PY% baslat.py
if errorlevel 1 (
  echo.
  echo  Bir sorun olustu. Yukaridaki mesaji okuyun veya bu pencerenin ekran goruntusunu paylasin.
  echo.
  pause
)
exit /b

:try
%* -c "import sys; sys.exit(0 if sys.version_info[:2] >= (3, 10) else 1)" >nul 2>&1
if not errorlevel 1 set "PY=%*"
exit /b

:nopython
echo.
echo  [HATA] Python 3.10 veya daha yeni bir surum bulunamadi.
echo.
echo   1. https://www.python.org/downloads/ adresinden Python'u indirin
echo   2. Kurulumun ilk ekraninda "Add python.exe to PATH" kutusunu isaretleyin
echo   3. Kurulum bitince bu dosyayi tekrar calistirin
echo.
echo   Not: Microsoft Store'daki "python" kisayolu calismaz; python.org surumunu kurun.
echo.
start "" https://www.python.org/downloads/
pause
exit /b 1
